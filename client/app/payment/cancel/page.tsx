"use client";

import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { AppShell } from 'components/layout/app-shell';
import Link from 'next/link';

export default function PaymentCancelPage() {
    return (
        <AppShell title="Payment Cancelled" subtitle="The payment process was not completed">
            <div className="mx-auto max-w-md mt-10">
                <Card className="text-center border-yellow-200 bg-yellow-50">
                    <CardHeader>
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                        <CardTitle className="text-yellow-900">Payment Cancelled</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-yellow-800">
                            You cancelled the payment process. No charges were made to your account.
                        </p>
                        <div className="flex gap-3 pt-4 justify-center">
                            <Button variant="outline" asChild>
                                <Link href="/dashboard">Dashboard</Link>
                            </Button>
                            <Button asChild>
                                <Link href="/dashboard">Try Again</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
