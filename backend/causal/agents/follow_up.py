"""Follow-up response generator using Anthropic SDK directly.

Generates a conversational answer based on the existing inference results
without re-running the pipeline.
"""
import logging
import os

import anthropic

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """あなたは因果推論AIアシスタント「Athena」です。
ユーザーは因果推論の結果について追加の質問をしています。

以下は、このセッションで実行された因果推論の結果です。
この情報を元に、ユーザーの質問に日本語で簡潔かつ正確に回答してください。
回答には推論結果の根拠を引用し、参照元がある場合は[N]形式で引用してください。

---
【元のクエリ】
{query}

【仮説一覧】
{hypotheses}

【最終分析結果】
{final_answer}

【参照元】
{references}
---"""


def generate_follow_up_response(
    query: str,
    follow_up_query: str,
    hypotheses: list[dict],
    final_answer: str,
    references: list[dict],
) -> str:
    """Generate a follow-up response using existing inference context."""
    # Format hypotheses
    hyp_text = ""
    for i, h in enumerate(hypotheses, 1):
        score = h.get("score", 0)
        hyp_text += f"  {i}. {h.get('text', '')} (スコア: {score:.2f})\n"
    if not hyp_text:
        hyp_text = "  （仮説なし）\n"

    # Format references
    ref_text = ""
    for i, r in enumerate(references, 1):
        title = r.get("title", "")
        url = r.get("url", "")
        ref_text += f"  [{i}] {title} - {url}\n"
    if not ref_text:
        ref_text = "  （参照元なし）\n"

    system = SYSTEM_PROMPT.format(
        query=query,
        hypotheses=hyp_text,
        final_answer=final_answer or "（分析結果なし）",
        references=ref_text,
    )

    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=system,
        messages=[
            {"role": "user", "content": follow_up_query},
        ],
    )
    return response.content[0].text
