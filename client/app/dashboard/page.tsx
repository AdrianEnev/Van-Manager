"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useAuth } from '../../components/auth-provider';
import { getMyVehicles, getMyCharges, getMyPayments, getMyPenalties, type VehicleAssignment, type Charge, type Payment, type Penalty } from '../../lib/api';
import { Button } from 'components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Section, SectionTitle } from 'components/ui/section';
import { EmptyState } from 'components/ui/empty-state';
import { Badge } from 'components/ui/badge';
import { AppShell } from 'components/layout/app-shell';
import { useTranslation } from 'react-i18next';
import { PayChargeButton } from '../../components/pay-charge-button';
import { NotificationBanner } from '../../components/notification-banner';
import { PaymentTimeline } from '../../components/payment-timeline';



export default function DashboardPage() {
    const { user, authed, loading } = useAuth();
    const [vehicles, setVehicles] = useState<VehicleAssignment[] | null>(null);
    const [charges, setCharges] = useState<Charge[] | null>(null);
    const [payments, setPayments] = useState<Payment[] | null>(null);
    const [penalties, setPenalties] = useState<Penalty[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation('common');

    useEffect(() => {
        let mounted = true;
        async function load() {
            try {
                const [v, c, p, pe] = await Promise.all([
                    getMyVehicles(),
                    getMyCharges(60),
                    getMyPayments(14),
                    getMyPenalties(),
                ]);
                if (!mounted) return;
                setVehicles(v);
                setCharges(c);
                setPayments(p);
                setPenalties(pe);
            } catch (e: any) {
                if (!mounted) return;
                setError(e?.message || 'Failed to load dashboard');
            }
        }
        if (authed) load();
        return () => { mounted = false; };
    }, [authed]);

    const overdueCharges = useMemo(() => {
        return (charges || []).filter((c) => c.status === 'overdue');
    }, [charges]);


    const motAlerts = useMemo(() => {
        const now = new Date();
        const inThirty = new Date(now);
        inThirty.setDate(now.getDate() + 30);
        return (vehicles || []).filter((a) => {
            if (!a.vehicle.motExpiry) return false;
            const expiry = new Date(a.vehicle.motExpiry);
            return expiry >= now && expiry <= inThirty;
        });
    }, [vehicles]);



    const motTasks = useMemo(() => {
        const tasks: { title: string; detail: string }[] = [];
        motAlerts.slice(0, 5).forEach((a) => tasks.push({
            title: `${t('dashboard.motSoon')}`,
            detail: `${a.vehicle.plateNumber} • ${a.vehicle.motExpiry ? formatDate(a.vehicle.motExpiry) : ''}`,
        }));
        return tasks;
    }, [motAlerts, t]);

    function currency(amount: number) {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(amount);
    }

    function formatDate(value: string) {
        return new Date(value).toLocaleDateString();
    }

    function formatDateTime(value: string) {
        return new Date(value).toLocaleString();
    }

    function getDaysOverdue(dueDate: string): number {
        const due = new Date(dueDate);
        const now = new Date();
        const diffTime = now.getTime() - due.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }

    // Redirect admins to admin console
    useEffect(() => {
        if (user?.role === 'admin') {
            window.location.href = '/admin';
        }
    }, [user]);

    if (!authed && !loading) {
        return <div className="space-y-2 text-center"><p>{t('access.loginToView')}</p></div>;
    }

    // Don't render dashboard for admins (they'll be redirected)
    if (user?.role === 'admin') {
        return null;
    }

    return (
        <AppShell
            overline="Driver portal"
            title={t('dashboard.title')}
            subtitle={t('dashboard.subtitle')}
            actions={(
                <div className="flex flex-wrap gap-2">
                    {user?.isTransactionAllowed && charges && charges.some(c => c.status === 'pending' || c.status === 'overdue') && (
                        <PayChargeButton
                            chargeId={charges?.find(c => c.status === 'pending' || c.status === 'overdue')?.id || ''}
                            amount={charges?.find(c => c.status === 'pending' || c.status === 'overdue')?.amount || 0}
                            size="sm"
                        >
                            {t('actions.payOutstanding')}
                        </PayChargeButton>
                    )}
                </div>
            )}
            heroSlot={
                <div className="flex flex-wrap gap-2">
                    <Link href={"/contact" as any}>
                        <Button size="sm" variant="secondary">
                            {t('actions.contactSupport')}
                        </Button>
                    </Link>
                </div>
            }
        >
            {/* Dashboard Content */}
            <div className="space-y-8">

                {/* Row 1: Payment Status Section (Full Width) */}
                {charges && payments && (
                    <Section>
                        <SectionTitle className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
                            <span>💳</span> Payment Status
                        </SectionTitle>
                        <PaymentTimeline
                            charges={charges}
                            payments={payments}
                            isTransactionAllowed={user?.isTransactionAllowed ?? true}
                        />
                    </Section>
                )}

                {/* Row 2: Vehicles & Penalties (Side by Side) */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Vehicles Column */}
                    <Section className="h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <span>🚛</span> {t('dashboard.vehicles')}
                            </h3>
                            {vehicles && <Badge tone="gray" className="rounded-full px-3">{vehicles.length}</Badge>}
                        </div>
                        <div className="space-y-4">
                            {vehicles?.length ? (
                                vehicles.map((a) => (
                                    <div key={a.assignmentId} className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-md shadow-gray-200/50 transition-all hover:-translate-y-1 hover:shadow-xl">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" /></svg>
                                        </div>
                                        <h4 className="text-2xl font-bold text-gray-900">{a.vehicle.plateNumber}</h4>
                                        <p className="font-medium text-gray-500 mb-4">{a.vehicle.makeModel || t('vehiclesPage.notes')}</p>

                                        <div className="space-y-2 text-sm text-gray-600 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400">📅</span>
                                                <span>Assigned: <span className="font-semibold text-gray-900">{formatDate(a.assignedAt)}</span></span>
                                            </div>
                                            {a.vehicle.motExpiry && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400">🔧</span>
                                                    <span>MOT: <span className={clsx("font-semibold", new Date(a.vehicle.motExpiry) < new Date() ? "text-red-600" : "text-gray-900")}>{formatDate(a.vehicle.motExpiry)}</span></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyState title={t('dashboard.noVehicles')} description={t('vehiclesPage.assigned')} />
                            )}
                        </div>
                    </Section>

                    {/* Penalties Column */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-md shadow-gray-200/50 h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <span>⚖️</span> {t('dashboard.penalties')}
                            </h3>
                            {penalties && penalties.length > 0 && <Badge tone="gray" className="rounded-full px-3">{penalties.length}</Badge>}
                        </div>
                        <div className="space-y-3">
                            {penalties?.length ? (
                                penalties.map((pe) => (
                                    <div key={pe.id} className="group relative rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition hover:bg-white hover:shadow-md">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xl font-bold text-gray-900">{currency(pe.amount)}</span>
                                            <Badge tone={pe.status === 'paid' ? 'green' : pe.status === 'waived' ? 'blue' : 'yellow'}>{pe.status}</Badge>
                                        </div>
                                        <p className="font-medium text-gray-700">{pe.reason}</p>
                                        {pe.dueDate && <p className="text-xs text-gray-400 mt-2">Due {formatDate(pe.dueDate)}</p>}
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <p className="text-5xl mb-4">🎉</p>
                                    <p className="text-lg font-bold text-gray-900">{t('dashboard.noPenalties')}</p>
                                    <p className="text-sm text-gray-500">You're doing great!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppShell >
    );
}
