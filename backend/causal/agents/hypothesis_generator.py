"""Node 3: Hypothesis generator - generates causal hypotheses."""
import logging

from anthropic import Anthropic
from django.conf import settings

from . import extract_json
from ..middleware import record_token_usage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """あなたは因果推論の専門家です。
ユーザーの問いに対して、3〜5個の因果仮説を生成してください。

以下のJSON形式で回答してください:
{
  "hypotheses": [
    {
      "text": "<仮説の説明文>",
      "short_label": "<グラフ表示用の短いラベル（改行込み2行以内）>",
      "initial_score": <0.0-1.0の初期信頼スコア>,
      "reasoning": "<この仮説を提案する理由>"
    }
  ]
}

仮説は具体的で検証可能なものにしてください。初期スコアはあなたの事前知識に基づく暫定的な信頼度です。"""


def hypothesis_generator(state: dict) -> dict:
    query = state["query"]
    session_id = state["session_id"]
    model = state["selected_model"]
    parsed = state.get("parsed_question", {})

    prompt = f"""問い: {query}

構造化情報:
- 主語: {parsed.get('subject', 'N/A')}
- 述語: {parsed.get('predicate', 'N/A')}
- スコープ: {parsed.get('scope', 'N/A')}
- 時間軸: {parsed.get('time_frame', 'N/A')}
- エンティティ: {', '.join(parsed.get('entities', []))}

この問いに対する因果仮説を3〜5個生成してください。"""

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    response = client.messages.create(
        model=model,
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    record_token_usage(
        session_id=session_id,
        model=model,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        node_name="hypothesis_generator",
    )

    text = response.content[0].text
    result = extract_json(text)
    if result is not None:
        hypotheses = result.get("hypotheses", []) if isinstance(result, dict) else result
    else:
        hypotheses = [
            {
                "text": "仮説の生成に失敗しました",
                "short_label": "エラー",
                "initial_score": 0.0,
                "reasoning": "JSON解析エラー",
            }
        ]

    return {
        **state,
        "hypotheses": hypotheses,
    }
