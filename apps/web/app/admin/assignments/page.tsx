"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { adminAssignVehicle, adminDetachAssignment, adminListUserVehicles, adminListUsers, adminListVehicles, type AdminUser, type VehicleAssignment, type Vehicle } from '../../../lib/api';
import { AdminAppShell } from 'components/layout/admin-app-shell';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { StatCard } from 'components/ui/stat-card';

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

  const assignedVehicles = assignments.length;
  const availableVehicles = vehicles.filter((v) => v.status === 'active').length;

  return (
    <AdminAppShell
      title="Assignments"
      subtitle="Attach vehicles to drivers and manage active links."
      actions={(
        <Button size="sm" variant="outline" onClick={() => { if (selectedUser) refreshAssignments(selectedUser); }}>
          Refresh assignments
        </Button>
      )}
      toolbarSlot={(
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Users" value={users.length} description="Eligible drivers" />
          <StatCard label="Active assignments" value={assignedVehicles} description="Vehicles currently linked" />
          <StatCard label="Available vehicles" value={availableVehicles} description="Active vehicles" />
          <StatCard label="Unassigned" value={Math.max(vehicles.length - assignedVehicles, 0)} description="Vehicles ready to assign" />
        </div>
      )}
    >
      {error && <div className="text-sm text-red-600">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Create assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onAssign} className="grid gap-4 md:grid-cols-3">
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
              <Button className="w-full" disabled={!selectedUser || !selectedVehicle}>Assign vehicle</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Assignments for selected user</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.length ? assignments.map((a) => (
              <div key={a.assignmentId} className="rounded-2xl border px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{a.vehicle.plateNumber} {a.vehicle.makeModel ? `— ${a.vehicle.makeModel}` : ''}</p>
                    <p className="text-sm text-gray-600">Assigned {new Date(a.assignedAt).toLocaleDateString()}</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={()=>onDetach(a.assignmentId)}>Detach</Button>
                </div>
              </div>
            )) : <p className="text-sm text-gray-600">No active assignments.</p>}
          </CardContent>
        </Card>
      </section>
    </AdminAppShell>
  );
}
