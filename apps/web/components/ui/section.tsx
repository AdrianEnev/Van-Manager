"use client";

import React from "react";

export function Section({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={`space-y-3 ${className}`}>
      {children}
    </section>
  );
}

export function SectionTitle({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <h2 className={`text-lg font-medium ${className}`}>{children}</h2>
  );
}

export function SectionDescription({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <p className={`text-sm text-gray-600 ${className}`}>{children}</p>
  );
}
