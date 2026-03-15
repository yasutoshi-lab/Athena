<img src="./banner.svg" width="800" />

# Athena — 因果推論AIシステム

「なぜ◯◯が起きたのか」という因果的な問いに対し、AIが複数の仮説を自動生成・検証し、その思考プロセスをリアルタイムで**知識グラフ**として可視化するシステムです。

## 主な機能

- ユーザーの問いからクエリ複雑度を判定し、使用モデル（Sonnet / Opus）を自動選択
- 3〜5個の因果仮説を自動生成
- Brave Search API によるWeb検索で証拠・反証を収集
- 証拠をベクトル化し PostgreSQL（pgvector）に保存・重複排除
- 因果グラフを構築し、フロントエンドに WebSocket でリアルタイム配信
- 最も蓋然性の高い仮説を根拠付きで提示
- トークン使用量・コスト（USD）の追跡と可視化

## 技術スタック

| レイヤー | 技術 | 役割 |
|---|---|---|
| フロントエンド | Next.js 15 + TypeScript | UI全体・設定画面 |
| グラフ描画 | D3.js (force-directed) | 知識グラフのインタラクティブ表示 |
| 状態管理 | Zustand | 認証・セッション・グラフ状態 |
| バックエンド | Django + Django Channels | REST API・WebSocket・認証 |
| 認証 | Django Auth + SimpleJWT | JWT認証・複数ユーザー管理 |
| AIパイプライン | LangGraph | 7ノード推論パイプライン制御 |
| LLM | Claude Sonnet / Opus（自動切替） | 仮説生成・証拠評価・推論 |
| Web検索 | Brave Search API | リアルタイム証拠収集 |
| ベクトルDB | PostgreSQL + pgvector | 埋め込みによる類似検索・重複排除 |
| 監視 | LangSmith | エージェント動作のトレース・評価 |

## LangGraph パイプライン（7ノード構成）

```
START
  │
  ▼
[ complexity_judge ]      ← クエリ複雑度を判定 → モデル（Sonnet/Opus）を選択
  │
  ▼
[ question_parser ]       ← 問いを構造化（主語・述語・時間軸を抽出）
  │
  ▼
[ hypothesis_generator ]  ← Claude で3〜5個の因果仮説を生成
  │
  ▼
[ evidence_searcher ]     ← Brave API から証拠・反証を収集
  │
  ▼
[ graph_builder ]         ← ノード・エッジを生成・pgvectorに保存
  │
  ▼
[ hypothesis_ranker ]     ← スコアリング（証拠数・質・矛盾度を総合評価）
  │
  ▼
[ answer_synthesizer ]    ← 最終説明文を根拠付きで生成
  │
  ▼
END  ← token_usage を DB に記録
```

## 画面構成

| 画面 | 説明 |
|---|---|
| ログイン画面 | メール/パスワード認証。JWT取得後にメイン画面へ遷移 |
| メイン画面 | 左：チャットパネル / 右：D3.js 知識グラフの2ペイン |
| 設定画面 | 一般（プロフィール・モデル選択）/ API使用量 / 外観 の3タブ |

## ディレクトリ構成

```
athena/
├── backend/                # Django バックエンド（REST API・WebSocket・認証・推論パイプライン）
├── frontend/               # Next.js フロントエンド（UI・状態管理・グラフ描画）
├── doc/                    # ドキュメント（日本語版 jp/・英語版 en/）
├── moc/                    # 設計書・UIモックアップ
├── docker-compose.yml      # PostgreSQL + Redis コンテナ定義
├── pyproject.toml          # Python プロジェクト設定・依存パッケージ
├── init.sql                # DB 初期化スクリプト（pgvector 拡張）
├── icon.svg                # プロジェクトアイコン
├── banner.svg              # README バナー画像
└── .env                    # 環境変数（APIキー・DB接続情報）
```

## セットアップ

### 前提条件

- Python 3.12+
- Node.js 22+
- Docker / Docker Compose

### 1. 環境変数の設定

```bash
cp .env.example .env
# .env に各APIキーを設定
```

### 2. Docker コンテナの起動

```bash
docker compose up -d
```

PostgreSQL（pgvector拡張付き）と Redis が起動します。

### 3. バックエンドのセットアップ

