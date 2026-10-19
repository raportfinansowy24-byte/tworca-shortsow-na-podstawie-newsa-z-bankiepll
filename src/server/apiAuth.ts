import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

export interface ApiAuthOptions {
  appPassword?: string;
  machineToken?: string;
  publicPaths?: string[];
}

export function constantTimeTokenMatch(candidate: string, expected: string): boolean {
  if (!candidate || !expected) return false;
  const candidateBytes = Buffer.from(candidate, 'utf8');
  const expectedBytes = Buffer.from(expected, 'utf8');
  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
}

function getBearerToken(value: string | undefined): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(value || '');
  return match?.[1]?.trim() || null;
}

export function createApiAuthMiddleware(options: ApiAuthOptions): RequestHandler {
  const publicPaths = new Set(options.publicPaths || ['/health', '/telegram/webhook']);
  return (req, res, next) => {
    if (publicPaths.has(req.path)) return next();
    const bearer = getBearerToken(req.get('authorization'));
    if (bearer && (
      constantTimeTokenMatch(bearer, options.appPassword || '') ||
      constantTimeTokenMatch(bearer, options.machineToken || '')
    )) return next();
    if (!options.appPassword && !options.machineToken) {
      return res.status(503).json({ error: 'Brak konfiguracji dostępu do API na serwerze.' });
    }
    return res.status(401).json({ error: 'Podaj hasło dostępu do aplikacji.' });
  };
}
