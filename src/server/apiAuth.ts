import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

const SESSION_TTL_SECONDS = 60 * 60 * 12;

export function constantTimeTokenMatch(candidate: string, expected: string): boolean {
  if (!candidate || !expected) return false;
  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function signature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createAppSessionToken(secret: string, now = Date.now()): string {
  if (!secret || secret.length < 32) throw new Error('APP_AUTH_SECRET must contain at least 32 characters.');
  const payload = Buffer.from(JSON.stringify({
    sub: 'raportfinansowy24',
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS
  })).toString('base64url');
  return payload + '.' + signature(payload, secret);
}

export function verifyAppSessionToken(token: string, secret: string, now = Date.now()): boolean {
  if (!token || !secret || secret.length < 32) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const expected = signature(parts[0], secret);
  if (!constantTimeTokenMatch(parts[1], expected)) return false;
  try {
    const claims = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    return claims.sub === 'raportfinansowy24' && Number.isFinite(claims.exp) && claims.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

function getBearerToken(value: string | undefined): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(value || '');
  return match?.[1]?.trim() || null;
}

export interface ApiAuthOptions {
  sessionSecret?: string;
  machineToken?: string;
  publicPaths?: string[];
}

export function createApiAuthMiddleware(options: ApiAuthOptions): RequestHandler {
  const publicPaths = new Set(options.publicPaths || ['/health', '/telegram/webhook', '/auth/login']);

  return (req, res, next) => {
    if (publicPaths.has(req.path)) return next();
    const bearer = getBearerToken(req.get('authorization'));
    if (bearer && options.machineToken && constantTimeTokenMatch(bearer, options.machineToken)) return next();
    if (bearer && options.sessionSecret && verifyAppSessionToken(bearer, options.sessionSecret)) return next();
    if (!bearer) return res.status(401).json({ error: 'Zaloguj się, aby korzystać z aplikacji.' });
    return res.status(401).json({ error: 'Sesja jest nieprawidłowa lub wygasła. Zaloguj się ponownie.' });
  };
}
