import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { Charge } from '../models/Charge';
import { Notification } from '../models/Notification';
import { sendEmailNotification } from './notifications';
import { loadApiEnv } from '../env';
import { Plan } from '../models/Plan';

function msFromHours(h: number) { return h * 60 * 60 * 1000; }

function addInterval(date: Date, frequency: 'weekly' | 'monthly' | 'custom_days', intervalDays?: number): Date {
    const d = new Date(date);
    if (frequency === 'weekly') {
        d.setDate(d.getDate() + 7);
    } else if (frequency === 'monthly') {
        const day = d.getDate();
        d.setMonth(d.getMonth() + 1);
        if (d.getDate() < day) {
            d.setDate(0);
        }
    } else {
        const inc = Math.max(1, intervalDays || 1);
        d.setDate(d.getDate() + inc);
    }
    return d;
}

export async function processOverdueCharges(app: FastifyInstance) {
    const now = new Date();
    const pending = await Charge.find({ status: 'pending', dueDate: { $lt: now } }).limit(200).lean();
    if (!pending.length) return { processed: 0, notified: 0 };

    let notified = 0;
    for (const c of pending) {
        try {
            await Charge.updateOne({ _id: c._id, status: 'pending' }, { $set: { status: 'overdue' } });

            const env = loadApiEnv();
            const throttleHours = Number(env.NOTIFY_THROTTLE_HOURS ?? 24);
            const since = new Date(Date.now() - msFromHours(throttleHours));
            const dup = await Notification.exists({
                userId: new mongoose.Types.ObjectId(c.userId as any),
                relatedChargeId: new mongoose.Types.ObjectId(c._id as any),
                channel: 'overdue',
                sentAt: { $gte: since },
            });
            if (dup) continue;

            const amount = (c as any).amount?.toFixed ? (c as any).amount.toFixed(2) : String((c as any).amount);
            const subject = `Overdue payment: £${amount}`;
            const due = c.dueDate ? new Date(c.dueDate).toLocaleDateString() : 'N/A';
            const text = `Your charge is now overdue.\\n\\nAmount: £${amount}\\nDue date: ${due}\\n\\nPlease arrange payment as soon as possible.`;

            await sendEmailNotification({
                userId: c.userId as any,
                subject,
                text,
                channel: 'overdue',
                relatedChargeId: c._id as any,
            });
            notified += 1;
        } catch (e) {
            (app.log as any)?.error?.({ err: e, chargeId: String((c as any)._id) }, 'Failed overdue processing');
        }
    }
    return { processed: pending.length, notified };
}

export async function tickPlans(app: FastifyInstance) {
    try {
        const now = new Date();
        const batch = await Plan.find({ active: true, nextDueDate: { $lte: now } }).limit(100).lean();
        if (!batch.length) return { processed: 0, created: 0 };

        let created = 0;
        for (const p of batch) {
            try {
                await Charge.create({
                    userId: p.userId,
                    vehicleId: p.vehicleId,
                    amount: (p as any).amount,
                    currency: (p as any).currency || 'GBP',
                    type: (p as any).frequency === 'weekly' ? 'weekly_fee' : (p as any).frequency === 'monthly' ? 'monthly_fee' : 'other',
                    dueDate: p.nextDueDate,
                    status: 'pending',
                    metadata: { planId: (p as any)._id?.toString?.() },
                });

                const next = addInterval(new Date(p.nextDueDate), (p as any).frequency, (p as any).intervalDays);
                await Plan.updateOne({ _id: (p as any)._id }, { $set: { nextDueDate: next } });
                created += 1;
            } catch (e) {
                (app.log as any)?.error?.({ err: e, planId: String((p as any)._id) }, 'Failed to create charge from plan');
            }
        }
        return { processed: batch.length, created };
    } catch (e) {
        (app.log as any)?.error?.({ err: e }, 'tickPlans failed');
        return { processed: 0, created: 0 };
    }
}

export async function processDueSoonReminders(app: FastifyInstance) {
    const env = loadApiEnv();
    const leadHours = Number(env.NOTIFY_REMINDER_LEAD_HOURS ?? 48);
    const throttleHours = Number(env.NOTIFY_THROTTLE_HOURS ?? 24);
    const now = new Date();
    const until = new Date(Date.now() + msFromHours(leadHours));

    const dueSoon = await Charge.find({ status: 'pending', dueDate: { $gte: now, $lte: until } })
        .limit(200)
        .lean();
    if (!dueSoon.length) return { processed: 0, notified: 0 };

    let notified = 0;
    for (const c of dueSoon) {
        try {
            const since = new Date(Date.now() - msFromHours(throttleHours));
            const dup = await Notification.exists({
                userId: new mongoose.Types.ObjectId(c.userId as any),
                relatedChargeId: new mongoose.Types.ObjectId(c._id as any),
                channel: 'reminder',
                sentAt: { $gte: since },
            });
            if (dup) continue;

            const amount = (c as any).amount?.toFixed ? (c as any).amount.toFixed(2) : String((c as any).amount);
            const due = c.dueDate ? new Date(c.dueDate).toLocaleDateString() : 'N/A';
            const subject = `Upcoming payment due: £${amount}`;
            const text = `You have an upcoming charge due soon.\\n\\nAmount: £${amount}\\nDue date: ${due}\\n\\nPlease arrange payment by the due date.`;

            await sendEmailNotification({
                userId: c.userId as any,
                subject,
                text,
                channel: 'reminder',
                relatedChargeId: c._id as any,
            });
            notified += 1;
        } catch (e) {
            (app.log as any)?.error?.({ err: e, chargeId: String((c as any)._id) }, 'Failed reminder processing');
        }
    }
    return { processed: dueSoon.length, notified };
}
