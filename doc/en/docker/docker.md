# Docker Operations Guide

## Overview

Athena manages 4 services with Docker Compose. This guide covers procedures from initial setup to rebuilding after code changes.

## Container Configuration

| Service | Container Name | Port | Description |
|---------|---------------|------|-------------|
| postgres | athena-postgres | 5432 | PostgreSQL 17 + pgvector |
| redis | athena-redis | 6380 → 6379 | Redis 7 (for WebSocket communication) |
| backend | athena-backend | 8000 | Django / Daphne ASGI server |
| frontend | athena-frontend | 3000 | Next.js standalone server |

## Prerequisites

- Docker / Docker Compose installed
- A `.env` file exists at the project root

```bash
# Required keys in .env
ANTHROPIC_API_KEY=sk-ant-...
BRAVE_API_KEY=BSA...
```

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yasutoshi-lab/Athena.git
cd Athena
```

### 2. Create the `.env` File

```bash
cp .env.example .env  # If a template exists
# Or create manually
cat > .env << 'EOF'
ANTHROPIC_API_KEY=your-api-key-here
BRAVE_API_KEY=your-brave-key-here
EOF
```

### 3. Build and Start

```bash
docker compose up -d --build
```

The initial build will take several minutes to build the Docker images.

### 4. Create an Admin User

```bash
docker compose exec backend python manage.py createsuperuser
```

### 5. Access

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api/
- **Django Admin:** http://localhost:8000/admin/

---

## Basic Operations

### Start

```bash
# If already built (fast)
docker compose up -d

# Build and start
docker compose up -d --build
```

### Stop

```bash
docker compose down
```

### Stop + Delete Database

```bash
docker compose down -v
```

> **Warning:** The `-v` option also deletes the PostgreSQL data volume. All data will be lost.

### Check Status

```bash
docker compose ps
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service only
docker compose logs -f backend
docker compose logs -f frontend

# Specify number of recent lines
docker compose logs --tail 50 backend
```

---

## Rebuilding After Code Changes

### When frontend (`frontend/`) files are modified

```bash
docker compose up -d --build frontend
```

Since `npm run build` is automatically executed in the Dockerfile, there is no need to build manually.

### When backend (`backend/`) files are modified

```bash
docker compose up -d --build backend
```

Since `python manage.py migrate` is automatically executed on startup, migrations are applied automatically.

### When both are modified

```bash
docker compose up -d --build
```

### When pip packages are added or changed

1. Update `backend/requirements.txt`
2. Run a rebuild

```bash
docker compose up -d --build backend
```

### When npm packages are added or changed

1. Update `frontend/package.json`
2. Run a rebuild

```bash
docker compose up -d --build frontend
```

### Full Rebuild Ignoring Cache

If changes are not reflected due to Docker's build cache:

```bash
docker compose build --no-cache
docker compose up -d
```

---

## Local Development (Docker + Host Hybrid)

This approach runs only the database and Redis in Docker while developing the backend and frontend on the host. Hot reloading is available, improving development efficiency.

```bash
# Start only DB and Redis
docker compose up -d postgres redis

# Backend (separate terminal)
cd backend
source ../.venv/bin/activate
python manage.py runserver 8000

# Frontend (separate terminal)
cd frontend
npm run dev
```

With this setup, code changes to the frontend and backend are reflected immediately.

---

## Migration Operations

### Run Migrations Manually

```bash
docker compose exec backend python manage.py migrate
```

### Create Migration Files

```bash
docker compose exec backend python manage.py makemigrations
```

### Run Django Management Commands

```bash
# Django shell
docker compose exec backend python manage.py shell

# Create superuser
docker compose exec backend python manage.py createsuperuser

# Run tests
docker compose exec backend python manage.py test tests -v2
```

---

## Troubleshooting

### Port Already in Use

```bash
# Check which process is using the port
ss -tlnp | grep :3000
ss -tlnp | grep :8000

# Kill the process and restart
kill <PID>
docker compose up -d
```

### Backend Fails to Start (DB Connection Error)

The backend may have started before PostgreSQL's healthcheck completed.

```bash
docker compose up -d --force-recreate backend
```

### Frontend Fails to Start (Hostname Error)

Verify that the following environment variables are set for the frontend service in `docker-compose.yml`:

```yaml
environment:
  HOSTNAME: "0.0.0.0"
  PORT: "3000"
```

### Complete Database Reset

```bash
docker compose down -v
docker compose up -d --build
docker compose exec backend python manage.py createsuperuser
```

### Docker Image Size Has Grown Too Large

Remove unused images:

```bash
docker image prune -f
```
