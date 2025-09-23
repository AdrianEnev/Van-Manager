"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { adminCreateVehicle, adminListVehicles, adminUpdateVehicle, type Vehicle } from '../../../lib/api';

export default function AdminVehiclesPage() {
  const { user, authed, loading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useMemo(() => authed && user?.role === 'admin', [authed, user]);

  async function refresh() {
    try {
      const list = await adminListVehicles();
      setVehicles(list);
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
    try {
      await adminCreateVehicle({ plateNumber, makeModel, motExpiry, notes });
      (e.target as HTMLFormElement).reset();
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Create failed');
    }
  }

  async function toggleStatus(v: Vehicle) {
    const next = v.status === 'active' ? 'inactive' : 'active';
    await adminUpdateVehicle(v.id, { status: next });
    await refresh();
  }

  if (!loading && !isAdmin) return <div className="text-sm text-red-600">Forbidden</div>;

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-semibold">Admin · Vehicles</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}

      <form onSubmit={onCreate} className="rounded border bg-white p-4 grid gap-3 md:grid-cols-4">
        <div>
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
        <div className="md:col-span-4">
          <button className="rounded bg-black px-3 py-2 text-white">Create Vehicle</button>
        </div>
      </form>

      <div className="grid gap-3">
        {vehicles.length ? vehicles.map((v) => (
          <div key={v.id} className="rounded border bg-white p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{v.plateNumber} {v.makeModel ? `— ${v.makeModel}` : ''}</div>
              {v.motExpiry && <div className="text-sm text-gray-600">MOT: {new Date(v.motExpiry).toLocaleDateString()}</div>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{v.status}</span>
              <button onClick={() => toggleStatus(v)} className="rounded border px-3 py-1 text-sm">{v.status === 'active' ? 'Deactivate' : 'Activate'}</button>
            </div>
          </div>
        )) : <div className="text-sm text-gray-600">No vehicles yet.</div>}
      </div>
    </div>
  );
}
