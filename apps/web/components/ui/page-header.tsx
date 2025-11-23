"use client";

import React from "react";

export function PageHeader({ title, subtitle, actions, className = "" }: { title: string; subtitle?: string; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div>
        <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
