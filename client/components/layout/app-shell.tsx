"use client";

import type { ReactNode } from 'react';
import clsx from 'clsx';

export type AppShellProps = {
  title: string;
  subtitle?: string;
  overline?: string;
  actions?: ReactNode;
  heroSlot?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AppShell({ title, subtitle, overline = 'Workspace', actions, heroSlot, children, className }: AppShellProps) {
  return (
    <section className={clsx('space-y-8', className)}>
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-r from-slate-900 to-slate-700 p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/70">{overline}</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-base text-white/80 sm:text-lg">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {heroSlot && <div className="mt-6">{heroSlot}</div>}
        <div className="pointer-events-none absolute -right-12 top-0 hidden h-40 w-40 rounded-full bg-white/10 blur-3xl sm:block" />
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
