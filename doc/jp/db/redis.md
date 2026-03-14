# Redis 設計

## 概要

Redis は Django Channels の Channel Layer として使用され、WebSocket 通信のメッセージブローカーの役割を担います。永続データの保存には使用していません。

## 接続情報

| 項目 | 値 |
|------|-----|
| ホスト | localhost（Docker: `redis`） |
| ポート | 6380（ホスト側） → 6379（コンテナ内） |
| データベース | 0（デフォルト） |
| パスワード | なし |

> **注意:** ホスト側のポートは **6380** です（6379 ではない）。これは他のサービス（hermes-redis 等）とのポート競合を避けるためです。Docker Compose 内ではコンテナ間通信に 6379 を使用します。

## 用途

### WebSocket Channel Layer

Django Channels の `RedisChannelLayer` として、以下の機能に使用されます:

| 用途 | 説明 |
|------|------|
| WebSocket メッセージルーティング | クライアントとサーバー間のリアルタイム通信 |
| グループメッセージング | `session_{id}` グループへのブロードキャスト |
| チャネル管理 | 接続/切断時のチャネル登録・解除 |

### 設定

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

## データの永続性

Redis に保存されるデータは一時的なもので、永続化は不要です。コンテナを再起動してもアプリケーションへの影響はありません（アクティブな WebSocket 接続は切断されますが、再接続で復旧します）。

## 監視コマンド

```bash
# Redis に接続して状態確認
docker compose exec redis redis-cli

# 接続数の確認
docker compose exec redis redis-cli info clients

# チャネルキーの確認
docker compose exec redis redis-cli keys "asgi:*"

# メモリ使用量
docker compose exec redis redis-cli info memory
```
