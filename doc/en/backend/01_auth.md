# Authentication API

## Overview

Provides user authentication using JWT (JSON Web Token). Built on SimpleJWT with token rotation and blacklist support.

## Endpoints

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/auth/login/` | Not required | Login |
| POST | `/api/auth/refresh/` | Not required | Refresh token |
| POST | `/api/auth/logout/` | Required | Logout |
| GET | `/api/auth/me/` | Required | Get user info |

## API Details

### POST `/api/auth/login/`

Log in with a username and password to obtain JWT tokens.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "access": "eyJhbGci...",
  "refresh": "eyJhbGci..."
}
```

### POST `/api/auth/refresh/`

Refresh an expired access token.

**Request:**
```json
{
  "refresh": "eyJhbGci..."
}
```

**Response (200):**
```json
{
  "access": "eyJhbGci...",
  "refresh": "eyJhbGci..."
}
```

### POST `/api/auth/logout/`

Log out by adding the refresh token to the blacklist.

**Header:** `Authorization: Bearer {access_token}`

**Request:**
```json
{
  "refresh": "eyJhbGci..."
}
```

**Response (200):**
```json
{
  "detail": "Logged out successfully"
}
```

### GET `/api/auth/me/`

Retrieve the currently logged-in user's information and settings. If UserSettings has not been created yet, it is automatically generated with defaults.

**Header:** `Authorization: Bearer {access_token}`

**Response (200):**
```json
{
  "id": 1,
  "username": "admin",
  "email": "",
  "settings": {
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
}
```

## Token Expiration

| Token | Expiration |
|-------|------------|
| Access token | 1 hour |
| Refresh token | 7 days |

## Authentication Flow

```
Login -> Obtain access + refresh tokens
    |
API requests: Authorization: Bearer {access_token}
    |
401 error (token expired)
    |
Refresh with refresh token -> Obtain new access + refresh tokens
    |
Logout -> Add refresh token to blacklist
```

The frontend's `lib/api.ts` automatically detects 401 responses and performs token refresh.
