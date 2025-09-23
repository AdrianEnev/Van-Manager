"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { adminAssignVehicle, adminDetachAssignment, adminListUserVehicles, adminListUsers, adminListVehicles, type AdminUser, type VehicleAssignment, type Vehicle } from '../../../lib/api';

export default function AdminAssignmentsPage() {
  const { user, authed, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [assignments, setAssignments] = useState<VehicleAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useMemo(() => authed && user?.role === 'admin', [authed, user]);

  async function refreshUsers() {
    const list = await adminListUsers();
    setUsers(list);
    if (!selectedUser && list.length) setSelectedUser(list[0].id);
  }
  async function refreshVehicles() {
    const list = await adminListVehicles();
    setVehicles(list);
    if (!selectedVehicle && list.length) setSelectedVehicle(list[0].id);
  }
  async function refreshAssignments(uid: string) {
    const list = await adminListUserVehicles(uid);
    setAssignments(list);
  }

  useEffect(() => { if (isAdmin) { refreshUsers().catch(()=>{}); refreshVehicles().catch(()=>{});} }, [isAdmin]);
  useEffect(() => { if (isAdmin && selectedUser) refreshAssignments(selectedUser).catch(()=>{}); }, [isAdmin, selectedUser]);

  async function onAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const userId = selectedUser;
    const vehicleId = selectedVehicle;
    if (!userId || !vehicleId) return;
    try {
      await adminAssignVehicle(userId, vehicleId);
      await refreshAssignments(userId);
    } catch (err: any) {
      setError(err?.message || 'Assignment failed');
    }
  }

  async function onDetach(assignmentId: string) {
    await adminDetachAssignment(assignmentId);
    if (selectedUser) await refreshAssignments(selectedUser);
  }

  if (!loading && !isAdmin) return <div className="text-sm text-red-600">Forbidden</div>;

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-semibold">Admin · Assignments</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}

      <form onSubmit={onAssign} className="rounded border bg-white p-4 grid gap-3 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium">User</label>
          <select name="userId" required className="mt-1 w-full rounded border px-2 py-1" value={selectedUser} onChange={(e)=>setSelectedUser(e.target.value)}>
            {users.map(u => (<option key={u.id} value={u.id}>{u.name} ({u.email})</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Vehicle</label>
          <select name="vehicleId" required className="mt-1 w-full rounded border px-2 py-1" value={selectedVehicle} onChange={(e)=>setSelectedVehicle(e.target.value)}>
            {vehicles.map(v => (<option key={v.id} value={v.id}>{v.plateNumber} {v.makeModel ? `— ${v.makeModel}` : ''}</option>))}
          </select>
        </div>
        <div className="flex items-end">
          <button disabled={!selectedUser || !selectedVehicle} className="rounded bg-black px-3 py-2 text-white disabled:opacity-50">Assign Vehicle</button>
        </div>
      </form>

      <section>
        <h2 className="text-lg font-medium mb-2">Assignments for selected user</h2>
        <div className="grid gap-3">
          {assignments.length ? assignments.map((a) => (
            <div key={a.assignmentId} className="rounded border bg-white p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{a.vehicle.plateNumber} {a.vehicle.makeModel ? `— ${a.vehicle.makeModel}` : ''}</div>
                <div className="text-sm text-gray-600">Assigned: {new Date(a.assignedAt).toLocaleDateString()}</div>
              </div>
              <button onClick={()=>onDetach(a.assignmentId)} className="rounded border px-3 py-1 text-sm">Detach</button>
            </div>
          )) : <div className="text-sm text-gray-600">No active assignments.</div>}
        </div>
      </section>
    </div>
  );
}
