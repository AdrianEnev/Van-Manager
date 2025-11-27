"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../../locales/en/common.json";
import bg from "../../locales/bg/common.json";

const STORAGE_KEY = "app_lang";

function detectLanguage(): "en" | "bg" {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(STORAGE_KEY) as "en" | "bg" | null;
  if (saved === "en" || saved === "bg") return saved;
  const nav = window.navigator?.language?.toLowerCase?.() || "en";
  if (nav.startsWith("bg")) return "bg";
  return "en";
}

export function setLanguage(lang: "en" | "bg") {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, lang);
  }
  i18n.changeLanguage(lang);
}

let initialized = false;

export function ensureI18n() {
  if (initialized) return i18n;
  initialized = true;
  const lng = detectLanguage();
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { common: en },
        bg: { common: bg },
      },
      lng,
      fallbackLng: "en",
      ns: ["common"],
      defaultNS: "common",
      interpolation: { escapeValue: false },
      returnNull: false,
      react: { useSuspense: false }
    });
  return i18n;
}

// Initialize immediately to avoid first-render stalls
ensureI18n();

export default i18n;
