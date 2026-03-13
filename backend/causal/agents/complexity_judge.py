"""Node 1: Query complexity judgment and model selection."""
import logging

from anthropic import Anthropic
from django.conf import settings

from . import extract_json
from ..middleware import record_token_usage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """あなたはクエリ複雑度判定システムです。
ユーザーの因果的な問いを分析し、以下のJSON形式で回答してください:

{
  "entity_count": <抽出されたエンティティ数>,
  "causal_depth": <因果関係の深さ（1-5）>,
  "complexity_score": <0.0-1.0>,
  "reasoning": "<判定理由>"
}

エンティティとは、問いに含まれる主要な概念・名詞（人物、組織、概念など）を指します。"""


def complexity_judge(state: dict) -> dict:
    query = state["query"]
    session_id = state["session_id"]
    threshold = state.get("complexity_threshold", 3)

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": query}],
    )

    # Record token usage
    record_token_usage(
        session_id=session_id,
        model="claude-sonnet-4-20250514",
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        node_name="complexity_judge",
    )

    # Parse response
    text = response.content[0].text
    result = extract_json(text)
    if result is None:
        # Fallback: simple heuristic
        entity_count = len(query.split()) // 5
        result = {
            "entity_count": entity_count,
            "complexity_score": 0.5,
            "reasoning": "JSON解析失敗のためヒューリスティック判定",
        }

    entity_count = result.get("entity_count", 1)
    complexity_score = result.get("complexity_score", 0.5)

    # Model selection based on complexity
    if entity_count > threshold or len(query) > 100:
        selected_model = "claude-opus-4-20250514"
    else:
        selected_model = "claude-sonnet-4-20250514"

    return {
        **state,
        "complexity_score": complexity_score,
        "entity_count": entity_count,
        "selected_model": selected_model,
        "complexity_reasoning": result.get("reasoning", ""),
    }
