"use client";

import { useTranslation } from 'react-i18next';

export default function SiteFooter() {
  const { t } = useTranslation('common');
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-white/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <p className="font-semibold text-gray-900">Van Manager</p>
        <p className="text-xs text-gray-500">© {year} {t('footer.tagline')}</p>
      </div>
    </footer>
  );
}
