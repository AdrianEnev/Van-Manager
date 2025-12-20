import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { requireAdmin, requireAuth } from '../plugins/roles';
import { Payment } from '../models/Payment';
import { Charge } from '../models/Charge';
import { User } from '../models/User';

export async function registerPaymentRoutes(app: FastifyInstance) {
    // Admin: record a manual payment (optionally linked to a charge)
    app.post('/api/payments/manual', async (req: FastifyRequest, reply: FastifyReply) => {
        await requireAdmin(app, req, reply);
        const bodySchema = z.object({
            userId: z.string().min(1),
            amount: z.number().positive(),
            currency: z.string().default('GBP'),
            relatedChargeId: z.string().optional(),
            note: z.string().optional(),
        });
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

        const payment = await Payment.create({
            userId: new mongoose.Types.ObjectId(parsed.data.userId),
            amount: parsed.data.amount,
            currency: parsed.data.currency || 'GBP',
            method: 'manual',
            relatedChargeId: parsed.data.relatedChargeId ? new mongoose.Types.ObjectId(parsed.data.relatedChargeId) : undefined,
            note: parsed.data.note,
        });

        if (parsed.data.relatedChargeId) {
            await Charge.findByIdAndUpdate(parsed.data.relatedChargeId, { $set: { status: 'paid' } });
        }

        return reply.code(201).send(payment.toJSON());
    });

    // Admin: list payments with filters
    app.get('/api/payments', async (req: FastifyRequest, reply: FastifyReply) => {
        await requireAdmin(app, req, reply);
        const qSchema = z.object({
            userId: z.string().optional(),
            method: z.enum(['manual', 'stripe']).optional(),
            from: z.coerce.date().optional(),
            to: z.coerce.date().optional(),
        }).partial();
        const parsed = qSchema.safeParse((req as any).query);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

        const { userId, method, from, to } = parsed.data;
        const filter: any = {};
        if (userId) filter.userId = new mongoose.Types.ObjectId(userId);
        if (method) filter.method = method;
        if (from || to) filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };

        const list = await Payment.find(filter).sort({ createdAt: -1 }).lean();
        const mapped = (list || []).map((p: any) => ({
            id: p._id?.toString?.(),
            userId: p.userId?.toString?.(),
            amount: p.amount,
            currency: p.currency,
            method: p.method,
            relatedChargeId: p.relatedChargeId ? p.relatedChargeId.toString() : undefined,
            externalRef: p.externalRef,
            note: p.note,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }));
        return reply.send(mapped);
    });

    // User: my payments with limited window
    app.get('/api/my/payments', async (req: FastifyRequest, reply: FastifyReply) => {
        const ctx = await requireAuth(app, req, reply);
        const qSchema = z.object({ windowDays: z.coerce.number().min(1).max(60).default(14) });
        const parsed = qSchema.safeParse((req as any).query);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
        const windowDays = parsed.data.windowDays ?? 14;
        const from = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
        const list = await Payment.find({ userId: new mongoose.Types.ObjectId(ctx.userId), createdAt: { $gte: from } })
            .sort({ createdAt: -1 })
            .lean();
        const mapped = (list || []).map((p: any) => ({
            id: p._id?.toString?.(),
            userId: p.userId?.toString?.(),
            amount: p.amount,
            currency: p.currency,
            method: p.method,
            relatedChargeId: p.relatedChargeId ? p.relatedChargeId.toString() : undefined,
            externalRef: p.externalRef,
            note: p.note,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }));
        return reply.send(mapped);
    });

    // User: initiate online checkout
    app.post('/api/payments/checkout', async (req: FastifyRequest, reply: FastifyReply) => {
        const ctx = await requireAuth(app, req, reply);
        const bodySchema = z.object({ chargeId: z.string().min(1) });
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

        const user = await User.findById(ctx.userId).select('isTransactionAllowed email').lean();
        if (!user?.isTransactionAllowed) return reply.code(403).send({ error: 'Online payments not enabled for this user' });

        const charge = await Charge.findOne({ _id: parsed.data.chargeId, userId: ctx.userId });
        if (!charge) return reply.code(404).send({ error: 'Charge not found' });
        if (charge.status === 'paid') return reply.code(400).send({ error: 'Charge already paid' });

        // Ensure we have a valid absolute URL for success/cancel redirects
        const clientUrl = process.env.WEB_BASE_URL || 'http://localhost:3000';

        try {
            const { createCheckoutSession } = await import('../services/stripe');
            const session = await createCheckoutSession({
                amount: charge.amount,
                currency: charge.currency,
                chargeId: charge._id.toString(),
                userId: ctx.userId,
                userEmail: user.email,
                successUrl: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${clientUrl}/payment/cancel`,
            });

            return reply.send({ sessionId: session.id, url: session.url });
        } catch (err: any) {
            req.log.error(err);
            return reply.code(500).send({ error: 'Failed to create checkout session' });
        }
    });

    // Stripe Webhook
    app.post('/api/payments/stripe-webhook', { config: { rawBody: true } }, async (req: FastifyRequest, reply: FastifyReply) => {
        const signature = req.headers['stripe-signature'];
        if (!signature) return reply.code(400).send('Missing stripe-signature header');

        let event;
        try {
            // NOTE: Fastify needs raw body for signature verification. 
            // Ensure specific raw body plugin is configured or use `req.raw` if compatible.
            // Here assuming `req.body` is raw buffer due to configuration or content-type parser
            const { constructWebhookEvent } = await import('../services/stripe');
            event = constructWebhookEvent(req.body as any, signature as string);
        } catch (err: any) {
            req.log.error(`Webhook signature verification failed: ${err.message}`);
            return reply.code(400).send(`Webhook Error: ${err.message}`);
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as any;
            const chargeId = session.metadata?.chargeId;
            const userId = session.metadata?.userId;

            // Ensure idempotency: check if payment already recorded
            const existing = await Payment.findOne({ externalRef: session.payment_intent });
            if (existing) return reply.send({ received: true });

            if (chargeId && userId) {
                // Create payment record
                await Payment.create({
                    userId: new mongoose.Types.ObjectId(userId),
                    amount: session.amount_total ? session.amount_total / 100 : 0,
                    currency: session.currency || 'GBP',
                    method: 'stripe',
                    relatedChargeId: new mongoose.Types.ObjectId(chargeId),
                    externalRef: session.payment_intent,
                    note: `Stripe Checkout ${session.id}`,
                });

                // Mark charge as paid
                await Charge.findByIdAndUpdate(chargeId, { $set: { status: 'paid' } });
            }
        }

        return reply.send({ received: true });
    });
}
