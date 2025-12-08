"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { adminCreateVehicle, adminDeleteVehicle, adminListVehicles, adminUpdateVehicle, type Vehicle } from '../../../lib/api';
import { AdminAppShell } from 'components/layout/admin-app-shell';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { StatCard } from 'components/ui/stat-card';

export default function AdminVehiclesPage() {
  const { user, authed, loading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editingSavingId, setEditingSavingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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

  async function onEditSubmit(e: React.FormEvent<HTMLFormElement>, vehicleId: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const plateNumber = String(fd.get('plateNumber') ?? '').trim() || undefined;
    const makeModel = String(fd.get('makeModel') ?? '').trim() || undefined;
    const motExpiry = String(fd.get('motExpiry') ?? '').trim() || undefined;
    const notes = String(fd.get('notes') ?? '').trim() || undefined;
    const statusValue = String(fd.get('status') ?? '').trim();
    const payload: Record<string, any> = {};
    if (plateNumber !== undefined) payload.plateNumber = plateNumber;
    if (makeModel !== undefined) payload.makeModel = makeModel;
    if (motExpiry) payload.motExpiry = motExpiry;
    if (notes !== undefined) payload.notes = notes;
    if (statusValue === 'active' || statusValue === 'inactive') payload.status = statusValue;
    if (!Object.keys(payload).length) {
      setEditingVehicleId(null);
      return;
    }
    setEditingSavingId(vehicleId);
    try {
      await adminUpdateVehicle(vehicleId, payload);
      setEditingVehicleId(null);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Update failed');
    } finally {
      setEditingSavingId(null);
    }
  }

  async function toggleStatus(v: Vehicle) {
    const next = v.status === 'active' ? 'inactive' : 'active';
    setTogglingId(v.id);
    setError(null);
    try {
      await adminUpdateVehicle(v.id, { status: next });
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  }

  async function onDeleteVehicle(vehicleId: string) {
    if (!window.confirm('Delete this vehicle? This cannot be undone.')) return;
    try {
      await adminDeleteVehicle(vehicleId);
      if (editingVehicleId === vehicleId) setEditingVehicleId(null);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Delete failed');
    }
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
        {vehicles.length ? vehicles.map((v, index) => {
          const isEditing = editingVehicleId === v.id;
          const motInputValue = v.motExpiry ? new Date(v.motExpiry).toISOString().slice(0, 10) : '';
          return (
            <Card key={v.id} className="border-2 border-transparent transition hover:border-gray-200">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{v.plateNumber}</CardTitle>
                  <p className="text-sm text-gray-500">Vehicle #{index + 1} · {v.makeModel || 'Model unknown'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs rounded-full px-3 py-1 ${v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{v.status}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="md" onClick={() => toggleStatus(v)} disabled={togglingId === v.id}>
                      {togglingId === v.id ? 'Updating…' : v.status === 'active' ? 'Mark inactive' : 'Activate'}
                    </Button>
                    <Button variant="secondary" size="md" onClick={() => setEditingVehicleId(isEditing ? null : v.id)}>
                      {isEditing ? 'Close editor' : 'Edit details'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                {v.motExpiry && <p>MOT: {new Date(v.motExpiry).toLocaleDateString()}</p>}
                {v.notes && <p>Notes: {v.notes}</p>}
                {isEditing && (
                  <form onSubmit={(e) => onEditSubmit(e, v.id)} className="mt-3 grid gap-3 text-sm">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide">Plate number</label>
                      <input name="plateNumber" defaultValue={v.plateNumber} className="mt-1 w-full rounded border px-2 py-1" placeholder="AB12 CDE" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide">Make/Model</label>
                      <input name="makeModel" defaultValue={v.makeModel || ''} className="mt-1 w-full rounded border px-2 py-1" placeholder="Ford Transit" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide">MOT expiry</label>
                        <input name="motExpiry" type="date" defaultValue={motInputValue} className="mt-1 w-full rounded border px-2 py-1" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide">Status</label>
                        <select name="status" defaultValue={v.status} className="mt-1 w-full rounded border px-2 py-1">
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide">Notes</label>
                      <textarea name="notes" defaultValue={v.notes || ''} className="mt-1 w-full rounded border px-2 py-1" rows={3} placeholder="Maintenance notes" />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <div className="flex gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingVehicleId(null)}>
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={editingSavingId === v.id}>
                          {editingSavingId === v.id ? 'Saving…' : 'Save changes'}
                        </Button>
                      </div>
                      <Button type="button" size="sm" variant="destructive" onClick={() => onDeleteVehicle(v.id)}>
                        Delete vehicle
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        }) : (
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
