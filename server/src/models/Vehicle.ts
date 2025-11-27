import mongoose, { Schema, model, Model, Types } from 'mongoose';

export interface IVehicle {
  _id: Types.ObjectId;
  plateNumber: string; // unique registration number
  makeModel?: string;
  motExpiry?: Date;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    plateNumber: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    makeModel: { type: String },
    motExpiry: { type: Date },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    notes: { type: String },
  },
  { timestamps: true }
);

VehicleSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const r: any = ret as any;
    r.id = r._id?.toString?.() ?? r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const Vehicle = (mongoose.models.Vehicle as Model<IVehicle>) || model<IVehicle>('Vehicle', VehicleSchema);
