import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAdmin } from '../plugins/roles';
import { MaintenanceRecord } from '../models/MaintenanceRecord';
import { Vehicle } from '../models/Vehicle';

const DEFAULT_OIL_INTERVAL = 10000;
const maintenanceTypeEnum = z.enum(['oil_change', 'tyre_change']);

type MaintenanceType = z.infer<typeof maintenanceTypeEnum>;

type SummaryItem = {
  vehicleId: string;
  plateNumber: string;
  makeModel?: string;
  status: 'active' | 'inactive';
  lastOilChange: {
    performedAt: string;
    odometerMiles: number;
    intervalMiles: number;
    nextDueOdometer: number;
    notes?: string;
  } | null;
  lastTyreChange: {
    performedAt: string;
    odometerMiles: number;
    tyreMileage?: number;
    notes?: string;
  } | null;
};

function serializeRecord(record: any) {
  return {
    id: record._id?.toString?.(),
    vehicleId: record.vehicleId?.toString?.(),
    type: record.type as MaintenanceType,
    performedAt: record.performedAt instanceof Date ? record.performedAt.toISOString() : record.performedAt,
    odometerMiles: record.odometerMiles,
    intervalMiles: record.intervalMiles,
    tyreMileage: record.tyreMileage,
    notes: record.notes,
    createdBy: record.createdBy ? record.createdBy.toString() : undefined,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : record.updatedAt,
  };
}

export async function registerMaintenanceRoutes(app: FastifyInstance) {
  app.get('/api/maintenance/summary', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const vehicles = await Vehicle.find({}).sort({ plateNumber: 1 }).lean();
    if (!vehicles.length) return reply.send([]);

    const records = await MaintenanceRecord.find({}).sort({ performedAt: -1 }).lean();
    const latestByKey = new Map<string, any>();
    for (const record of records) {
      const vehicleId = record.vehicleId?.toString();
      if (!vehicleId) continue;
      const key = `${vehicleId}-${record.type}`;
      if (!latestByKey.has(key)) {
        latestByKey.set(key, record);
      }
    }

    const summary: SummaryItem[] = vehicles.map((vehicle: any) => {
      const vid = vehicle._id?.toString?.();
      const oil = latestByKey.get(`${vid}-oil_change`);
      const tyre = latestByKey.get(`${vid}-tyre_change`);
      const oilInterval = oil?.intervalMiles ?? DEFAULT_OIL_INTERVAL;
      return {
        vehicleId: vid,
        plateNumber: vehicle.plateNumber,
        makeModel: vehicle.makeModel,
        status: vehicle.status,
        lastOilChange: oil
          ? {
              performedAt: oil.performedAt instanceof Date ? oil.performedAt.toISOString() : oil.performedAt,
              odometerMiles: oil.odometerMiles,
              intervalMiles: oilInterval,
              nextDueOdometer: oil.odometerMiles + oilInterval,
              notes: oil.notes,
            }
          : null,
        lastTyreChange: tyre
          ? {
              performedAt: tyre.performedAt instanceof Date ? tyre.performedAt.toISOString() : tyre.performedAt,
              odometerMiles: tyre.odometerMiles,
              tyreMileage: tyre.tyreMileage,
              notes: tyre.notes,
            }
          : null,
      };
    });

    return reply.send(summary);
  });

  app.get('/api/vehicles/:vehicleId/maintenance', async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const { vehicleId } = req.params as { vehicleId: string };
    if (!mongoose.isValidObjectId(vehicleId)) return reply.code(400).send({ error: 'Invalid vehicleId' });

    const querySchema = z.object({ type: maintenanceTypeEnum.optional() });
    const parsed = querySchema.safeParse((req as any).query ?? {});
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const filter: Record<string, any> = { vehicleId: new mongoose.Types.ObjectId(vehicleId) };
    if (parsed.data.type) filter.type = parsed.data.type;

    const records = await MaintenanceRecord.find(filter).sort({ performedAt: -1 }).lean();
    return reply.send(records.map(serializeRecord));
  });

  app.post('/api/vehicles/:vehicleId/maintenance', async (req: FastifyRequest, reply: FastifyReply) => {
    const ctx = await requireAdmin(app, req, reply);
    const { vehicleId } = req.params as { vehicleId: string };
    if (!mongoose.isValidObjectId(vehicleId)) return reply.code(400).send({ error: 'Invalid vehicleId' });

    const bodySchema = z
      .object({
        type: maintenanceTypeEnum,
        performedAt: z.coerce.date(),
        odometerMiles: z.number().int().min(0),
        intervalMiles: z.number().int().min(1000).optional(),
        tyreMileage: z.number().int().min(0).optional(),
        notes: z.string().max(1000).optional(),
      })
      .superRefine((data, ctxRef) => {
        if (data.type === 'tyre_change' && data.tyreMileage === undefined) {
          ctxRef.addIssue({ code: z.ZodIssueCode.custom, message: 'tyreMileage is required for tyre changes', path: ['tyreMileage'] });
        }
        if (data.type === 'oil_change' && data.intervalMiles !== undefined && data.intervalMiles < 1000) {
          ctxRef.addIssue({ code: z.ZodIssueCode.custom, message: 'intervalMiles must be at least 1000', path: ['intervalMiles'] });
        }
      });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const vehicle = await Vehicle.findById(vehicleId).select('_id').lean();
    if (!vehicle) return reply.code(404).send({ error: 'Vehicle not found' });

    const payload = parsed.data;
    const record = await MaintenanceRecord.create({
      vehicleId: new mongoose.Types.ObjectId(vehicleId),
      type: payload.type,
      performedAt: payload.performedAt,
      odometerMiles: payload.odometerMiles,
      intervalMiles: payload.type === 'oil_change' ? payload.intervalMiles ?? DEFAULT_OIL_INTERVAL : undefined,
      tyreMileage: payload.type === 'tyre_change' ? payload.tyreMileage : undefined,
      notes: payload.notes,
      createdBy: ctx.userId ? new mongoose.Types.ObjectId(ctx.userId) : undefined,
    });

    return reply.code(201).send(record.toJSON());
  });
}
