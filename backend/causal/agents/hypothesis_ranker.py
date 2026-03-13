"""Node 6: Hypothesis ranker - re-scores hypotheses based on evidence."""
import json
import logging

from anthropic import Anthropic
from django.conf import settings

from ..middleware import record_token_usage

logger = logging.getLogger(__name__)

RANKING_PROMPT = """あなたは因果推論の評価者です。
以下の仮説と収集された証拠に基づいて、各仮説の信頼スコアを再評価してください。

問い: {query}

仮説と証拠:
{hypotheses_with_evidence}

以下のJSON形式で回答してください:
{{
  "ranked_hypotheses": [
    {{
      "index": <仮説のインデックス（0始まり）>,
      "score": <0.0-1.0の信頼スコア>,
      "support_count": <支持証拠の数>,
      "counter_count": <反証の数>,
      "reasoning": "<スコアの根拠>"
    }}
  ]
}}

スコアリング基準:
- 支持証拠の数と質
- 反証の数と質
- 証拠間の矛盾度
- 因果メカニズムの妥当性"""


def hypothesis_ranker(state: dict) -> dict:
    query = state["query"]
    session_id = state["session_id"]
    model = state["selected_model"]
    hypotheses = state.get("hypotheses", [])
    evidences = state.get("evidences", {})

    # Build hypothesis + evidence text
    lines = []
    for i, hyp in enumerate(hypotheses):
        lines.append(f"\n## 仮説 {i + 1}: {hyp['text']}")
        lines.append(f"初期スコア: {hyp.get('initial_score', 'N/A')}")
        hyp_evidences = evidences.get(i, evidences.get(str(i), []))
        if hyp_evidences:
            for ev in hyp_evidences:
                stance = ev.get("stance", "?")
                lines.append(f"  [{stance.upper()}] {ev.get('text', '')}")
        else:
            lines.append("  証拠なし")

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    response = client.messages.create(
        model=model,
        max_tokens=1500,
        messages=[
            {
                "role": "user",
                "content": RANKING_PROMPT.format(
                    query=query,
                    hypotheses_with_evidence="\n".join(lines),
                ),
            }
        ],
    )

    record_token_usage(
        session_id=session_id,
        model=model,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        node_name="hypothesis_ranker",
    )

    text = response.content[0].text
    try:
        result = json.loads(text)
        ranked = result.get("ranked_hypotheses", [])
    except json.JSONDecodeError:
        ranked = [
            {"index": i, "score": hyp.get("initial_score", 0.5)}
            for i, hyp in enumerate(hypotheses)
        ]

    # Update hypotheses with new scores
    for r in ranked:
        idx = r.get("index", 0)
        if idx < len(hypotheses):
            hypotheses[idx]["score"] = r["score"]
            hypotheses[idx]["support_count"] = r.get("support_count", 0)
            hypotheses[idx]["counter_count"] = r.get("counter_count", 0)
            hypotheses[idx]["ranking_reasoning"] = r.get("reasoning", "")

    return {
        **state,
        "hypotheses": hypotheses,
        "ranked_hypotheses": ranked,
    }
