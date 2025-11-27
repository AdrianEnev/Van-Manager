import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { sendMail } from './mailer';
import mongoose from 'mongoose';

export async function logNotification(params: {
  userId: string | mongoose.Types.ObjectId;
  channel: 'reminder' | 'overdue' | 'receipt' | 'generic';
  message: string;
  relatedChargeId?: string | mongoose.Types.ObjectId;
  relatedPenaltyId?: string | mongoose.Types.ObjectId;
  status?: 'sent' | 'failed';
  metadata?: Record<string, any>;
}) {
  const doc = await Notification.create({
    userId: new mongoose.Types.ObjectId(params.userId),
    type: 'email',
    channel: params.channel,
    message: params.message,
    relatedChargeId: params.relatedChargeId ? new mongoose.Types.ObjectId(params.relatedChargeId) : undefined,
    relatedPenaltyId: params.relatedPenaltyId ? new mongoose.Types.ObjectId(params.relatedPenaltyId) : undefined,
    status: params.status ?? 'sent',
    metadata: params.metadata,
  });
  return doc;
}

export async function sendEmailNotification(params: {
  userId: string | mongoose.Types.ObjectId;
  subject: string;
  text: string;
  channel: 'reminder' | 'overdue' | 'receipt' | 'generic';
  relatedChargeId?: string | mongoose.Types.ObjectId;
  relatedPenaltyId?: string | mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
}) {
  const user = await User.findById(params.userId).lean();
  if (!user) throw new Error('User not found');
  try {
    const html = `<pre style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; white-space:pre-wrap;">${
      params.text.replace(/</g, '&lt;')
    }</pre>`;
    await sendMail({ to: user.email, subject: params.subject, text: params.text, html });
    await logNotification({
      userId: user._id,
      channel: params.channel,
      message: params.text,
      relatedChargeId: params.relatedChargeId,
      relatedPenaltyId: params.relatedPenaltyId,
      status: 'sent',
      metadata: params.metadata,
    });
    return { ok: true } as const;
  } catch (e) {
    await logNotification({
      userId: params.userId,
      channel: params.channel,
      message: params.text,
      relatedChargeId: params.relatedChargeId,
      relatedPenaltyId: params.relatedPenaltyId,
      status: 'failed',
      metadata: { ...(params.metadata || {}), error: (e as Error)?.message },
    });
    return { ok: false } as const;
  }
}
