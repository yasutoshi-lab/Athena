"""Node 5: Graph builder - constructs knowledge graph nodes and edges."""
import logging

from anthropic import Anthropic
from django.conf import settings

from . import extract_json
from ..middleware import record_token_usage

logger = logging.getLogger(__name__)

CONCEPT_PROMPT = """以下の仮説群と証拠から、関連する概念ノードを3〜5個抽出してください。
概念ノードは、複数の仮説や証拠に共通するキーワード・概念です。

仮説:
{hypotheses}

証拠:
{evidences}

以下のJSON形式で回答してください:
{{
  "concepts": [
    {{
      "label": "<概念名（短く）>",
      "related_hypotheses": [<関連する仮説のインデックス（0始まり）>]
    }}
  ]
}}"""


def graph_builder(state: dict) -> dict:
    query = state["query"]
    session_id = state["session_id"]
    model = state["selected_model"]
    hypotheses = state.get("hypotheses", [])
    evidences = state.get("evidences", {})

    nodes = []
    edges = []

    # Question node
    nodes.append(
        {
            "node_id": "q0",
            "node_type": "question",
            "label": query,
            "metadata": state.get("parsed_question", {}),
        }
    )

    # Hypothesis nodes
    for i, hyp in enumerate(hypotheses):
        node_id = f"h{i + 1}"
        nodes.append(
            {
                "node_id": node_id,
                "node_type": "hypothesis",
                "label": hyp.get("short_label", hyp["text"][:30]),
                "metadata": {
                    "text": hyp["text"],
                    "score": hyp.get("initial_score", 0.0),
                },
            }
        )
        edges.append(
            {
                "source_node_id": "q0",
                "target_node_id": node_id,
                "edge_type": "causal",
            }
        )

    # Evidence nodes
    ev_counter = {"support": 0, "counter": 0}
    for hyp_idx, hyp_evidences in evidences.items():
        hyp_node_id = f"h{int(hyp_idx) + 1}"
        for ev in hyp_evidences:
            stance = ev.get("stance", "support")
            prefix = "s" if stance == "support" else "c"
            ev_counter[stance] = ev_counter.get(stance, 0) + 1
            ev_node_id = f"{prefix}{ev_counter[stance]}"

            nodes.append(
                {
                    "node_id": ev_node_id,
                    "node_type": stance,
                    "label": ev.get("text", "")[:40],
                    "metadata": {
                        "text": ev.get("text", ""),
                        "source_url": ev.get("source_url", ""),
                        "source_title": ev.get("source_title", ""),
                        "confidence": ev.get("confidence", "medium"),
                    },
                }
            )
            edges.append(
                {
                    "source_node_id": hyp_node_id,
                    "target_node_id": ev_node_id,
                    "edge_type": stance,
                }
            )

    # Concept extraction via LLM
    hyp_text = "\n".join(f"H{i+1}: {h['text']}" for i, h in enumerate(hypotheses))
    ev_text = "\n".join(
        f"[{ev.get('stance', '?')}] {ev.get('text', '')}"
        for evs in evidences.values()
        for ev in evs
    )

    if hyp_text and ev_text:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=model,
            max_tokens=1000,
            messages=[
                {
                    "role": "user",
                    "content": CONCEPT_PROMPT.format(
                        hypotheses=hyp_text, evidences=ev_text
                    ),
                }
            ],
        )

        record_token_usage(
            session_id=session_id,
            model=model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            node_name="graph_builder",
        )

        result = extract_json(response.content[0].text)
        if result is not None:
            concepts = result.get("concepts", []) if isinstance(result, dict) else result
        else:
            concepts = []

        for i, concept in enumerate(concepts):
            concept_id = f"e{i + 1}"
            nodes.append(
                {
                    "node_id": concept_id,
                    "node_type": "concept",
                    "label": concept["label"],
                    "metadata": {},
                }
            )
            for hyp_idx in concept.get("related_hypotheses", []):
                hyp_node_id = f"h{hyp_idx + 1}"
                if any(n["node_id"] == hyp_node_id for n in nodes):
                    edges.append(
                        {
                            "source_node_id": hyp_node_id,
                            "target_node_id": concept_id,
                            "edge_type": "rel",
                        }
                    )

    return {
        **state,
        "graph_nodes": nodes,
        "graph_edges": edges,
    }
