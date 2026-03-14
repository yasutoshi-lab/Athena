# セッション API

## 概要

因果推論セッションの作成・取得・更新・削除を提供します。各セッションには推論結果（仮説、証拠、最終回答、知識グラフ）が紐づきます。

## エンドポイント一覧

| メソッド | URL | 説明 |
|----------|-----|------|
| GET | `/api/sessions/` | セッション一覧取得 |
| POST | `/api/sessions/` | セッション新規作成 |
| GET | `/api/sessions/{id}/` | セッション詳細取得 |
| PATCH | `/api/sessions/{id}/` | セッションタイトル更新 |
| DELETE | `/api/sessions/{id}/` | セッション削除 |
| GET | `/api/sessions/{id}/graph/` | グラフデータ取得 |

全エンドポイントで `Authorization: Bearer {access_token}` ヘッダーが必要です。

## API 詳細

### GET `/api/sessions/`

ログインユーザーの全セッションを取得します（作成日時の降順）。

**レスポンス (200):**
```json
[
  {
    "id": 18,
    "query": "なぜ日本のスタートアップ資金調達額がアメリカより少ないのか？",
    "title": "日本のスタートアップ資金",
    "selected_model": "sonnet",
    "status": "completed",
    "created_at": "2026-03-15T12:00:00+09:00"
  }
]
```

### POST `/api/sessions/`

新しいセッションを作成します。タイトルはクエリの先頭 100 文字が初期値として設定されます。

**リクエスト:**
```json
{
  "query": "なぜ日本のスタートアップ資金調達額がアメリカより少ないのか？"
}
```

**レスポンス (201):**
```json
{
  "id": 19,
  "query": "なぜ日本のスタートアップ資金調達額がアメリカより少ないのか？",
  "title": "なぜ日本のスタートアップ資金調達額がアメリカより少ないのか？",
  "complexity_score": null,
  "selected_model": "sonnet",
  "status": "pending",
  "hypotheses": [],
  "final_answer": "",
  "references": [],
  "created_at": "2026-03-15T12:00:00+09:00",
  "updated_at": "2026-03-15T12:00:00+09:00"
}
```

### GET `/api/sessions/{id}/`

セッションの詳細（仮説・証拠含む）を取得します。

**レスポンス (200):**
```json
{
  "id": 18,
  "query": "...",
  "title": "...",
  "complexity_score": 0.72,
  "selected_model": "sonnet",
  "status": "completed",
  "hypotheses": [
    {
      "id": 1,
      "order": 1,
      "text": "ベンチャーキャピタル市場の規模差...",
      "score": 0.85,
      "evidences": [
        {
          "id": 1,
          "text": "...",
          "source_url": "https://...",
          "source_title": "...",
          "stance": "support",
          "confidence": "high"
        }
      ]
    }
  ],
  "final_answer": "日本のスタートアップ資金調達額が...",
  "references": [
    {"title": "...", "url": "https://..."}
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

### PATCH `/api/sessions/{id}/`

セッションのタイトルを更新します。

**リクエスト:**
```json
{
  "title": "新しいタイトル"
}
```

### DELETE `/api/sessions/{id}/`

セッションと関連する全データ（仮説、証拠、グラフノード、グラフエッジ、トークン使用量）を CASCADE 削除します。

**レスポンス: 204 No Content**

### GET `/api/sessions/{id}/graph/`

セッションの知識グラフデータを取得します。

**レスポンス (200):**
```json
{
  "nodes": [
    {
      "id": 1,
      "node_id": "q0",
      "node_type": "question",
      "label": "なぜ...",
      "metadata": {"subject": "...", "predicate": "..."}
    },
    {
      "id": 2,
      "node_id": "h1",
      "node_type": "hypothesis",
      "label": "VC市場の規模差",
      "metadata": {"text": "...", "score": 0.85}
    }
  ],
  "edges": [
    {
      "id": 1,
      "source_node_id": "q0",
      "target_node_id": "h1",
      "edge_type": "causal"
    }
  ]
}
```

## セッションのステータス遷移

```
pending → running → completed
                  → error
```

| ステータス | 説明 |
|-----------|------|
| pending | 作成直後 |
| running | パイプライン実行中 |
| completed | 推論完了 |
| error | エラー発生 |
