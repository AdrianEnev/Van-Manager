"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { AdminAppShell } from 'components/layout/admin-app-shell';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { apiFetchAuto, adminListUsers, adminListPlans, adminListCharges, type AdminUser, type Plan, type Charge } from '../../../lib/api';

export default function DevToolsPage() {
    const { user, authed, loading } = useAuth();
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // User and data selection
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [plans, setPlans] = useState<Plan[]>([]);
    const [charges, setCharges] = useState<Charge[]>([]);

    const isAdmin = authed && user?.role === 'admin';

    // Load users on mount
    useEffect(() => {
        if (isAdmin) {
            adminListUsers().then(list => {
                setUsers(list);
                if (list.length > 0) setSelectedUser(list[0].id);
            }).catch(() => { });
        }
    }, [isAdmin]);

    // Load plans and charges when user changes
    useEffect(() => {
        if (isAdmin && selectedUser) {
            adminListPlans({ userId: selectedUser }).then(setPlans).catch(() => { });
            adminListCharges({ userId: selectedUser }).then(setCharges).catch(() => { });
        }
    }, [isAdmin, selectedUser]);

    async function callDevEndpoint(endpoint: string, body?: any) {
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await apiFetchAuto<any>(endpoint, {
                method: 'POST',
                body: body ? JSON.stringify(body) : undefined,
            });
            setResult(res);
            // Refresh data after successful operation
            if (selectedUser) {
                await adminListPlans({ userId: selectedUser }).then(setPlans).catch(() => { });
                await adminListCharges({ userId: selectedUser }).then(setCharges).catch(() => { });
            }
        } catch (err: any) {
            setError(err?.message || 'Request failed');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleTriggerPlanCharges(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const planId = fd.get('planId')?.toString().trim();
        const body: any = {};
        if (planId) body.planId = planId;
        else if (selectedUser) body.userId = selectedUser;
        await callDevEndpoint('/api/dev/trigger-plan-charges', Object.keys(body).length ? body : undefined);
    }

    async function handleMarkOverdue(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const chargeId = fd.get('chargeId')?.toString().trim();
        const body: any = {};
        if (chargeId) body.chargeId = chargeId;
        else if (selectedUser) body.userId = selectedUser;
        await callDevEndpoint('/api/dev/mark-charges-overdue', Object.keys(body).length ? body : undefined);
    }

    async function handleSetDueDate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const chargeId = fd.get('chargeId')?.toString().trim();
        const dueDate = fd.get('dueDate')?.toString().trim();
        if (!chargeId || !dueDate) {
            setError('Charge ID and due date are required');
            return;
        }
        await callDevEndpoint('/api/dev/set-charge-due-date', { chargeId, dueDate });
    }

    async function handleSetPlanDueNow(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const planId = fd.get('planId')?.toString().trim();
        if (!planId) {
            setError('Plan ID is required');
            return;
        }
        await callDevEndpoint('/api/dev/set-plan-due-now', { planId });
    }

    async function handleTriggerScheduler(task: string) {
        await callDevEndpoint('/api/dev/trigger-scheduler', { task });
    }

    if (!loading && !isAdmin) {
        return <div className="text-sm text-red-600">Forbidden - Admin only</div>;
    }

    return (
        <AdminAppShell
            title="🛠️ Dev Tools"
            subtitle="Fast testing utilities for local development (disabled in production)"
        >
            <div className="mb-4 rounded-lg bg-blue-50 border-2 border-blue-200 p-4">
                <p className="text-sm text-blue-900">
                    <strong>Note:</strong> These tools are only available in development mode. Use them to test payment flows, notifications, and scheduler tasks without waiting for intervals.
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-lg bg-red-50 border-2 border-red-200 p-4">
                    <p className="text-sm text-red-900 font-semibold">Error:</p>
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {result && (
                <div className="mb-4 rounded-lg bg-green-50 border-2 border-green-200 p-4">
                    <p className="text-sm text-green-900 font-semibold mb-2">Success:</p>
                    <pre className="text-xs text-green-800 overflow-auto bg-white p-3 rounded border border-green-300 max-h-64">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}

            {/* User Selection */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-base">Select User</CardTitle>
                </CardHeader>
                <CardContent>
                    <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="w-full rounded border px-3 py-2"
                    >
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-600 mt-2">
                        Selected user has {plans.length} plan(s) and {charges.length} charge(s)
                    </p>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Trigger Plan Charges */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">1. Trigger Plan Charges</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-3">
                            Create charges from plans immediately without waiting for scheduler
                        </p>
                        <form onSubmit={handleTriggerPlanCharges} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Plan (optional)</label>
                                <select
                                    name="planId"
                                    className="w-full rounded border px-3 py-2 text-sm"
                                >
                                    <option value="">All active plans for selected user</option>
                                    {plans.filter(p => p.active).map(p => (
                                        <option key={p.id} value={p.id}>
                                            £{p.amount} - {p.frequency} (Next: {new Date(p.nextDueDate).toLocaleDateString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? 'Processing...' : 'Trigger Charges'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Mark Charges Overdue */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">2. Mark Charges Overdue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-3">
                            Force pending charges to overdue status for testing alerts
                        </p>
                        <form onSubmit={handleMarkOverdue} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Charge (optional)</label>
                                <select
                                    name="chargeId"
                                    className="w-full rounded border px-3 py-2 text-sm"
                                >
                                    <option value="">All pending charges for selected user</option>
                                    {charges.filter(c => c.status === 'pending').map(c => (
                                        <option key={c.id} value={c.id}>
                                            £{c.amount} - {c.type.replace('_', ' ')} (Due: {new Date(c.dueDate).toLocaleDateString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Button type="submit" disabled={isLoading} className="w-full bg-orange-600 hover:bg-orange-700">
                                {isLoading ? 'Processing...' : 'Mark Overdue'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Set Charge Due Date */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">3. Set Charge Due Date</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-3">
                            Change a charge's due date to any date (e.g., yesterday for testing)
                        </p>
                        <form onSubmit={handleSetDueDate} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Charge (required)</label>
                                <select
                                    name="chargeId"
                                    className="w-full rounded border px-3 py-2 text-sm"
                                    required
                                >
                                    <option value="">Select a charge</option>
                                    {charges.map(c => (
                                        <option key={c.id} value={c.id}>
                                            £{c.amount} - {c.status} - {c.type.replace('_', ' ')} (Due: {new Date(c.dueDate).toLocaleDateString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">New Due Date (required)</label>
                                <input
                                    name="dueDate"
                                    type="date"
                                    className="w-full rounded border px-3 py-2 text-sm"
                                    required
                                />
                            </div>
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? 'Processing...' : 'Update Due Date'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Set Plan Due Now */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">4. Set Plan Due Now</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-3">
                            Set a plan's nextDueDate to now for immediate charge generation
                        </p>
                        <form onSubmit={handleSetPlanDueNow} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Plan (required)</label>
                                <select
                                    name="planId"
                                    className="w-full rounded border px-3 py-2 text-sm"
                                    required
                                >
                                    <option value="">Select a plan</option>
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>
                                            £{p.amount} - {p.frequency} - {p.active ? 'Active' : 'Inactive'} (Next: {new Date(p.nextDueDate).toLocaleDateString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? 'Processing...' : 'Set Due Now'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* Trigger Scheduler */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="text-base">5. Trigger Scheduler Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                        Run scheduler tasks manually without waiting for the 15-minute interval
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Button
                            onClick={() => handleTriggerScheduler('all')}
                            disabled={isLoading}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            Run All
                        </Button>
                        <Button
                            onClick={() => handleTriggerScheduler('overdue')}
                            disabled={isLoading}
                            variant="outline"
                        >
                            Overdue
                        </Button>
                        <Button
                            onClick={() => handleTriggerScheduler('reminders')}
                            disabled={isLoading}
                            variant="outline"
                        >
                            Reminders
                        </Button>
                        <Button
                            onClick={() => handleTriggerScheduler('plans')}
                            disabled={isLoading}
                            variant="outline"
                        >
                            Plans
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="mt-6 bg-gray-50">
                <CardHeader>
                    <CardTitle className="text-base">💡 Quick Testing Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-700">
                    <p><strong>Test Stripe Payment:</strong> Select user → Set plan due now → Trigger charges → User pays via Stripe</p>
                    <p><strong>Test Overdue Alerts:</strong> Select user → Mark charges overdue → Check dashboard for red alerts</p>
                    <p><strong>Test Notifications:</strong> Create charge due in 2 days → Run "Reminders" scheduler → Check email logs</p>
                    <p><strong>Refresh Data:</strong> Change user selection to reload their plans and charges</p>
                </CardContent>
            </Card>
        </AdminAppShell>
    );
}
