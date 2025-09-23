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

  // User: initiate online checkout (placeholder to be implemented with Stripe)
  app.post('/api/payments/checkout', async (req: FastifyRequest, reply: FastifyReply) => {
    const ctx = await requireAuth(app, req, reply);
    const bodySchema = z.object({ chargeId: z.string().min(1) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const user = await User.findById(ctx.userId).select('isTransactionAllowed').lean();
    if (!user?.isTransactionAllowed) return reply.code(403).send({ error: 'Online payments not enabled for this user' });

    // Placeholder: Stripe integration to be added in a later step
    return reply.code(501).send({ error: 'Online payment not implemented yet' });
  });
}
