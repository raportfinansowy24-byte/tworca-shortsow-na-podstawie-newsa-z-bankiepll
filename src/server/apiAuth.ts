import { timingSafeEqual } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import type { RequestHandler } from 'express';

const ADMIN_APP_NAME = 'bankier-shorts-api-auth';
let cachedProjectId: string | null = null;

export interface ApiAuthOptions {
  projectId: string;
  allowedEmails: string[];
  machineToken?: string;
  publicPaths?: string[];
  verifyFirebaseToken?: (token: string) => Promise<Pick<DecodedIdToken, 'email' | 'email_verified' | 'uid'>>;
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

function verifyFirebaseIdToken(projectId: string, token: string) {
  let app = getApps().find((candidate) => candidate.name === ADMIN_APP_NAME);
  if (!app) {
    app = initializeApp({ projectId }, ADMIN_APP_NAME);
    cachedProjectId = projectId;
  } else if (cachedProjectId && cachedProjectId !== projectId) {
    throw new Error('Firebase project ID changed after auth initialization.');
  }
  return getAuth(app).verifyIdToken(token);
}

export function createApiAuthMiddleware(options: ApiAuthOptions): RequestHandler {
  const allowedEmails = new Set(options.allowedEmails.map((email) => email.trim().toLowerCase()).filter(Boolean));
  const publicPaths = new Set(options.publicPaths || ['/health', '/telegram/webhook']);

  return async (req, res, next) => {
    if (publicPaths.has(req.path)) return next();

    const bearer = getBearerToken(req.get('authorization'));
    if (bearer && options.machineToken && constantTimeTokenMatch(bearer, options.machineToken)) {
      return next();
    }

    if (!bearer) {
      return res.status(401).json({ error: 'Wymagane logowanie kontem Google lub token automatyzacji.' });
    }
    if (!options.projectId || allowedEmails.size === 0) {
      return res.status(503).json({ error: 'Uwierzytelnianie Firebase nie jest skonfigurowane na serwerze.' });
    }

    try {
      const claims = await (options.verifyFirebaseToken
        ? options.verifyFirebaseToken(bearer)
        : verifyFirebaseIdToken(options.projectId, bearer));
      const email = (claims.email || '').trim().toLowerCase();
      if (claims.email_verified !== true || !email || !allowedEmails.has(email)) {
        return res.status(403).json({ error: 'To konto Google nie ma uprawnień do tej aplikacji.' });
      }
      return next();
    } catch {
      return res.status(401).json({ error: 'Token logowania jest nieprawidłowy lub wygasł.' });
    }
  };
}
