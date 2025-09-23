import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { Vehicle } from '../models/Vehicle';
import { requireAdmin, requireAuth } from '../plugins/roles';

export async function registerVehicleRoutes(app: FastifyInstance) {
  // Admin: create vehicle
  app.post('/api/vehicles', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const bodySchema = z.object({
      plateNumber: z.string().min(2),
      makeModel: z.string().optional(),
      motExpiry: z.coerce.date().optional(),
      status: z.enum(['active', 'inactive']).optional(),
      notes: z.string().optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const v = await Vehicle.create(parsed.data);
    return reply.code(201).send(v);
  });

  // Admin: list vehicles
  app.get('/api/vehicles', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const qSchema = z.object({
      status: z.enum(['active', 'inactive']).optional(),
      search: z.string().optional(),
    }).partial();
    const parsed = qSchema.safeParse((req as any).query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { status, search } = parsed.data;
    const filter: any = {};
    if (status) filter.status = status;
    if (search) filter.plateNumber = { $regex: search, $options: 'i' };
    const list = await Vehicle.find(filter).sort({ createdAt: -1 }).lean();
    return reply.send(list);
  });

  // Admin: get one
  app.get('/api/vehicles/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const { id } = (req.params as any);
    const v = await Vehicle.findById(id).lean();
    if (!v) return reply.code(404).send({ error: 'Not found' });
    return reply.send(v);
  });

  // Admin: update
  app.patch('/api/vehicles/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const { id } = (req.params as any);
    const bodySchema = z.object({
      makeModel: z.string().optional(),
      motExpiry: z.coerce.date().optional(),
      status: z.enum(['active', 'inactive']).optional(),
      notes: z.string().optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const v = await Vehicle.findByIdAndUpdate(id, { $set: parsed.data }, { new: true }).lean();
    if (!v) return reply.code(404).send({ error: 'Not found' });
    return reply.send(v);
  });

  // Admin: delete (soft by status)
  app.delete('/api/vehicles/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const { id } = (req.params as any);
    const v = await Vehicle.findByIdAndUpdate(id, { $set: { status: 'inactive' } }, { new: true }).lean();
    if (!v) return reply.code(404).send({ error: 'Not found' });
    return reply.send({ ok: true });
  });

  // User: basic guard for future user-level vehicle views (e.g., health)
  app.get('/api/my/vehicle-health', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(app, req, reply);
    // placeholder endpoint to test auth; real per-user vehicle data comes from assignments route
    return reply.send({ ok: true });
  });
}
