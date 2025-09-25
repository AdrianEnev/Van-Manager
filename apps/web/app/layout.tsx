import './globals.css';
import type { Metadata } from 'next';
import Header from '../components/header';
import { AuthProvider } from '../components/auth-provider';
import I18nProvider from '../components/i18n/i18n-provider';

export const metadata: Metadata = {
  title: 'Van Manager',
  description: 'Van Manager',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <I18nProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
                {children}
              </main>
            </div>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
