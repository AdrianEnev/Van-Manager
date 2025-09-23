"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../../components/auth-provider';
import { getMyPenalties, type Penalty } from '../../lib/api';

export default function PenaltiesPage() {
  const { authed, loading } = useAuth();
  const [penalties, setPenalties] = useState<Penalty[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const list = await getMyPenalties();
        if (!mounted) return;
        setPenalties(list);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load penalties');
      }
    }
    if (authed) load();
    return () => { mounted = false; };
  }, [authed]);

  if (!authed && !loading) {
    return <div className="space-y-2 text-center"><p>Please log in to view your penalties.</p></div>;
  }

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-semibold">Penalties</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="grid gap-3">
        {penalties?.length ? penalties.map((pe) => (
          <div key={pe.id} className="rounded border bg-white p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">£{pe.amount.toFixed(2)} — {pe.reason}</div>
              {pe.dueDate && <div className="text-sm text-gray-600">Due: {new Date(pe.dueDate).toLocaleDateString()}</div>}
            </div>
            <div className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{pe.status}</div>
          </div>
        )) : <div className="text-sm text-gray-600">No penalties.</div>}
      </div>
    </div>
  );
}
