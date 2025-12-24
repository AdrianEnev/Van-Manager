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
        <section className={clsx('space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700', className)}>
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81] p-8 text-white shadow-2xl sm:p-10">
                <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-200">
                            <span className="h-1 w-8 rounded-full bg-indigo-400"></span>
                            {overline}
                        </p>
                        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{title}</h1>
                        {subtitle && <p className="text-lg text-indigo-100/80 max-w-2xl">{subtitle}</p>}
                    </div>
                    {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
                </div>
                {heroSlot && <div className="relative z-10 mt-8 border-t border-white/10 pt-6">{heroSlot}</div>}

                {/* Decorative elements */}
                <div className="pointer-events-none absolute -right-20 -top-20 z-0 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[100px]" />
                <div className="pointer-events-none absolute -bottom-20 -left-20 z-0 h-[400px] w-[400px] rounded-full bg-blue-600/20 blur-[80px]" />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
            </div>
            <div className="space-y-8 px-2">{children}</div>
        </section>
    );
}
