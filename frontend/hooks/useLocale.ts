"use client";
import { create } from "zustand";
import { translate, type Locale, type TranslationKey } from "@/lib/i18n";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export const useLocale = create<LocaleState>((set, get) => ({
  locale: "ja",
  setLocale: (locale) => set({ locale }),
  t: (key, params) => translate(get().locale, key, params),
}));
