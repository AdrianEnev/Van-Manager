import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../plugins/roles';
import { User } from '../models/User';

export async function registerAdminUserRoutes(app: FastifyInstance) {
  // Toggle isTransactionAllowed for a user
  app.patch('/api/users/:id/transaction-allowed', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const { id } = req.params as any;
    const bodySchema = z.object({ isTransactionAllowed: z.boolean() });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const updated = await User.findByIdAndUpdate(id, { $set: { isTransactionAllowed: parsed.data.isTransactionAllowed } }, { new: true }).lean();
    if (!updated) return reply.code(404).send({ error: 'User not found' });
    return reply.send({ id: updated._id.toString(), isTransactionAllowed: !!updated.isTransactionAllowed });
  });
}
