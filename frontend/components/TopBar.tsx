"use client";
import { useAuth } from "@/hooks/useAuth";
import { useSession } from "@/hooks/useSession";
import { useRouter, usePathname } from "next/navigation";

interface TopBarProps {
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
}

export default function TopBar({ onSidebarToggle, isSidebarOpen }: TopBarProps) {
  const user = useAuth((s) => s.user);
  const status = useSession((s) => s.status);
  const selectedModel = useSession((s) => s.selectedModel);
  const router = useRouter();
  const pathname = usePathname();

  const isRunning = status === "running";
  const modelLabel = selectedModel.includes("opus")
    ? `Opus — ${isRunning ? "推論中" : "待機中"}`
    : `Sonnet — ${isRunning ? "推論中" : "待機中"}`;

  const nickname =
    user?.settings?.nickname ||
    user?.settings?.display_name ||
    user?.username?.charAt(0) ||
    "?";

  return (
    <div
      style={{
        height: 44,
        flexShrink: 0,
        background: "var(--bg-1)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        position: "relative",
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.04em",
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background: "var(--accent-dim2)",
            border: "1px solid var(--border-focus)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: "var(--accent)",
            fontWeight: 700,
          }}
        >
          A
        </div>
        Athena
      </div>

      {/* Separator */}
      <div
        style={{
          width: 1,
          height: 20,
          background: "var(--border)",
          margin: "0 14px",
        }}
      />

      {/* Nav */}
      <div style={{ display: "flex", gap: 2 }}>
        {pathname === "/" && onSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 13,
              color: isSidebarOpen ? "var(--text-0)" : "var(--text-1)",
              background: isSidebarOpen ? "var(--bg-2)" : "transparent",
              fontWeight: 500,
              transition: "all 0.15s",
            }}
          >
            セッション一覧
          </button>
        )}
        <button
          onClick={() => router.push("/")}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            fontSize: 13,
            color: pathname === "/" ? "var(--text-0)" : "var(--text-1)",
            background: pathname === "/" && !isSidebarOpen ? "var(--bg-2)" : pathname === "/" ? "transparent" : "transparent",
            fontWeight: 500,
            transition: "all 0.15s",
          }}
        >
          推論チャット
        </button>
        <button
          onClick={() => router.push("/settings")}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            fontSize: 13,
            color: pathname === "/settings" ? "var(--text-0)" : "var(--text-1)",
            background: pathname === "/settings" ? "var(--bg-2)" : "transparent",
            fontWeight: 500,
            transition: "all 0.15s",
          }}
        >
          設定
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            background: "var(--accent-dim)",
            border: "1px solid rgba(91,106,240,0.25)",
            color: "var(--accent)",
            padding: "3px 9px",
            borderRadius: 5,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: isRunning ? "#2dbe8a" : "var(--accent)",
              animation: isRunning ? "beat 0.6s ease-in-out infinite" : "pulse 2s infinite",
            }}
          />
          {modelLabel}
        </div>

        <div
          onClick={() => router.push("/settings")}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--bg-3)",
            border: "1px solid var(--border-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "var(--text-1)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {nickname.charAt(0)}
        </div>
      </div>
    </div>
  );
}
