import assert from 'node:assert/strict';
import { createApiAuthMiddleware } from '../src/server/apiAuth';

function makeRequest(path: string, authorization?: string) {
  return {
    path,
    get: (name: string) => name.toLowerCase() === 'authorization' ? authorization : undefined
  } as any;
}

function makeResponse() {
  const response: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; }
  };
  return response;
}

async function invoke(middleware: ReturnType<typeof createApiAuthMiddleware>, path: string, authorization?: string) {
  const req = makeRequest(path, authorization);
  const res = makeResponse();
  let nextCalled = false;
  await middleware(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

async function main() {
  const base = {
    projectId: 'test-project',
    allowedEmails: ['raportfinansowy24@gmail.com'],
    machineToken: 'a'.repeat(64),
    verifyFirebaseToken: async (token: string) => {
      if (token === 'valid-firebase-token') {
        return { uid: 'user-1', email: 'raportfinansowy24@gmail.com', email_verified: true };
      }
      if (token === 'unverified-token') {
        return { uid: 'user-2', email: 'raportfinansowy24@gmail.com', email_verified: false };
      }
      if (token === 'other-account-token') {
        return { uid: 'user-3', email: 'other@example.com', email_verified: true };
      }
      throw new Error('invalid token');
    }
  };
  const middleware = createApiAuthMiddleware(base);

  const machine = await invoke(middleware, '/auto-pilot-shorts', `Bearer ${'a'.repeat(64)}`);
  assert.equal(machine.nextCalled, true, 'machine token should grant access');

  const firebase = await invoke(middleware, '/combine-scenes', 'Bearer valid-firebase-token');
  assert.equal(firebase.nextCalled, true, 'allowlisted verified Firebase identity should grant access');

  const missing = await invoke(middleware, '/auto-pilot-shorts');
  assert.equal(missing.res.statusCode, 401, 'missing auth should be rejected');

  const invalid = await invoke(middleware, '/auto-pilot-shorts', 'Bearer invalid');
  assert.equal(invalid.res.statusCode, 401, 'invalid Firebase token should be rejected');

  const unverified = await invoke(middleware, '/auto-pilot-shorts', 'Bearer unverified-token');
  assert.equal(unverified.res.statusCode, 403, 'unverified email should be rejected');

  const wrongAccount = await invoke(middleware, '/auto-pilot-shorts', 'Bearer other-account-token');
  assert.equal(wrongAccount.res.statusCode, 403, 'non-allowlisted account should be rejected');

  const publicHealth = await invoke(middleware, '/health');
  assert.equal(publicHealth.nextCalled, true, 'health check should remain public');
  const telegramWebhook = await invoke(middleware, '/telegram/webhook');
  assert.equal(telegramWebhook.nextCalled, true, 'Telegram webhook should remain reachable for its own secret validation');

  assert.equal(await import('../src/server/apiAuth').then(({ constantTimeTokenMatch }) => constantTimeTokenMatch('a', 'a')), true);
  assert.equal(await import('../src/server/apiAuth').then(({ constantTimeTokenMatch }) => constantTimeTokenMatch('a', 'b')), false);
  console.log('apiAuth tests passed');
}

void main();
