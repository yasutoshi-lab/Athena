"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface SessionItem {
  id: number;
  title: string;
  query: string;
  status: string;
  created_at: string;
}

interface SessionSidebarProps {
  currentSessionId: number | null;
  onSelectSession: (id: number) => void;
  onNewSession: () => void;
  onClose: () => void;
}

function groupByDate(sessions: SessionItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups: { label: string; items: SessionItem[] }[] = [
    { label: "今日", items: [] },
    { label: "昨日", items: [] },
    { label: "それ以前", items: [] },
  ];

  for (const s of sessions) {
    const d = new Date(s.created_at);
    if (d >= today) groups[0].items.push(s);
    else if (d >= yesterday) groups[1].items.push(s);
    else groups[2].items.push(s);
  }

  return groups.filter((g) => g.items.length > 0);
}

export default function SessionSidebar({
  currentSessionId,
  onSelectSession,
  onNewSession,
  onClose,
}: SessionSidebarProps) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = () => {
    api.getSessions().then((data) => {
      setSessions(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Reload when currentSessionId changes (new session created)
  useEffect(() => {
    if (currentSessionId) {
      loadSessions();
    }
  }, [currentSessionId]);

  const groups = groupByDate(sessions);

  const statusDot = (status: string) => {
    const colors: Record<string, string> = {
      running: "#2dbe8a",
      completed: "var(--accent)",
      error: "#d45757",
      pending: "var(--text-2)",
    };
    return colors[status] || "var(--text-2)";
  };

  // Update a session title in-place (called from parent via ref or event)
  const updateTitle = (id: number, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    );
  };

  // Expose updateTitle via a global so useWebSocket can call it
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__athena_updateSessionTitle = updateTitle;
    return () => {
      delete (window as unknown as Record<string, unknown>).__athena_updateSessionTitle;
    };
  }, []);

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        background: "var(--bg-0)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={onNewSession}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: 6,
            background: "var(--accent-dim)",
            border: "1px solid rgba(91,106,240,0.25)",
            color: "var(--accent)",
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: "0.04em",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          ＋ 新規セッション
        </button>
        <button
          onClick={onClose}
          style={{
            marginLeft: 6,
            width: 24,
            height: 24,
            borderRadius: 5,
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-2)",
            fontSize: 11,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {loading ? (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--text-2)",
            }}
          >
            読込中...
          </div>
        ) : sessions.length === 0 ? (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--text-2)",
            }}
          >
            セッションなし
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div
                style={{
                  padding: "8px 12px 4px",
                  fontFamily: "var(--mono)",
                  fontSize: 9.5,
                  color: "var(--text-2)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {group.label}
              </div>
              {group.items.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSession(s.id)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    textAlign: "left",
                    background:
                      s.id === currentSessionId
                        ? "var(--bg-2)"
                        : "transparent",
                    border: "none",
                    borderLeft:
                      s.id === currentSessionId
                        ? "2px solid var(--accent)"
                        : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.12s",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: statusDot(s.status),
                      flexShrink: 0,
                      animation:
                        s.status === "running"
                          ? "pulse 1.5s infinite"
                          : "none",
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 12,
                      color:
                        s.id === currentSessionId
                          ? "var(--text-0)"
                          : "var(--text-1)",
                    }}
                  >
                    {s.title || s.query.slice(0, 30)}
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
