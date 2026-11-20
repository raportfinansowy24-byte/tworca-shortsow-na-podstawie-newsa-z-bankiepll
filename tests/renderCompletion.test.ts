import assert from 'node:assert/strict';
import { runCompletionCallback } from '../src/server/renderDeadline';

let status: 'processing' | 'completed' | 'failed' = 'processing';
const watchdog = setTimeout(() => { status = 'failed'; }, 40);
status = 'completed';
const callbackStartedAt = Date.now();
await runCompletionCallback(watchdog, async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return 'telegram-upload-finished';
});
await runCompletionCallback(watchdog, async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return 'webhook-finished';
});
assert.equal(Date.now() - callbackStartedAt >= 190, true, 'test must exercise delayed Telegram and webhook callbacks');
assert.equal(status, 'completed', 'delayed Telegram upload or webhook must not turn a completed render into failed');
console.log('Render completion deadline tests passed.');
