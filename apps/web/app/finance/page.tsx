"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../../components/auth-provider';
import { getMyCharges, getMyPayments, type Charge, type Payment } from '../../lib/api';
import { Section, SectionTitle } from 'components/ui/section';
import { Card, CardContent } from 'components/ui/card';
import { Badge } from 'components/ui/badge';
import { EmptyState } from 'components/ui/empty-state';
import { useTranslation } from 'react-i18next';

export default function FinancePage() {
  const { authed, loading } = useAuth();
  const [charges, setCharges] = useState<Charge[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation('common');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [c, p] = await Promise.all([
          getMyCharges(14),
          getMyPayments(14),
        ]);
        if (!mounted) return;
        setCharges(c);
        setPayments(p);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load finance');
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
      <h1 className="text-2xl font-semibold">{t('financePage.title')}</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <Section>
        <SectionTitle>{t('financePage.charges')}</SectionTitle>
        <div className="grid gap-3">
          {charges?.length ? (
            charges.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">£{c.amount.toFixed(2)} — {c.type.replace('_',' ')}</div>
                    <div className="text-sm text-gray-600">{t('labels.due')} {new Date(c.dueDate).toLocaleDateString()}</div>
                  </div>
                  {c.status === 'paid' ? (
                    <Badge tone="green">{t('status.paid')}</Badge>
                  ) : c.status === 'overdue' ? (
                    <Badge tone="red">{t('status.overdue')}</Badge>
                  ) : (
                    <Badge tone="yellow">{t('status.pending')}</Badge>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState title={t('financePage.noCharges')} description={t('financePage.charges')} />
          )}
        </div>
      </Section>

      <Section>
        <SectionTitle>{t('financePage.payments')}</SectionTitle>
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
            <EmptyState title={t('financePage.noPayments')} description={t('financePage.payments')} />
          )}
        </div>
      </Section>
    </div>
  );
}
