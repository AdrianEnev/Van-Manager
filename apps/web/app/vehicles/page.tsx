"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../../components/auth-provider';
import { getMyVehicles, type VehicleAssignment } from '../../lib/api';

export default function VehiclesPage() {
  const { authed, loading } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleAssignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const v = await getMyVehicles();
        if (!mounted) return;
        setVehicles(v);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load vehicles');
      }
    }
    if (authed) load();
    return () => { mounted = false; };
  }, [authed]);

  if (!authed && !loading) {
    return <div className="space-y-2 text-center"><p>Please log in to view your vehicles.</p></div>;
  }

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-semibold">My Vehicles</h1>
      {error && <div className="text-red-600 text-sm">{error}</div>}
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
    </div>
  );
}
