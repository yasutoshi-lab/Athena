# 認証 API

## 概要

JWT（JSON Web Token）方式のユーザー認証を提供します。SimpleJWT を使用し、トークンローテーションとブラックリスト機能を備えています。

## エンドポイント一覧

| メソッド | URL | 認証 | 説明 |
|----------|-----|------|------|
| POST | `/api/auth/login/` | 不要 | ログイン |
| POST | `/api/auth/refresh/` | 不要 | トークン更新 |
| POST | `/api/auth/logout/` | 必要 | ログアウト |
| GET | `/api/auth/me/` | 必要 | ユーザー情報取得 |

## API 詳細

### POST `/api/auth/login/`

ユーザー名とパスワードでログインし、JWT トークンを取得します。

**リクエスト:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**レスポンス (200):**
```json
{
  "access": "eyJhbGci...",
  "refresh": "eyJhbGci..."
}
```

### POST `/api/auth/refresh/`

期限切れのアクセストークンを更新します。

**リクエスト:**
```json
{
  "refresh": "eyJhbGci..."
}
```

**レスポンス (200):**
```json
{
  "access": "eyJhbGci...",
  "refresh": "eyJhbGci..."
}
```

### POST `/api/auth/logout/`

リフレッシュトークンをブラックリストに追加してログアウトします。

**ヘッダー:** `Authorization: Bearer {access_token}`

**リクエスト:**
```json
{
  "refresh": "eyJhbGci..."
}
```

**レスポンス (200):**
```json
{
  "detail": "ログアウトしました"
}
```

### GET `/api/auth/me/`

ログイン中のユーザー情報と設定を取得します。UserSettings が未作成の場合は自動生成されます。

**ヘッダー:** `Authorization: Bearer {access_token}`

**レスポンス (200):**
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

## トークンの有効期限

| トークン | 有効期限 |
|----------|----------|
| アクセストークン | 1 時間 |
| リフレッシュトークン | 7 日間 |

## 認証フロー

```
ログイン → access + refresh トークン取得
    ↓
API リクエスト時: Authorization: Bearer {access_token}
    ↓
401 エラー（期限切れ）
    ↓
refresh トークンで更新 → 新しい access + refresh 取得
    ↓
ログアウト → refresh トークンをブラックリスト登録
```

フロントエンドの `lib/api.ts` では、401 レスポンスを自動検知してトークン更新を行います。
