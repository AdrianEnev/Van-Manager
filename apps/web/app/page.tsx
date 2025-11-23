"use client";

import Link from 'next/link';
import { Button } from '../components/ui/button';
import { useAuth } from 'components/auth-provider';
import { redirect } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function Home() {

    const {authed} = useAuth();
    const { t } = useTranslation('common');
    
    if (authed) {
        return redirect('/dashboard');
    }
    
  return (
    <div className="text-center space-y-4">
      <h1 className="text-4xl font-bold">{t('home.headline')}</h1>
      <p className="text-gray-700">{t('home.cta')}</p>
      <div className="flex items-center justify-center gap-3">
        <Button size="sm" asChild>
          <Link href="/login">{t('nav.login')}</Link>
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <Link href="/register">{t('nav.register')}</Link>
        </Button>
      </div>
    </div>
  );
}
