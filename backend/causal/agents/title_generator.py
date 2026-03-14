"""Session title generator using Anthropic SDK directly."""
import logging
import os

import anthropic

logger = logging.getLogger(__name__)

TITLE_PROMPT = """以下の因果推論クエリを、セッション一覧に表示するための簡潔なタイトル（15文字以内）に要約してください。
タイトルのみを返してください。

クエリ: {query}"""


def generate_title(query: str) -> str:
    """Generate a concise session title from the query."""
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=50,
        messages=[
            {"role": "user", "content": TITLE_PROMPT.format(query=query)},
        ],
    )
    title = response.content[0].text.strip()
    # Remove surrounding quotes if present
    if (title.startswith('"') and title.endswith('"')) or (
        title.startswith("「") and title.endswith("」")
    ):
        title = title[1:-1]
    return title[:50]  # Safety cap
