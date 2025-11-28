import './globals.css';
import type { Metadata } from 'next';
import Header from '../components/header';
import SiteFooter from '../components/site-footer';
import { AuthProvider } from '../components/auth-provider';
import I18nProvider from '../components/i18n/i18n-provider';

export const metadata: Metadata = {
  title: 'Enev Service',
  description: 'Enev Service',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <I18nProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col bg-slate-50">
              <Header />
              <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 lg:px-6">
                <div className="space-y-10">
                  {children}
                </div>
              </main>
              <SiteFooter />
            </div>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
