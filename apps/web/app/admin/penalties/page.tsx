"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { adminCreatePenalty, adminListPenalties, adminListUsers, adminListUserVehicles, adminUpdatePenaltyStatus, type AdminUser, type Penalty, type VehicleAssignment } from '../../../lib/api';

export default function AdminPenaltiesPage() {
  const { user, authed, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [assignments, setAssignments] = useState<VehicleAssignment[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
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
  async function refreshPenalties(uid?: string) {
    const list = await adminListPenalties(uid ? { userId: uid } : {});
    setPenalties(list);
  }

  useEffect(() => { if (isAdmin) { refreshUsers().catch(()=>{}); } }, [isAdmin]);
  useEffect(() => { if (isAdmin && selectedUser) { refreshAssignments(selectedUser).catch(()=>{}); refreshPenalties(selectedUser).catch(()=>{}); } }, [isAdmin, selectedUser]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const userId = String(fd.get('userId'));
    const vehicleAssignmentId = String(fd.get('vehicleAssignmentId') || '');
    const vehicleId = vehicleAssignmentId ? assignments.find(a => a.assignmentId === vehicleAssignmentId)?.vehicle.id : undefined;
    const amount = Number(fd.get('amount'));
    const reason = String(fd.get('reason'));
    const dueDate = String(fd.get('dueDate') || '');
    if (!userId || !amount || !reason) return;
    try {
      await adminCreatePenalty({ userId, vehicleId, amount, reason, dueDate: dueDate || undefined });
      (e.target as HTMLFormElement).reset();
      await refreshPenalties(userId);
    } catch (err: any) {
      setError(err?.message || 'Create penalty failed');
    }
  }

  async function setStatus(id: string, status: Penalty['status']) {
    try {
      await adminUpdatePenaltyStatus(id, status);
      await refreshPenalties(selectedUser);
    } catch (e: any) { setError(e?.message || 'Update status failed'); }
  }

  if (!loading && !isAdmin) return <div className="text-sm text-red-600">Forbidden</div>;

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-semibold">Admin · Penalties</h1>
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
          <label className="block text-sm font-medium">Reason</label>
          <input name="reason" className="mt-1 w-full rounded border px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Due date (optional)</label>
          <input name="dueDate" type="date" className="mt-1 w-full rounded border px-2 py-1" />
        </div>
        <div className="md:col-span-5">
          <button className="rounded bg-black px-3 py-2 text-white">Create Penalty</button>
        </div>
      </form>

      <section>
        <h2 className="text-lg font-medium mb-2">Penalties</h2>
        <div className="grid gap-3">
          {penalties.length ? penalties.map((pe) => (
            <div key={pe.id} className="rounded border bg-white p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">£{pe.amount.toFixed(2)} — {pe.reason}</div>
                {pe.dueDate && <div className="text-sm text-gray-600">Due: {new Date(pe.dueDate).toLocaleDateString()}</div>}
                <div className="text-xs text-gray-600">Status: {pe.status}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setStatus(pe.id, 'pending')} className="rounded border px-3 py-1 text-sm">Pending</button>
                <button onClick={() => setStatus(pe.id, 'paid')} className="rounded border px-3 py-1 text-sm">Paid</button>
                <button onClick={() => setStatus(pe.id, 'waived')} className="rounded border px-3 py-1 text-sm">Waive</button>
              </div>
            </div>
          )) : <div className="text-sm text-gray-600">No penalties.</div>}
        </div>
      </section>
    </div>
  );
}
