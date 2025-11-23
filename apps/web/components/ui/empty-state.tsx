"use client";

import React from "react";

export function EmptyState({ title = "Nothing here yet", description }: { title?: string; description?: string }) {
  return (
    <div className="rounded-md border border-dashed bg-white p-6 text-center text-sm text-gray-600">
      <div className="font-medium text-gray-800">{title}</div>
      {description && <div className="mt-1 text-gray-600">{description}</div>}
    </div>
  );
}
