"""Node 2: Question parser - structures the raw query."""
import json
import logging

from anthropic import Anthropic
from django.conf import settings

from ..middleware import record_token_usage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """あなたは因果推論のための問い構造化システムです。
ユーザーの因果的な問いを分析し、以下のJSON形式で構造化してください:

{
  "main_question": "<メインの問い>",
  "subject": "<主語・対象>",
  "predicate": "<述語・現象>",
  "scope": "<スコープ（例：日本 vs 米国）>",
  "time_frame": "<時間軸（例：直近5年）>",
  "entities": ["<エンティティ1>", "<エンティティ2>", ...]
}"""


def question_parser(state: dict) -> dict:
    query = state["query"]
    session_id = state["session_id"]
    model = state["selected_model"]

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    response = client.messages.create(
        model=model,
        max_tokens=800,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": query}],
    )

    record_token_usage(
        session_id=session_id,
        model=model,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        node_name="question_parser",
    )

    text = response.content[0].text
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = {
            "main_question": query,
            "subject": "",
            "predicate": "",
            "scope": "",
            "time_frame": "",
            "entities": [],
        }

    return {
        **state,
        "parsed_question": parsed,
    }
