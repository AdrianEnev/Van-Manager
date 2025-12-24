"use client";

import React from "react";

export function Card({ className = "", children, id }: { className?: string; children: React.ReactNode; id?: string }) {
    return (
        <div id={id} className={`rounded-xl border border-gray-100 bg-white shadow-md shadow-gray-200/50 ${className}`}>
            {children}
        </div>
    );
}

export function CardHeader({ className = "", children }: { className?: string; children: React.ReactNode }) {
    return (
        <div className={`border-b px-4 py-3 ${className}`}>
            {children}
        </div>
    );
}

export function CardTitle({ className = "", children }: { className?: string; children: React.ReactNode }) {
    return (
        <h3 className={`text-base font-semibold leading-6 ${className}`}>{children}</h3>
    );
}

export function CardContent({ className = "", children }: { className?: string; children: React.ReactNode }) {
    return (
        <div className={`px-4 py-4 ${className}`}>
            {children}
        </div>
    );
}

export function CardFooter({ className = "", children }: { className?: string; children: React.ReactNode }) {
    return (
        <div className={`border-t px-4 py-3 ${className}`}>
            {children}
        </div>
    );
}
