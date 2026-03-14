"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSession } from "@/hooks/useSession";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/lib/api";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import GraphPanel from "@/components/GraphPanel";
import SessionSidebar from "@/components/SessionSidebar";

export default function MainPage() {
  const router = useRouter();
  const { user, loading, loadUser } = useAuth();
  const {
    sessionId,
    setSessionId,
    addMessage,
    addGraphData,
    setStatus,
    reset,
  } = useSession();
  const { connect, sendMessage, stopInference, disconnect } = useWebSocket(sessionId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (sessionId) {
      connect();
    }
  }, [sessionId, connect]);

  const handleSend = async (query: string) => {
    // Add user message
    addMessage({
      id: `user-${Date.now()}`,
      type: "user",
      content: query,
      variant: "bubble",
    });

    try {
      // Create session via REST API
      const session = await api.createSession(query);
      reset();
      // Re-add user message after reset
      addMessage({
        id: `user-${Date.now()}`,
        type: "user",
        content: query,
        variant: "bubble",
      });
      setSessionId(session.id);

      // Wait for WebSocket to connect, then send
      setTimeout(() => {
        sendMessage(query);
      }, 500);
    } catch (err) {
      addMessage({
        id: `error-${Date.now()}`,
        type: "ai",
        content: "セッションの作成に失敗しました。",
        variant: "bubble",
      });
    }
  };

  const handleStop = () => {
    stopInference();
  };

  const handleClear = () => {
    disconnect();
    reset();
  };

  const handleSelectSession = async (id: number) => {
    disconnect();
    reset();

    try {
      const [session, graph] = await Promise.all([
        api.getSession(id),
        api.getGraph(id),
      ]);

      // Rebuild chat history from session data
      addMessage({
        id: `user-${id}`,
        type: "user",
        content: session.query,
        variant: "bubble",
      });

      // Add hypotheses if available
      if (session.hypotheses && session.hypotheses.length > 0) {
        addMessage({
          id: `hypotheses-${id}`,
          type: "ai",
          content: "因果仮説を生成",
          variant: "hypothesis",
          hypotheses: session.hypotheses.map((h: { text: string; score: number; order: number }) => ({
            text: h.text,
            score: h.score,
          })),
        });
      }

      // Add final answer if available
      if (session.final_answer) {
        addMessage({
          id: `answer-${id}`,
          type: "ai",
          content: session.final_answer,
          variant: "answer",
          references: session.references || [],
        });
      }

      // Restore graph
      if (graph.nodes?.length || graph.edges?.length) {
        addGraphData(graph.nodes || [], graph.edges || []);
      }

      setSessionId(id);
      setStatus(session.status === "running" ? "running" : session.status === "completed" ? "completed" : "idle");
    } catch (err) {
      addMessage({
        id: `error-${Date.now()}`,
        type: "ai",
        content: "セッションの読み込みに失敗しました。",
        variant: "bubble",
      });
    }
  };

  const handleNewSession = () => {
    disconnect();
    reset();
  };

  // --- Resizable divider (hooks must be before any early return) ---
  const MIN_CHAT_WIDTH = 300;
  const DEFAULT_CHAT_WIDTH = 380;
  const containerRef = useRef<HTMLDivElement>(null);
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);
  const dragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const maxWidth = containerRect.width * 0.5;
      const newWidth = Math.min(
        Math.max(ev.clientX - containerRect.left - (isSidebarOpen ? 220 : 0), MIN_CHAT_WIDTH),
        maxWidth,
      );
      setChatWidth(newWidth);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [isSidebarOpen]);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-0)",
          color: "var(--text-2)",
          fontFamily: "var(--mono)",
          fontSize: 13,
        }}
      >
        読み込み中...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopBar
        onSidebarToggle={() => setIsSidebarOpen((v) => !v)}
        isSidebarOpen={isSidebarOpen}
      />
      <div ref={containerRef} style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {isSidebarOpen && (
          <SessionSidebar
            currentSessionId={sessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}
        <ChatPanel onSend={handleSend} onStop={handleStop} onClear={handleClear} width={chatWidth} />
        {/* Drag handle */}
        <div
          onMouseDown={onMouseDown}
          style={{
            width: 6,
            flexShrink: 0,
            cursor: "col-resize",
            background: "transparent",
            position: "relative",
            zIndex: 50,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 2,
              width: 1,
              background: "var(--border)",
              transition: "background 0.15s",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 4,
              height: 32,
              borderRadius: 2,
              background: "var(--text-2)",
              opacity: 0.25,
              transition: "opacity 0.15s",
            }}
          />
        </div>
        <GraphPanel />
      </div>
    </div>
  );
}
