"use client";

import React from "react";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...props }, ref
) {
  return (
    <input
      ref={ref}
      className={`block w-full rounded-md border px-3 py-2 text-sm placeholder:text-gray-400 outline-none focus-visible:ring-2 focus-visible:ring-black ${className}`}
      {...props}
    />
  );
});
