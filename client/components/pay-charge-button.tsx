"use client";

import { useState } from 'react';
import { Button, ButtonProps } from 'components/ui/button';
import { initiatePayment as apiInitiatePayment } from '../lib/api';


interface PayChargeButtonProps extends ButtonProps {
    chargeId: string;
    amount: number;
}

export function PayChargeButton({ chargeId, amount, className, children, ...props }: PayChargeButtonProps) {
    const [loading, setLoading] = useState(false);

    async function handlePay(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (loading) return;

        setLoading(true);
        try {
            const { url } = await apiInitiatePayment(chargeId);
            if (url) {
                window.location.href = url;
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Payment initiation failed');
            setLoading(false);
        }
    }

    return (
        <Button
            onClick={handlePay}
            disabled={loading || props.disabled}
            className={className}
            {...props}
        >
            {loading ? 'Processing...' : children || 'Pay Now'}
        </Button>
    );
}
