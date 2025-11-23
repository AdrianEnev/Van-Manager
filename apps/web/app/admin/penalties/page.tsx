"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { adminCreatePenalty, adminListPenalties, adminListUsers, adminListUserVehicles, adminUpdatePenaltyStatus, type AdminUser, type Penalty, type VehicleAssignment } from '../../../lib/api';
import { AdminAppShell } from 'components/layout/admin-app-shell';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { StatCard } from 'components/ui/stat-card';

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

  const pendingCount = penalties.filter((p) => p.status === 'pending').length;
  const paidCount = penalties.filter((p) => p.status === 'paid').length;
  const waivedCount = penalties.filter((p) => p.status === 'waived').length;

  return (
    <AdminAppShell
      title="Penalties"
      subtitle="Create, track, and resolve penalties."
      actions={(
        <Button size="sm" variant="outline" onClick={() => refreshPenalties(selectedUser)}>Refresh penalties</Button>
      )}
      toolbarSlot={(
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total penalties" value={penalties.length} description="Filtered" />
          <StatCard label="Pending" value={pendingCount} description="Awaiting action" />
          <StatCard label="Paid" value={paidCount} description="Resolved" />
          <StatCard label="Waived" value={waivedCount} description="Cleared" />
        </div>
      )}
    >
      {error && <div className="text-sm text-red-600">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Create penalty</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-5">
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
            <div className="md:col-span-5 flex justify-end">
              <Button type="submit">Create penalty</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Penalties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {penalties.length ? penalties.map((pe) => (
              <div key={pe.id} className="rounded-2xl border px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">£{pe.amount.toFixed(2)} — {pe.reason}</p>
                    {pe.dueDate && <p className="text-sm text-gray-600">Due {new Date(pe.dueDate).toLocaleDateString()}</p>}
                    <p className="text-xs text-gray-600">Status: {pe.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" className="flex-1 sm:flex-none" onClick={() => setStatus(pe.id, 'pending')}>Pending</Button>
                    <Button variant="ghost" size="sm" className="flex-1 sm:flex-none" onClick={() => setStatus(pe.id, 'paid')}>Paid</Button>
                    <Button variant="ghost" size="sm" className="flex-1 sm:flex-none" onClick={() => setStatus(pe.id, 'waived')}>Waive</Button>
                  </div>
                </div>
              </div>
            )) : <p className="text-sm text-gray-600">No penalties.</p>}
          </CardContent>
        </Card>
      </section>
    </AdminAppShell>
  );
}
