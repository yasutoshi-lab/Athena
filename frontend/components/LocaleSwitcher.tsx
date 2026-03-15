"use client";
import { useLocale } from "@/hooks/useLocale";
import type { Locale } from "@/lib/i18n";

const locales: { value: Locale; label: string }[] = [
  { value: "ja", label: "JP" },
  { value: "en", label: "EN" },
];

export default function LocaleSwitcher() {
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);

  return (
    <div style={{ display: "flex", gap: 2, background: "var(--bg-2)", borderRadius: 6, padding: 2 }}>
      {locales.map((l) => (
        <button
          key={l.value}
          type="button"
          onClick={() => setLocale(l.value)}
          style={{
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
            background: locale === l.value ? "var(--accent)" : "transparent",
            color: locale === l.value ? "#fff" : "var(--text-1)",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
