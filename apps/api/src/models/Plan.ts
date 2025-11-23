import mongoose, { Schema, model, Model, Types } from 'mongoose';

export type PlanFrequency = 'weekly' | 'monthly' | 'custom_days';

export interface IPlan {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  amount: number;
  currency: string;
  frequency: PlanFrequency;
  intervalDays?: number; // only when frequency = custom_days
  startingDate: Date; // first effective due date
  nextDueDate: Date; // scheduler will create a Charge at this date and advance it
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'GBP' },
    frequency: { type: String, enum: ['weekly', 'monthly', 'custom_days'], required: true },
    intervalDays: { type: Number, min: 1 },
    startingDate: { type: Date, required: true },
    nextDueDate: { type: Date, required: true, index: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

PlanSchema.pre('validate', function (next) {
  if (this.frequency === 'custom_days' && !this.intervalDays) {
    return next(new Error('intervalDays is required when frequency=custom_days'));
  }
  if (this.frequency !== 'custom_days') this.intervalDays = undefined as any;
  next();
});

PlanSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const r: any = ret as any;
    r.id = r._id?.toString?.() ?? r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const Plan = (mongoose.models.Plan as Model<IPlan>) || model<IPlan>('Plan', PlanSchema);
