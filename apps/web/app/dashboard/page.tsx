"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../../components/auth-provider';
import { getMyVehicles, getMyCharges, getMyPayments, getMyPenalties, type VehicleAssignment, type Charge, type Payment, type Penalty } from '../../lib/api';
import { Button } from 'components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Section, SectionTitle } from 'components/ui/section';
import { EmptyState } from 'components/ui/empty-state';
import { Badge } from 'components/ui/badge';
import { useTranslation } from 'react-i18next';

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

  if (!authed && !loading) {
    return <div className="space-y-2 text-center"><p>{t('access.loginToView')}</p></div>;
  }

  return (
    <div className="w-full space-y-8">
      {user?.role === 'admin' && (
        <Card>
          <CardContent className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-gray-700">
              <p className="text-base sm:text-lg">{t('header.viewingAsAdmin')}</p>
              <p className="text-sm text-gray-600">{t('nav.admin')}</p>
            </div>
            <Button size="sm" variant="default" asChild>
              <Link href="/admin">{t('header.goToAdmin')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className={`flex flex-col gap-y-6 ${user?.role === 'admin' ? 'hidden' : ''}`}>
        <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
        {error && <div className="text-red-600 text-sm">{error}</div>}

        <Section>
          <SectionTitle>{t('dashboard.vehicles')}</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {vehicles?.length ? (
              vehicles.map((a) => (
                <Card key={a.assignmentId}>
                  <CardContent>
                    <div className="font-medium">{a.vehicle.plateNumber} {a.vehicle.makeModel ? `— ${a.vehicle.makeModel}` : ''}</div>
                    <div className="mt-1 text-sm text-gray-600">{t('labels.assigned')} {new Date(a.assignedAt).toLocaleDateString()}</div>
                    {a.vehicle.motExpiry && (
                      <div className="mt-1 text-sm">{t('labels.motExpires')} {new Date(a.vehicle.motExpiry).toLocaleDateString()}</div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState title={t('dashboard.noVehicles')} description={t('vehiclesPage.assigned')} />
            )}
          </div>
        </Section>

        <Section>
          <SectionTitle>{t('dashboard.charges')}</SectionTitle>
          <div className="grid gap-3">
            {charges?.length ? (
              charges
                .filter(c => c.status === 'pending' || c.status === 'overdue')
                .map((c) => (
                  <Card key={c.id}>
                    <CardContent className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">£{c.amount.toFixed(2)} — {c.type.replace('_',' ')}</div>
                        <div className="text-sm text-gray-600">{t('labels.due')} {new Date(c.dueDate).toLocaleDateString()}</div>
                      </div>
                      {c.status === 'overdue' ? (
                        <Badge tone="red">{t('status.overdue')}</Badge>
                      ) : (
                        <Badge tone="yellow">{t('status.pending')}</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))
            ) : (
              <EmptyState title={t('dashboard.noCharges')} description={t('financePage.charges')} />
            )}
          </div>
        </Section>

        <Section>
          <SectionTitle>{t('dashboard.payments')}</SectionTitle>
          <div className="grid gap-3">
            {payments?.length ? (
              payments.map((p) => (
                <Card key={p.id}>
                  <CardContent>
                    <div className="font-medium">£{p.amount.toFixed(2)} — {p.method}</div>
                    <div className="text-sm text-gray-600">{t('labels.on')} {new Date(p.createdAt).toLocaleString()}</div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState title={t('dashboard.noPayments')} description={t('financePage.payments')} />
            )}
          </div>
        </Section>

        <Section>
          <SectionTitle>{t('dashboard.penalties')}</SectionTitle>
          <div className="grid gap-3">
            {penalties?.length ? (
              penalties.map((pe) => (
                <Card key={pe.id}>
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">£{pe.amount.toFixed(2)} — {pe.reason}</div>
                      {pe.dueDate && <div className="text-sm text-gray-600">Due: {new Date(pe.dueDate).toLocaleDateString()}</div>}
                    </div>
                    <Badge>{pe.status}</Badge>
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState title={t('dashboard.noPenalties')} description={t('penaltiesPage.active')} />
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
