"use client";

import React from "react";

interface BadgeProps {
    children: React.ReactNode;
    tone?: 'gray' | 'green' | 'red' | 'yellow' | 'blue';
    size?: 'sm' | 'md' | 'lg';
    variant?: 'subtle' | 'bold';
    className?: string;
}

export function Badge({ children, tone = "gray", size = "md", variant = "subtle", className = "" }: BadgeProps) {
    const toneClasses = {
        subtle: {
            gray: 'bg-gray-100 text-gray-700',
            green: 'bg-green-100 text-green-700',
            red: 'bg-red-100 text-red-700',
            yellow: 'bg-yellow-100 text-yellow-700',
            blue: 'bg-blue-100 text-blue-700',
        },
        bold: {
            gray: 'bg-gray-200 text-gray-900 border border-gray-300',
            green: 'bg-green-200 text-green-900 border border-green-300',
            red: 'bg-red-200 text-red-900 border border-red-400',
            yellow: 'bg-yellow-200 text-yellow-900 border border-yellow-300',
            blue: 'bg-blue-200 text-blue-900 border border-blue-300',
        },
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
    };

    const toneClass = toneClasses[variant][tone];
    const sizeClass = sizeClasses[size];

    return (
        <span className={`inline-flex items-center rounded font-medium ${toneClass} ${sizeClass} ${className}`}>
            {children}
        </span>
    );
}
