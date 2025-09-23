"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/auth-provider';
import { forgotPasswordCookie } from '../../lib/api';
import { Button } from '../../components/ui/button';

export default function AccountPage() {
  const router = useRouter();
  const { user, authed, loading } = useAuth();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !authed) router.replace('/login');
  }, [authed, loading, router]);

  async function onResetPassword() {
    if (!user?.email) return;
    setSending(true);
    setMessage(null);
    setError(null);
    try {
      await forgotPasswordCookie(user.email);
      setMessage('If your email exists in our system, a password reset link has been sent.');
    } catch (e: any) {
      setError(e.message || 'Failed to start password reset');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">Account</h1>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          {loading && <p>Loading...</p>}
          {!loading && user && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-base font-medium">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-base font-medium">{user.email}</p>
              </div>
              <div className="pt-2">
                <Button onClick={onResetPassword} disabled={sending}>
                  {sending ? 'Sending…' : 'Reset Password'}
                </Button>
              </div>
              {message && <p className="text-sm text-green-700">{message}</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
