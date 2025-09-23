"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { adminListUsers, adminToggleTransactionAllowed, type AdminUser } from '../../../lib/api';

export default function AdminUsersPage() {
  const { user, authed, loading } = useAuth();
  const [users, setUsers] = useState<(AdminUser & { isTransactionAllowed?: boolean })[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useMemo(() => authed && user?.role === 'admin', [authed, user]);

  async function refresh() {
    try {
      const list = await adminListUsers();
      // It already returns isTransactionAllowed per latest backend change
      setUsers(list as any);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    }
  }

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  async function toggle(userId: string, current?: boolean) {
    try {
      const next = !current;
      await adminToggleTransactionAllowed(userId, next);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to toggle');
    }
  }

  if (!loading && !isAdmin) return <div className="text-sm text-red-600">Forbidden</div>;

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-semibold">Admin · Users</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="rounded border bg-white">
        <div className="grid grid-cols-5 gap-2 border-b px-3 py-2 text-sm font-medium">
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Transactions allowed</div>
          <div>Actions</div>
        </div>
        {users.length ? users.map(u => (
          <div key={u.id} className="grid grid-cols-5 gap-2 border-b px-3 py-2 text-sm items-center">
            <div>{u.name}</div>
            <div className="truncate">{u.email}</div>
            <div><span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{u.role}</span></div>
            <div>{u.isTransactionAllowed ? 'Yes' : 'No'}</div>
            <div>
              <button className="rounded border px-3 py-1 text-sm" onClick={() => toggle(u.id, u.isTransactionAllowed)}>Toggle</button>
            </div>
          </div>
        )) : <div className="px-3 py-2 text-sm text-gray-600">No users found.</div>}
      </div>
    </div>
  );
}
