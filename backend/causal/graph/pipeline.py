"""LangGraph pipeline for causal inference."""
import asyncio
import logging
import queue as thread_queue
from concurrent.futures import ThreadPoolExecutor
from typing import Any, AsyncGenerator, Callable, TypedDict

from langgraph.graph import StateGraph, END

from ..agents.complexity_judge import complexity_judge
from ..agents.question_parser import question_parser
from ..agents.hypothesis_generator import hypothesis_generator
from ..agents.evidence_searcher import evidence_searcher
from ..agents.graph_builder import graph_builder
from ..agents.hypothesis_ranker import hypothesis_ranker
from ..agents.answer_synthesizer import answer_synthesizer

logger = logging.getLogger(__name__)


class InferenceState(TypedDict, total=False):
    query: str
    session_id: int
    complexity_threshold: int
    complexity_score: float
    entity_count: int
    selected_model: str
    complexity_reasoning: str
    parsed_question: dict
    hypotheses: list[dict]
    evidences: dict
    graph_nodes: list[dict]
    graph_edges: list[dict]
    ranked_hypotheses: list[dict]
    final_answer: str


# Pipeline node progress mapping
NODE_PROGRESS = {
    "complexity_judge": 8,
    "question_parser": 20,
    "hypothesis_generator": 35,
    "evidence_searcher": 55,
    "graph_builder": 70,
    "hypothesis_ranker": 85,
    "answer_synthesizer": 96,
}

NODE_LABELS = {
    "complexity_judge": ("⚙", "クエリ複雑度を判定中"),
    "question_parser": ("◈", "問いを構造化中"),
    "hypothesis_generator": ("💡", "因果仮説を生成中"),
    "evidence_searcher": ("⊛", "Web検索 + 証拠収集中"),
    "graph_builder": ("⬡", "知識グラフを構築中"),
    "hypothesis_ranker": ("◷", "仮説スコアリング中"),
    "answer_synthesizer": ("✦", "根拠付き説明文を生成中"),
}


def build_pipeline() -> StateGraph:
    graph = StateGraph(InferenceState)

    graph.add_node("complexity_judge", complexity_judge)
    graph.add_node("question_parser", question_parser)
    graph.add_node("hypothesis_generator", hypothesis_generator)
    graph.add_node("evidence_searcher", evidence_searcher)
    graph.add_node("graph_builder", graph_builder)
    graph.add_node("hypothesis_ranker", hypothesis_ranker)
    graph.add_node("answer_synthesizer", answer_synthesizer)

    graph.set_entry_point("complexity_judge")
    graph.add_edge("complexity_judge", "question_parser")
    graph.add_edge("question_parser", "hypothesis_generator")
    graph.add_edge("hypothesis_generator", "evidence_searcher")
    graph.add_edge("evidence_searcher", "graph_builder")
    graph.add_edge("graph_builder", "hypothesis_ranker")
    graph.add_edge("hypothesis_ranker", "answer_synthesizer")
    graph.add_edge("answer_synthesizer", END)

    return graph.compile()


NODE_SEQUENCE = [
    "complexity_judge",
    "question_parser",
    "hypothesis_generator",
    "evidence_searcher",
    "graph_builder",
    "hypothesis_ranker",
    "answer_synthesizer",
]

_SENTINEL = object()  # Marks end of queue


