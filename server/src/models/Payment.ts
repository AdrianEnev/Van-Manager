import mongoose, { Schema, model, Model, Types } from 'mongoose';

export type PaymentMethod = 'manual' | 'stripe';

export interface IPayment {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  currency: string;
  method: PaymentMethod;
  relatedChargeId?: Types.ObjectId;
  externalRef?: string; // e.g., Stripe PaymentIntent ID
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'GBP' },
    method: { type: String, enum: ['manual', 'stripe'], required: true, index: true },
    relatedChargeId: { type: Schema.Types.ObjectId, ref: 'Charge', index: true },
    externalRef: { type: String },
    note: { type: String },
  },
  { timestamps: true }
);

PaymentSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const r: any = ret as any;
    r.id = r._id?.toString?.() ?? r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const Payment = (mongoose.models.Payment as Model<IPayment>) || model<IPayment>('Payment', PaymentSchema);
