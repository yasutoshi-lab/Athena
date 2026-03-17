# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Athena is a causal inference AI system that generates hypotheses, collects evidence via web search, and visualizes reasoning as a knowledge graph. User queries flow through a 7-node LangGraph pipeline (complexity_judge → question_parser → hypothesis_generator → evidence_searcher → graph_builder → hypothesis_ranker → answer_synthesizer), with real-time progress streamed to the frontend via WebSocket.

## Commands

### Activate venv first
```bash
source .venv/bin/activate           # Required before any backend commands
```

### Backend (run from `backend/`)
```bash
python manage.py runserver          # Daphne ASGI server on :8000
python manage.py test tests -v2     # Run all backend tests
python manage.py test tests.test_session_api.TestSessionCreateAPI.test_create_session  # Single test
python manage.py migrate            # Apply migrations
```

### Frontend (run from `frontend/`)
```bash
npm run dev       # Next.js dev server with Turbopack on :3000
npm run build     # Production build
npm run lint      # ESLint
```

### Frontend dependency install (run from `frontend/`)
```bash
npm install                         # Required before first run or after package.json changes
```

### Infrastructure
```bash
docker compose up -d postgres redis   # Start only PostgreSQL 17 (pgvector) + Redis for local dev
docker compose up -d                  # Start full stack (postgres + redis + backend + frontend)
```

## Architecture

### Backend: Django 6 + Channels (ASGI)
- **`config/`** — Settings, ASGI routing, URL root. Redis on port **6380** (not 6379).
- **`users/`** — JWT auth (SimpleJWT with rotation+blacklist), UserSettings model. Login/refresh/logout/me endpoints under `/api/auth/`.
- **`causal/`** — Core app. Models: Session, Hypothesis, Evidence (with pgvector embedding), GraphNode, GraphEdge, TokenUsage. REST endpoints under `/api/` for sessions, graph, usage, settings.
- **`causal/agents/`** — 7 LangGraph pipeline nodes. Each is a synchronous function that transforms `InferenceState` (TypedDict). Executed by LangGraph in a thread via ThreadPoolExecutor.
- **`causal/graph/pipeline.py`** — LangGraph StateGraph wiring. `run_pipeline()` wraps sync LangGraph in ThreadPoolExecutor, polls a `thread_queue.Queue` every 50ms for streaming events.
- **`causal/consumers.py`** — `InferenceConsumer` (AsyncJsonWebsocketConsumer). Authenticates via JWT query param, spawns async task for pipeline. Inbound: `start_inference` (with `query`) and `stop_inference`. Outbound: 15+ event types streamed from pipeline.
- **`causal/middleware.py`** — Token cost calculation (Sonnet: $3/$15, Opus: $15/$75 per 1M tokens) and usage recording.

### Frontend: Next.js 15 + React 19 + TypeScript
- **`lib/api.ts`** — Fetch wrapper with automatic JWT refresh on 401.
- **`hooks/useAuth.ts`** — Zustand auth store (JWT in localStorage).
- **`hooks/useSession.ts`** — Zustand session/message/graph state. Graph deduplication by node_id (nodes) and source+target+type (edges).
- **`hooks/useWebSocket.ts`** — Connects to `ws://localhost:8000/ws/sessions/{id}/?token={jwt}`. Handles 15+ event types and incrementally builds message history.
- **`components/GraphPanel.tsx`** — D3.js force-directed graph visualization.
- **`next.config.ts`** — Rewrites `/api/*` to Django backend at `localhost:8000`.
- Inline styles (no Tailwind in use despite being in devDependencies). CSS variables: `--bg-0`, `--bg-1`, `--text-2`, `--border`, etc.

### Pipeline State (`InferenceState`)
Defined in `causal/graph/pipeline.py` as a TypedDict with `total=False` (all fields optional for partial updates):
- `query`, `session_id`, `complexity_threshold`, `complexity_score`, `entity_count`
- `selected_model` — full model ID string (e.g., `"claude-sonnet-4-20250514"`)
- `parsed_question` (dict), `hypotheses` (list[dict]), `evidences` (dict keyed by hypothesis index)
- `graph_nodes`, `graph_edges`, `ranked_hypotheses`, `final_answer`, `references`
- `_live_queue` — hidden `thread_queue.Queue` injected for mid-node streaming (e.g., evidence_searcher emits search progress events)

### Data Flow
1. Frontend creates session via REST API (`POST /api/sessions/`)
2. WebSocket connects to `ws/sessions/{id}/`, sends `start_inference` with query
3. Consumer spawns async task → `run_pipeline()` executes 7 nodes sequentially in a thread
4. Each node emits events via `_live_queue` (mid-node) and state updates (post-node)
5. Pipeline saves results to PostgreSQL; events stream to frontend via WebSocket
6. Frontend renders incrementally from Zustand store updates

### URL Routing
- REST: `config/urls.py` → `/api/auth/` (users.urls), `/api/` (causal.urls)
- WebSocket: `causal/routing.py` → `ws/sessions/(?P<session_id>\d+)/`
- ASGI stack: `AllowedHostsOriginValidator` → `AuthMiddlewareStack` → `URLRouter`

## Key Implementation Details

- **Model auto-selection**: complexity_judge picks Opus when `entity_count > complexity_threshold` (default 3) OR `query length > 100`. `UserSettings.default_model` can override ("auto", "sonnet", "opus").
- **pgvector migration**: `0000_pgvector_extension.py` must run before `0001_initial.py` to create the `vector` type. This is critical for test DB creation.
- **Language/Timezone**: Default UI text and pipeline prompts are in Japanese. `TIME_ZONE=Asia/Tokyo`, `LANGUAGE_CODE=ja`. Frontend supports i18n (Japanese/English switching from Settings page).
- **UserSettings auto-creation**: First call to `/api/auth/me/` or `/api/settings/` creates UserSettings with defaults if missing (via `get_or_create`).
- **Python environment**: venv at `.venv/` with Python 3.12. Always use `python` (not system python) for Django commands.
- **Agent JSON parsing**: All agents use `extract_json()` from `agents/__init__.py` to parse Claude responses from markdown code blocks or raw JSON.
- **Token recording**: Per-node token usage recorded via `record_token_usage()` in middleware.
- **JWT auth**: Access tokens valid 1 hour, refresh tokens 7 days with rotation (old tokens blacklisted). `APPEND_SLASH = False` — strict URL matching.

## Environment Variables

`.env` file lives at the **project root** (loaded by `backend/config/settings.py` via `dotenv`).

Required API keys: `ANTHROPIC_API_KEY`, `BRAVE_API_KEY`. Optional: `LANGSMITH_API_KEY` for tracing.

Database defaults work with docker-compose (`ciuser`/`cipass`/`causal-inference` on localhost:5432). Redis defaults to localhost:6380.

## Git Workflow

エラー修正やバグフィックスを繰り返した場合、または新規機能を実装した場合は、作業の区切りごとにcommitとpushを実行すること。commitメッセージは変更内容・背景・影響範囲を詳細に記載する（日本語）。機能のまとまりごとにcommitを分割し、1つのcommitに無関係な変更を混ぜない。

## Test Structure

Tests use Django's TestCase + DRF's APIClient (not pytest). `tests/conftest.py` provides `APITestBase` with:
- Two pre-created users (`testuser`, `otheruser`) and an authenticated APIClient with JWT Bearer token
- Factory helpers: `create_session()`, `create_hypothesis()`, `create_evidence()`, `create_graph_node()`, `create_graph_edge()`, `create_token_usage()` — all with sensible Japanese defaults
- Test files organized by domain: auth, sessions, settings, usage, models, middleware
