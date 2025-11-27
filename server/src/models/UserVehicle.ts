import mongoose, { Schema, model, Model, Types } from 'mongoose';

export interface IUserVehicle {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  assignedAt: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserVehicleSchema = new Schema<IUserVehicle>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    assignedAt: { type: Date, default: () => new Date() },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

UserVehicleSchema.index({ userId: 1, vehicleId: 1 }, { unique: true, partialFilterExpression: { active: true } });

UserVehicleSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const r: any = ret as any;
    r.id = r._id?.toString?.() ?? r._id;
    delete r._id;
    delete r.__v;
    return r;
  },
});

export const UserVehicle = (mongoose.models.UserVehicle as Model<IUserVehicle>) || model<IUserVehicle>('UserVehicle', UserVehicleSchema);
