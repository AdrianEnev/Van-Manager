import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { requireAdmin } from '../plugins/roles';
import { Charge } from '../models/Charge';
import { Plan } from '../models/Plan';

/**
 * Development-only endpoints for fast testing of charges, plans, and notifications
 * These endpoints bypass normal scheduler timing to allow rapid testing
 */
export async function registerDevRoutes(app: FastifyInstance) {
    const isDev = process.env.NODE_ENV !== 'production';

    if (!isDev) {
        app.log.info('Dev routes disabled in production');
        return;
    }

    // Manually trigger plan charge generation (bypasses scheduler timing)
    app.post('/api/dev/trigger-plan-charges', async (req: FastifyRequest, reply: FastifyReply) => {
        await requireAdmin(app, req, reply);

        const bodySchema = z.object({
            planId: z.string().optional(),
            userId: z.string().optional(),
        });
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

        const filter: any = { active: true };
        if (parsed.data.planId) filter._id = new mongoose.Types.ObjectId(parsed.data.planId);
        if (parsed.data.userId) filter.userId = new mongoose.Types.ObjectId(parsed.data.userId);

        const plans = await Plan.find(filter).lean();
        const created = [];

        for (const p of plans) {
            try {
                const charge = await Charge.create({
                    userId: p.userId,
                    vehicleId: p.vehicleId,
                    amount: (p as any).amount,
                    currency: (p as any).currency || 'GBP',
                    type: (p as any).frequency === 'weekly' ? 'weekly_fee' : (p as any).frequency === 'monthly' ? 'monthly_fee' : 'other',
                    dueDate: p.nextDueDate,
                    status: 'pending',
                    metadata: { planId: (p as any)._id?.toString?.(), devTriggered: true },
                });

                // Advance nextDueDate
                const addInterval = (date: Date, frequency: 'weekly' | 'monthly' | 'custom_days', intervalDays?: number): Date => {
                    const d = new Date(date);
                    if (frequency === 'weekly') d.setDate(d.getDate() + 7);
                    else if (frequency === 'monthly') {
                        const day = d.getDate();
                        d.setMonth(d.getMonth() + 1);
                        if (d.getDate() < day) d.setDate(0);
                    } else {
                        const inc = Math.max(1, intervalDays || 1);
                        d.setDate(d.getDate() + inc);
                    }
                    return d;
                };

                const next = addInterval(new Date(p.nextDueDate), (p as any).frequency, (p as any).intervalDays);
                await Plan.updateOne({ _id: (p as any)._id }, { $set: { nextDueDate: next } });

                created.push({
                    chargeId: charge._id.toString(),
                    planId: (p as any)._id.toString(),
                    amount: charge.amount,
                    dueDate: charge.dueDate,
                });
            } catch (e: any) {
                app.log.error({ err: e, planId: (p as any)._id }, 'Failed to create charge from plan');
            }
        }

        return reply.send({
            ok: true,
            message: `Created ${created.length} charge(s) from ${plans.length} plan(s)`,
            charges: created
        });
    });

    // Manually mark charges as overdue (for testing overdue flow)
    app.post('/api/dev/mark-charges-overdue', async (req: FastifyRequest, reply: FastifyReply) => {
        await requireAdmin(app, req, reply);

        const bodySchema = z.object({
            chargeId: z.string().optional(),
            userId: z.string().optional(),
        });
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

        const filter: any = { status: 'pending' };
        if (parsed.data.chargeId) filter._id = new mongoose.Types.ObjectId(parsed.data.chargeId);
        if (parsed.data.userId) filter.userId = new mongoose.Types.ObjectId(parsed.data.userId);

        const result = await Charge.updateMany(filter, { $set: { status: 'overdue' } });

        return reply.send({
            ok: true,
            message: `Marked ${result.modifiedCount} charge(s) as overdue`,
            modifiedCount: result.modifiedCount
        });
    });

    // Set charge due date to past (for testing overdue detection)
    app.post('/api/dev/set-charge-due-date', async (req: FastifyRequest, reply: FastifyReply) => {
        await requireAdmin(app, req, reply);

        const bodySchema = z.object({
            chargeId: z.string(),
            dueDate: z.coerce.date(),
        });
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

        const charge = await Charge.findByIdAndUpdate(
            parsed.data.chargeId,
            { $set: { dueDate: parsed.data.dueDate } },
            { new: true }
        );

        if (!charge) return reply.code(404).send({ error: 'Charge not found' });

        return reply.send({
            ok: true,
            charge: {
                id: charge._id.toString(),
                dueDate: charge.dueDate,
                status: charge.status,
            }
        });
    });

    // Set plan nextDueDate to now (for immediate charge generation)
    app.post('/api/dev/set-plan-due-now', async (req: FastifyRequest, reply: FastifyReply) => {
        await requireAdmin(app, req, reply);

        const bodySchema = z.object({
            planId: z.string(),
        });
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

        const plan = await Plan.findByIdAndUpdate(
            parsed.data.planId,
            { $set: { nextDueDate: new Date() } },
            { new: true }
        );

        if (!plan) return reply.code(404).send({ error: 'Plan not found' });

        return reply.send({
            ok: true,
            message: 'Plan nextDueDate set to now. Run trigger-plan-charges to create charge.',
            plan: {
                id: plan._id.toString(),
                nextDueDate: plan.nextDueDate,
            }
        });
    });

    // Trigger scheduler manually (for testing without waiting)
    app.post('/api/dev/trigger-scheduler', async (req: FastifyRequest, reply: FastifyReply) => {
        await requireAdmin(app, req, reply);

        const bodySchema = z.object({
            task: z.enum(['overdue', 'reminders', 'plans', 'all']).default('all'),
        });
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

        const results: any = {};

        try {
            const { processOverdueCharges, processDueSoonReminders, tickPlans } = await import('../services/scheduler-tasks');

            if (parsed.data.task === 'overdue' || parsed.data.task === 'all') {
                results.overdue = await processOverdueCharges(app);
            }
            if (parsed.data.task === 'reminders' || parsed.data.task === 'all') {
                results.reminders = await processDueSoonReminders(app);
            }
            if (parsed.data.task === 'plans' || parsed.data.task === 'all') {
                results.plans = await tickPlans(app);
            }

            return reply.send({ ok: true, results });
        } catch (e: any) {
            app.log.error({ err: e }, 'Failed to trigger scheduler');
            return reply.code(500).send({ error: 'Failed to trigger scheduler', message: e.message });
        }
    });

    app.log.info('Development routes registered');
}
