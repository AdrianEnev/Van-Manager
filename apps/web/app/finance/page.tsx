"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../../components/auth-provider';
import { getMyCharges, getMyPayments, type Charge, type Payment } from '../../lib/api';

export default function FinancePage() {
  const { authed, loading } = useAuth();
  const [charges, setCharges] = useState<Charge[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [c, p] = await Promise.all([
          getMyCharges(14),
          getMyPayments(14),
        ]);
        if (!mounted) return;
        setCharges(c);
        setPayments(p);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load finance');
      }
    }
    if (authed) load();
    return () => { mounted = false; };
  }, [authed]);

  if (!authed && !loading) {
    return <div className="space-y-2 text-center"><p>Please log in to view your finance.</p></div>;
  }

  return (
    <div className="w-full space-y-8">
      <h1 className="text-2xl font-semibold">Finance</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <section>
        <h2 className="text-lg font-medium mb-2">Charges (last 14 days)</h2>
        <div className="grid gap-3">
          {charges?.length ? charges.map((c) => (
            <div key={c.id} className="rounded border bg-white p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">£{c.amount.toFixed(2)} — {c.type.replace('_',' ')}</div>
                <div className="text-sm text-gray-600">Due: {new Date(c.dueDate).toLocaleDateString()}</div>
              </div>
              <div className={`text-xs px-2 py-1 rounded ${c.status === 'paid' ? 'bg-green-100 text-green-700' : c.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</div>
            </div>
          )) : <div className="text-sm text-gray-600">No recent charges.</div>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Payments (last 14 days)</h2>
        <div className="grid gap-3">
          {payments?.length ? payments.map((p) => (
            <div key={p.id} className="rounded border bg-white p-4">
              <div className="font-medium">£{p.amount.toFixed(2)} — {p.method}</div>
              <div className="text-sm text-gray-600">On: {new Date(p.createdAt).toLocaleString()}</div>
            </div>
          )) : <div className="text-sm text-gray-600">No recent payments.</div>}
        </div>
      </section>
    </div>
  );
}
