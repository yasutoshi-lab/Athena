<img src="./banner.svg" width="800" />

[README_JP](README.md)

# Athena — Causal Inference AI System

A system that automatically generates and validates multiple hypotheses for causal questions like "Why did X happen?", visualizing the reasoning process in real-time as a **knowledge graph**.

*For a more precise description of the system's scope and feasibility, see [System Positioning and Feasibility](./doc/en/detail.md).

## demo

![demo](./demo.gif)

## Setup

### Prerequisites

- Python 3.12+
- [Node.js 22+](https://nodejs.org/)
- [Docker](https://docs.docker.com/engine/install)

### Environment Variables & Container Startup

```bash
# Create .env and configure API keys
cp .env.example .env

# Start all containers with Docker Compose
# ※If using WSL, please run this with Docker Desktop running.
docker compose up -d

# Access the system in your browser
http://localhost:3000
```

## Key Features

- Automatically evaluates query complexity and selects the appropriate model (Sonnet / Opus)
- Generates 3–5 causal hypotheses automatically
- Collects evidence and counter-evidence via web search using the Brave Search API
- Builds a causal graph and streams it to the frontend in real-time via WebSocket
- Presents the most plausible hypothesis with supporting evidence
- Tracks and visualizes token usage and cost (USD)

## Tech Stack

| Layer            | Technology                         | Role                                                   |
| ---------------- | ---------------------------------- | ------------------------------------------------------ |
| Frontend         | Next.js 15 + TypeScript            | Full UI & settings page                                |
| Graph Rendering  | D3.js (force-directed)             | Interactive knowledge graph display                    |
| State Management | Zustand                            | Auth, session & graph state                            |
| Backend          | Django + Django Channels           | REST API, WebSocket & auth                             |
| Authentication   | Django Auth + SimpleJWT            | JWT auth & multi-user management                       |
| AI Pipeline      | LangGraph                          | 7-node inference pipeline orchestration                |
| LLM              | Claude Sonnet / Opus (auto-switch) | Hypothesis generation, evidence evaluation & reasoning |
| Web Search       | Brave Search API                   | Real-time evidence collection                          |
| Vector DB        | PostgreSQL + pgvector              | Embedding-based similarity search & deduplication      |
| Monitoring       | LangSmith                          | Agent tracing & evaluation                             |

## Directory Structure

```
athena/
├── backend/                    # Django backend
│   ├── config/                 #   Django settings (settings, urls, asgi)
│   ├── causal/                 #   Causal inference app (models, API, WebSocket, pipeline)
│   ├── users/                  #   Auth & user settings app
│   └── tests/                  #   Backend tests
├── frontend/                   # Next.js frontend
│   ├── app/                    #   Pages (login, main, settings, signup)
│   ├── components/             #   UI components (TopBar, ChatPanel, GraphPanel, etc.)
│   ├── hooks/                  #   Zustand stores (auth, session, WebSocket, i18n)
│   └── lib/                    #   API client & i18n translations
├── doc/                        # Documentation
│   ├── jp/                     #   Japanese version (frontend, backend, db, docker)
│   └── en/                     #   English version
├── moc/                        # Design documents & UI mockups
├── docker-compose.yml          # PostgreSQL + Redis container definitions
├── pyproject.toml              # Python project config & dependencies
├── init.sql                    # DB initialization script (pgvector extension)
├── icon.svg                    # Project icon
├── banner.svg                  # README banner image
└── .env                        # Environment variables (API keys, DB connection)
```

## LangGraph Pipeline (7-Node Architecture)

```
START
  │
  ▼
[ complexity_judge ]      ← Evaluates query complexity → selects model (Sonnet/Opus)
  │
  ▼
[ question_parser ]       ← Structures the question (extracts subject, predicate, timeline)
  │
  ▼
[ hypothesis_generator ]  ← Generates 3–5 causal hypotheses using Claude
  │
  ▼
[ evidence_searcher ]     ← Collects evidence & counter-evidence via Brave API
  │
  ▼
[ graph_builder ]         ← Generates nodes & edges, stores in pgvector
  │
  ▼
[ hypothesis_ranker ]     ← Scores hypotheses (evidence count, quality, contradiction level)
  │
  ▼
[ answer_synthesizer ]    ← Generates final explanation with supporting evidence
  │
  ▼
END  ← Records token_usage to DB
```

## Documentation

| Category | Feature              | 日本語版                                             | English                                                      |
| -------- | -------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| Frontend | Login Screen         | [ログイン画面](doc/jp/frontend/01_login.md)             | [Login Screen](doc/en/frontend/01_login.md)                     |
| Frontend | Main Screen          | [メイン画面](doc/jp/frontend/02_main.md)                | [Main Screen](doc/en/frontend/02_main.md)                       |
| Frontend | Settings Screen      | [設定画面](doc/jp/frontend/03_settings.md)              | [Settings Screen](doc/en/frontend/03_settings.md)               |
| Frontend | Account Registration | [アカウント作成画面](doc/jp/frontend/04_signup.md)      | [Account Registration](doc/en/frontend/04_signup.md)            |
| Backend  | Authentication API   | [認証 API](doc/jp/backend/01_auth.md)                   | [Authentication API](doc/en/backend/01_auth.md)                 |
| Backend  | Sessions API         | [セッション API](doc/jp/backend/02_sessions.md)         | [Sessions API](doc/en/backend/02_sessions.md)                   |
| Backend  | WebSocket API        | [WebSocket API](doc/jp/backend/03_websocket.md)         | [WebSocket API](doc/en/backend/03_websocket.md)                 |
| Backend  | Settings & Usage API | [設定・使用量 API](doc/jp/backend/04_settings_usage.md) | [Settings &amp; Usage API](doc/en/backend/04_settings_usage.md) |
| Database | PostgreSQL           | [PostgreSQL](doc/jp/db/postgresql.md)                   | [PostgreSQL](doc/en/db/postgresql.md)                           |
| Database | Redis                | [Redis](doc/jp/db/redis.md)                             | [Redis](doc/en/db/redis.md)                                     |
| Docker   | Operations Guide     | [Docker 運用ガイド](doc/jp/docker/docker.md)            | [Docker Operations Guide](doc/en/docker/docker.md)              |

## References

- [Anthropic Claude API](https://docs.anthropic.com/)
- [LangGraph](https://langchain-ai.github.io/langgraph/)
- [LangSmith](https://docs.smith.langchain.com/)
- [Brave Search API](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Description of your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Create a Pull Request

For bug reports and feature requests, please use [Issues](https://github.com/yasutoshi-lab/Athena/issues).

## License

This project is licensed under the [Apache License 2.0](./LICENSE).

Copyright 2026 yasutoshi-lab
