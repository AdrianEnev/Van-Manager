"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { setLanguage } from "./i18n";

export default function LanguageSwitcher({ layout = "inline" }: { layout?: "inline" | "stack" }) {
  const { i18n } = useTranslation();
  const [lang, setLangState] = useState<"en" | "bg">("en");

  useEffect(() => {
    const current = (i18n.language?.startsWith("bg") ? "bg" : "en") as "en" | "bg";
    setLangState(current);
  }, [i18n.language]);

  function change(to: "en" | "bg") {
    setLangState(to);
    setLanguage(to);
  }

  const wrapper = layout === "stack" ? "flex flex-col gap-1" : "flex items-center gap-2";

  return (
    <div className={wrapper}>
      <button
        onClick={() => change("en")}
        className={`rounded px-2 py-1 text-xs ${lang === "en" ? "bg-black text-white" : "border"}`}
      >
        EN
      </button>
      <button
        onClick={() => change("bg")}
        className={`rounded px-2 py-1 text-xs ${lang === "bg" ? "bg-black text-white" : "border"}`}
      >
        BG
      </button>
    </div>
  );
}
