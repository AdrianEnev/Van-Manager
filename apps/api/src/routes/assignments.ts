import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { requireAdmin, requireAuth } from '../plugins/roles';
import { UserVehicle } from '../models/UserVehicle';
import { Vehicle } from '../models/Vehicle';

export async function registerAssignmentRoutes(app: FastifyInstance) {
  // Admin: attach vehicle to user (activate or create)
  app.post('/api/assignments', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId, vehicleId } = (z
      .object({ userId: z.string().min(1), vehicleId: z.string().min(1) })
      .parse(req.body)) as { userId: string; vehicleId: string };

    await requireAdmin(app, req, reply);

    // ensure vehicle exists
    const v = await Vehicle.findById(vehicleId).lean();
    if (!v) return reply.code(404).send({ error: 'Vehicle not found' });

    const uid = new mongoose.Types.ObjectId(userId);
    const vid = new mongoose.Types.ObjectId(vehicleId);

    // either create new or reactivate existing
    let record = await UserVehicle.findOne({ userId: uid, vehicleId: vid });
    if (!record) {
      record = await UserVehicle.create({ userId: uid, vehicleId: vid, active: true, assignedAt: new Date() });
    } else if (!record.active) {
      record.active = true;
      record.assignedAt = new Date();
      await record.save();
    }
    return reply.code(201).send(record.toJSON());
  });

  // Admin: detach by assignment id (soft deactivate)
  app.delete('/api/assignments/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const { id } = req.params as any;
    const rec = await UserVehicle.findByIdAndUpdate(id, { $set: { active: false } }, { new: true }).lean();
    if (!rec) return reply.code(404).send({ error: 'Not found' });
    return reply.send({ ok: true });
  });

  // Admin: list a user's vehicles (active only)
  app.get('/api/users/:userId/vehicles', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const { userId } = req.params as any;
    const uid = new mongoose.Types.ObjectId(userId);
    const list = await UserVehicle.find({ userId: uid, active: true })
      .populate('vehicleId')
      .sort({ assignedAt: -1 })
      .lean();
    const vehicles = (list || []).map((r: any) => ({
      assignmentId: r._id?.toString?.(),
      assignedAt: r.assignedAt,
      vehicle: r.vehicleId,
    }));
    return reply.send(vehicles);
  });

  // User: list my vehicles (active)
  app.get('/api/my/vehicles', async (req: FastifyRequest, reply: FastifyReply) => {
    const ctx = await requireAuth(app, req, reply);
    const uid = new mongoose.Types.ObjectId(ctx.userId);
    const list = await UserVehicle.find({ userId: uid, active: true })
      .populate('vehicleId')
      .sort({ assignedAt: -1 })
      .lean();
    const vehicles = (list || []).map((r: any) => ({
      assignmentId: r._id?.toString?.(),
      assignedAt: r.assignedAt,
      vehicle: r.vehicleId,
    }));
    return reply.send(vehicles);
  });
}
