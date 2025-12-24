import Stripe from 'stripe';
import { loadApiEnv } from '../env';

const env = loadApiEnv();

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    typescript: true,
});

export async function createCheckoutSession(params: {
    amount: number;
    currency: string;
    chargeId: string;
    userId: string;
    userEmail: string;
    successUrl: string;
    cancelUrl: string;
}) {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: params.currency,
                    product_data: {
                        name: 'Payment for charge',
                        metadata: {
                            chargeId: params.chargeId,
                        },
                    },
                    unit_amount: Math.round(params.amount * 100), // Stripe expects amounts in cents
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        customer_email: params.userEmail,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
            chargeId: params.chargeId,
            userId: params.userId,
        },
    });

    return session;
}

export function constructWebhookEvent(payload: string | Buffer, signature: string) {
    return stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
}
