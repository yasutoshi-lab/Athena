# Scoring System

Athena generates multiple hypotheses for a user's causal question, then quantifies the confidence of each hypothesis as a **score** (0.0–1.0) based on evidence and counter-evidence collected via web search. This document explains the scoring concepts, flow, and calculation methods.

---

## 1. Overall Scoring Flow

```
User's Query
  │
  ▼
┌─────────────────────┐
│  complexity_judge    │ → complexity_score (0.0-1.0)
│                      │   Quantifies query complexity; determines model selection
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│  hypothesis_generator│ → initial_score (0.0-1.0) × number of hypotheses
│                      │   Assigns tentative scores based on prior knowledge
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│  evidence_searcher   │ → stance (support / counter) + confidence (high / medium / low)
│                      │   Classifies evidence collected via Brave Search
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│  graph_builder       │ → Embeds scores and confidence into graph node metadata
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│  hypothesis_ranker   │ → score (0.0-1.0) final score
│                      │   Re-scores hypotheses using comprehensive evidence evaluation
└─────────────────────┘
  │
  ▼
┌─────────────────────┐
│  answer_synthesizer  │ → Generates final answer reflecting scores
│                      │   Cites evidence with reference numbers [1][2]...
└─────────────────────┘
```

---

## 2. Score Concepts

### 2.1 complexity_score (Query Complexity)

| Item | Details |
|------|---------|
| Computed by | `complexity_judge` |
| Range | 0.0–1.0 |
| Meaning | Normalized complexity based on entity count and causal depth |

Claude analyzes the query and returns three values:

| Field | Description |
|-------|-------------|
| `entity_count` | Number of entities extracted from the query |
| `causal_depth` | Depth of causal relationships (1–5 scale) |
| `complexity_score` | Overall complexity normalized to 0.0–1.0 |

**Model selection logic:**

```
entity_count > complexity_threshold (default: 3)
  OR query length > 100 characters
    → Claude Opus (higher accuracy)
    → Otherwise Claude Sonnet (faster)
```

Users can override auto-selection by setting `UserSettings.default_model` to `"sonnet"` or `"opus"` directly.

### 2.2 initial_score (Initial Confidence)

| Item | Details |
|------|---------|
| Computed by | `hypothesis_generator` |
| Range | 0.0–1.0 |
| Meaning | Tentative confidence based on Claude's prior knowledge |

Assigned to each hypothesis at generation time, before any web search is performed. This is an estimate of plausibility based on Claude's training data and may change significantly after evidence collection.

### 2.3 Evidence stance and confidence

| Item | Details |
|------|---------|
| Computed by | `evidence_searcher` |
| stance | `"support"` / `"counter"` |
| confidence | `"high"` / `"medium"` / `"low"` |

Claude analyzes search results from the Brave Search API and assigns each piece of evidence:

- **stance**: Binary classification of whether the evidence supports or contradicts the hypothesis
- **confidence**: Three-level reliability assessment based on source credibility and content specificity

For each hypothesis, `support_count` (supporting evidence) and `counter_count` (counter-evidence) are aggregated and used in subsequent ranking.

### 2.4 score (Final Confidence Score)

| Item | Details |
|------|---------|
| Computed by | `hypothesis_ranker` |
| Range | 0.0–1.0 |
| Meaning | Final hypothesis confidence after comprehensive evidence evaluation |
| Stored in | `Hypothesis.score` (sorted descending) |

All hypotheses are compared cross-sectionally and re-scored using the criteria below.

---

## 3. Final Score Calculation

The `hypothesis_ranker` sends all hypotheses and their evidence to Claude in a single request, evaluating each hypothesis on a 0.0–1.0 scale using **four criteria**:

| Criterion | Description |
|-----------|-------------|
| **Support evidence count and quality** | Number of `"support"` evidence items and their confidence levels |
| **Counter-evidence count and quality** | Number of `"counter"` evidence items and their confidence levels |
| **Contradiction degree** | Degree of conflict between supporting and contradicting evidence for the same hypothesis |
| **Causal mechanism validity** | Whether the proposed causal relationship is logically sound |

### Ranking Input

```
Hypothesis 1: [hypothesis text]
  Supporting evidence: X items / Counter-evidence: Y items
  Evidence list:
    - [support] evidence text (confidence: high)
    - [counter] evidence text (confidence: medium)
    ...

Hypothesis 2: [hypothesis text]
  ...
```

### Ranking Output

The following is produced for each hypothesis:

| Field | Type | Description |
|-------|------|-------------|
| `index` | int | Hypothesis index (0-based) |
| `score` | float | Final confidence score (0.0–1.0) |
| `support_count` | int | Number of supporting evidence items |
| `counter_count` | int | Number of counter-evidence items |
| `reasoning` | string | Explanation for the assigned score |

---

## 4. Where Scores Are Used

### Database Persistence

| Model | Field | Content |
|-------|-------|---------|
| `Session` | `complexity_score` | Query complexity |
| `Hypothesis` | `score` | Final confidence score (sorted descending) |
| `Evidence` | `stance` | support / counter |
| `Evidence` | `confidence` | high / medium / low |

### Knowledge Graph

- **Hypothesis nodes**: Store `score` in metadata, used for visual emphasis on the frontend
- **Evidence nodes**: `node_type` is set to `"support"` or `"counter"`, with `confidence` in metadata
- **Edges**: Hypothesis→evidence edges have `edge_type` of `"support"` or `"counter"`

### Final Answer Citations

The `answer_synthesizer` feeds all hypotheses (with final scores) and the top 15 evidence items to Claude, generating an answer that cites sources using reference numbers `[1]` through `[N]`. References are deduplicated by URL to ensure stable numbering.

---

## 5. Score Flow Summary

```
[hypothesis_generator]
    initial_score: 0.0-1.0 (prior knowledge based)
        │
        ▼
[evidence_searcher]
    Assigns stance + confidence to each evidence item
    Aggregates support_count / counter_count
        │
        ▼
[hypothesis_ranker]
    Evaluates on 4 criteria → score: 0.0-1.0 (final score)
        │
        ▼
[answer_synthesizer]
    References final scores to compose the answer
        │
        ▼
    DB: Hypothesis.score, Evidence.stance/confidence
    Graph: Reflected in node/edge metadata
```
