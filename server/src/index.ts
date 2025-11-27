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
import { registerVehicleRoutes } from './routes/vehicles';
import { registerAssignmentRoutes } from './routes/assignments';
import { registerChargeRoutes } from './routes/charges';
import { registerPaymentRoutes } from './routes/payments';
import { registerPenaltyRoutes } from './routes/penalties';

async function bootstrap() {
  const env = await loadApiEnv();
  
  const app = fastify({
    logger: {
      level: 'info',
    },
  });

  // Register plugins
  const corsOrigins = env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : (env.CORS_ORIGIN ? [env.CORS_ORIGIN] : ['http://localhost:3000']);
  await app.register(cors, { 
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(cookie);
  await app.register(authGuard);

  // Connect to MongoDB
  await connectMongo(env.MONGODB_URI);

  // Register routes
  await registerAuthRoutes(app);
  await registerUserRoutes(app);
  await registerVehicleRoutes(app);
  await registerAssignmentRoutes(app);
  await registerChargeRoutes(app);
  await registerPaymentRoutes(app);
  await registerPenaltyRoutes(app);

  const port = env.PORT;
  await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();