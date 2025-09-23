"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { adminCreatePlan, adminListCharges, adminListUsers, adminListUserVehicles, adminListPlans, adminMarkChargePaid, type AdminUser, type Charge, type VehicleAssignment, type Plan } from '../../../lib/api';

export default function AdminChargesPage() {
  const { user, authed, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [assignments, setAssignments] = useState<VehicleAssignment[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'custom_days'>('weekly');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin = useMemo(() => authed && user?.role === 'admin', [authed, user]);

  async function refreshUsers() {
    const list = await adminListUsers();
    setUsers(list);
    if (!selectedUser && list.length) setSelectedUser(list[0].id);
  }
  async function refreshAssignments(uid: string) {
    const list = await adminListUserVehicles(uid);
    setAssignments(list);
  }
  async function refreshPlans(uid?: string) {
    const list = await adminListPlans(uid ? { userId: uid } : {});
    setPlans(list);
  }
  async function refreshCharges(uid?: string) {
    const list = await adminListCharges(uid ? { userId: uid } : {});
    setCharges(list);
  }

  useEffect(() => { if (isAdmin) { refreshUsers().catch(()=>{}); } }, [isAdmin]);
  useEffect(() => { if (isAdmin && selectedUser) { refreshAssignments(selectedUser).catch(()=>{}); refreshCharges(selectedUser).catch(()=>{}); refreshPlans(selectedUser).catch(()=>{}); } }, [isAdmin, selectedUser]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const userId = String(fd.get('userId'));
    const vehicleAssignmentId = String(fd.get('vehicleAssignmentId') || '');
    const vehicleId = vehicleAssignmentId ? assignments.find(a => a.assignmentId === vehicleAssignmentId)?.vehicle.id : undefined;
    const amount = Number(fd.get('amount'));
    const frequency = String(fd.get('frequency')) as 'weekly' | 'monthly' | 'custom_days';
    const startingDate = String(fd.get('startingDate'));
    const intervalDaysRaw = String(fd.get('intervalDays') || '');
    const intervalDays = frequency === 'custom_days' && intervalDaysRaw ? Number(intervalDaysRaw) : undefined;
    if (!userId || !amount || !frequency || !startingDate) return;
    try {
      await adminCreatePlan({ userId, vehicleId, amount, frequency, startingDate, ...(intervalDays ? { intervalDays } : {}) });
      (e.target as HTMLFormElement).reset();
      setFrequency('weekly');
      setSuccess('Recurring plan created. It will materialize charges on and after the starting date.');
      await Promise.all([refreshPlans(userId), refreshCharges(userId)]);
    } catch (err: any) {
      setError(err?.message || 'Create charge failed');
    }
  }

  async function markPaid(id: string) {
    try {
      await adminMarkChargePaid(id, {});
      await refreshCharges(selectedUser);
    } catch (e: any) { setError(e?.message || 'Mark paid failed'); }
  }

  if (!loading && !isAdmin) return <div className="text-sm text-red-600">Forbidden</div>;

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-semibold">Admin · Charges</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {success && <div className="text-sm text-green-700">{success}</div>}

      <form onSubmit={onCreate} className="rounded border bg-white p-4 grid gap-3 md:grid-cols-6">
        <div>
          <label className="block text-sm font-medium">User</label>
          <select name="userId" className="mt-1 w-full rounded border px-2 py-1" value={selectedUser} onChange={(e)=>setSelectedUser(e.target.value)}>
            {users.map(u => (<option key={u.id} value={u.id}>{u.name} ({u.email})</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Vehicle (optional)</label>
          <select name="vehicleAssignmentId" className="mt-1 w-full rounded border px-2 py-1">
            <option value="">— None —</option>
            {assignments.map(a => (<option key={a.assignmentId} value={a.assignmentId}>{a.vehicle.plateNumber} {a.vehicle.makeModel ? `— ${a.vehicle.makeModel}` : ''}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Amount</label>
          <input name="amount" type="number" step="0.01" className="mt-1 w-full rounded border px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Frequency</label>
          <select
            name="frequency"
            className="mt-1 w-full rounded border px-2 py-1"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as any)}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom_days">Custom (days)</option>
          </select>
        </div>
        {frequency === 'custom_days' && (
          <div>
            <label className="block text-sm font-medium">Interval days (custom only)</label>
            <input name="intervalDays" type="number" min={1} className="mt-1 w-full rounded border px-2 py-1" placeholder="e.g., 13" required />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium">Starting date</label>
          <input name="startingDate" type="date" className="mt-1 w-full rounded border px-2 py-1" required />
        </div>
        <div className="md:col-span-6">
          <button className="rounded bg-black px-3 py-2 text-white">Create Recurring Plan</button>
        </div>
      </form>

      <section>
        <h2 className="text-lg font-medium mb-2">Recurring Plans for selected user</h2>
        <div className="grid gap-3">
          {plans.length ? plans.map((p) => (
            <div key={p.id} className="rounded border bg-white p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">£{p.amount.toFixed(2)} — {p.frequency === 'custom_days' ? `every ${p.intervalDays} days` : p.frequency}</div>
                <div className="text-sm text-gray-600">Starting: {new Date(p.startingDate).toLocaleDateString()}</div>
                <div className="text-sm text-gray-600">Next due: {new Date(p.nextDueDate).toLocaleDateString()}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{p.active ? 'active' : 'inactive'}</span>
            </div>
          )) : <div className="text-sm text-gray-600">No plans for this user.</div>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Charges</h2>
        <div className="grid gap-3">
          {charges.length ? charges.map((c) => (
            <div key={c.id} className="rounded border bg-white p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">£{c.amount.toFixed(2)} — {c.type.replace('_',' ')}</div>
                <div className="text-sm text-gray-600">Due: {new Date(c.dueDate).toLocaleDateString()}</div>
                <div className="text-xs text-gray-600">Status: {c.status}</div>
              </div>
              {c.status !== 'paid' && (
                <button onClick={() => markPaid(c.id)} className="rounded border px-3 py-1 text-sm">Mark Paid</button>
              )}
            </div>
          )) : <div className="text-sm text-gray-600">No charges.</div>}
        </div>
      </section>
    </div>
  );
}
