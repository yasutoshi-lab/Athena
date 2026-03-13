"""Node 7: Answer synthesizer - generates the final answer with citations."""
import json
import logging

from anthropic import Anthropic
from django.conf import settings

from ..middleware import record_token_usage

logger = logging.getLogger(__name__)

SYNTHESIS_PROMPT = """あなたは因果推論の結果を分かりやすく説明する専門家です。
以下の分析結果をもとに、最終的な回答を生成してください。

問い: {query}

仮説とスコア:
{hypotheses_summary}

主要な証拠:
{evidence_summary}

以下の形式で回答してください:
1. 最も有力な仮説を明示（スコア付き）
2. その仮説を支持する主要な証拠を引用（本文中に [1], [2] のように番号付き参照を埋め込む）
3. 他の仮説についても簡潔に言及
4. 全体的な評価と注意点

重要なルール:
- 本文中で証拠を参照する際は必ず [番号] 形式（例: [1], [2]）で明記してください
- 番号は「参照元」セクションの番号と対応させてください
- 回答の末尾に以下の形式で参照元リストを付けてください:

---
参照元:
[1] 出典タイトル - URL
[2] 出典タイトル - URL
...

回答は自然な日本語で、読みやすく構造化してください。"""


def answer_synthesizer(state: dict) -> dict:
    query = state["query"]
    session_id = state["session_id"]
    model = state["selected_model"]
    hypotheses = state.get("hypotheses", [])
    evidences = state.get("evidences", {})

    # Build summaries
    hyp_lines = []
    for i, hyp in enumerate(hypotheses):
        hyp_lines.append(
            f"仮説{i+1} (スコア: {hyp.get('score', 'N/A')}): {hyp['text']}"
        )

    # Collect unique references from evidences
    references = []
    seen_urls = set()
    ev_lines = []
    ref_counter = 0
    for hyp_idx, hyp_evidences in evidences.items():
        for ev in hyp_evidences:
            stance = ev.get("stance", "?")
            source_title = ev.get("source_title", "不明")
            source_url = ev.get("source_url", "")
            ref_counter += 1
            ev_lines.append(
                f"[{ref_counter}] [{stance.upper()}] {ev.get('text', '')} — {source_title}"
            )
            if source_url and source_url not in seen_urls:
                seen_urls.add(source_url)
                references.append({
                    "title": source_title,
                    "url": source_url,
                })

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    response = client.messages.create(
        model=model,
        max_tokens=2000,
        messages=[
            {
                "role": "user",
                "content": SYNTHESIS_PROMPT.format(
                    query=query,
                    hypotheses_summary="\n".join(hyp_lines),
                    evidence_summary="\n".join(ev_lines[:15]),
                ),
            }
        ],
    )

    record_token_usage(
        session_id=session_id,
        model=model,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        node_name="answer_synthesizer",
    )

    final_answer = response.content[0].text

    return {
        **state,
        "final_answer": final_answer,
        "references": references,
    }
