"use client";
import { useCallback, useEffect, useRef } from "react";
import { useSession } from "./useSession";

export function useWebSocket(sessionId: number | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const {
    addMessage,
    setGraphData,
    setProgress,
    setStatus,
    setSelectedModel,
    setError,
  } = useSession();

  const connect = useCallback(() => {
    if (!sessionId || wsRef.current) return;

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
  }, [sessionId, addMessage, setGraphData, setProgress, setStatus, setSelectedModel, setError]);

  const handleEvent = useCallback(
    (data: Record<string, unknown>) => {
      switch (data.type) {
        case "session_started":
          setStatus("running");
          break;

        case "node_completed":
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

        case "model_selected":
          setSelectedModel(data.model as string);
          addMessage({
            id: "model-selected",
            type: "ai",
            content: `モデル決定：${(data.model as string).includes("opus") ? "Claude Opus" : "Claude Sonnet"}`,
            variant: "step",
            stepIcon: "◎",
            stepTag: "auto",
          });
          break;

        case "hypotheses_generated":
          addMessage({
            id: "hypotheses",
            type: "ai",
            content: "因果仮説を生成",
            variant: "hypothesis",
            hypotheses: data.hypotheses as HypothesisData[],
          });
          break;

        case "graph_update":
          setGraphData(
            data.nodes as GraphNodeData[],
            data.edges as GraphEdgeData[],
          );
          break;

        case "hypotheses_ranked":
          // Update hypothesis scores in existing message
          break;

        case "final_answer":
          addMessage({
            id: "answer",
            type: "ai",
            content: data.answer as string,
            variant: "answer",
          });
          setProgress(100);
          break;

        case "session_completed":
          setStatus("completed");
          setTimeout(() => setProgress(0), 500);
          break;

        case "error":
          setError(data.message as string);
          setStatus("error");
          break;
      }
    },
    [addMessage, setGraphData, setProgress, setStatus, setSelectedModel, setError],
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

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { connect, sendMessage, disconnect };
}

// Re-export types for convenience
type HypothesisData = {
  text: string;
  short_label?: string;
  score: number;
  support_count?: number;
  counter_count?: number;
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
