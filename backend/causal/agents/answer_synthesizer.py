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

主要な証拠（[番号]は参照元番号）:
{evidence_summary}

参照元リスト:
{reference_list}

以下の形式で回答してください:
1. 最も有力な仮説を明示（スコア付き）
2. その仮説を支持する主要な証拠を引用
3. 他の仮説についても簡潔に言及
4. 全体的な評価と注意点

重要なルール:
- 本文中で証拠や情報源を参照する際は必ず上記の参照元リストの番号を使い [番号] 形式（例: [1], [2]）で明記してください
- 存在しない番号は絶対に使わないでください。使える番号は [1] から [{max_ref}] までです
- 回答の末尾に「参照元」セクションは付けないでください（システムが自動で表示します）

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

    # Build a deduplicated reference list with stable numbering.
    # Each unique URL gets a single [N] number; evidence lines reference
    # that number so the LLM's citations match the list sent to the frontend.
    references = []          # ordered list of {"title", "url"}
    url_to_refnum: dict[str, int] = {}  # url -> 1-based ref number
    ev_lines = []

    for hyp_idx, hyp_evidences in evidences.items():
        for ev in hyp_evidences:
            stance = ev.get("stance", "?")
            source_title = ev.get("source_title", "不明")
            source_url = ev.get("source_url", "")

            # Assign a reference number (reuse if URL already seen)
            if source_url and source_url in url_to_refnum:
                ref_num = url_to_refnum[source_url]
            else:
                references.append({
                    "title": source_title,
                    "url": source_url,
                })
                ref_num = len(references)
                if source_url:
                    url_to_refnum[source_url] = ref_num

            ev_lines.append(
                f"[{ref_num}] [{stance.upper()}] {ev.get('text', '')} — {source_title}"
            )

    # Build reference list for the prompt
    ref_list_lines = []
    for idx, ref in enumerate(references):
        title = ref.get("title", "不明")
        url = ref.get("url", "")
        ref_list_lines.append(f"[{idx + 1}] {title} - {url}" if url else f"[{idx + 1}] {title}")

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
                    reference_list="\n".join(ref_list_lines),
                    max_ref=len(references),
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
