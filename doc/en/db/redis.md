# Redis Design

## Overview

Redis is used as the Channel Layer for Django Channels, serving as a message broker for WebSocket communication. It is not used for persistent data storage.

## Connection Details

| Item | Value |
|------|-------|
| Host | localhost (Docker: `redis`) |
| Port | 6380 (host side) → 6379 (inside container) |
| Database | 0 (default) |
| Password | None |

> **Note:** The host-side port is **6380** (not 6379). This is to avoid port conflicts with other services (such as hermes-redis). Within Docker Compose, inter-container communication uses port 6379.

## Usage

### WebSocket Channel Layer

Used as Django Channels' `RedisChannelLayer` for the following functions:

| Usage | Description |
|-------|-------------|
| WebSocket message routing | Real-time communication between client and server |
| Group messaging | Broadcasting to `session_{id}` groups |
| Channel management | Channel registration/deregistration on connect/disconnect |

### Configuration

```python
# backend/config/settings.py
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [
                (os.getenv("REDIS_HOST", "localhost"),
                 int(os.getenv("REDIS_PORT", "6380")))
            ],
        },
    },
}
```

## Data Persistence

Data stored in Redis is temporary and does not require persistence. Restarting the container has no impact on the application (active WebSocket connections will be disconnected but will recover upon reconnection).

## Monitoring Commands

```bash
# Connect to Redis and check status
docker compose exec redis redis-cli

# Check connection count
docker compose exec redis redis-cli info clients

# Check channel keys
docker compose exec redis redis-cli keys "asgi:*"

# Memory usage
docker compose exec redis redis-cli info memory
```
