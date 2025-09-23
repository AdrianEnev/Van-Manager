import './globals.css';
import type { Metadata } from 'next';
import Header from '../components/header';
import { AuthProvider } from '../components/auth-provider';

export const metadata: Metadata = {
  title: 'Van Manager',
  description: 'Van Manager',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="mx-auto flex-1 max-w-5xl px-4 py-6 flex items-center justify-center">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
