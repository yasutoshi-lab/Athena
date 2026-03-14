import ja, { type TranslationKey } from "./ja";
import en from "./en";

export type Locale = "ja" | "en";
export type { TranslationKey };

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { ja, en };

export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  let text = dictionaries[locale]?.[key] ?? dictionaries.ja[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
