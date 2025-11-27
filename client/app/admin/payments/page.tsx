"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { adminListPayments, adminListUsers, adminRecordManualPayment, type AdminUser, type Payment } from '../../../lib/api';
import { AdminAppShell } from 'components/layout/admin-app-shell';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { StatCard } from 'components/ui/stat-card';

export default function AdminPaymentsPage() {
  const { user, authed, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useMemo(() => authed && user?.role === 'admin', [authed, user]);

  async function refreshUsers() {
    const list = await adminListUsers();
    setUsers(list);
    if (!selectedUser && list.length) setSelectedUser(list[0].id);
  }
  async function refreshPayments(uid?: string) {
    const list = await adminListPayments(uid ? { userId: uid } : {});
    setPayments(list);
  }

  useEffect(() => { if (isAdmin) { refreshUsers().catch(()=>{}); } }, [isAdmin]);
  useEffect(() => { if (isAdmin) { refreshPayments(selectedUser).catch(()=>{}); } }, [isAdmin, selectedUser]);

  async function onRecord(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const userId = String(fd.get('userId'));
    const amount = Number(fd.get('amount'));
    const note = String(fd.get('note') || '');
    if (!userId || !amount) return;
    try {
      await adminRecordManualPayment({ userId, amount, note });
      (e.target as HTMLFormElement).reset();
      await refreshPayments(userId);
    } catch (err: any) {
      setError(err?.message || 'Record payment failed');
    }
  }

  if (!loading && !isAdmin) return <div className="text-sm text-red-600">Forbidden</div>;

  const totalPayments = payments.length;
  const manualPayments = payments.filter((p) => p.method === 'manual').length;
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const latestPayment = payments[0];

  return (
    <AdminAppShell
      title="Payments"
      subtitle="Record manual payments and review history."
      actions={(
        <Button size="sm" variant="outline" onClick={() => refreshPayments(selectedUser)}>Refresh payments</Button>
      )}
      toolbarSlot={(
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total payments" value={totalPayments} description="Filtered set" />
          <StatCard label="Manual receipts" value={manualPayments} description="Needs reconciliation" />
          <StatCard label="Amount received" value={`£${totalAmount.toFixed(2)}`} description="Selected range" />
          <StatCard label="Latest payment" value={latestPayment ? `£${latestPayment.amount.toFixed(2)}` : '—'} description={latestPayment ? new Date(latestPayment.createdAt).toLocaleDateString() : 'No data'} />
        </div>
      )}
    >
      {error && <div className="text-sm text-red-600">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Record manual payment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onRecord} className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium">User</label>
              <select name="userId" className="mt-1 w-full rounded border px-2 py-1" value={selectedUser} onChange={(e)=>setSelectedUser(e.target.value)}>
                {users.map(u => (<option key={u.id} value={u.id}>{u.name} ({u.email})</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Amount</label>
              <input name="amount" type="number" step="0.01" className="mt-1 w-full rounded border px-2 py-1" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Note</label>
              <input name="note" className="mt-1 w-full rounded border px-2 py-1" placeholder="Optional" />
            </div>
            <div className="md:col-span-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="submit" className="w-full sm:w-auto">Record manual payment</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.length ? payments.map((p) => (
              <div key={p.id} className="rounded-2xl border px-4 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium">£{p.amount.toFixed(2)} — {p.method}</p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <p className="text-sm text-gray-600">On {new Date(p.createdAt).toLocaleString()}</p>
              </div>
            )) : <p className="text-sm text-gray-600">No payments.</p>}
          </CardContent>
        </Card>
      </section>
    </AdminAppShell>
  );
}
