"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "./ui/card";
import { PayChargeButton } from "./pay-charge-button";
import type { Charge, Payment } from "../lib/api";

interface PaymentTimelineProps {
    charges: Charge[];
    payments: Payment[];
    isTransactionAllowed?: boolean;
}

export function PaymentTimeline({ charges, payments, isTransactionAllowed }: PaymentTimelineProps) {
    // Normalize now to start of day for accurate date comparison
    const now = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    console.log('PaymentTimeline debug:', {
        chargesCount: charges?.length,
        isTransactionAllowed,
        userRole: 'user' // we don't have user role here but we know isTransactionAllowed status
    });

    const getDaysUntilDue = (dueDate: string) => {
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getDaysOverdue = (dueDate: string) => {
        return Math.max(0, -getDaysUntilDue(dueDate));
    };

    // Get unpaid charges - ONLY showing those actually Overdue or Due Today
    const unpaidCharges = useMemo(() => {
        return charges
            .filter(c => {
                if (c.status === 'overdue') return true;
                if (c.status === 'pending') {
                    // Only include if due today or earlier
                    return getDaysUntilDue(c.dueDate) <= 0;
                }
                return false;
            })
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [charges, now]);

    // Get the last paid charge
    const lastPaidCharge = useMemo(() => {
        return charges
            .filter(c => c.status === 'paid')
            .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())[0];
    }, [charges]);

    // Get next upcoming charge (future only)
    const nextCharge = useMemo(() => {
        return charges
            .filter(c => c.status === 'pending' && getDaysUntilDue(c.dueDate) > 0)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    }, [charges, now]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            maximumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Check if we should notify admin (2+ unpaid charges)
    if (unpaidCharges.length >= 2) {
        console.warn(`⚠️ ADMIN ALERT: User has ${unpaidCharges.length} unpaid charges totaling ${formatCurrency(unpaidCharges.reduce((sum, c) => sum + c.amount, 0))}`);
    }

    const hasMultipleUnpaid = unpaidCharges.length >= 3;
    const totalUnpaid = unpaidCharges.reduce((sum, c) => sum + c.amount, 0);

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Left Side: Unpaid / Last Payment */}
            <div className={`relative overflow-hidden rounded-2xl border bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl ${unpaidCharges.length > 0
                ? 'border-red-100 shadow-red-200/50'
                : 'border-emerald-100 shadow-emerald-200/50'
                }`}>
                {/* Background accent */}
                <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-10 blur-3xl ${unpaidCharges.length > 0 ? 'bg-red-500' : 'bg-emerald-500'
                    }`} />

                {unpaidCharges.length > 0 ? (
                    // Unpaid charges
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-xl">⚠️</div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-red-600">Action Required</p>
                                <h3 className="text-lg font-bold text-gray-900">Outstanding Balance</h3>
                            </div>
                        </div>

                        {hasMultipleUnpaid ? (
                            <>
                                <div className="mb-2">
                                    <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{formatCurrency(totalUnpaid)}</p>
                                    <p className="text-sm font-medium text-red-600">{unpaidCharges.length} overdue payments</p>
                                </div>
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                    {unpaidCharges.map((charge) => {
                                        const daysOverdue = getDaysOverdue(charge.dueDate);
                                        return (
                                            <div key={charge.id} className="flex items-center justify-between rounded-xl border border-red-50 bg-red-50/30 p-3">
                                                <div>
                                                    <p className="font-bold text-gray-900">{formatCurrency(charge.amount)}</p>
                                                    <p className="text-xs font-medium text-red-600">
                                                        {daysOverdue > 0 ? `${daysOverdue} days overdue` : 'Due today'}
                                                    </p>
                                                </div>
                                                {isTransactionAllowed && (
                                                    <PayChargeButton
                                                        chargeId={charge.id}
                                                        amount={charge.amount}
                                                        size="sm"
                                                        className="bg-red-600 text-xs hover:bg-red-700 text-white shadow-none"
                                                    >
                                                        Pay
                                                    </PayChargeButton>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <p className="text-4xl font-extrabold text-gray-900 tracking-tight">{formatCurrency(unpaidCharges[0].amount)}</p>
                                    <p className="text-sm font-medium text-red-600 mt-1">
                                        {getDaysOverdue(unpaidCharges[0].dueDate) > 0
                                            ? `${getDaysOverdue(unpaidCharges[0].dueDate)} days overdue`
                                            : 'Due today'}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
                                    Due Date: <span className="font-semibold">{formatDate(unpaidCharges[0].dueDate)}</span>
                                </div>
                                {isTransactionAllowed && (
                                    <PayChargeButton
                                        chargeId={unpaidCharges[0].id}
                                        amount={unpaidCharges[0].amount}
                                        className="w-full mt-4 bg-gradient-to-r from-red-600 to-red-500 py-6 text-lg font-bold text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:to-red-600 transition-all rounded-xl"
                                    >
                                        Pay Now 💳
                                    </PayChargeButton>
                                )}
                            </>
                        )}
                    </div>
                ) : lastPaidCharge ? (
                    // Last paid charge
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xl">✓</div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Status</p>
                                <h3 className="text-lg font-bold text-gray-900">All Caught Up</h3>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Last payment made</p>
                            <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{formatCurrency(lastPaidCharge.amount)}</p>
                            <p className="text-sm font-medium text-emerald-600 mt-1">on {formatDate(lastPaidCharge.dueDate)}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center py-6 text-center">
                        <div className="mb-3 rounded-full bg-gray-100 p-3 text-2xl">👋</div>
                        <p className="font-medium text-gray-900">Welcome!</p>
                        <p className="text-sm text-gray-500">No payment history yet.</p>
                    </div>
                )}
            </div>

            {/* Right Side: Next Payment */}
            <div className={`relative overflow-hidden rounded-2xl border bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl ${nextCharge && getDaysUntilDue(nextCharge.dueDate) <= 0
                ? 'border-red-100 shadow-red-200/50'
                : 'border-indigo-100 shadow-indigo-200/50'
                }`}>
                {/* Background accent */}
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />

                <div className="relative z-10 h-full">
                    {nextCharge ? (
                        getDaysUntilDue(nextCharge.dueDate) <= 0 ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-xl">⚠️</div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-red-600">Due Today</p>
                                        <h3 className="text-lg font-bold text-gray-900">Payment Required</h3>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-4xl font-extrabold text-gray-900 tracking-tight">{formatCurrency(nextCharge.amount)}</p>
                                    <p className="text-sm text-red-600 font-medium">Please pay by end of day</p>
                                    {isTransactionAllowed && (
                                        <PayChargeButton
                                            chargeId={nextCharge.id}
                                            amount={nextCharge.amount}
                                            className="w-full mt-4 bg-gradient-to-r from-red-600 to-red-500 py-6 text-lg font-bold text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:to-red-600 transition-all rounded-xl"
                                        >
                                            Pay Now 💳
                                        </PayChargeButton>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-full flex-col justify-between space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xl">📅</div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Upcoming</p>
                                        <h3 className="text-lg font-bold text-gray-900">Next Payment</h3>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-4xl font-extrabold text-gray-900 tracking-tight">{formatCurrency(nextCharge.amount)}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                                            {getDaysUntilDue(nextCharge.dueDate)} days left
                                        </span>
                                        <span className="text-sm text-gray-500">Due {formatDate(nextCharge.dueDate)}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center py-6 text-center">
                            <div className="mb-3 rounded-full bg-gray-50 p-3 text-2xl">📅</div>
                            <p className="font-medium text-gray-900">No upcoming charges</p>
                            <p className="text-sm text-gray-500">You're all clear for now.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
