# WebSocket API（リアルタイム推論）

## 概要

推論パイプラインの実行とフォローアップ応答をリアルタイムで行う WebSocket インターフェースです。7 ノードのパイプラインが順次実行され、各段階の結果がイベントとして配信されます。

## 接続

```
ws://localhost:8000/ws/sessions/{session_id}/?token={jwt_access_token}
```

- `session_id`: REST API で作成したセッションの ID
- `token`: JWT アクセストークン（クエリパラメータで渡す）

## クライアント → サーバー（送信メッセージ）

### `start_inference` — 推論開始

```json
{
  "type": "start_inference",
  "query": "なぜ日本のスタートアップ資金調達額がアメリカより少ないのか？"
}
```

7 ノードパイプラインが起動し、結果がイベントとして順次配信されます。

### `follow_up` — フォローアップ質問

```json
{
  "type": "follow_up",
  "query": "仮説1についてもっと詳しく教えてください"
}
```

パイプラインは再実行されず、既存の推論結果をコンテキストとして Claude が直接回答します。

### `stop_inference` — 推論停止

```json
{
  "type": "stop_inference"
}
```

## サーバー → クライアント（受信イベント）

### パイプライン制御イベント

| イベント | 説明 |
|---------|------|
| `session_started` | パイプライン開始 |
| `node_started` | ノード処理開始（icon, label 付き） |
| `node_completed` | ノード処理完了（progress 付き） |
| `session_completed` | 全処理完了 |
| `session_stopped` | ユーザーによる停止 |
| `error` | エラー発生 |

### 推論結果イベント

| イベント | タイミング | データ |
|---------|-----------|--------|
| `model_selected` | complexity_judge 完了後 | model, complexity_score, entity_count, reasoning |
| `question_parsed` | question_parser 完了後 | parsed_question (subject, predicate, scope, time_frame, entities) |
| `hypotheses_generated` | hypothesis_generator 完了後 | hypotheses (text, score, short_label) |
| `search_started` | 検索開始時 | query |
| `search_results_found` | 検索結果取得時 | results (title, url) |
| `evidence_analyzing` | 証拠分析開始 | hypothesis_index, source_count |
| `evidence_analyzed` | 証拠分析完了 | hypothesis_index, support_count, counter_count |
| `evidence_collected` | 全証拠収集完了 | evidences |
| `graph_update` | グラフ更新時 | nodes, edges |
| `hypotheses_ranked` | 仮説ランキング完了 | hypotheses (score 更新済み) |
| `final_answer` | 最終回答生成 | answer, references |
| `title_generated` | タイトル自動生成完了 | session_id, title |

### フォローアップイベント

| イベント | 説明 |
|---------|------|
| `follow_up_started` | フォローアップ処理開始 |
| `follow_up_response` | 回答テキスト（answer） |

## パイプラインの 7 ノード

```
complexity_judge → question_parser → hypothesis_generator
    → evidence_searcher → graph_builder → hypothesis_ranker
    → answer_synthesizer
```

| ノード | 進捗 | 説明 |
|--------|------|------|
| complexity_judge | 8% | クエリの複雑度を判定し、使用モデルを選択 |
| question_parser | 20% | 問いを構造化（主語・述語・スコープ等） |
| hypothesis_generator | 35% | 因果仮説を生成 |
| evidence_searcher | 55% | Web 検索で証拠を収集・分析 |
| graph_builder | 70% | 知識グラフを構築（概念ノードを追加） |
| hypothesis_ranker | 85% | 証拠に基づいて仮説をスコアリング |
| answer_synthesizer | 96% | 参照元付きの最終回答を生成 |

## エラーハンドリング

API クレジット残高不足などのエラーは、ユーザーフレンドリーなメッセージに変換されてトースト通知で表示されます。

```json
{
  "type": "error",
  "message": "AnthropicのAPIクレジット残高が不足しています。コンソールでクレジットを追加してください。"
}
```
