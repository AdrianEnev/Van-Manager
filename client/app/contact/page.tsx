"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { submitContactForm } from '../../lib/api';
import { useTranslation } from 'react-i18next';

export default function ContactPage() {
    const router = useRouter();
    const { t } = useTranslation('common');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setLoading(true);
        try {
            await submitContactForm({ name, email, phone: phone || undefined, message });
            setSuccess(true);
            setName('');
            setEmail('');
            setPhone('');
            setMessage('');
        } catch (err: any) {
            setError(err.message || 'Failed to send message');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-2xl justify-center py-12 md:py-16">
            <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
                <h1 className="text-2xl font-semibold">{t('contact.title')}</h1>
                <p className="mt-1 text-sm text-gray-600">{t('contact.subtitle')}</p>

                <div className="mt-4 rounded-md bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700">{t('contact.supportPhone')}</p>
                    <p className="text-lg font-semibold text-gray-900">+44 7123 456789</p>
                </div>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium">{t('contact.name')}</label>
                        <input
                            type="text"
                            className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">{t('contact.email')}</label>
                        <input
                            type="email"
                            className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">{t('contact.phone')}</label>
                        <input
                            type="tel"
                            className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder={t('contact.phoneOptional')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">{t('contact.message')}</label>
                        <textarea
                            className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                            rows={5}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            minLength={10}
                            maxLength={2000}
                        />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {success && <p className="text-sm text-green-600">{t('contact.success')}</p>}
                    <Button disabled={loading} className="w-full">
                        {loading ? t('contact.sending') : t('contact.submit')}
                    </Button>
                </form>

                <p className="mt-4 text-sm text-gray-600">
                    <a href="/" className="text-black underline">{t('contact.backToHome')}</a>
                </p>
            </div>
        </div>
    );
}
