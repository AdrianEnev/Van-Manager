"use client";

import Link from 'next/link';
import { useAuth } from '../../components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { PageHeader } from 'components/ui/page-header';

export default function AdminHome() {
  const { user, authed, loading } = useAuth();
  if (!loading && (!authed || user?.role !== 'admin')) {
    return <div className="text-center text-sm text-red-600">Forbidden: admin only</div>;
  }
  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Admin"
        subtitle="Manage vehicles, assignments, charges, payments and penalties"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/vehicles">
          <Card className="transition hover:shadow-md">
            <CardHeader>
              <CardTitle>Vehicles</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Create, update and manage vehicles and MOT dates.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/assignments">
          <Card className="transition hover:shadow-md">
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Attach vehicles to users and manage active links.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/charges">
          <Card className="transition hover:shadow-md">
            <CardHeader>
              <CardTitle>Charges & Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Create charges manually or set up recurring plans.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/payments">
          <Card className="transition hover:shadow-md">
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Record manual payments and review history.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/penalties">
          <Card className="transition hover:shadow-md">
            <CardHeader>
              <CardTitle>Penalties</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Create and manage penalties and their status.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
