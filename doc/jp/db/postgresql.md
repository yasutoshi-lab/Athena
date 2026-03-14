# PostgreSQL テーブル設計

## 概要

PostgreSQL 17 + pgvector 拡張を使用し、セッション・仮説・証拠・知識グラフ・ユーザー設定・トークン使用量を管理します。

## 接続情報

| 項目 | 値 |
|------|-----|
| ホスト | localhost（Docker: `postgres`） |
| ポート | 5432 |
| データベース | causal-inference |
| ユーザー | ciuser |
| パスワード | cipass |

## ER 図

```
User (auth_user)
 ├── 1:1 ── UserSettings (users_usersettings)
 └── 1:N ── Session (causal_session)
              ├── 1:N ── Hypothesis (causal_hypothesis)
              │            └── 1:N ── Evidence (causal_evidence)
              ├── 1:N ── GraphNode (causal_graphnode)
              │            ├── 1:N ── GraphEdge.source (causal_graphedge)
              │            └── 1:N ── GraphEdge.target (causal_graphedge)
              └── 1:N ── TokenUsage (causal_tokenusage)
```

## テーブル定義

### causal_session

セッション（1 回の因果推論）を管理します。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | BIGSERIAL | PK | セッション ID |
| user_id | BIGINT | FK → auth_user, NOT NULL | ユーザー |
| query | TEXT | NOT NULL | 入力クエリ |
| title | VARCHAR(500) | | セッションタイトル（自動生成） |
| complexity_score | FLOAT | NULL | 複雑度スコア |
| selected_model | VARCHAR(20) | DEFAULT 'sonnet' | 使用モデル（sonnet/opus） |
| status | VARCHAR(20) | DEFAULT 'pending' | ステータス（pending/running/completed/error） |
| final_answer | TEXT | | 最終回答テキスト |
| references | JSONB | DEFAULT '[]' | 参照元リスト [{title, url}] |
| created_at | TIMESTAMPTZ | auto | 作成日時 |
| updated_at | TIMESTAMPTZ | auto | 更新日時 |

**インデックス:** created_at DESC（デフォルト並び順）

### causal_hypothesis

因果仮説を管理します。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | BIGSERIAL | PK | |
| session_id | BIGINT | FK → causal_session, CASCADE | セッション |
| order | INT | NOT NULL | 表示順序 |
| text | TEXT | NOT NULL | 仮説テキスト |
| score | FLOAT | DEFAULT 0.0 | 信頼度スコア（0.0〜1.0） |
| created_at | TIMESTAMPTZ | auto | |

**並び順:** score DESC

### causal_evidence

仮説を支持/反証する証拠を管理します。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | BIGSERIAL | PK | |
| hypothesis_id | BIGINT | FK → causal_hypothesis, CASCADE | 仮説 |
| text | TEXT | NOT NULL | 証拠テキスト |
| source_url | TEXT | | 出典 URL |
| source_title | VARCHAR(500) | | 出典タイトル |
| stance | VARCHAR(10) | NOT NULL | support / counter |
| confidence | VARCHAR(10) | DEFAULT 'medium' | high / medium / low |
| embedding | VECTOR(1024) | NULL | pgvector 埋め込み |
| created_at | TIMESTAMPTZ | auto | |

### causal_graphnode

知識グラフのノードを管理します。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | BIGSERIAL | PK | |
| session_id | BIGINT | FK → causal_session, CASCADE | セッション |
| node_id | VARCHAR(50) | NOT NULL | ノード識別子（q0, h1, s1 等） |
| node_type | VARCHAR(20) | NOT NULL | question/hypothesis/support/counter/concept |
| label | TEXT | NOT NULL | 表示ラベル |
| metadata | JSONB | DEFAULT '{}' | メタデータ |

**一意制約:** (session_id, node_id)

### causal_graphedge

知識グラフのエッジを管理します。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | BIGSERIAL | PK | |
| session_id | BIGINT | FK → causal_session, CASCADE | セッション |
| source_id | BIGINT | FK → causal_graphnode, CASCADE | 始点ノード |
| target_id | BIGINT | FK → causal_graphnode, CASCADE | 終点ノード |
| edge_type | VARCHAR(20) | NOT NULL | causal/support/counter/rel |

### causal_tokenusage

API トークン使用量を記録します。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | BIGSERIAL | PK | |
| session_id | BIGINT | FK → causal_session, CASCADE | セッション |
| model | VARCHAR(30) | NOT NULL | モデル名 |
| input_tokens | INT | NOT NULL | 入力トークン数 |
| output_tokens | INT | NOT NULL | 出力トークン数 |
| cost_usd | DECIMAL(10,6) | NOT NULL | コスト（USD） |
| node_name | VARCHAR(50) | NOT NULL | パイプラインノード名 |
| created_at | TIMESTAMPTZ | auto | |

### users_usersettings

ユーザー設定を管理します。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | BIGSERIAL | PK | |
| user_id | BIGINT | FK → auth_user, UNIQUE, CASCADE | ユーザー（1:1） |
| display_name | VARCHAR(100) | | 表示名 |
| nickname | VARCHAR(100) | | 呼び名 |
| default_model | VARCHAR(20) | DEFAULT 'auto' | auto/sonnet/opus |
| complexity_threshold | INT | DEFAULT 3 | 複雑度しきい値 |
| system_prompt | TEXT | | カスタムプロンプト |
| language | VARCHAR(5) | DEFAULT 'ja' | ja/en |
| color_mode | VARCHAR(10) | DEFAULT 'dark' | dark/light/system |
| graph_animation | BOOLEAN | DEFAULT true | |
| graph_grid | BOOLEAN | DEFAULT true | |
| animation_speed | VARCHAR(10) | DEFAULT 'normal' | slow/normal/fast |

## CASCADE 削除の関係

セッションを削除すると、以下が連鎖的に削除されます:

```
Session 削除
  → Hypothesis 削除
    → Evidence 削除
  → GraphNode 削除
    → GraphEdge 削除
  → TokenUsage 削除
```

## pgvector 拡張

初回起動時に `init.sql` で `CREATE EXTENSION IF NOT EXISTS vector;` が実行され、VECTOR 型が利用可能になります。Evidence テーブルの `embedding` カラム（1024 次元）で使用されます。
