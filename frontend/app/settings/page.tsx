"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import TopBar from "@/components/TopBar";
import { useLocale } from "@/hooks/useLocale";
import type { Locale } from "@/lib/i18n";

type Tab = "general" | "usage" | "appearance";

interface UsageData {
  total_cost: number;
  total_tokens: { input: number; output: number };
  session_count: number;
  model_breakdown: Record<string, { cost: number; sessions: number }>;
  sessions: Array<{
    session__title: string;
    model: string;
    tokens: number;
    cost: number;
  }>;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, loadUser, logout } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const [tab, setTab] = useState<Tab>("general");
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      api.getSettings().then((s) => {
        setSettings(s);
        if (s.language) setLocale(s.language as Locale);
      }).catch(console.error);
      api.getUsage().then(setUsage).catch(console.error);
    }
  }, [user, setLocale]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading || !user) return null;

  const navItems = [
    { key: "general" as Tab, icon: "⊞", label: t("settings.general") },
    { key: "usage" as Tab, icon: "◷", label: t("settings.usage") },
    { key: "appearance" as Tab, icon: "◑", label: t("settings.appearance") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopBar />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            background: "var(--bg-1)",
            borderRight: "1px solid var(--border)",
            padding: "12px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9.5,
              color: "var(--text-2)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "6px 8px 4px",
            }}
          >
            {t("settings.title")}
          </div>
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 10px",
                borderRadius: 7,
                fontSize: 13.5,
                color: tab === item.key ? "var(--text-0)" : "var(--text-1)",
                background: tab === item.key ? "var(--bg-2)" : "transparent",
                fontWeight: tab === item.key ? 500 : 400,
                cursor: "pointer",
                transition: "all 0.12s",
                width: "100%",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 15, opacity: 0.7 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "8px 10px",
              borderRadius: 7,
              fontSize: 13.5,
              color: "var(--text-2)",
              marginTop: 8,
              width: "100%",
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 15, opacity: 0.7 }}>→</span>
            {t("settings.logout")}
          </button>
        </div>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 36px",
            maxWidth: 700,
          }}
        >
          {tab === "general" && (
            <GeneralTab settings={settings} setSettings={setSettings} onSave={handleSave} saving={saving} />
          )}
          {tab === "usage" && <UsageTab usage={usage} />}
          {tab === "appearance" && (
            <AppearanceTab settings={settings} setSettings={setSettings} onSave={handleSave} saving={saving} />
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        color: "var(--text-2)",
        fontFamily: "var(--mono)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--border)",
        borderRadius: 11,
        overflow: "hidden",
        marginBottom: 18,
      }}
    >
      {children}
    </div>
  );
}

function SettingsRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "14px 18px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--text-1)" }}>{desc}</div>
      </div>
      <div style={{ flexShrink: 0, marginLeft: 16 }}>{children}</div>
    </div>
  );
}

function GeneralTab({
  settings,
  setSettings,
  onSave,
  saving,
}: {
  settings: Record<string, unknown>;
  setSettings: (s: Record<string, unknown>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const { t, setLocale } = useLocale();
  const update = (key: string, value: unknown) => setSettings({ ...settings, [key]: value });

  const handleLanguageChange = (lang: string) => {
    update("language", lang);
    setLocale(lang as Locale);
  };

  return (
    <div style={{ animation: "fadeUp 0.2s ease" }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{t("settings.generalTitle")}</div>
      <div style={{ fontSize: 13, color: "var(--text-1)", marginBottom: 28 }}>
        {t("settings.generalDesc")}
      </div>

      <SectionTitle>{t("settings.profile")}</SectionTitle>
      <SettingsCard>
        <SettingsRow label={t("settings.displayName")} desc={t("settings.displayNameDesc")}>
          <input
            style={inputStyle}
            value={(settings.display_name as string) || ""}
            onChange={(e) => update("display_name", e.target.value)}
          />
        </SettingsRow>
        <SettingsRow label={t("settings.nickname")} desc={t("settings.nicknameDesc")}>
          <input
            style={inputStyle}
            value={(settings.nickname as string) || ""}
            onChange={(e) => update("nickname", e.target.value)}
          />
        </SettingsRow>
      </SettingsCard>

      <SectionTitle>{t("settings.language")}</SectionTitle>
      <SettingsCard>
        <SettingsRow label={t("settings.languageLabel")} desc={t("settings.languageDesc")}>
          <select
            style={selectStyle}
            value={(settings.language as string) || "ja"}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            <option value="ja">{t("settings.langJa")}</option>
            <option value="en">{t("settings.langEn")}</option>
          </select>
        </SettingsRow>
      </SettingsCard>

      <SectionTitle>{t("settings.llmModel")}</SectionTitle>
      <SettingsCard>
        <SettingsRow label={t("settings.defaultModel")} desc={t("settings.defaultModelDesc")}>
          <select
            style={selectStyle}
            value={(settings.default_model as string) || "auto"}
            onChange={(e) => update("default_model", e.target.value)}
          >
            <option value="auto">{t("settings.modelAuto")}</option>
            <option value="sonnet">{t("settings.modelSonnet")}</option>
            <option value="opus">{t("settings.modelOpus")}</option>
          </select>
        </SettingsRow>
        <SettingsRow label={t("settings.threshold")} desc={t("settings.thresholdDesc")}>
          <input
            style={{ ...inputStyle, width: 80 }}
            type="number"
            min={1}
            max={10}
            value={(settings.complexity_threshold as number) || 3}
            onChange={(e) => update("complexity_threshold", parseInt(e.target.value))}
          />
        </SettingsRow>
      </SettingsCard>

      <SectionTitle>{t("settings.systemPrompt")}</SectionTitle>
      <SettingsCard>
        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "var(--text-1)" }}>
            {t("settings.systemPromptDesc")}
          </div>
          <textarea
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border-md)",
              borderRadius: "var(--radius)",
              padding: "10px 12px",
              fontSize: 13,
              color: "var(--text-0)",
              width: "100%",
              minHeight: 120,
              resize: "vertical",
              lineHeight: 1.65,
              fontFamily: "var(--mono)",
              transition: "border-color 0.2s",
            }}
            value={(settings.system_prompt as string) || ""}
            onChange={(e) => update("system_prompt", e.target.value)}
            placeholder={t("settings.systemPromptPlaceholder")}
          />
        </div>
      </SettingsCard>

      <button
        onClick={onSave}
        disabled={saving}
        style={{
          background: "var(--accent)",
          color: "#fff",
          borderRadius: "var(--radius)",
          padding: "9px 22px",
          fontSize: 13.5,
          fontWeight: 600,
          transition: "all 0.15s",
          marginTop: 6,
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? t("common.saving") : t("common.saveChanges")}
      </button>
    </div>
  );
}

