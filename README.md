# Athena

このプロジェクトでは、"なぜ◯◯が起きたのか"という問を、下記のようなステップで検証する因果推論システムです

- 複数の因果仮説を自動生成
- 各仮説を支持する証拠・反証をWeb検索, データ分析
- 因果グラフを構築して可視化
- 最も蓋然性の高い説明を根拠付きで提示

## フレームワーク

バックエンド: Django
フロントエンド: Next.js
データベース: PostgreSQL
サンドボックス: DockerSnadbox
ウェブ検索ツール: BraveSearchAPI
エージェントSDK: Claude-Agent-SDK

## セットアップ

```
# 仮想環境作成
uv venv

# ライブラリのインストール
uv sync

# .envの作成
copy .env.example .env

# 依存環境の起動
docker compose up -d
```


## 参考ドキュメント

[Claude-Agent-SDK-Python](https://github.com/anthropics/claude-agent-sdk-python?tab=readme-ov-file)
[Claude API Docs](https://platform.claude.com/docs/ja/home)  
[LangChain Docs Quickstart](https://docs.langchain.com/oss/python/langchain/quickstart)
[LangGraph Overview](https://docs.langchain.com/oss/python/langgraph/overview)
[LangSmith Docs](https://docs.langchain.com/langsmith/home)
[Brave Search API](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started)
