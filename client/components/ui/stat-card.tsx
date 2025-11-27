"use client";

import clsx from 'clsx';
import type { ReactNode } from 'react';

export type StatCardProps = {
  label: string;
  value: string | number;
  description?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  icon?: ReactNode;
  className?: string;
};

export function StatCard({ label, value, description, trend, icon, className }: StatCardProps) {
  return (
    <div className={clsx('rounded-2xl border bg-white/80 p-5 shadow-sm backdrop-blur', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      {description && <p className="mt-2 text-sm text-gray-500">{description}</p>}
      {trend && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
          {trend.direction === 'up' && <span aria-hidden>▲</span>}
          {trend.direction === 'down' && <span aria-hidden>▼</span>}
          {trend.direction === 'neutral' && <span aria-hidden>•</span>}
          <span>{trend.label}</span>
        </div>
      )}
    </div>
  );
}
