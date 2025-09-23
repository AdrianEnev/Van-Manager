"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { adminListPayments, adminListUsers, adminRecordManualPayment, type AdminUser, type Payment } from '../../../lib/api';

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

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-semibold">Admin · Payments</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}

      <form onSubmit={onRecord} className="rounded border bg-white p-4 grid gap-3 md:grid-cols-4">
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
        <div className="md:col-span-4">
          <button className="rounded bg-black px-3 py-2 text-white">Record Manual Payment</button>
        </div>
      </form>

      <section>
        <h2 className="text-lg font-medium mb-2">Payments</h2>
        <div className="grid gap-3">
          {payments.length ? payments.map((p) => (
            <div key={p.id} className="rounded border bg-white p-4">
              <div className="font-medium">£{p.amount.toFixed(2)} — {p.method}</div>
              <div className="text-sm text-gray-600">On: {new Date(p.createdAt).toLocaleString()}</div>
            </div>
          )) : <div className="text-sm text-gray-600">No payments.</div>}
        </div>
      </section>
    </div>
  );
}
