"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../../components/auth-provider';
import { getMyVehicles, type VehicleAssignment } from '../../lib/api';
import { Section, SectionTitle } from 'components/ui/section';
import { Card, CardContent } from 'components/ui/card';
import { EmptyState } from 'components/ui/empty-state';
import { useTranslation } from 'react-i18next';

export default function VehiclesPage() {
  const { authed, loading } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleAssignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation('common');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const v = await getMyVehicles();
        if (!mounted) return;
        setVehicles(v);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load vehicles');
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
      <h1 className="text-2xl font-semibold">{t('vehiclesPage.title')}</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <Section>
        <SectionTitle>{t('vehiclesPage.assigned')}</SectionTitle>
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
            <EmptyState title={t('vehiclesPage.noVehicles')} description={t('vehiclesPage.assigned')} />
          )}
        </div>
      </Section>
    </div>
  );
}
