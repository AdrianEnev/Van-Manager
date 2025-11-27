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
    // advance by one calendar month, keeping day where possible
    const day = d.getDate();
    d.setMonth(d.getMonth() + 1);
    // handle edge cases like Jan 31 -> Feb
    if (d.getDate() < day) {
      d.setDate(0); // go to last day of previous month
    }
  } else {
    const inc = Math.max(1, intervalDays || 1);
    d.setDate(d.getDate() + inc);
  }
  return d;
}

async function processOverdueCharges(app: FastifyInstance) {
  const now = new Date();
  const pending = await Charge.find({ status: 'pending', dueDate: { $lt: now } }).limit(200).lean();
  if (!pending.length) return { processed: 0, notified: 0 };

  let notified = 0;
  for (const c of pending) {
    try {
      // Mark overdue
      await Charge.updateOne({ _id: c._id, status: 'pending' }, { $set: { status: 'overdue' } });

      // Throttle notifications: do not send another overdue email for the same charge within throttle window
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
      const text = `Your charge is now overdue.\n\nAmount: £${amount}\nDue date: ${due}\n\nPlease arrange payment as soon as possible.`;

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
      // continue to next
    }
  }
  return { processed: pending.length, notified };
}

async function tickPlans(app: FastifyInstance) {
  try {
    const now = new Date();
    const batch = await Plan.find({ active: true, nextDueDate: { $lte: now } }).limit(100).lean();
    if (!batch.length) return;
    for (const p of batch) {
      try {
        await (await import('../models/Charge')).Charge.create({
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
      } catch (e) {
        // log and continue
      }
    }
  } catch (e) {
    // log and continue
  }
}

async function processDueSoonReminders(app: FastifyInstance) {
  const env = loadApiEnv();
  const leadHours = Number(env.NOTIFY_REMINDER_LEAD_HOURS ?? 48);
  const throttleHours = Number(env.NOTIFY_THROTTLE_HOURS ?? 24);
  const now = new Date();
  const until = new Date(Date.now() + msFromHours(leadHours));

  // Find pending charges due between now and the lead window
  const dueSoon = await Charge.find({ status: 'pending', dueDate: { $gte: now, $lte: until } })
    .limit(200)
    .lean();
  if (!dueSoon.length) return { processed: 0, notified: 0 };

  let notified = 0;
  for (const c of dueSoon) {
    try {
      // Throttle: check if we've sent a reminder recently for this charge
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
      const text = `You have an upcoming charge due soon.\n\nAmount: £${amount}\nDue date: ${due}\n\nPlease arrange payment by the due date.`;

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

export function startSchedulers(app: FastifyInstance) {
  const env = loadApiEnv();
  const enabled = String(env.ENABLE_SCHEDULER ?? 'true') === 'true';
  if (!enabled) {
    app.log.info('Schedulers disabled by env');
    return;
  }

  const overdueIntervalMs = Number(env.OVERDUE_CRON_INTERVAL_MS ?? 15 * 60 * 1000); // default 15 min

  async function tickOverdue() {
    try {
      const { processed, notified } = await processOverdueCharges(app);
      app.log.info({ processed, notified }, 'Overdue scheduler run');
    } catch (e) {
      app.log.error({ err: e }, 'Overdue scheduler failed');
    }
  }

  async function tickReminders() {
    try {
      const { processed, notified } = await processDueSoonReminders(app);
      app.log.info({ processed, notified }, 'Reminder scheduler run');
    } catch (e) {
      app.log.error({ err: e }, 'Reminder scheduler failed');
    }
  }

  // Initial delay to allow server to finish booting, then interval
  setTimeout(() => {
    tickOverdue();
    tickReminders();
    tickPlans(app);
    setInterval(tickOverdue, overdueIntervalMs).unref();
    setInterval(tickReminders, overdueIntervalMs).unref();
    setInterval(() => tickPlans(app), overdueIntervalMs).unref();
  }, 5_000).unref?.();
}
