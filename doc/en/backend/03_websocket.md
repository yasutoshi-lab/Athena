# WebSocket API (Real-time Inference)

## Overview

A WebSocket interface for executing the inference pipeline and handling follow-up responses in real time. The 7-node pipeline runs sequentially, and results from each stage are delivered as events.

## Connection

```
ws://localhost:8000/ws/sessions/{session_id}/?token={jwt_access_token}
```

- `session_id`: The ID of a session created via the REST API
- `token`: JWT access token (passed as a query parameter)

## Client -> Server (Outbound Messages)

### `start_inference` — Start Inference

```json
{
  "type": "start_inference",
  "query": "Why is startup funding in Japan lower than in the United States?"
}
```

Launches the 7-node pipeline, and results are delivered as events sequentially.

### `follow_up` — Follow-up Question

```json
{
  "type": "follow_up",
  "query": "Tell me more about hypothesis 1"
}
```

The pipeline is not re-executed. Instead, Claude responds directly using the existing inference results as context.

### `stop_inference` — Stop Inference

```json
{
  "type": "stop_inference"
}
```

## Server -> Client (Inbound Events)

### Pipeline Control Events

| Event | Description |
|-------|-------------|
| `session_started` | Pipeline started |
| `node_started` | Node processing started (includes icon, label) |
| `node_completed` | Node processing completed (includes progress) |
| `session_completed` | All processing completed |
| `session_stopped` | Stopped by the user |
| `error` | An error occurred |

### Inference Result Events

| Event | Timing | Data |
|-------|--------|------|
| `model_selected` | After complexity_judge | model, complexity_score, entity_count, reasoning |
| `question_parsed` | After question_parser | parsed_question (subject, predicate, scope, time_frame, entities) |
| `hypotheses_generated` | After hypothesis_generator | hypotheses (text, score, short_label) |
| `search_started` | When search begins | query |
| `search_results_found` | When search results are retrieved | results (title, url) |
| `evidence_analyzing` | When evidence analysis begins | hypothesis_index, source_count |
| `evidence_analyzed` | When evidence analysis completes | hypothesis_index, support_count, counter_count |
| `evidence_collected` | When all evidence is collected | evidences |
| `graph_update` | When the graph is updated | nodes, edges |
| `hypotheses_ranked` | When hypothesis ranking completes | hypotheses (with updated scores) |
| `final_answer` | When the final answer is generated | answer, references |
| `title_generated` | When auto-generated title is ready | session_id, title |

### Follow-up Events

| Event | Description |
|-------|-------------|
| `follow_up_started` | Follow-up processing started |
| `follow_up_response` | Response text (answer) |

## Pipeline: 7 Nodes

```
complexity_judge -> question_parser -> hypothesis_generator
    -> evidence_searcher -> graph_builder -> hypothesis_ranker
    -> answer_synthesizer
```

| Node | Progress | Description |
|------|----------|-------------|
| complexity_judge | 8% | Evaluates query complexity and selects the model |
| question_parser | 20% | Structures the question (subject, predicate, scope, etc.) |
| hypothesis_generator | 35% | Generates causal hypotheses |
| evidence_searcher | 55% | Collects and analyzes evidence via web search |
| graph_builder | 70% | Builds the knowledge graph (adds concept nodes) |
| hypothesis_ranker | 85% | Scores hypotheses based on evidence |
| answer_synthesizer | 96% | Generates the final answer with references |

## Error Handling

Errors such as insufficient API credit balance are converted to user-friendly messages and displayed as toast notifications.

```json
{
  "type": "error",
  "message": "Anthropic API credit balance is insufficient. Please add credits in the console."
}
```
