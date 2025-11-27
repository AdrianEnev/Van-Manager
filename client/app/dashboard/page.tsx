"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../components/auth-provider';
import { getMyVehicles, getMyCharges, getMyPayments, getMyPenalties, type VehicleAssignment, type Charge, type Payment, type Penalty } from '../../lib/api';
import { Button } from 'components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Section, SectionTitle } from 'components/ui/section';
import { EmptyState } from 'components/ui/empty-state';
import { Badge } from 'components/ui/badge';
import { StatCard } from 'components/ui/stat-card';
import { AppShell } from 'components/layout/app-shell';
import { useTranslation } from 'react-i18next';

type TimelineEvent = {
  id: string;
  date: string;
  title: string;
  description: string;
  tone: 'neutral' | 'success' | 'alert';
};

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
          getMyCharges(14),
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

  const outstandingAmount = useMemo(() => {
    return (charges || [])
      .filter((c) => c.status === 'pending' || c.status === 'overdue')
      .reduce((sum, c) => sum + c.amount, 0);
  }, [charges]);

  const paymentsTotal = useMemo(() => {
    return (payments || []).reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const penaltiesActive = useMemo(() => (penalties || []).filter((p) => p.status !== 'paid').length, [penalties]);
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

  const timelineEvents: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = [];
    (charges || []).forEach((c) => {
      events.push({
        id: `charge-${c.id}`,
        date: c.dueDate,
        title: `${currency(c.amount)} • ${c.type.replace('_', ' ')}`,
        description: `${t('labels.due')} ${formatDate(c.dueDate)} (${c.status})`,
        tone: c.status === 'overdue' ? 'alert' : 'neutral',
      });
    });
    (payments || []).forEach((p) => {
      events.push({
        id: `payment-${p.id}`,
        date: p.createdAt,
        title: `${currency(p.amount)} • ${p.method}`,
        description: `${t('labels.on')} ${formatDateTime(p.createdAt)}`,
        tone: 'success',
      });
    });
    (penalties || []).forEach((pe) => {
      events.push({
        id: `penalty-${pe.id}`,
        date: pe.createdAt,
        title: `${currency(pe.amount)} • ${pe.reason}`,
        description: pe.dueDate ? `${t('labels.due')} ${formatDate(pe.dueDate)}` : t('penaltiesPage.title'),
        tone: pe.status === 'paid' ? 'success' : 'alert',
      });
    });
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  }, [charges, payments, penalties, t]);

  const upcomingTasks = useMemo(() => {
    const tasks: { title: string; detail: string }[] = [];
    (charges || [])
      .filter((c) => c.status === 'pending' || c.status === 'overdue')
      .slice(0, 3)
      .forEach((c) => tasks.push({
        title: `${t('dashboard.paymentsDue')}`,
        detail: `${currency(c.amount)} • ${formatDate(c.dueDate)}`,
      }));
    motAlerts.slice(0, 3).forEach((a) => tasks.push({
      title: `${t('dashboard.motSoon')}`,
      detail: `${a.vehicle.plateNumber} • ${a.vehicle.motExpiry ? formatDate(a.vehicle.motExpiry) : ''}`,
    }));
    return tasks;
  }, [charges, motAlerts, t]);

  function currency(amount: number) {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(amount);
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString();
  }

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString();
  }

  if (!authed && !loading) {
    return <div className="space-y-2 text-center"><p>{t('access.loginToView')}</p></div>;
  }

  return (
    <AppShell
      overline="Driver portal"
      title={t('dashboard.title')}
      subtitle={t('dashboard.subtitle')}
      actions={(
        <div className="flex flex-wrap gap-2">
          {outstandingAmount > 0 && (
            <Button size="sm" onClick={() => {/* placeholder */}}>{t('actions.payOutstanding')}</Button>
          )}
        </div>
      )}
      heroSlot={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary">{t('actions.contactSupport')}</Button>
          {user?.role === 'admin' && (
            <Button size="sm" variant="ghost" asChild>
              <a href="/admin">{t('actions.switchToAdmin')}</a>
            </Button>
          )}
        </div>
      }
    >
      {error && <div className="text-sm text-red-600">{error}</div>}

      <Section>
        <SectionTitle>{t('dashboard.quickStats')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t('dashboard.statVehicles')} value={vehicles?.length || 0} description={t('vehiclesPage.assigned')} />
          <StatCard label={t('dashboard.statOutstanding')} value={currency(outstandingAmount)} description={t('dashboard.payments')} trend={outstandingAmount > 0 ? { direction: 'up', label: t('dashboard.paymentsDue') } : undefined} />
          <StatCard label={t('dashboard.statPayments')} value={currency(paymentsTotal)} description={t('financePage.payments')} trend={{ direction: 'neutral', label: `${payments?.length || 0} trx` }} />
          <StatCard label={t('dashboard.statPenalties')} value={penaltiesActive} description={t('dashboard.penalties')} trend={penaltiesActive ? { direction: 'up', label: t('dashboard.noPenalties') } : undefined} />
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section className="lg:col-span-2">
          <SectionTitle>{t('dashboard.timeline')}</SectionTitle>
          <Card>
            <CardContent className="space-y-4 py-5">
              {timelineEvents.length === 0 && <EmptyState title={t('dashboard.noActivity')} description={t('dashboard.subtitle')} />}
              {timelineEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border px-3 py-3 sm:px-4">
                  <div className="flex gap-3">
                    <span
                      className={`mt-1 inline-flex h-2 w-2 shrink-0 rounded-full ${event.tone === 'alert' ? 'bg-red-500' : event.tone === 'success' ? 'bg-green-500' : 'bg-gray-400'}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-600">{event.description}</p>
                    </div>
                  </div>
                  <span className="mt-2 block text-xs text-gray-500 sm:mt-1 sm:text-right">{formatDate(event.date)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </Section>

        <Section>
          <SectionTitle>{t('dashboard.tasks')}</SectionTitle>
          <Card>
            <CardContent className="space-y-4 py-5">
              {upcomingTasks.length === 0 && (
                <EmptyState title={t('dashboard.noActivity')} description={t('dashboard.subtitle')} />
              )}
              {upcomingTasks.map((task, idx) => (
                <div key={`${task.title}-${idx}`} className="rounded-2xl border bg-gray-50 px-3 py-3">
                  <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                  <p className="text-xs text-gray-600">{task.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </Section>
      </div>

      <Section>
        <SectionTitle>{t('dashboard.vehicles')}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {vehicles?.length ? (
            vehicles.map((a) => (
              <Card key={a.assignmentId} className="border-2 border-transparent transition hover:border-gray-200">
                <CardHeader>
                  <CardTitle className="text-xl">{a.vehicle.plateNumber}</CardTitle>
                  <p className="text-sm text-gray-500">{a.vehicle.makeModel || t('vehiclesPage.notes')}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-600">
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
      </Section>

      <Section>
        <SectionTitle>{t('dashboard.penalties')}</SectionTitle>
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
      </Section>
    </AppShell>
  );
}
