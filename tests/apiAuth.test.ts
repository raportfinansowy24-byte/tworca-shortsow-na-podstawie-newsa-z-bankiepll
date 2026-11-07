import assert from 'node:assert/strict';
import { createApiAuthMiddleware, createAppSessionToken, verifyAppSessionToken, SESSION_TTL_SECONDS, getAppAuthConfiguration } from '../src/server/apiAuth';

function makeRequest(path: string, authorization?: string) {
  const parsed = new URL(path, 'http://localhost');
  return { path: parsed.pathname, query: Object.fromEntries(parsed.searchParams), get: (name: string) => name.toLowerCase() === 'authorization' ? authorization : undefined } as any;
}
function makeResponse() {
  return { statusCode: 200, body: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } };
}
async function invoke(middleware: ReturnType<typeof createApiAuthMiddleware>, path: string, authorization?: string) {
  const res = makeResponse();
  let nextCalled = false;
  await middleware(makeRequest(path, authorization), res as any, () => { nextCalled = true; });
  return { res, nextCalled };
}
async function main() {
  const secret = 'test-secret-that-is-at-least-32-characters-long';
  const machineToken = 'a'.repeat(64);
  const middleware = createApiAuthMiddleware({ sessionSecret: secret, machineToken });
  const session = createAppSessionToken(secret, 1_800_000_000_000);
  assert.equal(verifyAppSessionToken(session, secret, 1_800_000_000_000), true);
  const claims = JSON.parse(Buffer.from(session.split('.')[0], 'base64url').toString());
  assert.equal(claims.exp, Math.floor(1_800_000_000_000 / 1000) + SESSION_TTL_SECONDS);
  assert.equal(SESSION_TTL_SECONDS, 43200);
  assert.equal(getAppAuthConfiguration({ APP_AUTH_SECRET: secret } as NodeJS.ProcessEnv), null);
  assert.deepEqual(getAppAuthConfiguration({ APP_AUTH_SECRET: secret, APP_LOGIN_PASSWORD: 'configured' } as NodeJS.ProcessEnv), { secret, password: 'configured' });
  assert.equal(verifyAppSessionToken(session, 'wrong-secret-that-is-at-least-32-chars', 1_800_000_000_000), false);
  assert.equal(verifyAppSessionToken(session, secret, 1_900_000_000_000), false, 'expired session rejected');
  assert.equal((await invoke(middleware, '/private', `Bearer ${session}`)).nextCalled, true);
  assert.equal((await invoke(middleware, '/private', `Bearer ${machineToken}`)).nextCalled, true);
  assert.equal((await invoke(middleware, '/private')).res.statusCode, 401);
  assert.equal((await invoke(middleware, '/private', 'Bearer invalid')).res.statusCode, 401);
  assert.equal((await invoke(middleware, '/health')).nextCalled, true);
  assert.equal((await invoke(middleware, '/auth/login')).nextCalled, true);
  assert.equal((await invoke(middleware, '/jobs/job-123/stream')).res.statusCode, 401, 'SSE requires a valid ticket or Bearer token');
  let consumedTicket = false;
  const ticketMiddleware = createApiAuthMiddleware({ consumeStreamTicket: (jobId, ticket) => { if (jobId !== 'job-123' || ticket !== 'one-use' || consumedTicket) return false; consumedTicket = true; return true; } });
  assert.equal((await invoke(ticketMiddleware, '/jobs/job-123/stream?ticket=one-use')).nextCalled, true);
  assert.equal((await invoke(ticketMiddleware, '/jobs/job-123/stream?ticket=one-use')).res.statusCode, 401, 'ticket is one-use');
  assert.equal((await invoke(middleware, '/telegram/webhook')).nextCalled, true);
  console.log('apiAuth tests passed');
}
void main();
