"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../../components/auth-provider';
import { getMyPenalties, type Penalty } from '../../lib/api';
import { Section, SectionTitle } from 'components/ui/section';
import { Card, CardContent } from 'components/ui/card';
import { EmptyState } from 'components/ui/empty-state';
import { Badge } from 'components/ui/badge';
import { useTranslation } from 'react-i18next';

export default function PenaltiesPage() {
  const { authed, loading } = useAuth();
  const [penalties, setPenalties] = useState<Penalty[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation('common');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const list = await getMyPenalties();
        if (!mounted) return;
        setPenalties(list);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load penalties');
      }
    }
    if (authed) load();
    return () => { mounted = false; };
  }, [authed]);

  if (!authed && !loading) {
    return <div className="space-y-2 text-center"><p>{t('access.loginToView')}</p></div>;
  }

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-semibold">{t('penaltiesPage.title')}</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <Section>
        <SectionTitle>{t('penaltiesPage.active')}</SectionTitle>
        <div className="grid gap-3">
          {penalties?.length ? (
            penalties.map((pe) => (
              <Card key={pe.id}>
                <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">£{pe.amount.toFixed(2)} — {pe.reason}</div>
                    {pe.dueDate && <div className="text-sm text-gray-600">{t('labels.due')} {new Date(pe.dueDate).toLocaleDateString()}</div>}
                  </div>
                  <Badge>{pe.status}</Badge>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState title={t('penaltiesPage.noPenalties')} description={t('penaltiesPage.active')} />
          )}
        </div>
      </Section>
    </div>
  );
}