function UsageTab({ usage }: { usage: UsageData | null }) {
  const t = useLocale((s) => s.t);
  if (!usage) return <div style={{ color: "var(--text-2)" }}>{t("common.loading")}</div>;

  const sonnetCost = usage.model_breakdown.sonnet?.cost || 0;
  const opusCost = usage.model_breakdown.opus?.cost || 0;
  const totalCost = usage.total_cost || 1;

  return (
    <div style={{ animation: "fadeUp 0.2s ease" }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{t("settings.usageTitle")}</div>
      <div style={{ fontSize: 13, color: "var(--text-1)", marginBottom: 28 }}>
        {t("settings.usageDesc")}
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
        <StatCard label={t("settings.totalCost")} value={`$${usage.total_cost.toFixed(2)}`} />
        <StatCard
          label={t("settings.totalTokens")}
          value={`${((usage.total_tokens.input + usage.total_tokens.output) / 1000).toFixed(1)}K`}
          sub={`input ${(usage.total_tokens.input / 1000).toFixed(0)}K / output ${(usage.total_tokens.output / 1000).toFixed(0)}K`}
        />
        <StatCard
          label={t("settings.sessionCount")}
          value={String(usage.session_count)}
          sub={`Sonnet ${usage.model_breakdown.sonnet?.sessions || 0} / Opus ${usage.model_breakdown.opus?.sessions || 0}`}
        />
      </div>

      {/* Model breakdown bars */}
      <UsageBar label="Claude Sonnet" cost={sonnetCost} pct={totalCost > 0 ? (sonnetCost / totalCost) * 100 : 0} color="var(--accent)" />
      <UsageBar label="Claude Opus" cost={opusCost} pct={totalCost > 0 ? (opusCost / totalCost) * 100 : 0} color="#b478f0" />

      {/* Session table */}
      {usage.sessions.length > 0 && (
        <div
          style={{
            background: "var(--bg-1)",
            border: "1px solid var(--border)",
            borderRadius: 11,
            overflow: "hidden",
            marginTop: 6,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 100px 90px",
              padding: "10px 16px",
              borderBottom: "1px solid var(--border)",
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              color: "var(--text-2)",
              letterSpacing: "0.05em",
            }}
          >
            <span>{t("settings.session")}</span>
            <span>{t("settings.model")}</span>
            <span>{t("settings.tokens")}</span>
            <span>{t("settings.cost")}</span>
          </div>
          {usage.sessions.map((s, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 100px 100px 90px",
                padding: "11px 16px",
                borderBottom: "1px solid var(--border)",
                fontSize: 13,
                transition: "background 0.1s",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.session__title || "—"}
              </span>
              <span>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 3,
                    background: s.model.includes("opus") ? "rgba(180,120,240,0.12)" : "var(--accent-dim)",
                    color: s.model.includes("opus") ? "#b478f0" : "var(--accent)",
                  }}
                >
                  {s.model.includes("opus") ? "Opus" : "Sonnet"}
                </span>
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-1)" }}>
                {s.tokens?.toLocaleString()}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-0)" }}>
                ${(s.cost || 0).toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: 11.5, color: "var(--text-1)", marginBottom: 6, fontFamily: "var(--mono)" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function UsageBar({ label, cost, pct, color }: { label: string; cost: number; pct: number; color: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--text-1)",
          marginBottom: 6,
          fontFamily: "var(--mono)",
        }}
      >
        <span>{label}</span>
        <span>${cost.toFixed(2)} ({pct.toFixed(0)}%)</span>
      </div>
      <div style={{ height: 6, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 3, background: color, width: `${pct}%`, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function AppearanceTab({
  settings,
  setSettings,
  onSave,
  saving,
}: {
  settings: Record<string, unknown>;
  setSettings: (s: Record<string, unknown>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const t = useLocale((s) => s.t);
  const update = (key: string, value: unknown) => setSettings({ ...settings, [key]: value });
  const colorMode = (settings.color_mode as string) || "dark";

  const handleColorMode = (mode: string) => {
    update("color_mode", mode);
    if (mode === "light") {
      document.body.classList.add("light-mode");
    } else {
      document.body.classList.remove("light-mode");
    }
  };

  return (
    <div style={{ animation: "fadeUp 0.2s ease" }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{t("settings.appearanceTitle")}</div>
      <div style={{ fontSize: 13, color: "var(--text-1)", marginBottom: 28 }}>
        {t("settings.appearanceDesc")}
      </div>

      <SectionTitle>{t("settings.colorMode")}</SectionTitle>
      <SettingsCard>
        <div style={{ display: "flex", gap: 10, padding: "14px 18px" }}>
          {[
            { key: "dark", label: t("settings.dark") },
            { key: "light", label: t("settings.light") },
            { key: "system", label: t("settings.system") },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => handleColorMode(m.key)}
              style={{
                flex: 1,
                padding: "12px 8px",
                borderRadius: 9,
                border: `2px solid ${colorMode === m.key ? "var(--accent)" : "var(--border-md)"}`,
                background: colorMode === m.key ? "var(--accent-dim)" : "var(--bg-2)",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 36,
                  borderRadius: 6,
                  marginBottom: 8,
                  overflow: "hidden",
                  display: "flex",
                  background:
                    m.key === "dark"
                      ? "linear-gradient(to right, #13131e, #0e0e16)"
                      : m.key === "light"
                      ? "linear-gradient(to right, #ffffff, #f5f5fa)"
                      : "linear-gradient(to bottom right, #13131e 50%, #ffffff 50%)",
                }}
              />
              <div
                style={{
                  fontSize: 12,
                  color: colorMode === m.key ? "var(--accent)" : "var(--text-1)",
                  fontWeight: colorMode === m.key ? 600 : 400,
                }}
              >
                {m.label}
              </div>
            </button>
          ))}
        </div>
      </SettingsCard>

      <SectionTitle>{t("settings.graphSettings")}</SectionTitle>
      <SettingsCard>
        <SettingsRow label={t("settings.nodeAnimation")} desc={t("settings.nodeAnimationDesc")}>
          <Toggle
            checked={(settings.graph_animation as boolean) ?? true}
            onChange={(v) => update("graph_animation", v)}
          />
        </SettingsRow>
        <SettingsRow label={t("settings.gridDisplay")} desc={t("settings.gridDisplayDesc")}>
          <Toggle
            checked={(settings.graph_grid as boolean) ?? true}
            onChange={(v) => update("graph_grid", v)}
          />
        </SettingsRow>
        <SettingsRow label={t("settings.animSpeed")} desc={t("settings.animSpeedDesc")}>
          <select
            style={{ ...selectStyle, width: 130 }}
            value={(settings.animation_speed as string) || "normal"}
            onChange={(e) => update("animation_speed", e.target.value)}
          >
            <option value="slow">{t("settings.speedSlow")}</option>
            <option value="normal">{t("settings.speedNormal")}</option>
            <option value="fast">{t("settings.speedFast")}</option>
          </select>
        </SettingsRow>
      </SettingsCard>

      <button
        onClick={onSave}
        disabled={saving}
        style={{
          background: "var(--accent)",
          color: "#fff",
          borderRadius: "var(--radius)",
          padding: "9px 22px",
          fontSize: 13.5,
          fontWeight: 600,
          transition: "all 0.15s",
          marginTop: 6,
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? t("common.saving") : t("common.saveChanges")}
      </button>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      style={{
        position: "relative",
        width: 40,
        height: 22,
        cursor: "pointer",
        display: "inline-block",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ display: "none" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 11,
          background: checked ? "var(--accent)" : "var(--bg-3)",
          border: `1px solid ${checked ? "var(--accent)" : "var(--border-md)"}`,
          transition: "all 0.2s",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 21 : 3,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }}
      />
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--border-md)",
  borderRadius: "var(--radius)",
  padding: "8px 12px",
  fontSize: 13.5,
  color: "var(--text-0)",
  minWidth: 180,
  transition: "border-color 0.2s",
};

const selectStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--border-md)",
  borderRadius: "var(--radius)",
  padding: "8px 12px",
  fontSize: 13.5,
  color: "var(--text-0)",
  minWidth: 160,
  cursor: "pointer",
};
