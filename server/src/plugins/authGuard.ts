import fp from 'fastify-plugin';
import type { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userRole?: string;
  }
}

export default fp(async (app) => {
  app.addHook('preHandler', async (req: FastifyRequest) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return;
    const token = auth.split(' ')[1];
    try {
      const payload = app.jwt.verify(token) as { sub: string; role?: string };
      req.userId = payload.sub;
      req.userRole = payload.role;
    } catch {
      // ignore, route can still enforce auth explicitly
    }
  });
});
