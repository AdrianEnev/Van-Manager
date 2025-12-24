"use client";

import Link from 'next/link';
import type { Route } from 'next';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './i18n/language-switcher';
import { useVehicleAccess } from './vehicle-access-provider';

type NavLinkItem = {
    href: Route;
    label: string;
};

export default function Header() {
    const { authed, user, refresh, logout } = useAuth();
    const { shouldRestrict } = useVehicleAccess();
    const [open, setOpen] = useState(false);
    const { t } = useTranslation('common');
    const pathname = usePathname();

    useEffect(() => {
        refresh().catch(() => { });
    }, [refresh]);

    async function onLogout() {
        try {
            await logout();
        } finally {
            if (typeof window !== 'undefined') window.location.href = '/';
        }
    }

    const primaryNav: NavLinkItem[] = authed && user && !shouldRestrict
        ? user.role === 'admin'
            ? []
            : []
        : [];

    const guestLinks: NavLinkItem[] = [
        { href: '/login', label: t('nav.login') },
        { href: '/register', label: t('nav.register') },
    ];

    function renderDesktopAuth() {
        if (!authed || !user) {
            return (
                <div className="hidden items-center gap-2 sm:flex">
                    {guestLinks.map((item) => (
                        <Button key={item.href} size="sm" variant={item.href === '/register' ? 'secondary' : 'outline'} asChild>
                            <Link href={item.href}>{item.label}</Link>
                        </Button>
                    ))}
                </div>
            );
        }
        if (shouldRestrict) {
            return (
                <div className="hidden items-center gap-3 sm:flex">
                    <Button variant="outline" size="sm" onClick={onLogout}>{t('nav.logout')}</Button>
                </div>
            );
        }
        return (
            <div className="hidden items-center gap-3 sm:flex">
                <Button size="sm" variant="secondary" asChild>
                    <Link href="/account">{t('nav.account')}</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={onLogout}>{t('nav.logout')}</Button>
            </div>
        );
    }

    function DesktopNav() {
        if (!primaryNav.length) return null;
        return (
            <nav className="ml-6 hidden items-center gap-3 md:flex" aria-label={t('header.primaryNav')}>
                {primaryNav.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                            'text-sm font-medium text-gray-600 transition hover:text-gray-900',
                            pathname?.startsWith(item.href) && 'text-gray-900'
                        )}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>
        );
    }

    function MobileNav() {
        if (shouldRestrict) return null;
        const items = primaryNav.length ? primaryNav : guestLinks;
        return (
            <>
                <div
                    aria-hidden
                    className={clsx('fixed inset-0 z-[90] bg-black/30 transition-opacity', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
                    onClick={() => setOpen(false)}
                />
                <div
                    className={clsx(
                        'fixed inset-y-0 left-0 z-[100] w-80 max-w-[80vw] transform bg-white shadow-xl transition-transform duration-200 ease-out',
                        open ? 'translate-x-0' : '-translate-x-full'
                    )}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <Link href="/" className="text-lg font-semibold" onClick={() => setOpen(false)}>
                            {t('appName')}
                        </Link>
                        <button
                            aria-label={t('actions.close')}
                            className="rounded p-2 hover:bg-gray-100"
                            onClick={() => setOpen(false)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                        {authed && user && (
                            <div className="mb-4 rounded-xl border bg-gray-50 px-4 py-3">
                                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                                {user.role !== 'admin' && <p className="text-xs uppercase tracking-wide text-gray-500">{t('nav.account')}</p>}
                            </div>
                        )}
                        <nav className="space-y-1" aria-label={t('header.primaryNav')}>
                            {items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    className={clsx(
                                        'block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100',
                                        pathname?.startsWith(item.href) && 'bg-gray-100 text-gray-900'
                                    )}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                        <div className="mt-6 space-y-2">
                            {authed && user ? (
                                <>
                                    <Button className="w-full" variant="secondary" asChild>
                                        <Link href="/account" onClick={() => setOpen(false)}>
                                            {t('nav.account')}
                                        </Link>
                                    </Button>
                                    <Button className="w-full" variant="outline" onClick={onLogout}>
                                        {t('nav.logout')}
                                    </Button>
                                </>
                            ) : (
                                guestLinks.map((item) => (
                                    <Button key={item.href} className="w-full" variant={item.href === '/register' ? 'secondary' : 'default'} asChild>
                                        <Link href={item.href} onClick={() => setOpen(false)}>
                                            {item.label}
                                        </Link>
                                    </Button>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-gray-500">
                        <span>© {new Date().getFullYear()} {t('appName')}</span>
                        <LanguageSwitcher layout="inline" />
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 lg:px-6">
                    <div className="flex items-center gap-3">
                        {!shouldRestrict && (
                            <button
                                className="-ml-2 rounded p-2 hover:bg-gray-100 md:hidden"
                                aria-label={t('actions.openMenu')}
                                onClick={() => setOpen(true)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        )}
                        {user?.role === 'admin' ? (
                            <div className="text-lg font-semibold">{t('appName')}</div>
                        ) : (
                            <Link href="/" className="text-lg font-semibold">
                                {t('appName')}
                            </Link>
                        )}
                        {!shouldRestrict && <DesktopNav />}
                    </div>
                    <div className="flex items-center gap-3">
                        {!shouldRestrict && (
                            <div className="hidden sm:block">
                                <LanguageSwitcher />
                            </div>
                        )}
                        {renderDesktopAuth()}
                    </div>
                </div>
            </header>
            {!shouldRestrict && <MobileNav />}
        </>
    );
}
