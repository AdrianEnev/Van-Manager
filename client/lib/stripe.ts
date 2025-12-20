import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

let stripePromise: ReturnType<typeof loadStripe>;

export function getStripe() {
    if (!stripePromise) {
        if (!STRIPE_PUBLISHABLE_KEY) {
            console.warn('Stripe publishable key is missing');
            return null;
        }
        stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
    }
    return stripePromise;
}

export async function redirectToCheckout(sessionId: string) {
    const stripe = await getStripe();
    if (!stripe) throw new Error('Stripe not initialized');

    const { error } = await (stripe as any).redirectToCheckout({ sessionId });
    if (error) throw error;
}
