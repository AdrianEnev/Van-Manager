import mongoose, { Schema, model, Model, Types } from 'mongoose';

export type NotificationType = 'email' | 'in_app';
export type NotificationChannel = 'reminder' | 'overdue' | 'receipt' | 'generic';
export type NotificationStatus = 'sent' | 'failed';

export interface INotification {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  channel: NotificationChannel;
  message: string;
  relatedChargeId?: Types.ObjectId;
  relatedPenaltyId?: Types.ObjectId;
  sentAt: Date;
  status: NotificationStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['email', 'in_app'], default: 'email' },
    channel: { type: String, enum: ['reminder', 'overdue', 'receipt', 'generic'], default: 'generic', index: true },
    message: { type: String, required: true },
    relatedChargeId: { type: Schema.Types.ObjectId, ref: 'Charge' },
    relatedPenaltyId: { type: Schema.Types.ObjectId, ref: 'Penalty' },
    sentAt: { type: Date, default: () => new Date(), index: true },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

NotificationSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const r: any = ret as any;
    r.id = r._id?.toString?.() ?? r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const Notification = (mongoose.models.Notification as Model<INotification>) || model<INotification>('Notification', NotificationSchema);
