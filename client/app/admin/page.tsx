"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useAuth } from '../../components/auth-provider';
import { AdminAppShell } from 'components/layout/admin-app-shell';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { StatCard } from 'components/ui/stat-card';
import { EmptyState } from 'components/ui/empty-state';
import {
  adminListVehicles,
  adminListCharges,
  adminListPayments,
  adminListPenalties,
  adminListPlans,
  type Vehicle,
  type Charge,
  type Payment,
  type Penalty,
  type Plan,
} from '../../lib/api';

type WorkQueueItem = { label: string; meta: string };
type WorkQueue = { title: string; description: string; action: Route; items: WorkQueueItem[] };

export default function AdminHome() {
  const { user, authed, loading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!authed || user?.role !== 'admin') return;
    let cancelled = false;
    async function load() {
      setDataLoading(true);
      setError(null);
      try {
        const [vehicleList, chargeList, paymentList, penaltyList, planList] = await Promise.all([
          adminListVehicles(),
          adminListCharges({}),
          adminListPayments({}),
          adminListPenalties({}),
          adminListPlans({}),
        ]);
        if (cancelled) return;
        setVehicles(vehicleList);
        setCharges(chargeList);
        setPayments(paymentList);
        setPenalties(penaltyList);
        setPlans(planList);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load admin data');
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [authed, user?.role]);

  if (!loading && (!authed || user?.role !== 'admin')) {
    return <div className="text-center text-sm text-red-600">Forbidden: admin only</div>;
  }

  const activeVehicles = useMemo(() => vehicles.filter((v) => v.status === 'active').length, [vehicles]);
  const fleetUtilization = vehicles.length ? `${Math.round((activeVehicles / vehicles.length) * 100)}%` : '0%';
  const overdueCharges = useMemo(() => charges.filter((c) => c.status === 'overdue'), [charges]);
  const outstandingAmount = useMemo(
    () => charges.filter((c) => c.status === 'pending' || c.status === 'overdue').reduce((sum, c) => sum + c.amount, 0),
    [charges]
  );
  const motDueSoon = useMemo(() => {
    const now = new Date();
    const limit = new Date(now);
    limit.setDate(now.getDate() + 30);
    return vehicles.filter((v) => {
      if (!v.motExpiry) return false;
      const expiry = new Date(v.motExpiry);
      return expiry >= now && expiry <= limit;
    });
  }, [vehicles]);
  const pendingPenalties = useMemo(() => penalties.filter((p) => p.status === 'pending'), [penalties]);
  const recentPayments = useMemo(() => payments.slice(0, 5), [payments]);
  const activePlans = useMemo(() => plans.filter((p) => p.active).length, [plans]);

  const workQueues: WorkQueue[] = useMemo(() => [
    {
      title: 'MOT expiring soon',
      description: `${motDueSoon.length} vehicles within 30 days`,
      action: '/admin/vehicles',
      items: motDueSoon.slice(0, 4).map((v) => ({
        label: `${v.plateNumber}${v.makeModel ? ` — ${v.makeModel}` : ''}`,
        meta: v.motExpiry ? `MOT ${formatDate(v.motExpiry)}` : 'No MOT date',
      })),
    },
    {
      title: 'Overdue charges',
      description: `${overdueCharges.length} outstanding`,
      action: '/admin/charges',
      items: overdueCharges.slice(0, 4).map((c) => ({
        label: `${formatCurrency(c.amount)} • ${c.type.replace('_', ' ')}`,
        meta: formatDate(c.dueDate),
      })),
    },
    {
      title: 'Pending penalties',
      description: `${pendingPenalties.length} awaiting action`,
      action: '/admin/penalties',
      items: pendingPenalties.slice(0, 4).map((p) => ({
        label: `${formatCurrency(p.amount)} • ${p.reason}`,
        meta: p.dueDate ? formatDate(p.dueDate) : 'No due date',
      })),
    },
  ], [motDueSoon, overdueCharges, pendingPenalties]);

  const shortcuts: { href: Route; title: string; copy: string }[] = [
    { href: '/admin/vehicles', title: 'Vehicles', copy: 'Manage fleet, MOT, status' },
    { href: '/admin/assignments', title: 'Assignments', copy: 'Pair users with vans' },
    { href: '/admin/charges', title: 'Charges & Plans', copy: 'Recurring plans, charge queue' },
    { href: '/admin/payments', title: 'Payments', copy: 'Manual receipts, reconcile' },
    { href: '/admin/penalties', title: 'Penalties', copy: 'Issue penalties & track status' },
    { href: '/admin/users', title: 'Users', copy: 'Accounts, permissions' },
  ];

  return (
    <AdminAppShell
      title="Admin overview"
      subtitle="Monitor fleet health, receivables, and workflows in one command center."
      actions={(
        <>
          <Button size="sm" asChild>
            <Link href="/admin/charges">Create charge</Link>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <Link href="/admin/vehicles">Add vehicle</Link>
          </Button>
        </>
      )}
      toolbarSlot={(
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Fleet utilization" value={fleetUtilization} description="Active vehicles / total" />
          <StatCard label="Active vehicles" value={activeVehicles} description={`${vehicles.length} total`} />
          <StatCard label="Outstanding charges" value={formatCurrency(outstandingAmount)} description={`${overdueCharges.length} overdue`} trend={overdueCharges.length ? { direction: 'up', label: `${overdueCharges.length} invoices` } : undefined} />
          <StatCard label="Active plans" value={activePlans} description="Recurring billing" />
        </div>
      )}
    >
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Work queues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workQueues.map((queue) => (
              <div key={queue.title} className="rounded-2xl border px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{queue.title}</p>
                    <p className="text-xs text-gray-600">{queue.description}</p>
                  </div>
                  <Button size="sm" variant="outline" className="w-full sm:w-auto" asChild>
                    <Link href={queue.action}>Open</Link>
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  {queue.items.length ? queue.items.map((item, idx) => (
                    <div key={`${queue.title}-${idx}`} className="rounded-xl bg-gray-50 px-3 py-2">
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-600">{item.meta}</p>
                    </div>
                  )) : (
                    <p className="text-xs text-gray-500">Nothing in queue.</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" asChild>
              <Link href="/admin/assignments">Assign vehicle</Link>
            </Button>
            <Button className="w-full" variant="secondary" asChild>
              <Link href="/admin/payments">Record payment</Link>
            </Button>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/admin/penalties">Issue penalty</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full rounded-3xl border-2 border-transparent transition hover:border-gray-200">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{item.copy}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPayments.length ? recentPayments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border px-3 py-2">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(payment.amount)} • {payment.method}</p>
                <p className="text-xs text-gray-600">{formatDateTime(payment.createdAt)}</p>
              </div>
            )) : (
              <EmptyState title="No recent payments" description="New payments will show here." />
            )}
          </CardContent>
        </Card>
      </section>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {dataLoading && <p className="text-sm text-gray-500">Loading admin data…</p>}
    </AdminAppShell>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(amount);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}
