"use client";
import { create } from "zustand";

export interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  variant?: "bubble" | "step" | "hypothesis" | "answer" | "evidence" | "parsed";
  stepIcon?: string;
  stepTag?: string;
  hypotheses?: HypothesisData[];
  parsedQuestion?: ParsedQuestionData;
  evidenceSummary?: EvidenceSummaryData;
}

export interface HypothesisData {
  text: string;
  short_label?: string;
  score: number;
  initial_score?: number;
  support_count?: number;
  counter_count?: number;
  ranking_reasoning?: string;
}

export interface ParsedQuestionData {
  main_question?: string;
  subject?: string;
  predicate?: string;
  scope?: string;
  time_frame?: string;
  entities?: string[];
}

export interface EvidenceSummaryData {
  total: number;
  support: number;
  counter: number;
}

export interface GraphNodeData {
  node_id: string;
  node_type: string;
  label: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdgeData {
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
}

export interface ThinkingState {
  node: string;
  icon: string;
  label: string;
}

interface SessionState {
  sessionId: number | null;
  status: "idle" | "running" | "completed" | "error";
  messages: ChatMessage[];
  graphNodes: GraphNodeData[];
  graphEdges: GraphEdgeData[];
  progress: number;
  selectedModel: string;
  error: string | null;
  thinking: ThinkingState | null;

  setSessionId: (id: number) => void;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, update: Partial<ChatMessage>) => void;
  addGraphData: (nodes: GraphNodeData[], edges: GraphEdgeData[]) => void;
  setProgress: (pct: number) => void;
  setStatus: (s: SessionState["status"]) => void;
  setSelectedModel: (m: string) => void;
  setError: (e: string | null) => void;
  setThinking: (t: ThinkingState | null) => void;
  reset: () => void;
}

let msgCounter = 0;

export const useSession = create<SessionState>((set) => ({
  sessionId: null,
  status: "idle",
  messages: [],
  graphNodes: [],
  graphEdges: [],
  progress: 0,
  selectedModel: "sonnet",
  error: null,
  thinking: null,

  setSessionId: (id) => set({ sessionId: id }),
  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, { ...msg, id: msg.id || `msg-${++msgCounter}` }] })),
  updateMessage: (id, update) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, ...update } : m
      ),
    })),
  addGraphData: (nodes, edges) =>
    set((s) => {
      // Merge new nodes (deduplicate by node_id)
      const existingIds = new Set(s.graphNodes.map((n) => n.node_id));
      const newNodes = nodes.filter((n) => !existingIds.has(n.node_id));
      // Merge new edges (deduplicate by source+target+type)
      const existingEdgeKeys = new Set(
        s.graphEdges.map((e) => `${e.source_node_id}-${e.target_node_id}-${e.edge_type}`)
      );
      const newEdges = edges.filter(
        (e) => !existingEdgeKeys.has(`${e.source_node_id}-${e.target_node_id}-${e.edge_type}`)
      );
      return {
        graphNodes: [...s.graphNodes, ...newNodes],
        graphEdges: [...s.graphEdges, ...newEdges],
      };
    }),
  setProgress: (pct) => set({ progress: pct }),
  setStatus: (status) => set({ status }),
  setSelectedModel: (m) => set({ selectedModel: m }),
  setError: (e) => set({ error: e }),
  setThinking: (t) => set({ thinking: t }),
  reset: () =>
    set({
      sessionId: null,
      status: "idle",
      messages: [],
      graphNodes: [],
      graphEdges: [],
      progress: 0,
      selectedModel: "sonnet",
      error: null,
      thinking: null,
    }),
}));
