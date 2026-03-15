"use client";
import { create } from "zustand";
import { translate, type Locale, type TranslationKey } from "@/lib/i18n";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

function makeT(locale: Locale) {
  return (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(locale, key, params);
}

export const useLocale = create<LocaleState>((set) => ({
  locale: "ja",
  t: makeT("ja"),
  setLocale: (locale) => set({ locale, t: makeT(locale) }),
}));
