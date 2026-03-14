"use client";
import { useToast, type Toast } from "@/hooks/useToast";

const ICON: Record<Toast["type"], string> = {
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const ACCENT: Record<Toast["type"], { bg: string; border: string; color: string }> = {
  error: {
    bg: "rgba(212,87,87,0.12)",
    border: "rgba(212,87,87,0.35)",
    color: "#d45757",
  },
  warning: {
    bg: "rgba(224,180,60,0.12)",
    border: "rgba(224,180,60,0.35)",
    color: "#e0b43c",
  },
  info: {
    bg: "rgba(91,106,240,0.10)",
    border: "rgba(91,106,240,0.30)",
    color: "var(--accent)",
  },
};

export default function ToastContainer() {
  const toasts = useToast((s) => s.toasts);
  const removeToast = useToast((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 52,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
        maxWidth: 520,
        width: "90%",
      }}
    >
      {toasts.map((toast) => {
        const style = ACCENT[toast.type];
        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "11px 14px",
              borderRadius: 9,
              background: style.bg,
              border: `1px solid ${style.border}`,
              backdropFilter: "blur(12px)",
              animation: "fadeUp 0.25s ease",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                background: style.color,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {ICON[toast.type]}
            </div>

            {/* Message */}
            <div
              style={{
                flex: 1,
                fontSize: 13,
                lineHeight: 1.55,
                color: "var(--text-0)",
              }}
            >
              {toast.message}
            </div>

            {/* Dismiss */}
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                flexShrink: 0,
                width: 20,
                height: 20,
                borderRadius: 4,
                background: "transparent",
                border: "none",
                color: "var(--text-2)",
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.1s",
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
