import 'dotenv/config';
import fastify from 'fastify';
import { loadApiEnv } from './env';
import { connectMongo } from './db/mongo';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import authGuard from './plugins/authGuard';

// Import route registration functions
import { registerAuthRoutes } from './routes/auth';
import { registerUserRoutes } from './routes/users';
import { registerAdminUserRoutes } from './routes/admin-users';
import { registerVehicleRoutes } from './routes/vehicles';
import { registerAssignmentRoutes } from './routes/assignments';
import { registerChargeRoutes } from './routes/charges';
import { registerPaymentRoutes } from './routes/payments';
import { registerPenaltyRoutes } from './routes/penalties';
import { registerPlanRoutes } from './routes/plans';
import { registerMaintenanceRoutes } from './routes/maintenance';
import { contactRoutes } from './routes/contact';
import { registerDevRoutes } from './routes/dev';
import { startSchedulers } from './services/scheduler';

async function bootstrap() {
    const env = await loadApiEnv();

    const app = fastify({
        logger: {
            level: 'info',
        },
    });

    // Register plugins
    const corsOrigins = env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : (env.CORS_ORIGIN ? [env.CORS_ORIGIN] : ['http://localhost:3000']);

    // Filter out empty origins and validate
    const validOrigins = corsOrigins.filter(origin => origin && origin.trim() !== '');

    await app.register(cors, {
        origin: validOrigins.length > 0 ? validOrigins : true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    await app.register(jwt, { secret: env.JWT_SECRET });
    await app.register(cookie);
    await app.register(import('fastify-raw-body'), {
        field: 'rawBody',
        global: false,
        encoding: 'utf8',
        runFirst: true,
    });
    await app.register(authGuard);

    // Connect to MongoDB
    await connectMongo(env.MONGODB_URI);

    // Register routes
    await registerAuthRoutes(app);
    await registerUserRoutes(app);
    await registerAdminUserRoutes(app);
    await registerVehicleRoutes(app);
    await registerAssignmentRoutes(app);
    await registerChargeRoutes(app);
    await registerPaymentRoutes(app);
    await registerPenaltyRoutes(app);
    await registerPlanRoutes(app);
    await registerMaintenanceRoutes(app);
    await app.register(contactRoutes);
    await registerDevRoutes(app);

    // Start schedulers
    startSchedulers(app);

    const port = env.PORT;
    await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();