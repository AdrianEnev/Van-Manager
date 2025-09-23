import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { User } from '../models/User';

export type AuthContext = {
  userId: string;
  role: 'admin' | 'user';
  sessionVersion?: number;
};

async function verifyHeaderToken(app: FastifyInstance, req: FastifyRequest): Promise<AuthContext | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.split(' ')[1];
  try {
    const payload = app.jwt.verify(token) as { sub?: string; role?: 'admin' | 'user' };
    if (!payload?.sub || !payload?.role) return null;
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

async function verifyCookieToken(app: FastifyInstance, req: FastifyRequest): Promise<AuthContext | null> {
  const token = (req.cookies as any)?.userToken as string | undefined;
  if (!token) return null;
  try {
    const decoded = app.jwt.verify(token) as { userId: string; role: 'admin' | 'user'; sessionVersion?: number };
    // Validate sessionVersion if present
    if (decoded.sessionVersion !== undefined) {
      const user = await User.findById(decoded.userId).select('sessionVersion role').lean();
      if (!user) return null;
      if (user.sessionVersion !== decoded.sessionVersion) return null;
      return { userId: decoded.userId, role: user.role as 'admin' | 'user', sessionVersion: user.sessionVersion };
    }
    return { userId: decoded.userId, role: decoded.role };
  } catch {
    return null;
  }
}

export async function getAuthContext(app: FastifyInstance, req: FastifyRequest): Promise<AuthContext | null> {
  // Prefer cookie (browser sessions), else header (API tokens)
  const fromCookie = await verifyCookieToken(app, req);
  if (fromCookie) return fromCookie;
  return await verifyHeaderToken(app, req);
}

export async function requireAuth(app: FastifyInstance, req: FastifyRequest, reply: FastifyReply): Promise<AuthContext> {
  const ctx = await getAuthContext(app, req);
  if (!ctx) {
    reply.code(401).send({ error: 'Not authenticated' });
    throw new Error('UNAUTHORIZED');
  }
  return ctx;
}

export async function requireAdmin(app: FastifyInstance, req: FastifyRequest, reply: FastifyReply): Promise<AuthContext> {
  const ctx = await requireAuth(app, req, reply);
  if (ctx.role !== 'admin') {
    reply.code(403).send({ error: 'Forbidden' });
    throw new Error('FORBIDDEN');
  }
  return ctx;
}
