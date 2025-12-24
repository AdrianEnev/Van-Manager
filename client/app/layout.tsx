import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '../components/auth-provider';
import AppFrame from '../components/app-frame';
import I18nProvider from '../components/i18n/i18n-provider';
import { VehicleAccessProvider } from '../components/vehicle-access-provider';

export const metadata: Metadata = {
    title: 'Enev Service LTD',
    description: 'Enev Service LTD',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-gray-100 text-gray-900">
                <I18nProvider>
                    <AuthProvider>
                        <VehicleAccessProvider>
                            <AppFrame>
                                {children}
                            </AppFrame>
                        </VehicleAccessProvider>
                    </AuthProvider>
                </I18nProvider>
            </body>
        </html>
    );
}
