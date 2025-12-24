"use client";

import React from "react";
import { Button } from "./ui/button";

interface NotificationBannerProps {
    variant?: 'error' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    onDismiss?: () => void;
    dismissible?: boolean;
}

export function NotificationBanner({
    variant = 'info',
    title,
    message,
    actionLabel,
    onAction,
    onDismiss,
    dismissible = false,
}: NotificationBannerProps) {
    const variantStyles = {
        error: 'bg-red-50 border-red-200 text-red-900',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
        info: 'bg-blue-50 border-blue-200 text-blue-900',
        success: 'bg-green-50 border-green-200 text-green-900',
    };

    const iconBgStyles = {
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500',
        success: 'bg-green-500',
    };

    const buttonStyles = {
        error: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        info: 'bg-blue-600 hover:bg-blue-700 text-white',
        success: 'bg-green-600 hover:bg-green-700 text-white',
    };

    return (
        <div className={`rounded-lg border-2 p-4 ${variantStyles[variant]}`}>
            <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${iconBgStyles[variant]}`} />
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1">{title}</h3>
                    <p className="text-sm opacity-90">{message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {actionLabel && onAction && (
                        <Button
                            onClick={onAction}
                            size="sm"
                            className={buttonStyles[variant]}
                        >
                            {actionLabel}
                        </Button>
                    )}
                    {dismissible && onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="p-1 rounded hover:bg-black/5 transition-colors"
                            aria-label="Dismiss"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
