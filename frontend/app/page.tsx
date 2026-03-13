"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSession } from "@/hooks/useSession";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/lib/api";
import TopBar from "@/components/TopBar";
import ChatPanel from "@/components/ChatPanel";
import GraphPanel from "@/components/GraphPanel";

export default function MainPage() {
  const router = useRouter();
  const { user, loading, loadUser } = useAuth();
  const { sessionId, setSessionId, addMessage, reset } = useSession();
  const { connect, sendMessage } = useWebSocket(sessionId);

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
      <TopBar />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <ChatPanel onSend={handleSend} />
        <GraphPanel />
      </div>
    </div>
  );
}
