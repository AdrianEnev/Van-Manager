"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { adminCreatePlan, adminListCharges, adminListUsers, adminListUserVehicles, adminListPlans, adminMarkChargePaid, type AdminUser, type Charge, type VehicleAssignment, type Plan } from '../../../lib/api';
import { AdminAppShell } from 'components/layout/admin-app-shell';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { StatCard } from 'components/ui/stat-card';

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

  const totalCharges = charges.length;
  const overdueCharges = charges.filter((c) => c.status === 'overdue').length;
  const activePlans = plans.filter((p) => p.active).length;
  const linkedVehicles = assignments.length;

  return (
    <AdminAppShell
      title="Charges & plans"
      subtitle="Manage recurring plans and keep receivables up to date."
      actions={(
        <Button size="sm" variant="outline" onClick={() => selectedUser && refreshCharges(selectedUser)}>Refresh charges</Button>
      )}
      toolbarSlot={(
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total charges" value={totalCharges} description="For selected user" />
          <StatCard label="Overdue" value={overdueCharges} description="Needs action" trend={overdueCharges ? { direction: 'up', label: `${overdueCharges} unpaid` } : undefined} />
          <StatCard label="Active plans" value={activePlans} description="Auto billing" />
          <StatCard label="Linked vehicles" value={linkedVehicles} description="Assignments" />
        </div>
      )}
    >
      {error && <div className="text-sm text-red-600">{error}</div>}
      {success && <div className="text-sm text-green-700">{success}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Create recurring plan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-6">
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
            <div className="md:col-span-6 flex justify-end">
              <Button type="submit">Create plan</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recurring plans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plans.length ? plans.map((p) => (
              <div key={p.id} className="rounded-2xl border px-4 py-3">
                <p className="font-medium">£{p.amount.toFixed(2)} — {p.frequency === 'custom_days' ? `every ${p.intervalDays} days` : p.frequency}</p>
                <div className="flex flex-col gap-1 text-sm text-gray-600 sm:flex-row sm:flex-wrap sm:gap-4">
                  <span>Starting {new Date(p.startingDate).toLocaleDateString()}</span>
                  <span>Next due {new Date(p.nextDueDate).toLocaleDateString()}</span>
                </div>
                <span className={`mt-2 inline-flex text-xs rounded-full px-2 py-1 ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{p.active ? 'Active' : 'Inactive'}</span>
              </div>
            )) : <p className="text-sm text-gray-600">No plans for this user.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Charges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {charges.length ? charges.map((c) => (
              <div key={c.id} className="rounded-2xl border px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">£{c.amount.toFixed(2)} — {c.type.replace('_',' ')}</p>
                    <p className="text-sm text-gray-600">Due {new Date(c.dueDate).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-600">Status: {c.status}</p>
                  </div>
                  {c.status !== 'paid' && (
                    <Button variant="outline" size="sm" onClick={() => markPaid(c.id)} className="w-full sm:w-auto">Mark paid</Button>
                  )}
                </div>
              </div>
            )) : <p className="text-sm text-gray-600">No charges.</p>}
          </CardContent>
        </Card>
      </section>
    </AdminAppShell>
  );
}
