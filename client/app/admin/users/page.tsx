"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { adminListUsers, adminToggleTransactionAllowed, type AdminUser } from '../../../lib/api';
import { AdminAppShell } from 'components/layout/admin-app-shell';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { StatCard } from 'components/ui/stat-card';

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

    const adminCount = users.filter((u) => u.role === 'admin').length;
    const driverCount = users.filter((u) => u.role === 'user').length;
    const txAllowed = users.filter((u) => u.isTransactionAllowed).length;

    return (
        <AdminAppShell
            title="Users"
            subtitle="Manage accounts, roles, and transaction permissions."
            actions={(
                <Button size="sm" variant="outline" onClick={refresh}>Refresh users</Button>
            )}
            toolbarSlot={(
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Total users" value={users.length} description="All accounts" />
                    <StatCard label="Admins" value={adminCount} description="Staff" />
                    <StatCard label="Drivers" value={driverCount} description="Active drivers" />
                    <StatCard label="Transactions allowed" value={txAllowed} description="Payments enabled" />
                </div>
            )}
        >
            {error && <div className="text-sm text-red-600">{error}</div>}

            <Card>
                <CardHeader>
                    <CardTitle>Accounts</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-600">
                                <th className="px-2 py-2">Name</th>
                                <th className="px-2 py-2">Email</th>
                                <th className="px-2 py-2">Role</th>
                                <th className="px-2 py-2">Transactions allowed</th>
                                <th className="px-2 py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length ? users.map(u => (
                                <tr key={u.id} className="border-t">
                                    <td className="px-2 py-2">{u.name}</td>
                                    <td className="px-2 py-2 truncate">{u.email}</td>
                                    <td className="px-2 py-2"><span className="rounded bg-gray-100 px-2 py-0.5 text-xs uppercase">{u.role}</span></td>
                                    <td className="px-2 py-2">{u.isTransactionAllowed ? 'Yes' : 'No'}</td>
                                    <td className="px-2 py-2">
                                        <Button variant="outline" size="sm" onClick={() => toggle(u.id, u.isTransactionAllowed)}>{u.isTransactionAllowed ? 'Disable' : 'Enable'}</Button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-2 py-4 text-center text-gray-600">No users found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </AdminAppShell>
    );
}
