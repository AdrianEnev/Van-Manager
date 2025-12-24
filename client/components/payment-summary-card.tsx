"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { PayChargeButton } from "./pay-charge-button";
import type { Charge } from "../lib/api";

interface PaymentSummaryCardProps {
    charges: Charge[];
    onPayCharge?: (chargeId: string) => void;
    isTransactionAllowed?: boolean;
}

export function PaymentSummaryCard({ charges, onPayCharge, isTransactionAllowed }: PaymentSummaryCardProps) {
    const now = new Date();

    const overdueCharges = charges.filter(c => c.status === 'overdue');
    const pendingCharges = charges.filter(c => c.status === 'pending');

    const totalOverdue = overdueCharges.reduce((sum, c) => sum + c.amount, 0);
    const totalPending = pendingCharges.reduce((sum, c) => sum + c.amount, 0);

    const upcomingCharges = pendingCharges
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 3);

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

    const getDaysUntilDue = (dueDate: string) => {
        const due = new Date(dueDate);
        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    if (overdueCharges.length === 0 && pendingCharges.length === 0) {
        return null;
    }

    return (
        <Card className="border-2">
            <CardHeader>
                <CardTitle className="text-lg">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Totals */}
                <div className="grid grid-cols-2 gap-3">
                    {totalOverdue > 0 && (
                        <div className="rounded-lg bg-red-50 border-2 border-red-200 p-3">
                            <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Overdue</p>
                            <p className="text-xl font-bold text-red-900 mt-1">{formatCurrency(totalOverdue)}</p>
                            <p className="text-xs text-red-700 mt-0.5">{overdueCharges.length} charge{overdueCharges.length !== 1 ? 's' : ''}</p>
                        </div>
                    )}
                    {totalPending > 0 && (
                        <div className="rounded-lg bg-red-100 border-3 border-red-400 p-4 shadow-lg animate-pulse-slow">
                            <p className="text-sm font-bold text-red-700 uppercase tracking-wide">⚠️ Pending Payment</p>
                            <p className="text-2xl font-extrabold text-red-900 mt-2">{formatCurrency(totalPending)}</p>
                            <p className="text-sm text-red-800 mt-1 font-semibold">{pendingCharges.length} charge{pendingCharges.length !== 1 ? 's' : ''}</p>
                            {isTransactionAllowed && pendingCharges.length > 0 && (
                                <div className="mt-3">
                                    <PayChargeButton
                                        chargeId={pendingCharges[0].id}
                                        amount={totalPending}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
                                        size="sm"
                                    >
                                        Pay Now
                                    </PayChargeButton>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Upcoming charges */}
                {upcomingCharges.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Next Payments Due</h4>
                        <div className="space-y-2">
                            {upcomingCharges.map((charge) => {
                                const daysUntil = getDaysUntilDue(charge.dueDate);
                                const isUrgent = daysUntil <= 3;

                                return (
                                    <div
                                        key={charge.id}
                                        className={`flex items-center justify-between rounded-lg border p-2 text-sm ${isUrgent ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900">{formatCurrency(charge.amount)}</p>
                                            <p className="text-xs text-gray-600">{formatDate(charge.dueDate)}</p>
                                        </div>
                                        <Badge tone={isUrgent ? 'yellow' : 'gray'} className="shrink-0">
                                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
