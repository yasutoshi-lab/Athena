# Docker 運用ガイド

## 概要

Athena は Docker Compose で 4 つのサービスを管理します。このガイドでは、初回セットアップからコード修正後のリビルドまでの手順を説明します。

## コンテナ構成

| サービス | コンテナ名 | ポート | 説明 |
|---|---|---|---|
| postgres | athena-postgres | 5432 | PostgreSQL 17 + pgvector |
| redis | athena-redis | 6380 → 6379 | Redis 7（WebSocket 通信用） |
| backend | athena-backend | 8000 | Django / Daphne ASGI サーバー |
| frontend | athena-frontend | 3000 | Next.js standalone サーバー |

## 前提条件

- Docker / Docker Compose がインストール済み
- プロジェクトルートに `.env` ファイルが存在すること

```bash
# .env に必要なキー
ANTHROPIC_API_KEY=sk-ant-...
BRAVE_API_KEY=BSA...
```

---

## 初回セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/yasutoshi-lab/Athena.git
cd Athena
```

### 2. `.env` ファイルの作成

```bash
cp .env.example .env  # テンプレートがある場合
# または手動で作成
cat > .env << 'EOF'
ANTHROPIC_API_KEY=your-api-key-here
BRAVE_API_KEY=your-brave-key-here
EOF
```

### 3. ビルドと起動

```bash
docker compose up -d --build
```

初回は Docker イメージのビルドに数分かかります。

### 4. 管理ユーザーの作成

```bash
docker compose exec backend python manage.py createsuperuser
```

### 5. アクセス

- **フロントエンド:** http://localhost:3000
- **バックエンド API:** http://localhost:8000/api/
- **Django 管理画面:** http://localhost:8000/admin/

---

## 基本操作

### 起動

```bash
# ビルド済みの場合（高速）
docker compose up -d

# ビルドも実行する場合
docker compose up -d --build
```

### 停止

```bash
docker compose down
```

### 停止 + データベース削除

```bash
docker compose down -v
```

> **注意:** `-v` オプションは PostgreSQL のデータボリュームも削除します。全データが失われます。

### 状態確認

```bash
docker compose ps
```

### ログ確認

```bash
# 全サービス
docker compose logs -f

# 特定のサービスのみ
docker compose logs -f backend
docker compose logs -f frontend

# 直近の行数を指定
docker compose logs --tail 50 backend
```

---

## コード修正後のリビルド

### フロントエンド（`frontend/` 配下）を修正した場合

```bash
docker compose up -d --build frontend
```

Dockerfile 内で `npm run build` が自動実行されるため、手動でビルドする必要はありません。

### バックエンド（`backend/` 配下）を修正した場合

```bash
docker compose up -d --build backend
```

起動時に `python manage.py migrate` が自動実行されるため、マイグレーションの適用も自動です。

### 両方修正した場合

```bash
docker compose up -d --build
```

### pip パッケージを追加・変更した場合

1. `backend/requirements.txt` を更新
2. リビルドを実行

```bash
docker compose up -d --build backend
```

### npm パッケージを追加・変更した場合

1. `frontend/package.json` を更新
2. リビルドを実行

```bash
docker compose up -d --build frontend
```

### キャッシュを無視して完全リビルド

Docker のビルドキャッシュが原因で変更が反映されない場合:

```bash
docker compose build --no-cache
docker compose up -d
```

---

## ローカル開発（Docker + ホスト混在）

データベースと Redis のみ Docker で起動し、バックエンドとフロントエンドはホスト側で開発する方法です。ホットリロードが利用でき、開発効率が向上します。

```bash
# DB と Redis だけ起動
docker compose up -d postgres redis

# バックエンド（別ターミナル）
cd backend
source ../.venv/bin/activate
python manage.py runserver 8000

# フロントエンド（別ターミナル）
cd frontend
npm run dev
```

この場合、フロントエンド・バックエンドのコード変更は即座に反映されます。

---

## マイグレーション操作

### マイグレーションの手動実行

```bash
docker compose exec backend python manage.py migrate
```

### マイグレーションファイルの作成

```bash
docker compose exec backend python manage.py makemigrations
```

### Django 管理コマンドの実行

```bash
# Django シェル
docker compose exec backend python manage.py shell

# スーパーユーザー作成
docker compose exec backend python manage.py createsuperuser

# テスト実行
docker compose exec backend python manage.py test tests -v2
```

---

## トラブルシューティング

### ポートが使用中

```bash
# 使用中のプロセスを確認
ss -tlnp | grep :3000
ss -tlnp | grep :8000

# プロセスを終了してから再起動
kill <PID>
docker compose up -d
```

### backend が起動しない（DB 接続エラー）

PostgreSQL の healthcheck が完了する前に backend が起動した可能性があります。

```bash
docker compose up -d --force-recreate backend
```

### frontend が起動しない（ホスト名エラー）

`docker-compose.yml` の frontend サービスに以下の環境変数が設定されていることを確認:

```yaml
environment:
  HOSTNAME: "0.0.0.0"
  PORT: "3000"
```

### データベースを完全にリセットしたい

```bash
docker compose down -v
docker compose up -d --build
docker compose exec backend python manage.py createsuperuser
```

### Docker イメージの容量が大きくなった

使用していないイメージを削除:

```bash
docker image prune -f
```
