"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const register = useAuth((s) => s.register);
  const t = useLocale((s) => s.t);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError(t("signup.failed"));
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password);
      router.push("/");
    } catch (err) {
      if (err instanceof Error) {
        try {
          const data = JSON.parse(err.message);
          const messages = Object.values(data).flat();
          setError(messages.join(" "));
        } catch {
          setError(t("signup.failed"));
        }
      } else {
        setError(t("signup.failed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "var(--bg-2)",
    border: "1px solid var(--border-md)",
    borderRadius: "var(--radius)",
    padding: "10px 13px",
    fontSize: 14,
    width: "100%",
    transition: "border-color 0.2s",
  };

  const labelStyle = {
    fontSize: 12,
    color: "var(--text-1)",
    fontWeight: 500 as const,
    letterSpacing: "0.03em",
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
        {/* Logo + Language */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/icon.svg" alt="Athena" width={32} height={32} style={{ borderRadius: 8 }} />
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.03em" }}>
              Athena
            </span>
          </div>
          <LocaleSwitcher />
        </div>

        <div>
          <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3 }}>{t("signup.title")}</div>
          <div style={{ color: "var(--text-1)", fontSize: 13, marginTop: 2 }}>
            {t("signup.subtitle")}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>{t("signup.username")}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>{t("signup.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>{t("signup.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>{t("signup.passwordConfirm")}</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              style={inputStyle}
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
          {loading ? t("signup.submitting") : t("signup.submit")}
        </button>

        <div style={{ textAlign: "center", fontSize: 13 }}>
          <span style={{ color: "var(--text-1)" }}>{t("signup.loginLink")} </span>
          <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
            {t("signup.loginAction")}
          </Link>
        </div>
      </form>
    </div>
  );
}
