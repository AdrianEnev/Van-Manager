"use client";

import React from "react";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = "", children, ...props }, ref
) {
  return (
    <select
      ref={ref}
      className={`block w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-black ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});
