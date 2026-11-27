import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const connector = readFileSync(new URL('../src/components/MakeHttpConnector.tsx', import.meta.url), 'utf8');

const jobsRouteStart = server.indexOf("router.get('/jobs',");
assert.notEqual(jobsRouteStart, -1, 'GET /api/jobs route must exist');
const jobsRouteEnd = server.indexOf('\n});', jobsRouteStart);
assert.notEqual(jobsRouteEnd, -1, 'GET /api/jobs route must be closed');
const jobsRoute = server.slice(jobsRouteStart, jobsRouteEnd);

assert.match(jobsRoute, /Cache-Control', 'no-store, no-cache, must-revalidate'/, 'queue API must disable browser and intermediary caching');
assert.match(jobsRoute, /Pragma', 'no-cache'/, 'queue API must include legacy no-cache header');
assert.match(jobsRoute, /Expires', '0'/, 'queue API must expire immediately');
assert.match(jobsRoute, /res\.status\(200\)\.json\(jobs\)/, 'queue API must send a fresh 200 JSON response');

const noStoreQueueFetches = connector.match(/fetch\('\/api\/jobs', \{ cache: 'no-store' \}\)/g) || [];
assert.equal(noStoreQueueFetches.length, 2, 'both queue GET call sites must bypass the browser HTTP cache');
assert.doesNotMatch(connector, /fetch\('\/api\/jobs'\)/, 'no queue GET may rely on the default browser cache mode');

console.log('Live queue no-store cache contract tests passed.');
