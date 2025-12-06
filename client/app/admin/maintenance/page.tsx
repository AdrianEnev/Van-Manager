"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { AdminAppShell } from 'components/layout/admin-app-shell';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { StatCard } from 'components/ui/stat-card';
import { Button } from 'components/ui/button';
import { Badge } from 'components/ui/badge';
import {
  adminCreateMaintenanceRecord,
  adminGetMaintenanceSummary,
  adminListMaintenanceRecords,
  type MaintenanceRecord,
  type MaintenanceSummaryItem,
} from '../../../lib/api';

const defaultFormState = {
  type: 'oil_change' as 'oil_change' | 'tyre_change',
  performedAt: new Date().toISOString().slice(0, 10),
  odometerMiles: '',
  intervalMiles: '10000',
  tyreMileage: '',
  notes: '',
};

export default function AdminMaintenancePage() {
  const { user, authed, loading } = useAuth();
  const [summary, setSummary] = useState<MaintenanceSummaryItem[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [formState, setFormState] = useState(defaultFormState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const isAdmin = useMemo(() => authed && user?.role === 'admin', [authed, user]);

  useEffect(() => {
    if (!isAdmin) return;
    refreshSummary();
  }, [isAdmin]);

  async function refreshSummary() {
    setLoadingSummary(true);
    setError(null);
    try {
      const data = await adminGetMaintenanceSummary();
      setSummary(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load maintenance summary');
    } finally {
      setLoadingSummary(false);
    }
  }

  async function selectVehicle(vehicleId: string) {
    setSelectedVehicleId(vehicleId);
    setLoadingRecords(true);
    setError(null);
    try {
      const list = await adminListMaintenanceRecords(vehicleId);
      setRecords(list);
    } catch (e: any) {
      setError(e?.message || 'Failed to load maintenance history');
    } finally {
      setLoadingRecords(false);
    }
  }

  const selectedVehicle = summary.find((item) => item.vehicleId === selectedVehicleId) || null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedVehicleId) return;
    const odometerMiles = Number(formState.odometerMiles);
    const intervalMiles = formState.intervalMiles ? Number(formState.intervalMiles) : undefined;
    const tyreMileage = formState.tyreMileage ? Number(formState.tyreMileage) : undefined;
    if (Number.isNaN(odometerMiles)) {
      setError('Odometer miles must be a number');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminCreateMaintenanceRecord(selectedVehicleId, {
        type: formState.type,
        performedAt: formState.performedAt,
        odometerMiles,
        intervalMiles: formState.type === 'oil_change' ? intervalMiles : undefined,
        tyreMileage: formState.type === 'tyre_change' ? tyreMileage : undefined,
        notes: formState.notes || undefined,
      });
      setFormState((prev) => ({
        ...defaultFormState,
        type: prev.type,
        performedAt: prev.performedAt,
      }));
      await Promise.all([refreshSummary(), selectVehicle(selectedVehicleId)]);
    } catch (e: any) {
      setError(e?.message || 'Failed to log maintenance');
    } finally {
      setSaving(false);
    }
  }

  const overdueCount = useMemo(() => summary.filter((item) => isOilOverdue(item)).length, [summary]);

  if (!loading && !isAdmin) return <div className="text-sm text-red-600">Forbidden</div>;

  return (
    <AdminAppShell
      title="Maintenance"
      subtitle="Track oil & tyre service intervals to keep the fleet road-ready."
      actions={(<Button size="sm" variant="outline" onClick={refreshSummary} disabled={loadingSummary}>Refresh data</Button>)}
      toolbarSlot={(<div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Vehicles tracked" value={summary.length} description="Total fleet" />
        <StatCard label="Overdue oil changes" value={overdueCount} description="Based on 10k mile interval" trend={overdueCount ? { direction: 'up', label: `${overdueCount} vehicles` } : undefined} />
        <StatCard label="Selected vehicle" value={selectedVehicle ? selectedVehicle.plateNumber : 'None'} description={selectedVehicle?.makeModel || 'Choose a vehicle'} />
      </div>)}
    >
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Maintenance summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingSummary && <p className="text-sm text-gray-500">Loading summary…</p>}
            {!loadingSummary && !summary.length && <p className="text-sm text-gray-500">No vehicles yet.</p>}
            {!loadingSummary && summary.map((item) => (
              <button
                type="button"
                key={item.vehicleId}
                onClick={() => selectVehicle(item.vehicleId)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedVehicleId === item.vehicleId ? 'border-gray-900 bg-gray-900/5' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.plateNumber}</p>
                    <p className="text-xs text-gray-500">{item.makeModel || 'Model unknown'}</p>
                  </div>
                  <Badge tone={isOilOverdue(item) ? 'red' : 'green'}>
                    {isOilOverdue(item) ? 'Oil overdue' : 'Oil OK'}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-gray-600 md:grid-cols-2">
                  <SummaryRow label="Last oil change" value={formatSummary(item.lastOilChange)} />
                  <SummaryRow label="Next oil due" value={formatNextDue(item.lastOilChange)} highlight={isOilOverdue(item)} />
                  <SummaryRow label="Last tyre change" value={formatSummary(item.lastTyreChange)} />
                  <SummaryRow label="Tyre mileage" value={item.lastTyreChange ? `${item.lastTyreChange.tyreMileage ?? '—'} mi` : '—'} />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Log maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedVehicle ? (
              <form onSubmit={onSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600">Vehicle</label>
                  <p className="text-base font-medium text-gray-900">{selectedVehicle.plateNumber}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-600">Type</label>
                    <select className="mt-1 w-full rounded border px-2 py-1" value={formState.type} onChange={(e) => setFormState((prev) => ({ ...prev, type: e.target.value as 'oil_change' | 'tyre_change' }))}>
                      <option value="oil_change">Oil change</option>
                      <option value="tyre_change">Tyre change</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-600">Date</label>
                    <input type="date" className="mt-1 w-full rounded border px-2 py-1" value={formState.performedAt} onChange={(e) => setFormState((prev) => ({ ...prev, performedAt: e.target.value }))} required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600">Odometer (miles)</label>
                  <input type="number" min={0} className="mt-1 w-full rounded border px-2 py-1" value={formState.odometerMiles} onChange={(e) => setFormState((prev) => ({ ...prev, odometerMiles: e.target.value }))} required />
                </div>
                {formState.type === 'oil_change' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-600">Interval miles (default 10k)</label>
                    <input type="number" min={1000} className="mt-1 w-full rounded border px-2 py-1" value={formState.intervalMiles} onChange={(e) => setFormState((prev) => ({ ...prev, intervalMiles: e.target.value }))} />
                  </div>
                )}
                {formState.type === 'tyre_change' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-600">Tyre mileage (miles on current set)</label>
                    <input type="number" min={0} className="mt-1 w-full rounded border px-2 py-1" value={formState.tyreMileage} onChange={(e) => setFormState((prev) => ({ ...prev, tyreMileage: e.target.value }))} required />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-600">Notes</label>
                  <textarea className="mt-1 w-full rounded border px-2 py-1" rows={3} value={formState.notes} onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Add context or mechanic notes" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setFormState(defaultFormState)}>Reset</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Log maintenance'}</Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-gray-500">Select a vehicle to start logging maintenance.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Maintenance history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            {loadingRecords && <p className="text-sm text-gray-500">Loading history…</p>}
            {!loadingRecords && !records.length && <p className="text-sm text-gray-500">Select a vehicle to view history.</p>}
            {!loadingRecords && records.map((record) => (
              <div key={record.id} className="rounded-2xl border px-4 py-3">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <p className="font-semibold text-gray-900">{record.type === 'oil_change' ? 'Oil change' : 'Tyre change'} • {new Date(record.performedAt).toLocaleDateString()}</p>
                  <Badge tone="blue">{record.odometerMiles.toLocaleString()} miles</Badge>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  {record.type === 'oil_change' && (
                    <p>Interval: {record.intervalMiles ?? 10000} miles • Next due ~ {(record.odometerMiles + (record.intervalMiles ?? 10000)).toLocaleString()} mi</p>
                  )}
                  {record.type === 'tyre_change' && (
                    <p>Tyre mileage: {record.tyreMileage ? `${record.tyreMileage.toLocaleString()} miles` : '—'}</p>
                  )}
                  {record.notes && <p className="mt-1">Notes: {record.notes}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </AdminAppShell>
  );
}

function formatSummary(value: MaintenanceSummaryItem['lastOilChange'] | MaintenanceSummaryItem['lastTyreChange']) {
  if (!value) return '—';
  return `${new Date(value.performedAt).toLocaleDateString()} • ${value.odometerMiles.toLocaleString()} mi`;
}

function formatNextDue(value: MaintenanceSummaryItem['lastOilChange']) {
  if (!value) return '—';
  return `${(value.nextDueOdometer).toLocaleString()} mi`;
}

function isOilOverdue(item: MaintenanceSummaryItem) {
  const last = item.lastOilChange;
  if (!last) return true;
  const milesRemaining = last.nextDueOdometer - last.odometerMiles;
  return milesRemaining <= 0;
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
