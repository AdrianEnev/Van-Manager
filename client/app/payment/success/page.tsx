"use client";

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { AppShell } from 'components/layout/app-shell';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const { t } = useTranslation('common');

    return (
        <AppShell title="Payment Successful" subtitle="Thank you for your payment">
            <div className="mx-auto max-w-md mt-10">
                <Card className="text-center border-green-200 bg-green-50">
                    <CardHeader>
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <CardTitle className="text-green-900">Payment Confirmed</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-green-800">
                            Your payment has been processed successfully.
                            {sessionId && <span className="block text-xs text-green-600 mt-2">Ref: {sessionId.slice(0, 10)}...</span>}
                        </p>
                        <div className="pt-4">
                            <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                                <Link href="/dashboard">Return to Dashboard</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
