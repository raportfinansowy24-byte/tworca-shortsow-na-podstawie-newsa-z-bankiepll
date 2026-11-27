import type { Application } from 'express';

export const TRUSTED_PROXY_HOPS = 1;

/**
 * Railway forwards requests through one ingress proxy. Trust only that
 * immediate proxy hop; never use boolean `true`, which trusts client-supplied
 * leftmost X-Forwarded-For values.
 */
export function configureExpressProxyTrust(app: Pick<Application, 'set'>): void {
  app.set('trust proxy', TRUSTED_PROXY_HOPS);
}
