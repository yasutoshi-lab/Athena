# 設定・使用量 API

## 概要

ユーザー設定の取得・更新と、API トークン使用量の統計情報を提供します。

## エンドポイント一覧

| メソッド | URL | 説明 |
|----------|-----|------|
| GET | `/api/settings/` | ユーザー設定取得 |
| PUT | `/api/settings/` | ユーザー設定更新 |
| GET | `/api/usage/` | API 使用量統計 |

全エンドポイントで `Authorization: Bearer {access_token}` ヘッダーが必要です。

## ユーザー設定 API

### GET `/api/settings/`

現在のユーザー設定を取得します。未作成の場合はデフォルト値で自動生成されます。

**レスポンス (200):**
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

ユーザー設定を更新します（部分更新対応）。

**リクエスト（変更したいフィールドのみ）:**
```json
{
  "language": "en",
  "default_model": "opus",
  "color_mode": "light"
}
```

### 設定フィールド一覧

| フィールド | 型 | 選択肢 | デフォルト | 説明 |
|-----------|------|--------|-----------|------|
| display_name | string | — | "" | 表示名 |
| nickname | string | — | "" | Athena が呼ぶ名前 |
| default_model | string | auto, sonnet, opus | "auto" | デフォルト LLM モデル |
| complexity_threshold | int | 1〜10 | 3 | Opus 切替エンティティ数 |
| system_prompt | string | — | "" | カスタムシステムプロンプト |
| language | string | ja, en | "ja" | 表示言語 |
| color_mode | string | dark, light, system | "dark" | カラーモード |
| graph_animation | bool | — | true | ノードアニメーション |
| graph_grid | bool | — | true | グリッド表示 |
| animation_speed | string | slow, normal, fast | "normal" | アニメーション速度 |

## 使用量 API

### GET `/api/usage/`

今月の API トークン使用量とコスト統計を取得します。

**レスポンス (200):**
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
      "session__title": "日本のスタートアップ資金",
      "model": "sonnet",
      "tokens": 15000,
      "cost": 0.30
    }
  ]
}
```

## コスト計算

| モデル | 入力 (1M トークン) | 出力 (1M トークン) |
|--------|-------------------|-------------------|
| Claude Sonnet | $3.00 | $15.00 |
| Claude Opus | $15.00 | $75.00 |

トークン使用量はパイプラインの各ノード実行時に自動記録されます。
