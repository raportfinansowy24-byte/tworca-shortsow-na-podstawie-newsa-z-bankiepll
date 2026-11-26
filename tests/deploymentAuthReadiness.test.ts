import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getAppAuthConfiguration } from '../src/server/apiAuth';

const validSecret = 'test-secret-that-is-at-least-32-characters-long';

assert.equal(
  getAppAuthConfiguration({ APP_AUTH_SECRET: validSecret } as NodeJS.ProcessEnv),
  null,
  'readiness must fail when APP_LOGIN_PASSWORD is missing'
);
assert.equal(
  getAppAuthConfiguration({ APP_LOGIN_PASSWORD: 'configured' } as NodeJS.ProcessEnv),
  null,
  'readiness must fail when APP_AUTH_SECRET is missing'
);
assert.equal(
  getAppAuthConfiguration({ APP_AUTH_SECRET: 'too-short', APP_LOGIN_PASSWORD: 'configured' } as NodeJS.ProcessEnv),
  null,
  'readiness must fail when APP_AUTH_SECRET is shorter than 32 characters'
);
assert.deepEqual(
  getAppAuthConfiguration({ APP_AUTH_SECRET: validSecret, APP_LOGIN_PASSWORD: 'configured' } as NodeJS.ProcessEnv),
  { secret: validSecret, password: 'configured' },
  'readiness succeeds only when both authentication secrets are configured'
);

const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/validate.yml', import.meta.url), 'utf8');
assert.match(server, /appAuth:\\s*Boolean\\(getAppAuthConfiguration\\(\\)\\)/);
assert.match(server, /getAppAuthConfiguration\\(\\)\\s*\\?\\s*200\\s*:\\s*503/);
assert.doesNotMatch(workflow, /flyctl|FLY_API_TOKEN|fly\\.dev|BASE_URL\\/api\\/auth\\/status/i,
  'GitHub Actions must not deploy to or depend on Fly.io; production is managed by Railway');
assert.match(workflow, /npm run test:deployment-auth-readiness/);


console.log('deployment auth readiness tests passed');
