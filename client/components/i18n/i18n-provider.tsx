"use client";

import React, { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { ensureI18n } from "./i18n";

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureI18n();
  }, []);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
