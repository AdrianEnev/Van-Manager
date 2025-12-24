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
        <div className="grid gap-4 md:grid-cols-2">
            {/* Left Side: Last Payment / Unpaid Charges */}
            <Card className={`border-2 ${unpaidCharges.length > 0 ? 'border-red-400 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                <CardContent className="p-4">
                    {unpaidCharges.length > 0 ? (
                        // Unpaid charges
                        <div className="space-y-3">
                            {hasMultipleUnpaid ? (
                                // Multiple unpaid - show all
                                <>
                                    <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-red-300">
                                        <div>
                                            <p className="text-xs font-bold text-red-700 uppercase tracking-wide">⚠️ Multiple Unpaid</p>
                                            <p className="text-2xl font-extrabold text-red-900 mt-1">{formatCurrency(totalUnpaid)}</p>
                                            <p className="text-sm text-red-800 font-semibold">{unpaidCharges.length} charges</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {unpaidCharges.map((charge) => {
                                            const daysOverdue = getDaysOverdue(charge.dueDate);
                                            return (
                                                <div key={charge.id} className="bg-white rounded-lg border-2 border-red-300 p-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <p className="font-bold text-red-900">{formatCurrency(charge.amount)}</p>
                                                            <p className="text-xs text-red-700">
                                                                {daysOverdue > 0 ? `${daysOverdue} days overdue` : 'Due today'}
                                                            </p>
                                                            <p className="text-xs text-gray-600">{formatDate(charge.dueDate)}</p>
                                                        </div>
                                                        {isTransactionAllowed && (
                                                            <PayChargeButton
                                                                chargeId={charge.id}
                                                                amount={charge.amount}
                                                                size="sm"
                                                                className="bg-red-600 hover:bg-red-700 text-white font-semibold ml-2"
                                                            >
                                                                Pay
                                                            </PayChargeButton>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                // Single unpaid charge
                                <>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl">⚠️</span>
                                        <p className="text-sm font-bold text-red-700 uppercase tracking-wide">Unpaid Charge</p>
                                    </div>
                                    <p className="text-3xl font-extrabold text-red-900">{formatCurrency(unpaidCharges[0].amount)}</p>
                                    <p className="text-sm text-red-800 font-semibold">
                                        {getDaysOverdue(unpaidCharges[0].dueDate) > 0
                                            ? `${getDaysOverdue(unpaidCharges[0].dueDate)} days overdue`
                                            : 'Due today'}
                                    </p>
                                    <p className="text-sm text-red-700">Due: {formatDate(unpaidCharges[0].dueDate)}</p>
                                    {isTransactionAllowed && (
                                        <PayChargeButton
                                            chargeId={unpaidCharges[0].id}
                                            amount={unpaidCharges[0].amount}
                                            className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-bold"
                                        >
                                            Pay Now
                                        </PayChargeButton>
                                    )}
                                </>
                            )}
                        </div>
                    ) : lastPaidCharge ? (
                        // Last paid charge
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">✓</span>
                                <p className="text-sm font-bold text-green-700 uppercase tracking-wide">Last Payment</p>
                            </div>
                            <p className="text-3xl font-extrabold text-green-900">{formatCurrency(lastPaidCharge.amount)}</p>
                            <p className="text-sm text-green-800 font-semibold mt-2">Payment Date:</p>
                            <p className="text-sm text-green-700">{formatDate(lastPaidCharge.dueDate)}</p>
                        </div>
                    ) : (
                        // No charges
                        <div className="text-center py-6">
                            <p className="text-gray-500 text-sm">No payment history</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Right Side: Next Payment */}
            <Card className={`border-2 ${nextCharge && getDaysUntilDue(nextCharge.dueDate) <= 0 ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'}`}>
                <CardContent className="p-4">
                    {nextCharge ? (
                        getDaysUntilDue(nextCharge.dueDate) <= 0 ? (
                            // Due today or overdue
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">⚠️</span>
                                    <p className="text-sm font-bold text-red-700 uppercase tracking-wide">Payment Due Today!</p>
                                </div>
                                <p className="text-3xl font-extrabold text-red-900">{formatCurrency(nextCharge.amount)}</p>
                                <p className="text-sm text-red-800 font-semibold">Due: {formatDate(nextCharge.dueDate)}</p>
                                {isTransactionAllowed && (
                                    <PayChargeButton
                                        chargeId={nextCharge.id}
                                        amount={nextCharge.amount}
                                        className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-bold"
                                    >
                                        Pay Now
                                    </PayChargeButton>
                                )}
                            </div>
                        ) : (
                            // Future payment
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">📅</span>
                                    <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Next Payment</p>
                                </div>
                                <p className="text-3xl font-extrabold text-gray-900">{formatCurrency(nextCharge.amount)}</p>
                                <p className="text-sm text-gray-800 font-semibold mt-2">
                                    {getDaysUntilDue(nextCharge.dueDate)} day{getDaysUntilDue(nextCharge.dueDate) !== 1 ? 's' : ''}:
                                </p>
                                <p className="text-sm text-gray-700">{formatDate(nextCharge.dueDate)}</p>
                            </div>
                        )
                    ) : (
                        // Placeholder when no next charge found
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">📅</span>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Next Payment</p>
                            </div>
                            <p className="text-lg text-gray-500 italic">No upcoming charges scheduled</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
