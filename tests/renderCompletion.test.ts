import assert from 'node:assert/strict';
import { runCompletionCallback } from '../src/server/renderDeadline';

let status: 'processing' | 'completed' | 'failed' = 'processing';
const watchdog = setTimeout(() => { status = 'failed'; }, 40);
status = 'completed';
const callbackStartedAt = Date.now();
await runCompletionCallback(watchdog, async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return 'callback-finished';
});
assert.equal(Date.now() - callbackStartedAt >= 90, true, 'test must exercise a delayed callback');
assert.equal(status, 'completed', 'a delayed completion callback must not turn a completed render into failed');
console.log('Render completion deadline tests passed.');
