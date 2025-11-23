import mongoose, { Schema, model, Model, Types } from 'mongoose';

export type PenaltyStatus = 'pending' | 'paid' | 'waived';

export interface IPenalty {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  amount: number;
  reason: string;
  dueDate?: Date;
  status: PenaltyStatus;
  createdBy?: Types.ObjectId; // admin
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PenaltySchema = new Schema<IPenalty>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    dueDate: { type: Date, index: true },
    status: { type: String, enum: ['pending', 'paid', 'waived'], default: 'pending', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

PenaltySchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const r: any = ret as any;
    r.id = r._id?.toString?.() ?? r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const Penalty = (mongoose.models.Penalty as Model<IPenalty>) || model<IPenalty>('Penalty', PenaltySchema);
