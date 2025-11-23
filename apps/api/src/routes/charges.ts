import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { requireAdmin, requireAuth } from '../plugins/roles';
import { Charge } from '../models/Charge';
import { Payment } from '../models/Payment';

export async function registerChargeRoutes(app: FastifyInstance) {
  // Admin: create a charge
  app.post('/api/charges', async (req: FastifyRequest, reply: FastifyReply) => {
    const bodySchema = z.object({
      userId: z.string().min(1),
      vehicleId: z.string().optional(),
      amount: z.number().positive(),
      currency: z.string().default('GBP'),
      type: z.enum(['weekly_fee', 'mot', 'other']),
      dueDate: z.coerce.date(),
      metadata: z.record(z.any()).optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const ctx = await requireAdmin(app, req, reply);

    const doc = await Charge.create({
      userId: new mongoose.Types.ObjectId(parsed.data.userId),
      vehicleId: parsed.data.vehicleId ? new mongoose.Types.ObjectId(parsed.data.vehicleId) : undefined,
      amount: parsed.data.amount,
      currency: parsed.data.currency || 'GBP',
      type: parsed.data.type,
      dueDate: parsed.data.dueDate,
      status: 'pending',
      createdBy: new mongoose.Types.ObjectId(ctx.userId),
      metadata: parsed.data.metadata,
    });
    return reply.code(201).send(doc.toJSON());
  });

  // Admin: list charges with filters
  app.get('/api/charges', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const qSchema = z.object({
      userId: z.string().optional(),
      vehicleId: z.string().optional(),
      status: z.enum(['pending', 'paid', 'overdue', 'canceled']).optional(),
      type: z.enum(['weekly_fee', 'mot', 'other']).optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    }).partial();
    const parsed = qSchema.safeParse((req as any).query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { userId, vehicleId, status, type, from, to } = parsed.data;
    const filter: any = {};
    if (userId) filter.userId = new mongoose.Types.ObjectId(userId);
    if (vehicleId) filter.vehicleId = new mongoose.Types.ObjectId(vehicleId);
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (from || to) filter.dueDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    const list = await Charge.find(filter).sort({ dueDate: -1 }).lean();
    const mapped = (list || []).map((c: any) => ({
      id: c._id?.toString?.(),
      userId: c.userId?.toString?.(),
      vehicleId: c.vehicleId ? c.vehicleId.toString() : undefined,
      amount: c.amount,
      currency: c.currency,
      type: c.type,
      dueDate: c.dueDate,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    return reply.send(mapped);
  });

  // Admin: mark charge as paid (manual)
  app.post('/api/charges/:id/mark-paid', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const { id } = req.params as any;
    const bodySchema = z.object({ amount: z.number().positive().optional(), currency: z.string().optional(), note: z.string().optional() });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const charge = await Charge.findById(id);
    if (!charge) return reply.code(404).send({ error: 'Charge not found' });
    if (charge.status === 'paid') return reply.send({ ok: true });

    const payment = await Payment.create({
      userId: charge.userId,
      amount: parsed.data.amount ?? charge.amount,
      currency: parsed.data.currency ?? 'GBP',
      method: 'manual',
      relatedChargeId: charge._id,
      note: parsed.data.note,
    });
    charge.status = 'paid';
    await charge.save();

    return reply.send({ ok: true, paymentId: payment._id.toString() });
  });

  // User: my charges with limited window
  app.get('/api/my/charges', async (req: FastifyRequest, reply: FastifyReply) => {
    const ctx = await requireAuth(app, req, reply);
    const qSchema = z.object({ windowDays: z.coerce.number().min(1).max(60).default(14) });
    const parsed = qSchema.safeParse((req as any).query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const windowDays = parsed.data.windowDays ?? 14;
    const from = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const list = await Charge.find({ userId: new mongoose.Types.ObjectId(ctx.userId), dueDate: { $gte: from } })
      .sort({ dueDate: -1 })
      .lean();
    const mapped = (list || []).map((c: any) => ({
      id: c._id?.toString?.(),
      userId: c.userId?.toString?.(),
      vehicleId: c.vehicleId ? c.vehicleId.toString() : undefined,
      amount: c.amount,
      currency: c.currency,
      type: c.type,
      dueDate: c.dueDate,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    return reply.send(mapped);
  });
}
