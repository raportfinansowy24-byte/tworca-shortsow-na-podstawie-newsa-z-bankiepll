import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const makeConnector = readFileSync(new URL('../src/components/MakeHttpConnector.tsx', import.meta.url), 'utf8');
const renderingQueue = readFileSync(new URL('../src/components/RenderingQueue.tsx', import.meta.url), 'utf8');
const sharedClient = readFileSync(new URL('../src/utils/jobEventSource.ts', import.meta.url), 'utf8');

assert.match(makeConnector, /openJobEventSource\(jobId\)/, 'Make connector must obtain a one-use stream ticket');
assert.doesNotMatch(makeConnector, /new EventSource\s*\(/, 'Make connector must not bypass stream-ticket authentication');
assert.match(renderingQueue, /openJobEventSource\(jobId\)/, 'render queue must obtain a one-use stream ticket');
assert.match(renderingQueue, /\}, \[activeProcessingJob\?\.id\]\);/, 'render queue subscription must depend on job identity, not refreshed job objects or state');
assert.match(renderingQueue, /onRefreshRef\.current\(\)/, 'poll refresh callback must not recreate the SSE subscription');
assert.match(sharedClient, /stream-ticket/, 'shared SSE client must request a ticket before opening EventSource');
console.log('SSE client contract tests passed.');
