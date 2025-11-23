"use client";

import type { ReactNode } from 'react';
import clsx from 'clsx';
import { AdminSidebar } from './admin-sidebar';

export type AdminAppShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  toolbarSlot?: ReactNode;
};

export function AdminAppShell({ title, subtitle, actions, children, toolbarSlot }: AdminAppShellProps) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <AdminSidebar />
      <div className="flex-1 space-y-6">
        <div className="rounded-3xl border bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500">Admin workspace</p>
              <h1 className="mt-2 text-3xl font-semibold text-gray-900">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
          {toolbarSlot && <div className="mt-4 border-t pt-4">{toolbarSlot}</div>}
        </div>
        <div className={clsx('space-y-6')}>
          {children}
        </div>
      </div>
    </div>
  );
}
