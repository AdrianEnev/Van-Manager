import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { Charge } from '../models/Charge';
import { Notification } from '../models/Notification';
import { sendEmailNotification } from './notifications';
import { loadApiEnv } from '@services/config/src/env';

function msFromHours(h: number) { return h * 60 * 60 * 1000; }

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

  // Initial delay to allow server to finish booting, then interval
  setTimeout(() => {
    tickOverdue();
    setInterval(tickOverdue, overdueIntervalMs).unref();
  }, 5_000).unref?.();
}