```bash
# 仮想環境の有効化
source .venv/bin/activate

# 依存パッケージのインストール
python -m pip install -e .

# マイグレーションの実行
cd backend
python manage.py migrate

# 管理ユーザーの作成
python manage.py createsuperuser

# 開発サーバーの起動（Daphne / ASGI）
python manage.py runserver 8000
```

### 4. フロントエンドのセットアップ

```bash
cd frontend

# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
```

### 5. アクセス

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/

## API エンドポイント

### 認証

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/auth/login/` | POST | ユーザー名+パスワード → JWT発行 |
| `/api/auth/refresh/` | POST | リフレッシュトークンでアクセストークンを更新 |
| `/api/auth/logout/` | POST | リフレッシュトークンを無効化 |
| `/api/auth/me/` | GET | ログイン中ユーザーのプロフィール取得 |

### 推論セッション

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/sessions/` | GET / POST | セッション一覧取得 / 新規作成 |
| `/api/sessions/{id}/` | GET | セッション詳細（仮説・証拠含む） |
| `/api/sessions/{id}/graph/` | GET | グラフノード・エッジ一覧 |
| `/ws/sessions/{id}/` | WebSocket | 推論進捗のリアルタイムストリーミング |

### 設定・使用量

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/api/settings/` | GET / PUT | ユーザー設定の取得・更新 |
| `/api/usage/` | GET | トークン使用量・コスト集計 |

## データベース

| テーブル | 説明 |
|---|---|
| `auth_user` | ユーザーアカウント（Django標準） |
| `users_usersettings` | ユーザー設定（モデル選択・プロンプト・外観） |
| `causal_session` | 推論セッション |
| `causal_hypothesis` | 生成された仮説 |
| `causal_evidence` | 証拠・反証（pgvector埋め込み付き） |
| `causal_graphnode` | グラフノード（question/hypothesis/support/counter/concept） |
| `causal_graphedge` | グラフエッジ（causal/support/counter/rel） |
| `causal_tokenusage` | トークン使用量・コスト記録 |

## ドキュメント一覧

| 項目 | 機能 | 日本語版 | English |
|------|------|----------|---------|
| Frontend | ログイン画面 | [ログイン画面](doc/jp/frontend/01_login.md) | [Login Screen](doc/en/frontend/01_login.md) |
| Frontend | メイン画面 | [メイン画面](doc/jp/frontend/02_main.md) | [Main Screen](doc/en/frontend/02_main.md) |
| Frontend | 設定画面 | [設定画面](doc/jp/frontend/03_settings.md) | [Settings Screen](doc/en/frontend/03_settings.md) |
| Frontend | アカウント作成画面 | [アカウント作成画面](doc/jp/frontend/04_signup.md) | [Account Registration](doc/en/frontend/04_signup.md) |
| Backend | 認証 API | [認証 API](doc/jp/backend/01_auth.md) | [Authentication API](doc/en/backend/01_auth.md) |
| Backend | セッション API | [セッション API](doc/jp/backend/02_sessions.md) | [Sessions API](doc/en/backend/02_sessions.md) |
| Backend | WebSocket API | [WebSocket API](doc/jp/backend/03_websocket.md) | [WebSocket API](doc/en/backend/03_websocket.md) |
| Backend | 設定・使用量 API | [設定・使用量 API](doc/jp/backend/04_settings_usage.md) | [Settings & Usage API](doc/en/backend/04_settings_usage.md) |
| Database | PostgreSQL | [PostgreSQL](doc/jp/db/postgresql.md) | [PostgreSQL](doc/en/db/postgresql.md) |
| Database | Redis | [Redis](doc/jp/db/redis.md) | [Redis](doc/en/db/redis.md) |
| Docker | 運用ガイド | [Docker 運用ガイド](doc/jp/docker/docker.md) | [Docker Operations Guide](doc/en/docker/docker.md) |

## 参考ドキュメント

- [Anthropic Claude API](https://docs.anthropic.com/)
- [LangGraph](https://langchain-ai.github.io/langgraph/)
- [LangSmith](https://docs.smith.langchain.com/)
- [Brave Search API](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started)
- [D3.js](https://d3js.org/)
- [Django Channels](https://channels.readthedocs.io/)
