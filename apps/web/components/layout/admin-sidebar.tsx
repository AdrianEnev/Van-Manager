"use client";

import Link from 'next/link';
import type { Route } from 'next';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

const adminLinks: { href: Route; key: keyof typeof labelKeys }[] = [
  { href: '/admin', key: 'overview' },
  { href: '/admin/vehicles', key: 'vehicles' },
  { href: '/admin/assignments', key: 'assignments' },
  { href: '/admin/charges', key: 'charges' },
  { href: '/admin/payments', key: 'payments' },
  { href: '/admin/penalties', key: 'penalties' },
  { href: '/admin/users', key: 'users' },
];

const labelKeys = {
  overview: 'adminNav.overview',
  vehicles: 'adminNav.vehicles',
  assignments: 'adminNav.assignments',
  charges: 'adminNav.charges',
  payments: 'adminNav.payments',
  penalties: 'adminNav.penalties',
  users: 'adminNav.users',
} as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useTranslation('common');

  return (
    <aside className="w-full shrink-0 rounded-3xl border bg-white/85 p-4 shadow-sm backdrop-blur lg:max-w-[260px] lg:sticky lg:top-28">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between lg:block">
        <p className="text-xs uppercase tracking-widest text-gray-500">Workspace</p>
        <p className="text-base font-semibold text-gray-900">{t('nav.admin')}</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              'rounded-2xl px-3 py-2 text-sm font-medium transition whitespace-nowrap lg:block',
              pathname?.startsWith(link.href)
                ? 'bg-gray-900 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            {t(`adminNav.${link.key}`)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
