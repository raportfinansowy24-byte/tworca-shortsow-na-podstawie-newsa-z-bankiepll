import assert from 'node:assert/strict';
import { clearRenderDeadline } from '../src/server/renderDeadline';

let status: 'processing' | 'completed' | 'failed' = 'processing';
const watchdog = setTimeout(() => { status = 'failed'; }, 40);
status = 'completed';
clearRenderDeadline(watchdog);
await new Promise((resolve) => setTimeout(resolve, 100));
assert.equal(status, 'completed', 'a delayed callback must not turn a completed render into failed');
console.log('Render completion deadline tests passed.');
