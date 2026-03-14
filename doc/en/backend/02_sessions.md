# Sessions API

## Overview

Provides creation, retrieval, update, and deletion of causal inference sessions. Each session is associated with inference results (hypotheses, evidence, final answer, knowledge graph).

## Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/sessions/` | List all sessions |
| POST | `/api/sessions/` | Create a new session |
| GET | `/api/sessions/{id}/` | Get session details |
| PATCH | `/api/sessions/{id}/` | Update session title |
| DELETE | `/api/sessions/{id}/` | Delete a session |
| GET | `/api/sessions/{id}/graph/` | Get graph data |

All endpoints require the `Authorization: Bearer {access_token}` header.

## API Details

### GET `/api/sessions/`

Retrieve all sessions for the logged-in user (ordered by creation date, newest first).

**Response (200):**
```json
[
  {
    "id": 18,
    "query": "Why is startup funding in Japan lower than in the United States?",
    "title": "Japan startup funding",
    "selected_model": "sonnet",
    "status": "completed",
    "created_at": "2026-03-15T12:00:00+09:00"
  }
]
```

### POST `/api/sessions/`

Create a new session. The title defaults to the first 100 characters of the query.

**Request:**
```json
{
  "query": "Why is startup funding in Japan lower than in the United States?"
}
```

**Response (201):**
```json
{
  "id": 19,
  "query": "Why is startup funding in Japan lower than in the United States?",
  "title": "Why is startup funding in Japan lower than in the United States?",
  "complexity_score": null,
  "selected_model": "sonnet",
  "status": "pending",
  "hypotheses": [],
  "final_answer": "",
  "references": [],
  "created_at": "2026-03-15T12:00:00+09:00",
  "updated_at": "2026-03-15T12:00:00+09:00"
}
```

### GET `/api/sessions/{id}/`

Retrieve session details including hypotheses and evidence.

**Response (200):**
```json
{
  "id": 18,
  "query": "...",
  "title": "...",
  "complexity_score": 0.72,
  "selected_model": "sonnet",
  "status": "completed",
  "hypotheses": [
    {
      "id": 1,
      "order": 1,
      "text": "Difference in venture capital market size...",
      "score": 0.85,
      "evidences": [
        {
          "id": 1,
          "text": "...",
          "source_url": "https://...",
          "source_title": "...",
          "stance": "support",
          "confidence": "high"
        }
      ]
    }
  ],
  "final_answer": "The startup funding in Japan...",
  "references": [
    {"title": "...", "url": "https://..."}
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

### PATCH `/api/sessions/{id}/`

Update a session's title.

**Request:**
```json
{
  "title": "New title"
}
```

### DELETE `/api/sessions/{id}/`

Delete a session and all related data (hypotheses, evidence, graph nodes, graph edges, token usage) via CASCADE deletion.

**Response: 204 No Content**

### GET `/api/sessions/{id}/graph/`

Retrieve the knowledge graph data for a session.

**Response (200):**
```json
{
  "nodes": [
    {
      "id": 1,
      "node_id": "q0",
      "node_type": "question",
      "label": "Why...",
      "metadata": {"subject": "...", "predicate": "..."}
    },
    {
      "id": 2,
      "node_id": "h1",
      "node_type": "hypothesis",
      "label": "VC market size difference",
      "metadata": {"text": "...", "score": 0.85}
    }
  ],
  "edges": [
    {
      "id": 1,
      "source_node_id": "q0",
      "target_node_id": "h1",
      "edge_type": "causal"
    }
  ]
}
```

## Session Status Transitions

```
pending -> running -> completed
                   -> error
```

| Status | Description |
|--------|-------------|
| pending | Just created |
| running | Pipeline in progress |
| completed | Inference finished |
| error | An error occurred |
