import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { requireAdmin, requireAuth } from '../plugins/roles';
import { Plan } from '../models/Plan';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { Charge } from '../models/Charge';

const createSchema = z.object({
  userId: z.string().min(1),
  vehicleId: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().default('GBP').optional(),
  frequency: z.enum(['weekly', 'monthly', 'custom_days']),
  intervalDays: z.number().int().positive().optional(),
  startingDate: z.coerce.date(),
});

export async function registerPlanRoutes(app: FastifyInstance) {
  // Admin: create plan
  app.post('/api/plans', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { userId, vehicleId, amount, currency = 'GBP', frequency, intervalDays, startingDate } = parsed.data;

    if (!mongoose.isValidObjectId(userId)) return reply.code(400).send({ error: 'Invalid userId' });
    if (vehicleId && !mongoose.isValidObjectId(vehicleId)) return reply.code(400).send({ error: 'Invalid vehicleId' });

    const u = await User.findById(userId).select('_id').lean();
    if (!u) return reply.code(404).send({ error: 'User not found' });
    if (vehicleId) {
      const v = await Vehicle.findById(vehicleId).lean();
      if (!v) return reply.code(404).send({ error: 'Vehicle not found' });
      if ((v as any).status !== 'active') return reply.code(400).send({ error: 'Vehicle is not active' });
    }

    // nextDueDate starts at startingDate
    const plan = await Plan.create({
      userId: new mongoose.Types.ObjectId(userId),
      vehicleId: vehicleId ? new mongoose.Types.ObjectId(vehicleId) : undefined,
      amount,
      currency,
      frequency,
      intervalDays: frequency === 'custom_days' ? intervalDays : undefined,
      startingDate,
      nextDueDate: startingDate,
      active: true,
    });
    return reply.code(201).send(plan.toJSON());
  });

  // Admin: list plans
  app.get('/api/plans', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const q = (req as any).query || {};
    const filter: any = {};
    if (q.userId && mongoose.isValidObjectId(q.userId)) filter.userId = new mongoose.Types.ObjectId(q.userId);
    if (q.vehicleId && mongoose.isValidObjectId(q.vehicleId)) filter.vehicleId = new mongoose.Types.ObjectId(q.vehicleId);
    if (q.active !== undefined) filter.active = String(q.active) === 'true';
    const list = await Plan.find(filter).sort({ createdAt: -1 }).lean();
    const mapped = (list || []).map((p: any) => ({
      id: p._id?.toString?.(),
      userId: p.userId?.toString?.(),
      vehicleId: p.vehicleId ? p.vehicleId.toString() : undefined,
      amount: p.amount,
      currency: p.currency,
      frequency: p.frequency,
      intervalDays: p.intervalDays,
      startingDate: p.startingDate,
      nextDueDate: p.nextDueDate,
      active: p.active,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    return reply.send(mapped);
  });

  // Admin: update plan (amount, currency, active on/off)
  app.patch('/api/plans/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const { id } = req.params as any;
    const bodySchema = z.object({ amount: z.number().positive().optional(), currency: z.string().optional(), active: z.boolean().optional() }).partial();
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const updated = await Plan.findByIdAndUpdate(id, { $set: parsed.data }, { new: true }).lean();
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    const mapped = {
      id: (updated as any)._id?.toString?.(),
      userId: (updated as any).userId?.toString?.(),
      vehicleId: (updated as any).vehicleId ? (updated as any).vehicleId.toString() : undefined,
      amount: (updated as any).amount,
      currency: (updated as any).currency,
      frequency: (updated as any).frequency,
      intervalDays: (updated as any).intervalDays,
      startingDate: (updated as any).startingDate,
      nextDueDate: (updated as any).nextDueDate,
      active: (updated as any).active,
      createdAt: (updated as any).createdAt,
      updatedAt: (updated as any).updatedAt,
    };
    return reply.send(mapped);
  });
}
