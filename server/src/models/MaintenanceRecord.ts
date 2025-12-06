import mongoose, { Schema, model, Model, Types } from 'mongoose';

export type MaintenanceType = 'oil_change' | 'tyre_change';

export interface IMaintenanceRecord {
  _id: Types.ObjectId;
  vehicleId: Types.ObjectId;
  type: MaintenanceType;
  performedAt: Date;
  odometerMiles: number;
  intervalMiles?: number;
  tyreMileage?: number;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceRecordSchema = new Schema<IMaintenanceRecord>(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    type: { type: String, enum: ['oil_change', 'tyre_change'], required: true, index: true },
    performedAt: { type: Date, required: true, index: true },
    odometerMiles: { type: Number, required: true, min: 0 },
    intervalMiles: { type: Number, min: 1 },
    tyreMileage: { type: Number, min: 0 },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

MaintenanceRecordSchema.index({ vehicleId: 1, type: 1, performedAt: -1 });

MaintenanceRecordSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const r: any = ret as any;
    r.id = r._id?.toString?.() ?? r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const MaintenanceRecord =
  (mongoose.models.MaintenanceRecord as Model<IMaintenanceRecord>) ||
  model<IMaintenanceRecord>('MaintenanceRecord', MaintenanceRecordSchema);
