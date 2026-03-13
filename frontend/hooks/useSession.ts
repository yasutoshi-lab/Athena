"use client";
import { create } from "zustand";

export interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  variant?: "bubble" | "step" | "hypothesis" | "answer";
  stepIcon?: string;
  stepTag?: string;
  hypotheses?: HypothesisData[];
}

export interface HypothesisData {
  text: string;
  short_label?: string;
  score: number;
  support_count?: number;
  counter_count?: number;
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

interface SessionState {
  sessionId: number | null;
  status: "idle" | "running" | "completed" | "error";
  messages: ChatMessage[];
  graphNodes: GraphNodeData[];
  graphEdges: GraphEdgeData[];
  progress: number;
  selectedModel: string;
  error: string | null;

  setSessionId: (id: number) => void;
  addMessage: (msg: ChatMessage) => void;
  setGraphData: (nodes: GraphNodeData[], edges: GraphEdgeData[]) => void;
  setProgress: (pct: number) => void;
  setStatus: (s: SessionState["status"]) => void;
  setSelectedModel: (m: string) => void;
  setError: (e: string | null) => void;
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

  setSessionId: (id) => set({ sessionId: id }),
  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, { ...msg, id: msg.id || `msg-${++msgCounter}` }] })),
  setGraphData: (nodes, edges) => set({ graphNodes: nodes, graphEdges: edges }),
  setProgress: (pct) => set({ progress: pct }),
  setStatus: (status) => set({ status }),
  setSelectedModel: (m) => set({ selectedModel: m }),
  setError: (e) => set({ error: e }),
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
    }),
}));
