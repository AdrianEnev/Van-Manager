"use client";

import type { ReactNode } from 'react';
import Header from './header';
import SiteFooter from './site-footer';
import { useVehicleAccess } from './vehicle-access-provider';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';
import { useAuth } from './auth-provider';

import { usePathname } from 'next/navigation';

export default function AppFrame({ children }: { children: ReactNode }) {
    const { awaitingApproval, shouldRestrict, checking, error, refreshStatus } = useVehicleAccess();
    const { user } = useAuth();
    const pathname = usePathname();
    const showAwaitingPanel = user?.role === 'user' && shouldRestrict;

    const isAuthPage = ['/login', '/register', '/forgot-password'].includes(pathname || '');

    return (
        <div className="flex min-h-screen flex-col bg-gray-100">
            <Header />
            {isAuthPage ? (
                <main className="flex-1 w-full">
                    {children}
                </main>
            ) : (
                <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 lg:px-6">
                    <div className="space-y-10">
                        {showAwaitingPanel ? (
                            <AwaitingApprovalPanel awaitingApproval={awaitingApproval} checking={checking} error={error} onRetry={refreshStatus} />
                        ) : (
                            children
                        )}
                    </div>
                </main>
            )}
            {!isAuthPage && <SiteFooter />}
        </div>
    );
}

type AwaitingApprovalPanelProps = {
    awaitingApproval: boolean;
    checking: boolean;
    error: string | null;
    onRetry: () => Promise<void>;
};

function AwaitingApprovalPanel({ awaitingApproval, checking, error, onRetry }: AwaitingApprovalPanelProps) {
    const { t } = useTranslation('common');
    const isError = !!error && !checking;

    return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{t('appName')}</p>
            <h1 className="mt-4 text-3xl font-semibold text-slate-900">
                {awaitingApproval ? t('access.awaitingApprovalTitle', 'Awaiting account approval') : t('access.accountCheckTitle', 'Checking your account')}
            </h1>
            <p className="mt-2 text-base text-slate-600">
                {isError
                    ? error
                    : awaitingApproval
                        ? t('access.awaitingApprovalDescription', 'Your profile is awaiting activation. An administrator will assign a vehicle to unlock your dashboard.')
                        : t('access.accountCheckDescription', 'Please hold on while we verify your access. This will only take a moment.')}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button onClick={onRetry} disabled={checking} variant="secondary">
                    {checking ? t('actions.loading', 'Loading...') : t('actions.refreshStatus', 'Refresh status')}
                </Button>
            </div>
        </div>
    );
}
