"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../components/auth-provider';
import { loginWithGoogle } from '../../lib/api';
import { useTranslation } from 'react-i18next';

declare global {
    interface Window {
        google?: any;
    }
}

export default function RegisterPage() {
    const router = useRouter();
    const { authed, register, authenticateFromCookie } = useAuth();
    const { t } = useTranslation('common');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gLoading, setGLoading] = useState(false);

    useEffect(() => {
        if (authed) router.replace('/');
    }, [authed, router]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await register({ name, email, password });
            router.replace('/');
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    }

    // Load Google Identity Services script and render button
    useEffect(() => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) return;
        const scriptId = 'google-identity-services';
        if (document.getElementById(scriptId)) {
            if (window.google?.accounts?.id) initGoogle();
            return;
        }
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.defer = true;
        s.id = scriptId;
        s.onload = () => initGoogle();
        document.head.appendChild(s);

        function initGoogle() {
            if (!window.google?.accounts?.id) return;
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: async (response: any) => {
                    try {
                        setGLoading(true);
                        await loginWithGoogle(response.credential);
                        await authenticateFromCookie();
                        router.replace('/');
                    } catch (e: any) {
                        setError(e.message || 'Google sign-up failed');
                    } finally {
                        setGLoading(false);
                    }
                },
            });
            const el = document.getElementById('google-button');
            if (el) {
                window.google.accounts.id.renderButton(el, {
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'pill',
                    logo_alignment: 'left',
                    width: 320,
                });
            }
        }
    }, [router, authenticateFromCookie]);

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl sm:p-10">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-gray-900">
                            {t('auth.registerTitle')}
                        </h1>
                        <p className="mt-2 text-sm text-gray-500">{t('auth.registerSubtitle')}</p>
                    </div>

                    <div className="mt-4">
                        <div id="google-button" className="flex justify-center" />
                        {gLoading && <p className="mt-2 text-center text-sm text-gray-600">Signing up with Google…</p>}
                    </div>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white px-2 text-gray-400">Or register with email</span>
                        </div>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.name')}</label>
                            <input
                                type="text"
                                className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
                            <input
                                type="email"
                                className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
                            <input
                                type="password"
                                className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={8}
                                required
                            />
                        </div>
                        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">⚠️ {error}</div>}

                        <Button disabled={loading} className="w-full rounded-xl bg-indigo-600 py-6 text-base font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all">
                            {loading ? 'Registering…' : t('auth.registerCta')}
                        </Button>
                    </form>
                    <p className="mt-6 text-center text-sm text-gray-600">
                        {t('auth.haveAccount')}{' '}
                        <a href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">{t('auth.login')}</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
