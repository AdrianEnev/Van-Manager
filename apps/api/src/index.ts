import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import jwt from '@fastify/jwt';
import { loadApiEnv } from '@services/config/src/env';
import { connectMongo } from './db/mongo';
import { registerAuthRoutes } from './routes/auth';
import authGuard from './plugins/authGuard';
import cookie from '@fastify/cookie';
import { registerUserRoutes } from './routes/users';

dotenv.config();

async function bootstrap() {
  const env = loadApiEnv();

  const app = Fastify({ logger: true, trustProxy: env.NODE_ENV === 'production' });

  const origins = (env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) || []);
  const origin = origins.length > 0 ? origins : env.CORS_ORIGIN ?? true;
  await app.register(cors, { origin, credentials: true });

  await connectMongo(env.MONGODB_URI);

  // Single JWT instance; set different expirations at sign time in routes
  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await app.register(cookie);

  // Attach auth guard to populate req.userId when Authorization header is present
  await app.register(authGuard);

  app.get('/health', async () => ({ status: 'ok' }));

  // Routes
  await registerAuthRoutes(app);
  await registerUserRoutes(app);

  const port = env.PORT;
  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`API running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
