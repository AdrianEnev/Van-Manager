"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from './auth-provider';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './i18n/language-switcher';

export default function Header() {
  const { authed, user, refresh, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation('common');

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  async function onLogout() {
    try {
      await logout();
    } finally {
      if (typeof window !== 'undefined') window.location.href = '/';
    }
  }

  function MobileNavContent() {
    return (
      <div className="flex h-full w-80 max-w-[80vw] flex-col bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Link href="/" onClick={() => setOpen(false)} className="font-semibold">{t('appName')}</Link>
          <button aria-label={t('actions.close')} onClick={() => setOpen(false)} className="rounded p-2 hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {authed && user ? (
            <div className="space-y-1">
              {user.role === 'user' && (
                <>
                  <MobileLink href="/dashboard" label={t('nav.dashboard')} onClick={() => setOpen(false)} />
                  <MobileLink href="/vehicles" label={t('nav.vehicles')} onClick={() => setOpen(false)} />
                  <MobileLink href="/finance" label={t('nav.finance')} onClick={() => setOpen(false)} />
                  <MobileLink href="/penalties" label={t('nav.penalties')} onClick={() => setOpen(false)} />
                </>
              )}
              {user.role === 'admin' && (
                <MobileLink href="/admin" label={t('nav.admin')} onClick={() => setOpen(false)} />
              )}
              <div className="mt-3 border-t pt-3">
                <MobileLink href="/account" label={t('nav.account')} onClick={() => setOpen(false)} />
                <button onClick={onLogout} className="mt-1 w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-gray-50">{t('nav.logout')}</button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <MobileLink href="/login" label={t('nav.login')} onClick={() => setOpen(false)} />
              <MobileLink href="/register" label={t('nav.register')} onClick={() => setOpen(false)} />
            </div>
          )}
        </nav>
        <div className="border-t px-4 py-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">© {new Date().getFullYear()} {t('appName')}</div>
          <LanguageSwitcher layout="inline" />
        </div>
      </div>
    );
  }

  function MobileLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
    return (
      <Link href={href as any} onClick={onClick} className="block rounded-md px-3 py-2 text-sm text-gray-800 hover:bg-gray-50">
        {label}
      </Link>
    );
  }

  return (
    <>
    <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Left: Brand + Desktop Nav */}
        <div className="flex items-center gap-3">
          {/* Mobile: hamburger */}
          <button
            className="-ml-2 rounded p-2 hover:bg-gray-100 sm:hidden"
            aria-label={t('actions.openMenu')}
            onClick={() => setOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/" className="font-semibold">{t('appName')}</Link>

          {/* Desktop nav */}
          <nav className="ml-4 hidden items-center gap-4 sm:flex">
            {authed && user && (
              <>
                {user.role === 'user' && (
                  <>
                    <Link href="/dashboard" className="text-sm text-gray-700 hover:text-black">{t('nav.dashboard')}</Link>
                    <Link href="/vehicles" className="text-sm text-gray-700 hover:text-black">{t('nav.vehicles')}</Link>
                    <Link href="/finance" className="text-sm text-gray-700 hover:text-black">{t('nav.finance')}</Link>
                    <Link href="/penalties" className="text-sm text-gray-700 hover:text-black">{t('nav.penalties')}</Link>
                  </>
                )}
                {user.role === 'admin' && (
                  <Link href="/admin" className="text-sm text-gray-700 hover:text-black">{t('nav.admin')}</Link>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Right: Actions (desktop) */}
        <div className="hidden items-center gap-3 sm:flex">
          <LanguageSwitcher />
          {authed && user ? (
            <>
              <Button size="sm" variant="secondary" asChild>
                <Link href="/account">{t('nav.account')}</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={onLogout}>{t('nav.logout')}</Button>
            </>
          ) : (
            <>
              <Button size="sm" asChild>
                <Link href="/login">{t('nav.login')}</Link>
              </Button>
              <Button size="sm" variant="secondary" asChild>
                <Link href="/register">{t('nav.register')}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Right: actions condensed on mobile (account shown in drawer) */}
        <div className="sm:hidden" />
      </div>
    </header>
    {/* Mobile drawer overlay (outside header to avoid stacking context issues) */}
    {open && (
      <div aria-hidden className="fixed inset-0 z-[90] bg-black/30" onClick={() => setOpen(false)} />
    )}
    {/* Mobile drawer panel */}
    <div
      className={`fixed inset-y-0 left-0 z-[100] transform transition-transform duration-200 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      role="dialog"
      aria-modal="true"
    >
      <MobileNavContent />
    </div>
    </>
  );
}
