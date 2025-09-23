"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { adminCreateCharge, adminListCharges, adminListUsers, adminListUserVehicles, adminMarkChargePaid, type AdminUser, type Charge, type VehicleAssignment } from '../../../lib/api';

export default function AdminChargesPage() {
  const { user, authed, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [assignments, setAssignments] = useState<VehicleAssignment[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [error, setError] = useState<string | null>(null);

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
  async function refreshCharges(uid?: string) {
    const list = await adminListCharges(uid ? { userId: uid } : {});
    setCharges(list);
  }

  useEffect(() => { if (isAdmin) { refreshUsers().catch(()=>{}); } }, [isAdmin]);
  useEffect(() => { if (isAdmin && selectedUser) { refreshAssignments(selectedUser).catch(()=>{}); refreshCharges(selectedUser).catch(()=>{}); } }, [isAdmin, selectedUser]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const userId = String(fd.get('userId'));
    const vehicleAssignmentId = String(fd.get('vehicleAssignmentId') || '');
    const vehicleId = vehicleAssignmentId ? assignments.find(a => a.assignmentId === vehicleAssignmentId)?.vehicle.id : undefined;
    const amount = Number(fd.get('amount'));
    const type = String(fd.get('type')) as Charge['type'];
    const dueDate = String(fd.get('dueDate'));
    if (!userId || !amount || !type || !dueDate) return;
    try {
      await adminCreateCharge({ userId, vehicleId, amount, type, dueDate });
      (e.target as HTMLFormElement).reset();
      await refreshCharges(userId);
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

      <form onSubmit={onCreate} className="rounded border bg-white p-4 grid gap-3 md:grid-cols-5">
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
          <label className="block text-sm font-medium">Type</label>
          <select name="type" className="mt-1 w-full rounded border px-2 py-1">
            <option value="weekly_fee">Weekly fee</option>
            <option value="mot">MOT</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Due date</label>
          <input name="dueDate" type="date" className="mt-1 w-full rounded border px-2 py-1" required />
        </div>
        <div className="md:col-span-5">
          <button className="rounded bg-black px-3 py-2 text-white">Create Charge</button>
        </div>
      </form>

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
