# Settings Screen

## Overview

This screen allows you to manage your user profile, LLM model settings, API usage, and appearance customization.

## Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ [A] Athena │ Inference Chat  Settings             │ Sonnet — Idle │
├────────────┬─────────────────────────────────────────────────────┤
│            │                                                     │
│  Settings  │  General                                            │
│            │  Profile and model settings                         │
│  ⊞ General │                                                     │
│  ◷ API     │  Profile                                            │
│    Usage   │  ┌───────────────────────────────────────────┐      │
│  ◑ Appear- │  │ Full Name     [________________]          │      │
│    ance    │  │ Display Name  [________________]          │      │
│            │  └───────────────────────────────────────────┘      │
│            │                                                     │
│            │  Language                                            │
│            │  ┌───────────────────────────────────────────┐      │
│            │  │ Display Lang. [English ▼]                 │      │
│            │  └───────────────────────────────────────────┘      │
│            │                                                     │
│            │  LLM Model                                          │
│            │  ┌───────────────────────────────────────────┐      │
│            │  │ Default Model   [Auto-detect (Recommended) ▼]    │
│            │  │ Complexity      [3]                       │      │
│            │  │ Threshold                                 │      │
│            │  └───────────────────────────────────────────┘      │
│            │                                                     │
│            │  API Keys                                           │
│            │  ┌───────────────────────────────────────────┐      │
│            │  │ Anthropic API Key  [••••••••]  Configured  │      │
│            │  │ Brave Search Key   [••••••••]  Not set     │      │
│            │  └───────────────────────────────────────────┘      │
│            │                                                     │
│            │  [Save Changes]                                     │
│            │                                                     │
│  → Logout  │                                                     │
└────────────┴─────────────────────────────────────────────────────┘
```

## Tabs

### General

| Item | Description |
|------|-------------|
| Full Name | Display name within the system |
| Display Name | Name used by Athena in chat responses |
| Display Language | Switch between Japanese / English (applied immediately) |
| Default Model | Auto-detect / Claude Sonnet / Claude Opus |
| Complexity Threshold | Entity count at which the system switches to Opus (default: 3) |
| System Prompt | Custom prompt shared across all sessions |
| Anthropic API Key | Authentication key for Claude API (system default used if not set) |
| Brave Search API Key | API key for web search (system default used if not set) |

#### About API Keys

- API keys are masked with `type="password"` in the input field
- After saving, GET responses do not include the key values (security measure)
- Instead, a "Configured" / "Not set (using default)" status is displayed
- Clearing a key and saving falls back to the system default key (configured in `.env`)

### API Usage

| Item | Description |
|------|-------------|
| Total Cost | Cumulative cost for the current month (USD) |
| Total Tokens | Input/output token counts |
| Session Count | Number of runs per model (Sonnet / Opus) |
| Cost by Model | Cost ratio bar for Sonnet / Opus |
| Session List | Token and cost details for the 20 most recent sessions |

### Appearance

| Item | Description |
|------|-------------|
| Color Mode | Dark / Light / System |
| Node Animation | Fade-in effect during inference ON/OFF |
| Grid Display | Background grid on the graph ON/OFF |
| Animation Speed | Slow / Normal / Fast |

## How to Use

1. Select a tab from the left menu
2. Modify the desired settings
3. Click the **"Save Changes" button** to save
4. Language changes take effect immediately (saving is still required)

## Logout

Click "Logout" at the bottom of the left menu to sign out and return to the login screen.
