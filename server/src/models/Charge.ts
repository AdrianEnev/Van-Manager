import mongoose, { Schema, model, Model, Types } from 'mongoose';

export type ChargeType = 'weekly_fee' | 'monthly_fee' | 'mot' | 'other';
export type ChargeStatus = 'pending' | 'paid' | 'overdue' | 'canceled';

export interface ICharge {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  amount: number;
  currency: string;
  type: ChargeType;
  dueDate: Date;
  status: ChargeStatus;
  createdBy?: Types.ObjectId; // admin user id
  metadata?: Record<string, any>; // may include planId when generated from a Plan
  createdAt: Date;
  updatedAt: Date;
}

const ChargeSchema = new Schema<ICharge>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'GBP' },
    type: { type: String, enum: ['weekly_fee', 'mot', 'other'], required: true, index: true },
    dueDate: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'paid', 'overdue', 'canceled'], default: 'pending', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ChargeSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const r: any = ret as any;
    r.id = r._id?.toString?.() ?? r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const Charge = (mongoose.models.Charge as Model<ICharge>) || model<ICharge>('Charge', ChargeSchema);
