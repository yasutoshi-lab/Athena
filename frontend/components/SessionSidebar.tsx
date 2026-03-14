"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { useLocale } from "@/hooks/useLocale";

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
  onSessionDeleted?: (id: number) => void;
}

function groupByDate(sessions: SessionItem[], labels: { today: string; yesterday: string; older: string }) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups: { label: string; items: SessionItem[] }[] = [
    { label: labels.today, items: [] },
    { label: labels.yesterday, items: [] },
    { label: labels.older, items: [] },
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
  onSessionDeleted,
}: SessionSidebarProps) {
  const t = useLocale((s) => s.t);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const loadSessions = () => {
    api.getSessions().then((data) => {
      setSessions(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadSessions();
    }
  }, [currentSessionId]);

  // Close menu on outside click
  useEffect(() => {
    if (menuOpenId === null) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpenId]);

  const groups = groupByDate(sessions, { today: t("sidebar.today"), yesterday: t("sidebar.yesterday"), older: t("sidebar.older") });

  const statusDot = (status: string) => {
    const colors: Record<string, string> = {
      running: "#2dbe8a",
      completed: "var(--accent)",
      error: "#d45757",
      pending: "var(--text-2)",
    };
    return colors[status] || "var(--text-2)";
  };

  const updateTitle = (id: number, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    );
  };

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__athena_updateSessionTitle = updateTitle;
    return () => {
      delete (window as unknown as Record<string, unknown>).__athena_updateSessionTitle;
    };
  }, []);

  const handleDelete = async (id: number) => {
    setMenuOpenId(null);
    try {
      await api.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (currentSessionId === id) {
        onSessionDeleted?.(id);
      }
    } catch (e) {
      console.error("Failed to delete session", e);
    }
  };

  const handleStartEdit = (s: SessionItem) => {
    setMenuOpenId(null);
    setEditingId(s.id);
    setEditTitle(s.title || s.query.slice(0, 30));
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    try {
      await api.updateSession(editingId, { title: editTitle });
      setSessions((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, title: editTitle } : s))
      );
    } catch (e) {
      console.error("Failed to update session", e);
    }
    setEditingId(null);
    setEditTitle("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

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
          {t("sidebar.newSession")}
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
            {t("sidebar.loading")}
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
            {t("sidebar.empty")}
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
                <SessionRow
                  key={s.id}
                  session={s}
                  isActive={s.id === currentSessionId}
                  isEditing={editingId === s.id}
                  editTitle={editTitle}
                  menuOpen={menuOpenId === s.id}
                  menuRef={menuOpenId === s.id ? menuRef : undefined}
                  statusColor={statusDot(s.status)}
                  onSelect={() => onSelectSession(s.id)}
                  onMenuToggle={() =>
                    setMenuOpenId(menuOpenId === s.id ? null : s.id)
                  }
                  onEdit={() => handleStartEdit(s)}
                  onDelete={() => handleDelete(s.id)}
                  onEditTitleChange={setEditTitle}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SessionRow({
  session,
  isActive,
  isEditing,
  editTitle,
  menuOpen,
  menuRef,
  statusColor,
  onSelect,
  onMenuToggle,
  onEdit,
  onDelete,
  onEditTitleChange,
  onSaveEdit,
  onCancelEdit,
}: {
  session: SessionItem;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  menuOpen: boolean;
  menuRef?: React.RefObject<HTMLDivElement | null>;
  statusColor: string;
  onSelect: () => void;
  onMenuToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditTitleChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const t = useLocale((s) => s.t);

  if (isEditing) {
    return (
      <div
        style={{
          padding: "6px 10px",
          borderLeft: isActive
            ? "2px solid var(--accent)"
            : "2px solid transparent",
          background: "var(--bg-2)",
        }}
      >
        <input
          autoFocus
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveEdit();
            if (e.key === "Escape") onCancelEdit();
          }}
          style={{
            width: "100%",
            fontSize: 12,
            padding: "4px 6px",
            borderRadius: 4,
            border: "1px solid var(--border-md)",
            background: "var(--bg-1)",
            color: "var(--text-0)",
            marginBottom: 4,
          }}
        />
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={onSaveEdit}
            style={{
              flex: 1,
              padding: "3px 0",
              borderRadius: 4,
              background: "var(--accent)",
              color: "#fff",
              fontSize: 10,
              fontFamily: "var(--mono)",
              cursor: "pointer",
              border: "none",
            }}
          >
            {t("common.save")}
          </button>
          <button
            onClick={onCancelEdit}
            style={{
              flex: 1,
              padding: "3px 0",
              borderRadius: 4,
              background: "var(--bg-3)",
              color: "var(--text-1)",
              fontSize: 10,
              fontFamily: "var(--mono)",
              cursor: "pointer",
              border: "1px solid var(--border)",
            }}
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
      }}
    >
      <button
        onClick={onSelect}
        style={{
          flex: 1,
          padding: "8px 28px 8px 12px",
          textAlign: "left",
          background: isActive ? "var(--bg-2)" : "transparent",
          border: "none",
          borderLeft: isActive
            ? "2px solid var(--accent)"
            : "2px solid transparent",
          cursor: "pointer",
          transition: "all 0.12s",
          display: "flex",
          alignItems: "center",
          gap: 7,
          minWidth: 0,
        }}
      >
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: statusColor,
            flexShrink: 0,
            animation:
              session.status === "running" ? "pulse 1.5s infinite" : "none",
          }}
        />
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 12,
            color: isActive ? "var(--text-0)" : "var(--text-1)",
          }}
        >
          {session.title || session.query.slice(0, 30)}
        </div>
      </button>

      {/* Three-dot menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMenuToggle();
        }}
        style={{
          position: "absolute",
          right: 4,
          top: "50%",
          transform: "translateY(-50%)",
          width: 20,
          height: 20,
          borderRadius: 4,
          background: menuOpen ? "var(--bg-3)" : "transparent",
          border: "none",
          color: "var(--text-2)",
          fontSize: 12,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: menuOpen ? 1 : 0,
          transition: "opacity 0.1s",
        }}
        className="session-menu-btn"
      >
        ···
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            right: 4,
            top: "100%",
            zIndex: 100,
            background: "var(--bg-1)",
            border: "1px solid var(--border-md)",
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            overflow: "hidden",
            minWidth: 100,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            style={{
              width: "100%",
              padding: "7px 12px",
              textAlign: "left",
              fontSize: 12,
              color: "var(--text-0)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "background 0.1s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.background = "var(--bg-2)")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.background = "transparent")
            }
          >
            {t("common.edit")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              width: "100%",
              padding: "7px 12px",
              textAlign: "left",
              fontSize: 12,
              color: "#d45757",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "background 0.1s",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.background =
                "rgba(212,87,87,0.08)")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.background = "transparent")
            }
          >
            {t("common.delete")}
          </button>
        </div>
      )}

      {/* CSS to show menu button on hover */}
      <style jsx>{`
        div:hover .session-menu-btn {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
