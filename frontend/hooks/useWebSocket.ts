"use client";
import { useCallback, useEffect, useRef } from "react";
import { useSession } from "./useSession";
import { useToast } from "./useToast";

export function useWebSocket(sessionId: number | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const {
    addMessage,
    updateMessage,
    addGraphData,
    setProgress,
    setStatus,
    setSelectedModel,
    setError,
    setThinking,
    addSearchActivity,
    clearSearchActivities,
    clearGraphData,
    updateSessionTitle,
  } = useSession();
  const addToast = useToast((s) => s.addToast);

  const connect = useCallback(() => {
    if (!sessionId) return;
    // Close stale connection if not open
    if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
      wsRef.current = null;
    }
    if (wsRef.current) return;

    const token = localStorage.getItem("access_token");
    const wsUrl = `ws://localhost:8000/ws/sessions/${sessionId}/?token=${token || ""}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleEvent(data);
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    ws.onerror = () => {
      setError("WebSocket接続エラー");
      wsRef.current = null;
    };
  }, [sessionId, addMessage, updateMessage, addGraphData, setProgress, setStatus, setSelectedModel, setError, setThinking, addSearchActivity, clearSearchActivities, clearGraphData, updateSessionTitle, addToast]);

  const handleEvent = useCallback(
    (data: Record<string, unknown>) => {
      switch (data.type) {
        case "session_started":
          setStatus("running");
          clearGraphData();
          clearSearchActivities();
          break;

        case "follow_up_started":
          setThinking({
            node: "follow_up",
            icon: "💬",
            label: "追加質問に回答中",
          });
          break;

        case "follow_up_response":
          setThinking(null);
          addMessage({
            id: `followup-${Date.now()}`,
            type: "ai",
            content: data.answer as string,
            variant: "bubble",
          });
          break;

        case "node_started":
          setThinking({
            node: data.node as string,
            icon: data.icon as string,
            label: data.label as string,
          });
          break;

        case "node_completed":
          setThinking(null);
          addMessage({
            id: `step-${data.node}`,
            type: "ai",
            content: data.label as string,
            variant: "step",
            stepIcon: data.icon as string,
            stepTag: data.node as string,
          });
          setProgress(data.progress as number);
          break;

        case "model_selected": {
          const modelName = (data.model as string).includes("opus") ? "Claude Opus" : "Claude Sonnet";
          const score = data.complexity_score as number;
          const entityCount = data.entity_count as number;
          const reasoning = data.reasoning as string;
          setSelectedModel(data.model as string);
          addMessage({
            id: "model-selected",
            type: "ai",
            content: `モデル決定：${modelName}\n複雑度スコア: ${score?.toFixed(2) ?? "N/A"} | エンティティ数: ${entityCount ?? "N/A"}${reasoning ? `\n${reasoning}` : ""}`,
            variant: "step",
            stepIcon: "◎",
            stepTag: "auto",
          });
          break;
        }

        case "question_parsed": {
          const parsed = data.parsed_question as Record<string, unknown>;
          if (parsed) {
            addMessage({
              id: "question-parsed",
              type: "ai",
              content: "",
              variant: "parsed",
              parsedQuestion: parsed as ParsedQuestionData,
            });
          }
          break;
        }

        case "hypotheses_generated":
          addMessage({
            id: "hypotheses",
            type: "ai",
            content: "因果仮説を生成",
            variant: "hypothesis",
            hypotheses: data.hypotheses as HypothesisData[],
          });
          break;

        case "search_started":
          addSearchActivity({
            id: `search-${Date.now()}`,
            type: "searching",
            query: data.query as string,
            timestamp: Date.now(),
          });
          break;

        case "search_results_found":
          addSearchActivity({
            id: `results-${Date.now()}`,
            type: "results",
            query: data.query as string,
            results: data.results as { title: string; url: string }[],
            timestamp: Date.now(),
          });
          break;

        case "evidence_analyzing":
          addSearchActivity({
            id: `analyzing-${Date.now()}`,
            type: "analyzing",
            hypothesisIndex: data.hypothesis_index as number,
            sourceCount: data.source_count as number,
            timestamp: Date.now(),
          });
          break;

        case "evidence_analyzed":
          addSearchActivity({
            id: `analyzed-${Date.now()}`,
            type: "analyzed",
            hypothesisIndex: data.hypothesis_index as number,
            supportCount: data.support_count as number,
            counterCount: data.counter_count as number,
            timestamp: Date.now(),
          });
          break;

        case "evidence_collected": {
          const evidences = data.evidences as Record<string, EvidenceItem[]>;
          let total = 0, support = 0, counter = 0;
          if (evidences) {
            for (const evs of Object.values(evidences)) {
              for (const ev of evs) {
                total++;
                if (ev.stance === "support") support++;
                else if (ev.stance === "counter") counter++;
              }
            }
          }
          addMessage({
            id: "evidence-collected",
            type: "ai",
            content: "",
            variant: "evidence",
            evidenceSummary: { total, support, counter },
          });
          clearSearchActivities();
          break;
        }

        case "graph_update":
          addGraphData(
            data.nodes as GraphNodeData[],
            data.edges as GraphEdgeData[],
          );
          break;

        case "hypotheses_ranked": {
          const ranked = data.hypotheses as HypothesisData[];
          if (ranked) {
            updateMessage("hypotheses", { hypotheses: ranked });
          }
          break;
        }

        case "final_answer":
          addMessage({
            id: "answer",
            type: "ai",
            content: data.answer as string,
            variant: "answer",
            references: (data.references as { title: string; url: string }[]) || [],
          });
          setProgress(100);
          break;

        case "session_completed":
          setThinking(null);
          setStatus("completed");
          setTimeout(() => setProgress(0), 500);
          break;

        case "session_stopped":
          setThinking(null);
          setStatus("idle");
          addMessage({
            id: `stopped-${Date.now()}`,
            type: "ai",
            content: data.message as string,
            variant: "step",
            stepIcon: "■",
            stepTag: "stopped",
          });
          break;

        case "title_generated":
          updateSessionTitle(
            data.session_id as number,
            data.title as string,
          );
          break;

        case "error":
          setThinking(null);
          setError(data.message as string);
          setStatus("idle");
          setProgress(0);
          addToast({ type: "error", message: data.message as string });
          break;
      }
    },
    [addMessage, updateMessage, addGraphData, setProgress, setStatus, setSelectedModel, setError, setThinking, addSearchActivity, clearSearchActivities, clearGraphData, updateSessionTitle, addToast],
  );

  const sendMessage = useCallback(
    (query: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "start_inference", query }),
        );
      }
    },
    [],
  );

  const sendFollowUp = useCallback(
    (query: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "follow_up", query }),
        );
      }
    },
    [],
  );

  const stopInference = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop_inference" }));
    }
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  const isConnected = useCallback(
    () => wsRef.current?.readyState === WebSocket.OPEN,
    [],
  );

  return { connect, sendMessage, sendFollowUp, stopInference, disconnect, isConnected };
}

// Types
type ParsedQuestionData = {
  main_question?: string;
  subject?: string;
  predicate?: string;
  scope?: string;
  time_frame?: string;
  entities?: string[];
};

type HypothesisData = {
  text: string;
  short_label?: string;
  score: number;
  initial_score?: number;
  support_count?: number;
  counter_count?: number;
  ranking_reasoning?: string;
};

type EvidenceItem = {
  text: string;
  stance: string;
  confidence: string;
  source_url?: string;
  source_title?: string;
};

type GraphNodeData = {
  node_id: string;
  node_type: string;
  label: string;
  metadata: Record<string, unknown>;
};

type GraphEdgeData = {
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
};
