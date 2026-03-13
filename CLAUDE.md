# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Athena is a causal inference AI system that generates hypotheses, collects evidence via web search, and visualizes reasoning as a knowledge graph. User queries flow through a 7-node LangGraph pipeline (complexity_judge → question_parser → hypothesis_generator → evidence_searcher → graph_builder → hypothesis_ranker → answer_synthesizer), with real-time progress streamed to the frontend via WebSocket.

## Commands

### Backend (run from `backend/`)
```bash
python manage.py runserver          # Daphne ASGI server on :8000
python manage.py test tests -v2     # Run all 76 backend tests
python manage.py test tests.test_session_api.TestSessionCreateAPI.test_create_session  # Single test
python manage.py migrate            # Apply migrations
```

### Frontend (run from `frontend/`)
```bash
npm run dev       # Next.js dev server with Turbopack on :3000
npm run build     # Production build
npm run lint      # ESLint
```

### Infrastructure
```bash
docker compose up -d                # Start PostgreSQL 17 (pgvector) + Redis
```

## Architecture

### Backend: Django 6 + Channels (ASGI)
- **`config/`** — Settings, ASGI routing, URL root. Redis on port **6380** (not 6379).
- **`users/`** — JWT auth (SimpleJWT with rotation+blacklist), UserSettings model. Login/refresh/logout/me endpoints under `/api/auth/`.
- **`causal/`** — Core app. Models: Session, Hypothesis, Evidence (with pgvector embedding), GraphNode, GraphEdge, TokenUsage. REST endpoints under `/api/` for sessions, graph, usage, settings.
- **`causal/agents/`** — 7 LangGraph pipeline nodes. Each is a standalone module with an async function that transforms pipeline state.
- **`causal/graph/pipeline.py`** — LangGraph StateGraph wiring. `run_pipeline()` is an async generator that streams state updates via a `send_event` callback to the WebSocket consumer.
- **`causal/consumers.py`** — Django Channels AsyncJsonWebsocketConsumer. Authenticates via JWT query param, creates asyncio task for pipeline execution.
- **`causal/middleware.py`** — Token cost calculation (Sonnet: $3/$15, Opus: $15/$75 per 1M tokens) and usage recording.

### Frontend: Next.js 15 + React 19 + TypeScript
- **`lib/api.ts`** — Fetch wrapper with automatic JWT refresh on 401.
- **`hooks/useAuth.ts`** — Zustand auth store (JWT in localStorage).
- **`hooks/useSession.ts`** — Zustand session/message/graph state.
- **`hooks/useWebSocket.ts`** — Connects to `ws://localhost:8000/ws/sessions/{id}/` for pipeline events.
- **`components/GraphPanel.tsx`** — D3.js force-directed graph visualization.
- **`next.config.ts`** — Rewrites `/api/*` to Django backend at `localhost:8000`.

### Data Flow
Frontend → REST API (create session) → WebSocket (start pipeline) → 7 LangGraph nodes execute sequentially → each node streams progress events back through WebSocket → graph/hypotheses saved to PostgreSQL → frontend renders incrementally.

## Key Implementation Details

- **Model auto-selection**: complexity_judge picks Opus when entity count exceeds `complexity_threshold` (default 3) from UserSettings, otherwise Sonnet.
- **pgvector migration**: `0000_pgvector_extension.py` must run before `0001_initial.py` to create the `vector` type. This is critical for test DB creation.
- **Language/Timezone**: All UI text and pipeline prompts are in Japanese. `TIME_ZONE=Asia/Tokyo`.
- **UserSettings auto-creation**: First call to `/api/auth/me/` creates UserSettings with defaults if missing.
- **Python environment**: venv at `.venv/` with Python 3.12. Always use `python` (not system python) for Django commands.

## Environment Variables

Required API keys: `ANTHROPIC_API_KEY`, `BRAVE_API_KEY`. Optional: `LANGSMITH_API_KEY` for tracing.

Database defaults work with docker-compose (`ciuser`/`cipass`/`causal-inference` on localhost:5432). Redis defaults to localhost:6380.

## Git Workflow

エラー修正やバグフィックスを繰り返した場合、または新規機能を実装した場合は、作業の区切りごとにcommitとpushを実行すること。commitメッセージは変更内容・背景・影響範囲を詳細に記載する（日本語）。機能のまとまりごとにcommitを分割し、1つのcommitに無関係な変更を混ぜない。

## Test Structure

Tests use Django's TestCase + DRF's APIClient (not pytest). `tests/conftest.py` provides `APITestBase` with authenticated client fixtures and factory helpers (`create_session`, `create_hypothesis`, `create_evidence`, `create_graph_node`, `create_graph_edge`, `create_token_usage`). Each test file covers one API domain or layer (auth, sessions, settings, usage, models, middleware).
