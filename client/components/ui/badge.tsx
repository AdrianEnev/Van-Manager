"use client";

import React from "react";

export function Badge({ children, tone = "gray", className = "" }: { children: React.ReactNode; tone?: 'gray'|'green'|'red'|'yellow'|'blue'; className?: string }) {
  const toneClass = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
  }[tone];
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${toneClass} ${className}`}>{children}</span>
  );
}
