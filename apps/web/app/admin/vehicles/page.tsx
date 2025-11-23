"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { adminCreateVehicle, adminListVehicles, adminUpdateVehicle, type Vehicle } from '../../../lib/api';
import { AdminAppShell } from 'components/layout/admin-app-shell';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { StatCard } from 'components/ui/stat-card';

export default function AdminVehiclesPage() {
  const { user, authed, loading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = useMemo(() => authed && user?.role === 'admin', [authed, user]);

  async function refresh() {
    try {
      const list = await adminListVehicles();
      setVehicles(list);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load vehicles');
    }
  }

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const plateNumber = String(fd.get('plateNumber') || '').trim();
    const makeModel = String(fd.get('makeModel') || '').trim() || undefined;
    const motExpiry = String(fd.get('motExpiry') || '').trim() || undefined;
    const notes = String(fd.get('notes') || '').trim() || undefined;
    if (!plateNumber) return;
    setSaving(true);
    try {
      await adminCreateVehicle({ plateNumber, makeModel, motExpiry, notes });
      (e.target as HTMLFormElement).reset();
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(v: Vehicle) {
    const next = v.status === 'active' ? 'inactive' : 'active';
    await adminUpdateVehicle(v.id, { status: next });
    await refresh();
  }

  if (!loading && !isAdmin) return <div className="text-sm text-red-600">Forbidden</div>;

  const activeCount = vehicles.filter((v) => v.status === 'active').length;
  const inactiveCount = vehicles.length - activeCount;

  return (
    <AdminAppShell
      title="Vehicles"
      subtitle="Manage the fleet, MOT schedules, and operational readiness."
      actions={(
        <Button size="sm" variant="outline" onClick={refresh}>Refresh data</Button>
      )}
      toolbarSlot={(
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total fleet" value={vehicles.length} description="Vehicles in system" />
          <StatCard label="Active" value={activeCount} description="Ready for assignments" />
          <StatCard label="Inactive" value={inactiveCount} description="Maintenance / off road" />
          <StatCard label="MOT missing" value={vehicles.filter((v) => !v.motExpiry).length} description="No expiry date" />
        </div>
      )}
    >
      {error && <div className="text-sm text-red-600">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Add a vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium">Plate Number</label>
              <input name="plateNumber" className="mt-1 w-full rounded border px-2 py-1" placeholder="AB12 CDE" required />
            </div>
            <div>
              <label className="block text-sm font-medium">Make/Model</label>
              <input name="makeModel" className="mt-1 w-full rounded border px-2 py-1" placeholder="Ford Transit" />
            </div>
            <div>
              <label className="block text-sm font-medium">MOT Expiry</label>
              <input name="motExpiry" type="date" className="mt-1 w-full rounded border px-2 py-1" />
            </div>
            <div>
              <label className="block text-sm font-medium">Notes</label>
              <input name="notes" className="mt-1 w-full rounded border px-2 py-1" placeholder="Optional" />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create vehicle'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        {vehicles.length ? vehicles.map((v) => (
          <Card key={v.id} className="border-2 border-transparent transition hover:border-gray-200">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>{v.plateNumber}</CardTitle>
                <p className="text-sm text-gray-500">{v.makeModel || 'Model unknown'}</p>
              </div>
              <span className={`text-xs rounded-full px-3 py-1 ${v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{v.status}</span>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              {v.motExpiry && <p>MOT: {new Date(v.motExpiry).toLocaleDateString()}</p>}
              {v.notes && <p>Notes: {v.notes}</p>}
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => toggleStatus(v)}>
                  {v.status === 'active' ? 'Mark inactive' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card className="lg:col-span-2">
            <CardContent>
              <p className="text-sm text-gray-600">No vehicles yet.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </AdminAppShell>
  );
}
