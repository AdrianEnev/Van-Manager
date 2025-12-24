"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
                    <Link href="/contact">
                        <Button size="sm" variant="secondary">
                            {t('actions.contactSupport')}
                        </Button>
                    </Link>
                </div>
            }
        >
            {error && <div className="text-sm text-red-600">{error}</div>}

            {/* Payment Timeline */}
            {charges && payments && (
                <Section>
                    <SectionTitle>Payment Status</SectionTitle>
                    <PaymentTimeline
                        charges={charges}
                        payments={payments}
                        isTransactionAllowed={user?.isTransactionAllowed}
                    />
                </Section>
            )}

            {/* Overdue Payment Alert Banner */}
            {overdueCharges.length > 0 && (
                <NotificationBanner
                    variant="error"
                    title={`⚠️ ${overdueCharges.length} Overdue Payment${overdueCharges.length > 1 ? 's' : ''}`}
                    message={`You have ${currency(overdueCharges.reduce((sum, c) => sum + c.amount, 0))} in overdue charges. Please make payment as soon as possible to avoid additional fees.`}
                    actionLabel="Pay Now"
                    onAction={() => {
                        const firstOverdue = overdueCharges[0];
                        if (firstOverdue?.id) {
                            document.getElementById(`charge-${firstOverdue.id}`)?.scrollIntoView({ behavior: 'smooth' });
                        }
                    }}
                />
            )}

            <Section>
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Vehicles */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">{t('dashboard.vehicles')}</h3>
                        <div className="grid gap-3">
                            {vehicles?.length ? (
                                vehicles.map((a) => (
                                    <Card key={a.assignmentId} className="border-2 border-transparent transition hover:border-gray-200">
                                        <CardHeader>
                                            <CardTitle className="text-lg">{a.vehicle.plateNumber}</CardTitle>
                                            <p className="text-sm text-gray-500">{a.vehicle.makeModel || t('vehiclesPage.notes')}</p>
                                        </CardHeader>
                                        <CardContent className="space-y-1 text-sm text-gray-600">
                                            <p>{t('vehiclesPage.assignment')}: {formatDate(a.assignedAt)}</p>
                                            {a.vehicle.motExpiry && <p>{t('vehiclesPage.mot')}: {formatDate(a.vehicle.motExpiry)}</p>}
                                            {a.vehicle.notes && <p>{t('vehiclesPage.notes')}: {a.vehicle.notes}</p>}
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <EmptyState title={t('dashboard.noVehicles')} description={t('vehiclesPage.assigned')} />
                            )}
                        </div>
                    </div>

                    {/* Penalties */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3">{t('dashboard.penalties')}</h3>
                        <div className="grid gap-3">
                            {penalties?.length ? (
                                penalties.map((pe) => (
                                    <Card key={pe.id}>
                                        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="font-medium">{currency(pe.amount)} — {pe.reason}</div>
                                                {pe.dueDate && <div className="text-sm text-gray-600">{t('labels.due')} {formatDate(pe.dueDate)}</div>}
                                            </div>
                                            <Badge tone={pe.status === 'paid' ? 'green' : pe.status === 'waived' ? 'blue' : 'yellow'}>{pe.status}</Badge>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <EmptyState title={t('dashboard.noPenalties')} description={t('penaltiesPage.active')} />
                            )}
                        </div>
                    </div>
                </div>
            </Section>

            {/* Action Required Section - Overdue Charges */}
            {/*
                {overdueCharges.length > 0 && (
                    <Section>
                        <SectionTitle className="text-red-700">🚨 Action Required - Overdue Payments</SectionTitle>
                        <div className="space-y-3">
                            {overdueCharges.map((charge) => {
                                const daysOverdue = getDaysOverdue(charge.dueDate);
                                return (
                                    <Card
                                        key={charge.id}
                                        id={`charge-${charge.id}`}
                                        className="border-2 border-red-300 bg-red-50"
                                    >
                                        <CardContent className="py-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-xl font-bold text-red-900">{currency(charge.amount)}</h3>
                                                        <Badge tone="red" size="lg" variant="bold">OVERDUE</Badge>
                                                    </div>
                                                    <p className="text-sm text-red-800 font-medium">
                                                        {charge.type.replace('_', ' ').toUpperCase()}
                                                    </p>
                                                    <p className="text-sm text-red-700 mt-1">
                                                        Due: {formatDate(charge.dueDate)} • <span className="font-semibold">{daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue</span>
                                                    </p>
                                                </div>
                                                {user?.isTransactionAllowed && (
                                                    <div className="shrink-0">
                                                        <PayChargeButton
                                                            chargeId={charge.id}
                                                            amount={charge.amount}
                                                            className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                                                        >
                                                            Pay {currency(charge.amount)}
                                                        </PayChargeButton>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </Section>
                )}
            */}

            {motTasks.length > 0 && (
                <Section>
                    <SectionTitle>Vehicle Alerts</SectionTitle>
                    <Card>
                        <CardContent className="space-y-4 py-5">
                            {motTasks.map((task, idx) => (
                                <div key={`${task.title}-${idx}`} className="rounded-2xl border bg-amber-50 border-amber-200 px-3 py-3">
                                    <p className="text-sm font-semibold text-amber-900">{task.title}</p>
                                    <p className="text-xs text-amber-700">{task.detail}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </Section>
            )}
        </AppShell >
    );
}
