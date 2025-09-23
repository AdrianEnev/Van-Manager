"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../../components/auth-provider';
import { getMyVehicles, getMyCharges, getMyPayments, getMyPenalties, type VehicleAssignment, type Charge, type Payment, type Penalty } from '../../lib/api';
import { Button } from 'components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, authed, loading } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleAssignment[] | null>(null);
  const [charges, setCharges] = useState<Charge[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [penalties, setPenalties] = useState<Penalty[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [v, c, p, pe] = await Promise.all([
          getMyVehicles(),
          getMyCharges(14),
          getMyPayments(14),
          getMyPenalties(),
        ]);
        if (!mounted) return;
        setVehicles(v);
        setCharges(c);
        setPayments(p);
        setPenalties(pe);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load dashboard');
      }
    }
    if (authed) load();
    return () => { mounted = false; };
  }, [authed]);

  if (!authed && !loading) {
    return <div className="space-y-2 text-center"><p>Please log in to view your dashboard.</p></div>;
  }

  return (
    <div className="w-full space-y-8">
      {user?.role === 'admin' && (
        <div className="text-xl text-gray-600">
          <p>Viewing dashboard as an admin.</p>
          <Button size="sm" variant="secondary" className='mt-2' asChild>
            <Link href="/admin">Admin Panel</Link>
          </Button>
        </div>
      )}
      
      <div className={`flex flex-col gap-y-3 ${user?.role === 'admin' ? 'hidden' : ''}`}>

        <h1 className="text-2xl font-semibold">Dashboard</h1>
        {error && <div className="text-red-600 text-sm">{error}</div>}

        <section>
            <h2 className="text-lg font-medium mb-2">My Vehicles</h2>
            <div className="grid gap-3">
            {vehicles?.length ? vehicles.map((a) => (
                <div key={a.assignmentId} className="rounded border bg-white p-4">
                <div className="font-medium">{a.vehicle.plateNumber} {a.vehicle.makeModel ? `— ${a.vehicle.makeModel}` : ''}</div>
                <div className="text-sm text-gray-600">Assigned: {new Date(a.assignedAt).toLocaleDateString()}</div>
                {a.vehicle.motExpiry && (
                    <div className="text-sm">MOT expires: {new Date(a.vehicle.motExpiry).toLocaleDateString()}</div>
                )}
                </div>
            )) : <div className="text-sm text-gray-600">No vehicles assigned.</div>}
            </div>
        </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Pending/Overdue Charges (last 14 days)</h2>
        <div className="grid gap-3">
          {charges?.length ? charges.filter(c => c.status === 'pending' || c.status === 'overdue').map((c) => (
            <div key={c.id} className="rounded border bg-white p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">£{c.amount.toFixed(2)} — {c.type.replace('_',' ')}</div>
                <div className="text-sm text-gray-600">Due: {new Date(c.dueDate).toLocaleDateString()}</div>
              </div>
              <div className={`text-xs px-2 py-1 rounded ${c.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</div>
            </div>
          )) : <div className="text-sm text-gray-600">No recent charges.</div>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Recent Payments (last 14 days)</h2>
        <div className="grid gap-3">
          {payments?.length ? payments.map((p) => (
            <div key={p.id} className="rounded border bg-white p-4">
              <div className="font-medium">£{p.amount.toFixed(2)} — {p.method}</div>
              <div className="text-sm text-gray-600">On: {new Date(p.createdAt).toLocaleString()}</div>
            </div>
          )) : <div className="text-sm text-gray-600">No recent payments.</div>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Penalties</h2>
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
      </section>
      </div>
    </div>
  );
}
