"""Node 4: Evidence searcher - collects evidence via Brave Search."""
import logging

import httpx
from anthropic import Anthropic
from django.conf import settings

from . import extract_json
from ..middleware import record_token_usage

logger = logging.getLogger(__name__)

EVIDENCE_ANALYSIS_PROMPT = """あなたは証拠評価の専門家です。
以下の検索結果を分析し、指定された仮説に対する証拠を抽出してください。

仮説: {hypothesis}

検索結果:
{search_results}

以下のJSON形式で回答してください:
{{
  "evidences": [
    {{
      "text": "<証拠の要約>",
      "source_title": "<出典タイトル>",
      "source_url": "<出典URL>",
      "stance": "support" または "counter",
      "confidence": "high" / "medium" / "low"
    }}
  ]
}}

各検索結果が仮説を支持するか反証するかを判断し、関連する証拠のみを含めてください。"""


def _emit(queue, event: dict):
    """Put a LiveEvent into the shared queue (if available)."""
    if queue is not None:
        from ..graph.pipeline import LiveEvent
        queue.put(LiveEvent(event))


def _brave_search(query: str, count: int = 5, *, live_queue=None) -> list[dict]:
    api_key = settings.BRAVE_API_KEY
    if not api_key:
        logger.warning("Brave API key not configured")
        return []

    _emit(live_queue, {
        "type": "search_started",
        "query": query[:120],
    })

    try:
        resp = httpx.get(
            "https://api.search.brave.com/res/v1/web/search",
            params={"q": query, "count": count, "search_lang": "jp"},
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": api_key,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("web", {}).get("results", [])
        parsed = [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "description": r.get("description", ""),
            }
            for r in results
        ]

        # Emit found URLs
        _emit(live_queue, {
            "type": "search_results_found",
            "query": query[:120],
            "results": [
                {"title": r["title"], "url": r["url"]}
                for r in parsed
            ],
        })

        return parsed
    except Exception as e:
        logger.error(f"Brave search error: {e}")
        return []


def _analyze_evidence(
    hypothesis_text: str,
    search_results: list[dict],
    model: str,
    session_id: int,
    *,
    hyp_index: int = 0,
    live_queue=None,
) -> list[dict]:
    if not search_results:
        return []

    _emit(live_queue, {
        "type": "evidence_analyzing",
        "hypothesis_index": hyp_index,
        "source_count": len(search_results),
    })

    results_text = "\n\n".join(
        f"【{r['title']}】\nURL: {r['url']}\n{r['description']}"
        for r in search_results
    )

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    response = client.messages.create(
        model=model,
        max_tokens=2000,
        messages=[
            {
                "role": "user",
                "content": EVIDENCE_ANALYSIS_PROMPT.format(
                    hypothesis=hypothesis_text,
                    search_results=results_text,
                ),
            }
        ],
    )

    record_token_usage(
        session_id=session_id,
        model=model,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        node_name="evidence_searcher",
    )

    text = response.content[0].text
    result = extract_json(text)
    if result is not None:
        evidences = result.get("evidences", []) if isinstance(result, dict) else result

        support = sum(1 for e in evidences if e.get("stance") == "support")
        counter = sum(1 for e in evidences if e.get("stance") == "counter")
        _emit(live_queue, {
            "type": "evidence_analyzed",
            "hypothesis_index": hyp_index,
            "support_count": support,
            "counter_count": counter,
        })

        return evidences
    logger.warning("Failed to parse evidence analysis response")
    return []


def evidence_searcher(state: dict) -> dict:
    query = state["query"]
    session_id = state["session_id"]
    model = state["selected_model"]
    hypotheses = state.get("hypotheses", [])
    live_queue = state.get("_live_queue")

    all_evidences = {}

    for i, hyp in enumerate(hypotheses):
        search_query = f"{query} {hyp['text']}"

        # Run brave search (synchronous) with live progress
        search_results = _brave_search(search_query, live_queue=live_queue)

        # Analyze search results with live progress
        evidences = _analyze_evidence(
            hyp["text"], search_results, model, session_id,
            hyp_index=i, live_queue=live_queue,
        )
        all_evidences[i] = evidences

    return {
        **state,
        "evidences": all_evidences,
    }
