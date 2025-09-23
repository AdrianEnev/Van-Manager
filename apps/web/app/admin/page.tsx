"use client";

import Link from 'next/link';
import { useAuth } from '../../components/auth-provider';

export default function AdminHome() {
  const { user, authed, loading } = useAuth();
  if (!loading && (!authed || user?.role !== 'admin')) {
    return <div className="text-center text-sm text-red-600">Forbidden: admin only</div>;
  }
  return (
    <div className="w-full space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="grid gap-3">
        <Link className="underline" href="/admin/vehicles">Vehicles</Link>
        <Link className="underline" href="/admin/assignments">Assignments</Link>
        <Link className="underline" href="/admin/charges">Charges</Link>
        <Link className="underline" href="/admin/payments">Payments</Link>
        <Link className="underline" href="/admin/penalties">Penalties</Link>
      </div>
    </div>
  );
}
