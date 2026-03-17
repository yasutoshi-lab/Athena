# スコアリングシステム

Athena では、ユーザーの因果的な問いに対して複数の仮説を生成し、Web 検索で収集した証拠・反証をもとに各仮説の信頼度を**スコア**（0.0〜1.0）として定量化します。本ドキュメントでは、スコアに関わる概念・フロー・算出方法を解説します。

---

## 1. スコアの全体フロー

```
ユーザーの問い
  │
  ▼
┌─────────────────────┐
│  complexity_judge    │ → complexity_score (0.0-1.0)
│                      │   クエリの複雑度を数値化し、使用モデルを決定
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│  hypothesis_generator│ → initial_score (0.0-1.0) × 仮説数
│                      │   各仮説に事前知識ベースの暫定スコアを付与
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│  evidence_searcher   │ → stance (support / counter) + confidence (high / medium / low)
│                      │   Brave Search で収集した証拠を分類・信頼度付け
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│  graph_builder       │ → グラフノードのメタデータにスコア・信頼度を埋め込み
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│  hypothesis_ranker   │ → score (0.0-1.0) 最終スコア
│                      │   証拠を総合評価して仮説を再スコアリング
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│  answer_synthesizer  │ → 最終スコアを反映した回答を生成
│                      │   参考文献番号 [1][2]... で証拠を引用
└─────────────────────┘
```

---

## 2. 各スコアの概念

### 2.1 complexity_score（クエリ複雑度）

| 項目 | 内容 |
|------|------|
| 算出ノード | `complexity_judge` |
| 値域 | 0.0〜1.0 |
| 意味 | クエリに含まれるエンティティ数・因果の深さをもとに算出される正規化複雑度 |

Claude がクエリを分析し、以下の 3 値を返します。

| フィールド | 説明 |
|-----------|------|
| `entity_count` | クエリから抽出されたエンティティの数 |
| `causal_depth` | 因果関係の深さ（1〜5 段階） |
| `complexity_score` | 0.0〜1.0 に正規化された総合複雑度 |

**モデル選択ロジック:**

```
entity_count > complexity_threshold（デフォルト: 3）
  OR クエリ文字数 > 100
    → Claude Opus（高精度モデル）
    → それ以外は Claude Sonnet（高速モデル）
```

ユーザー設定（`UserSettings.default_model`）で `"sonnet"` / `"opus"` を直接指定すると、自動選択を上書きできます。

### 2.2 initial_score（初期信頼度）

| 項目 | 内容 |
|------|------|
| 算出ノード | `hypothesis_generator` |
| 値域 | 0.0〜1.0 |
| 意味 | Claude の事前知識に基づく暫定的な信頼度 |

仮説生成時に、Web 検索を行う前の段階で各仮説に付与されます。これは Claude が持つ学習データに基づく「もっともらしさ」の推定値であり、後続の証拠収集によって大きく変動する可能性があります。

### 2.3 evidence の stance と confidence（証拠の分類と信頼度）

| 項目 | 内容 |
|------|------|
| 算出ノード | `evidence_searcher` |
| stance | `"support"`（支持）/ `"counter"`（反証） |
| confidence | `"high"` / `"medium"` / `"low"` |

Brave Search API で取得した検索結果を Claude が分析し、各証拠に以下を付与します。

- **stance**: その証拠が仮説を支持するか、反証するかの二値分類
- **confidence**: 情報源の信頼性・内容の具体性に基づく信頼度の三段階評価

各仮説について `support_count`（支持証拠数）と `counter_count`（反証数）が集計され、後続のランキングに使用されます。

### 2.4 score（最終信頼度スコア）

| 項目 | 内容 |
|------|------|
| 算出ノード | `hypothesis_ranker` |
| 値域 | 0.0〜1.0 |
| 意味 | 証拠を総合的に評価した最終的な仮説の信頼度 |
| 保存先 | `Hypothesis.score`（降順ソート） |

全仮説を横断的に比較し、以下の評価基準で再スコアリングされます。

---

## 3. 最終スコアの算出方法

`hypothesis_ranker` は全仮説とその証拠を Claude に一括入力し、以下の **4 つの評価基準** で各仮説を 0.0〜1.0 で再評価します。

| 評価基準 | 説明 |
|---------|------|
| **支持証拠の数と質** | stance が `"support"` の証拠の件数と、その confidence レベル |
| **反証の数と質** | stance が `"counter"` の証拠の件数と、その confidence レベル |
| **証拠間の矛盾度** | 同一仮説に対する支持・反証の対立の度合い |
| **因果メカニズムの妥当性** | 提示された因果関係が論理的に成立するかの評価 |

### ランキング入力データ

```
仮説1: [仮説テキスト]
  支持証拠: X件 / 反証: Y件
  証拠一覧:
    - [support] 証拠テキスト（confidence: high）
    - [counter] 証拠テキスト（confidence: medium）
    ...

仮説2: [仮説テキスト]
  ...
```

### ランキング出力

各仮説に対して以下が出力されます。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `index` | int | 仮説のインデックス（0始まり） |
| `score` | float | 0.0〜1.0 の最終信頼度スコア |
| `support_count` | int | 支持証拠の件数 |
| `counter_count` | int | 反証の件数 |
| `reasoning` | string | スコアの根拠説明 |

---

## 4. スコアの利用先

### データベースへの保存

| モデル | フィールド | 内容 |
|--------|-----------|------|
| `Session` | `complexity_score` | クエリ複雑度 |
| `Hypothesis` | `score` | 最終信頼度スコア（降順でソート） |
| `Evidence` | `stance` | support / counter |
| `Evidence` | `confidence` | high / medium / low |

### 知識グラフへの反映

- **仮説ノード**: メタデータに `score` を格納し、フロントエンドでノードの視覚的な強調に使用
- **証拠ノード**: `node_type` が `"support"` または `"counter"` として表現され、`confidence` をメタデータに格納
- **エッジ**: 仮説→証拠のエッジに `edge_type` として `"support"` / `"counter"` を設定

### 最終回答での引用

`answer_synthesizer` は最終スコアを含む全仮説と上位 15 件の証拠を Claude に入力し、参考文献番号 `[1]`〜`[N]` で引用した回答文を生成します。参考文献は URL による重複排除が行われ、安定した番号付けが保証されます。

---

## 5. スコアの流れまとめ

```
[hypothesis_generator]
    initial_score: 0.0-1.0（事前知識ベース）
        │
        ▼
[evidence_searcher]
    各証拠に stance + confidence を付与
    support_count / counter_count を集計
        │
        ▼
[hypothesis_ranker]
    4基準で総合評価 → score: 0.0-1.0（最終スコア）
        │
        ▼
[answer_synthesizer]
    最終スコアを参照して回答を構成
        │
        ▼
    DB保存: Hypothesis.score, Evidence.stance/confidence
    グラフ: ノード・エッジのメタデータに反映
```
