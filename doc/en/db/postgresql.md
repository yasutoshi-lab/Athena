# PostgreSQL Table Design

## Overview

Uses PostgreSQL 17 with the pgvector extension to manage sessions, hypotheses, evidence, knowledge graphs, user settings, and token usage.

## Connection Details

| Item | Value |
|------|-------|
| Host | localhost (Docker: `postgres`) |
| Port | 5432 |
| Database | causal-inference |
| User | ciuser |
| Password | cipass |

## ER Diagram

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

## Table Definitions

### causal_session

Manages sessions (one per causal inference run).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PK | Session ID |
| user_id | BIGINT | FK → auth_user, NOT NULL | User |
| query | TEXT | NOT NULL | Input query |
| title | VARCHAR(500) | | Session title (auto-generated) |
| complexity_score | FLOAT | NULL | Complexity score |
| selected_model | VARCHAR(20) | DEFAULT 'sonnet' | Model used (sonnet/opus) |
| status | VARCHAR(20) | DEFAULT 'pending' | Status (pending/running/completed/error) |
| final_answer | TEXT | | Final answer text |
| references | JSONB | DEFAULT '[]' | Reference list [{title, url}] |
| created_at | TIMESTAMPTZ | auto | Created at |
| updated_at | TIMESTAMPTZ | auto | Updated at |

**Index:** created_at DESC (default sort order)

### causal_hypothesis

Manages causal hypotheses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PK | |
| session_id | BIGINT | FK → causal_session, CASCADE | Session |
| order | INT | NOT NULL | Display order |
| text | TEXT | NOT NULL | Hypothesis text |
| score | FLOAT | DEFAULT 0.0 | Confidence score (0.0 to 1.0) |
| created_at | TIMESTAMPTZ | auto | |

**Sort order:** score DESC

### causal_evidence

Manages evidence that supports or counters hypotheses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PK | |
| hypothesis_id | BIGINT | FK → causal_hypothesis, CASCADE | Hypothesis |
| text | TEXT | NOT NULL | Evidence text |
| source_url | TEXT | | Source URL |
| source_title | VARCHAR(500) | | Source title |
| stance | VARCHAR(10) | NOT NULL | support / counter |
| confidence | VARCHAR(10) | DEFAULT 'medium' | high / medium / low |
| embedding | VECTOR(1024) | NULL | pgvector embedding |
| created_at | TIMESTAMPTZ | auto | |

### causal_graphnode

Manages knowledge graph nodes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PK | |
| session_id | BIGINT | FK → causal_session, CASCADE | Session |
| node_id | VARCHAR(50) | NOT NULL | Node identifier (q0, h1, s1, etc.) |
| node_type | VARCHAR(20) | NOT NULL | question/hypothesis/support/counter/concept |
| label | TEXT | NOT NULL | Display label |
| metadata | JSONB | DEFAULT '{}' | Metadata |

**Unique constraint:** (session_id, node_id)

### causal_graphedge

Manages knowledge graph edges.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PK | |
| session_id | BIGINT | FK → causal_session, CASCADE | Session |
| source_id | BIGINT | FK → causal_graphnode, CASCADE | Source node |
| target_id | BIGINT | FK → causal_graphnode, CASCADE | Target node |
| edge_type | VARCHAR(20) | NOT NULL | causal/support/counter/rel |

### causal_tokenusage

Records API token usage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PK | |
| session_id | BIGINT | FK → causal_session, CASCADE | Session |
| model | VARCHAR(30) | NOT NULL | Model name |
| input_tokens | INT | NOT NULL | Input token count |
| output_tokens | INT | NOT NULL | Output token count |
| cost_usd | DECIMAL(10,6) | NOT NULL | Cost (USD) |
| node_name | VARCHAR(50) | NOT NULL | Pipeline node name |
| created_at | TIMESTAMPTZ | auto | |

### users_usersettings

Manages user settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PK | |
| user_id | BIGINT | FK → auth_user, UNIQUE, CASCADE | User (1:1) |
| display_name | VARCHAR(100) | | Display name |
| nickname | VARCHAR(100) | | Nickname |
| default_model | VARCHAR(20) | DEFAULT 'auto' | auto/sonnet/opus |
| complexity_threshold | INT | DEFAULT 3 | Complexity threshold |
| system_prompt | TEXT | | Custom prompt |
| language | VARCHAR(5) | DEFAULT 'ja' | ja/en |
| color_mode | VARCHAR(10) | DEFAULT 'dark' | dark/light/system |
| graph_animation | BOOLEAN | DEFAULT true | |
| graph_grid | BOOLEAN | DEFAULT true | |
| animation_speed | VARCHAR(10) | DEFAULT 'normal' | slow/normal/fast |

## CASCADE Deletion Relationships

When a session is deleted, the following are cascade-deleted:

```
Session deleted
  → Hypothesis deleted
    → Evidence deleted
  → GraphNode deleted
    → GraphEdge deleted
  → TokenUsage deleted
```

## pgvector Extension

On first startup, `init.sql` executes `CREATE EXTENSION IF NOT EXISTS vector;` to enable the VECTOR type. It is used by the `embedding` column (1024 dimensions) in the Evidence table.
