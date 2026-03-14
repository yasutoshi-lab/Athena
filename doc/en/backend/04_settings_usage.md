# Settings & Usage API

## Overview

Provides retrieval and update of user settings, as well as API token usage statistics.

## Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/settings/` | Get user settings |
| PUT | `/api/settings/` | Update user settings |
| GET | `/api/usage/` | Get API usage statistics |

All endpoints require the `Authorization: Bearer {access_token}` header.

## User Settings API

### GET `/api/settings/`

Retrieve the current user settings. If settings have not been created yet, they are automatically generated with default values.

**Response (200):**
```json
{
  "display_name": "",
  "nickname": "",
  "default_model": "auto",
  "complexity_threshold": 3,
  "system_prompt": "",
  "language": "ja",
  "color_mode": "dark",
  "graph_animation": true,
  "graph_grid": true,
  "animation_speed": "normal"
}
```

### PUT `/api/settings/`

Update user settings (partial updates supported).

**Request (only include fields you want to change):**
```json
{
  "language": "en",
  "default_model": "opus",
  "color_mode": "light"
}
```

### Settings Fields

| Field | Type | Choices | Default | Description |
|-------|------|---------|---------|-------------|
| display_name | string | — | "" | Display name |
| nickname | string | — | "" | Name Athena uses to address you |
| default_model | string | auto, sonnet, opus | "auto" | Default LLM model |
| complexity_threshold | int | 1-10 | 3 | Entity count threshold for switching to Opus |
| system_prompt | string | — | "" | Custom system prompt |
| language | string | ja, en | "ja" | Display language |
| color_mode | string | dark, light, system | "dark" | Color mode |
| graph_animation | bool | — | true | Node animation |
| graph_grid | bool | — | true | Grid display |
| animation_speed | string | slow, normal, fast | "normal" | Animation speed |

## Usage API

### GET `/api/usage/`

Retrieve API token usage and cost statistics for the current month.

**Response (200):**
```json
{
  "total_cost": 2.50,
  "total_tokens": {
    "input": 125000,
    "output": 75000
  },
  "session_count": 5,
  "model_breakdown": {
    "sonnet": {
      "cost": 1.50,
      "sessions": 3
    },
    "opus": {
      "cost": 1.00,
      "sessions": 2
    }
  },
  "sessions": [
    {
      "session__id": 18,
      "session__title": "Japan startup funding",
      "model": "sonnet",
      "tokens": 15000,
      "cost": 0.30
    }
  ]
}
```

## Cost Calculation

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Claude Sonnet | $3.00 | $15.00 |
| Claude Opus | $15.00 | $75.00 |

Token usage is automatically recorded during each pipeline node execution.
