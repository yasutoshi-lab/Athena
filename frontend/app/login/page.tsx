"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const login = useAuth((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      router.push("/");
    } catch {
      setError("ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(91,106,240,0.12) 0%, transparent 70%), var(--bg-0)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 380,
          background: "var(--bg-1)",
          border: "1px solid var(--border-md)",
          borderRadius: 14,
          padding: "36px 36px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--accent-dim2)",
              border: "1px solid var(--border-focus)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--accent)",
            }}
          >
            A
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.03em" }}>
            Athena
          </span>
        </div>

        <div>
          <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3 }}>ログイン</div>
          <div style={{ color: "var(--text-1)", fontSize: 13, marginTop: 2 }}>
            因果推論システムにアクセスします
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-1)",
                fontWeight: 500,
                letterSpacing: "0.03em",
              }}
            >
              ユーザー名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border-md)",
                borderRadius: "var(--radius)",
                padding: "10px 13px",
                fontSize: 14,
                width: "100%",
                transition: "border-color 0.2s",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontSize: 12,
                color: "var(--text-1)",
                fontWeight: 500,
                letterSpacing: "0.03em",
              }}
            >
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border-md)",
                borderRadius: "var(--radius)",
                padding: "10px 13px",
                fontSize: 14,
                width: "100%",
                transition: "border-color 0.2s",
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{ color: "#d45757", fontSize: 13, textAlign: "center" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "var(--radius)",
            padding: 11,
            fontSize: 14,
            fontWeight: 600,
            width: "100%",
            transition: "background 0.15s, transform 0.1s",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>

        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--text-2)",
          }}
        >
          ローカル環境専用システム — Athena v0.1
        </div>
      </form>
    </div>
  );
}
