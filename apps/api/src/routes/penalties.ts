import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { requireAdmin, requireAuth } from '../plugins/roles';
import { Penalty } from '../models/Penalty';

export async function registerPenaltyRoutes(app: FastifyInstance) {
  // Admin: create penalty
  app.post('/api/penalties', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const bodySchema = z.object({
      userId: z.string().min(1),
      vehicleId: z.string().optional(),
      amount: z.number().positive(),
      reason: z.string().min(1),
      dueDate: z.coerce.date().optional(),
      metadata: z.record(z.any()).optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const doc = await Penalty.create({
      userId: new mongoose.Types.ObjectId(parsed.data.userId),
      vehicleId: parsed.data.vehicleId ? new mongoose.Types.ObjectId(parsed.data.vehicleId) : undefined,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      dueDate: parsed.data.dueDate,
      status: 'pending',
      metadata: parsed.data.metadata,
    });
    return reply.code(201).send(doc.toJSON());
  });

  // Admin: list penalties with filters
  app.get('/api/penalties', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const qSchema = z.object({
      userId: z.string().optional(),
      vehicleId: z.string().optional(),
      status: z.enum(['pending', 'paid', 'waived']).optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    }).partial();
    const parsed = qSchema.safeParse((req as any).query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { userId, vehicleId, status, from, to } = parsed.data;
    const filter: any = {};
    if (userId) filter.userId = new mongoose.Types.ObjectId(userId);
    if (vehicleId) filter.vehicleId = new mongoose.Types.ObjectId(vehicleId);
    if (status) filter.status = status;
    if (from || to) filter.dueDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };

    const list = await Penalty.find(filter).sort({ createdAt: -1 }).lean();
    const mapped = (list || []).map((p: any) => ({
      id: p._id?.toString?.(),
      userId: p.userId?.toString?.(),
      vehicleId: p.vehicleId ? p.vehicleId.toString() : undefined,
      amount: p.amount,
      reason: p.reason,
      dueDate: p.dueDate,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    return reply.send(mapped);
  });

  // Admin: update status (e.g., paid or waived)
  app.post('/api/penalties/:id/status', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const { id } = req.params as any;
    const bodySchema = z.object({ status: z.enum(['pending', 'paid', 'waived']) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const doc = await Penalty.findByIdAndUpdate(id, { $set: { status: parsed.data.status } }, { new: true }).lean();
    if (!doc) return reply.code(404).send({ error: 'Not found' });
    const mapped = {
      id: (doc as any)._id?.toString?.(),
      userId: (doc as any).userId?.toString?.(),
      vehicleId: (doc as any).vehicleId ? (doc as any).vehicleId.toString() : undefined,
      amount: (doc as any).amount,
      reason: (doc as any).reason,
      dueDate: (doc as any).dueDate,
      status: (doc as any).status,
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
    return reply.send(mapped);
  });

  // User: my penalties (active)
  app.get('/api/my/penalties', async (req: FastifyRequest, reply: FastifyReply) => {
    const ctx = await requireAuth(app, req, reply);
    const list = await Penalty.find({ userId: new mongoose.Types.ObjectId(ctx.userId), status: { $in: ['pending', 'paid'] } })
      .sort({ createdAt: -1 })
      .lean();
    const mapped = (list || []).map((p: any) => ({
      id: p._id?.toString?.(),
      userId: p.userId?.toString?.(),
      vehicleId: p.vehicleId ? p.vehicleId.toString() : undefined,
      amount: p.amount,
      reason: p.reason,
      dueDate: p.dueDate,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    return reply.send(mapped);
  });
}
