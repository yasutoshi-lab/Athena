# Main Screen (Inference Chat + Knowledge Graph)

## Overview

This is the main screen of Athena. It consists of three panels arranged left to right: the session list, the inference chat, and the knowledge graph. When you enter a causal question, the AI analyzes it through a 7-stage pipeline and displays results in real time.

## Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ [A] Athena │ Sessions  Inference Chat  Settings │ Sonnet — Idle [U] │
├────────────┬─────────────────────────┬───────────────────────────┤
│            │                         │                           │
│ + New      │  ATHENA                 │  Knowledge Graph  [Filter]│
│            │  Enter a causal         │                           │
│ ── Today ──│  question to begin...   │                           │
│ ● Session 1│                         │     ◯ Question            │
│ ● Session 2│                         │    / \                    │
│            │                         │   ◯   ◯ Hypothesis       │
│ ─Yesterday─│                         │  / \   \                  │
│ ● Session 3│                         │ ◯  ◯   ◯ Evidence        │
│            │                         │                           │
│            │  ┌─────────────────┐    │                           │
│            │  │ Ask a question…[↑]   │                           │
│            │  └─────────────────┘    │                           │
│            │  Press Enter to send    │                           │
├────────────┴─────────────────────────┴───────────────────────────┤
│ [Progress Bar]                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Three-Panel Layout

### 1. Session List Sidebar (Left, 220px)

- **+ New Session**: Start a new session
- **Session List**: Grouped by date (Today / Yesterday / Older)
- **Status Dot**: Green = Running, Blue = Completed, Red = Error
- **Three-dot Menu (···)**: Appears on hover with "Edit" and "Delete" options
- **✕ Button**: Close the sidebar (reopen via "Sessions" in the top bar)

### 2. Inference Chat Panel (Center, 380px, Resizable)

Inference progress and results are displayed in real time.

**Message Types:**

| Type | Description |
|------|-------------|
| User Message | The submitted question (right-aligned, blue background) |
| Step Notification | Completion notice for each pipeline node |
| Model Decision | Selected model, complexity score, and entity count |
| Structured Query | Subject, predicate, scope, timeframe, and entities |
| Hypothesis Card | Generated causal hypotheses (with scores) |
| Search Activity | Web search progress |
| Evidence Summary | Total evidence collected, supporting count, and counter count |
| Final Answer | Analysis results with source links (includes a copy button) |

**Controls:**
- **Enter**: Send message
- **Shift + Enter**: New line
- **Stop Button**: Cancel the running pipeline
- **Clear Button**: Reset the chat and graph

### 3. Knowledge Graph Panel (Right, flex:1)

An interactive force-directed graph powered by D3.js.

**Node Types:**

| Color | Type | Description |
|-------|------|-------------|
| Purple | Question | The input question |
| Yellow | Hypothesis | Generated hypotheses |
| Green | Support | Supporting evidence |
| Red | Counter | Contradicting evidence |
| Gray | Concept | Concept nodes |

**Interactions:**
- **Drag**: Move nodes
- **Scroll**: Zoom in/out
- **Click**: Show node details in the bottom-right corner
- **Hover**: Highlight connected nodes
- **Filter Button**: Toggle visibility of each node type

## Panel Resizing

You can adjust the panel widths by dragging the handle on the border between the chat panel and the knowledge graph.

## Follow-up Questions

After the initial inference completes, you can ask additional questions within the same session. The pipeline does not re-run; instead, Claude responds directly using the existing analysis results as context.

- Example: "Tell me more about Hypothesis 1"
- The knowledge graph and hypotheses are preserved while the new response is added to the chat