async def run_pipeline(
    query: str,
    session_id: int,
    send_event: Callable,
) -> AsyncGenerator[dict, None]:
    """Run the inference pipeline, streaming events via send_event callback."""
    from channels.db import database_sync_to_async

    pipeline = build_pipeline()

    initial_state: InferenceState = {
        "query": query,
        "session_id": session_id,
        "complexity_threshold": 3,
    }

    # Load user settings for complexity threshold
    try:
        from ..models import Session
        session = await database_sync_to_async(
            lambda: Session.objects.select_related("user").get(id=session_id)
        )()
        from users.models import UserSettings
        settings_obj = await database_sync_to_async(
            lambda: UserSettings.objects.filter(user=session.user).first()
        )()
        if settings_obj:
            initial_state["complexity_threshold"] = settings_obj.complexity_threshold
            if settings_obj.default_model != "auto":
                model_map = {
                    "sonnet": "claude-sonnet-4-20250514",
                    "opus": "claude-opus-4-20250514",
                }
                initial_state["selected_model"] = model_map.get(
                    settings_obj.default_model, "claude-sonnet-4-20250514"
                )
    except Exception as e:
        logger.warning(f"Failed to load user settings: {e}")

    await send_event({"type": "session_started", "session_id": session_id})

    # Send node_started for the first node
    first_icon, first_label = NODE_LABELS[NODE_SEQUENCE[0]]
    await send_event(
        {
            "type": "node_started",
            "node": NODE_SEQUENCE[0],
            "icon": first_icon,
            "label": first_label,
        }
    )

    # Thread-safe queue for real-time streaming between worker thread and async loop
    eq = thread_queue.Queue()

    def _run_sync():
        """Execute pipeline in worker thread, putting each step into the queue."""
        try:
            for step in pipeline.stream(initial_state):
                eq.put(step)
            eq.put(_SENTINEL)
        except Exception as exc:
            eq.put(exc)
            eq.put(_SENTINEL)

    loop = asyncio.get_event_loop()
    executor = ThreadPoolExecutor(max_workers=1)
    future = loop.run_in_executor(executor, _run_sync)

    # Accumulated state across all nodes for DB save
    accumulated_state: dict = {}

    # Process events as each node completes
    while True:
        # Poll the queue, yielding control to the event loop between checks
        try:
            item = eq.get_nowait()
        except thread_queue.Empty:
            await asyncio.sleep(0.05)
            continue

        # Sentinel = pipeline finished
        if item is _SENTINEL:
            break

        # Re-raise exceptions from the worker thread
        if isinstance(item, Exception):
            raise item

        step = item
        for node_name, node_output in step.items():
            accumulated_state.update(node_output)

            # Send node completion event
            icon, label = NODE_LABELS.get(node_name, ("⚙", node_name))
            progress = NODE_PROGRESS.get(node_name, 0)

            await send_event(
                {
                    "type": "node_completed",
                    "node": node_name,
                    "icon": icon,
                    "label": label,
                    "progress": progress,
                }
            )

            # Send node-specific data events
            if node_name == "complexity_judge":
                await send_event(
                    {
                        "type": "model_selected",
                        "model": node_output.get("selected_model", ""),
                        "complexity_score": node_output.get("complexity_score", 0),
                        "entity_count": node_output.get("entity_count", 0),
                        "reasoning": node_output.get("complexity_reasoning", ""),
                    }
                )

            elif node_name == "question_parser":
                parsed = node_output.get("parsed_question", {})
                await send_event(
                    {
                        "type": "question_parsed",
                        "parsed_question": parsed,
                    }
                )
                # Send initial graph: question node
                q_node = {
                    "node_id": "q0",
                    "node_type": "question",
                    "label": query,
                    "metadata": parsed,
                }
                await send_event(
                    {
                        "type": "graph_update",
                        "nodes": [q_node],
                        "edges": [],
                    }
                )

            elif node_name == "hypothesis_generator":
                hypotheses = node_output.get("hypotheses", [])
                await send_event(
                    {
                        "type": "hypotheses_generated",
                        "hypotheses": hypotheses,
                    }
                )
                # Send graph: hypothesis nodes connected to question
                h_nodes = []
                h_edges = []
                for i, hyp in enumerate(hypotheses):
                    node_id = f"h{i + 1}"
                    h_nodes.append(
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
                    h_edges.append(
                        {
                            "source_node_id": "q0",
                            "target_node_id": node_id,
                            "edge_type": "causal",
                        }
                    )
                await send_event(
                    {
                        "type": "graph_update",
                        "nodes": h_nodes,
                        "edges": h_edges,
                    }
                )

            elif node_name == "evidence_searcher":
                evidences = node_output.get("evidences", {})
                await send_event(
                    {
                        "type": "evidence_collected",
                        "evidences": evidences,
                    }
                )
                # Send graph: evidence nodes connected to hypotheses
                ev_nodes = []
                ev_edges = []
                ev_counter = {"support": 0, "counter": 0}
                for hyp_idx, hyp_evidences in evidences.items():
                    hyp_node_id = f"h{int(hyp_idx) + 1}"
                    for ev in hyp_evidences:
                        stance = ev.get("stance", "support")
                        prefix = "s" if stance == "support" else "c"
                        ev_counter[stance] = ev_counter.get(stance, 0) + 1
                        ev_node_id = f"{prefix}{ev_counter[stance]}"
                        ev_nodes.append(
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
                        ev_edges.append(
                            {
                                "source_node_id": hyp_node_id,
                                "target_node_id": ev_node_id,
                                "edge_type": stance,
                            }
                        )
                if ev_nodes:
                    await send_event(
                        {
                            "type": "graph_update",
                            "nodes": ev_nodes,
                            "edges": ev_edges,
                        }
                    )

            elif node_name == "graph_builder":
                # Send concept nodes (the new ones extracted by LLM)
                all_nodes = node_output.get("graph_nodes", [])
                all_edges = node_output.get("graph_edges", [])
                concept_nodes = [n for n in all_nodes if n["node_type"] == "concept"]
                concept_edges = [
                    e for e in all_edges if e["edge_type"] == "rel"
                ]
                if concept_nodes:
                    await send_event(
                        {
                            "type": "graph_update",
                            "nodes": concept_nodes,
                            "edges": concept_edges,
                        }
                    )

            elif node_name == "hypothesis_ranker":
                await send_event(
                    {
                        "type": "hypotheses_ranked",
                        "hypotheses": node_output.get("hypotheses", []),
                    }
                )

            elif node_name == "answer_synthesizer":
                await send_event(
                    {
                        "type": "final_answer",
                        "answer": node_output.get("final_answer", ""),
                        "progress": 100,
                    }
                )

            # Send node_started for the next node in the sequence
            try:
                idx = NODE_SEQUENCE.index(node_name)
                if idx + 1 < len(NODE_SEQUENCE):
                    next_node = NODE_SEQUENCE[idx + 1]
                    next_icon, next_label = NODE_LABELS[next_node]
                    await send_event(
                        {
                            "type": "node_started",
                            "node": next_node,
                            "icon": next_icon,
                            "label": next_label,
                        }
                    )
            except ValueError:
                pass

        yield step

    # Wait for thread to finish
    await future
    executor.shutdown(wait=False)

    # Save results to DB
    if accumulated_state:
        await _save_results(session_id, accumulated_state)

    await send_event({"type": "session_completed", "session_id": session_id})


async def _save_results(session_id: int, state: dict):
    """Persist pipeline results to database."""
    from channels.db import database_sync_to_async

    @database_sync_to_async
    def save():
        from ..models import Session, Hypothesis, Evidence, GraphNode, GraphEdge

        session = Session.objects.get(id=session_id)
        session.status = Session.Status.COMPLETED
        session.complexity_score = state.get("complexity_score")
        # Convert full model name to short name for DB storage
        full_model = state.get("selected_model", "sonnet")
        model_short = {
            "claude-sonnet-4-20250514": "sonnet",
            "claude-opus-4-20250514": "opus",
        }
        session.selected_model = model_short.get(full_model, full_model)
        session.save()

        # Save hypotheses
        for i, hyp in enumerate(state.get("hypotheses", [])):
            h = Hypothesis.objects.create(
                session=session,
                order=i + 1,
                text=hyp["text"],
                score=hyp.get("score", 0.0),
            )

            # Save evidences for this hypothesis
            hyp_evidences = state.get("evidences", {}).get(
                i, state.get("evidences", {}).get(str(i), [])
            )
            for ev in hyp_evidences:
                Evidence.objects.create(
                    hypothesis=h,
                    text=ev.get("text", ""),
                    source_url=ev.get("source_url", ""),
                    source_title=ev.get("source_title", ""),
                    stance=ev.get("stance", "support"),
                    confidence=ev.get("confidence", "medium"),
                )

        # Save graph nodes and edges
        node_map = {}
        for node_data in state.get("graph_nodes", []):
            gn = GraphNode.objects.create(
                session=session,
                node_id=node_data["node_id"],
                node_type=node_data["node_type"],
                label=node_data["label"],
                metadata=node_data.get("metadata", {}),
            )
            node_map[node_data["node_id"]] = gn

        for edge_data in state.get("graph_edges", []):
            source = node_map.get(edge_data["source_node_id"])
            target = node_map.get(edge_data["target_node_id"])
            if source and target:
                GraphEdge.objects.create(
                    session=session,
                    source=source,
                    target=target,
                    edge_type=edge_data["edge_type"],
                )

    await save()
