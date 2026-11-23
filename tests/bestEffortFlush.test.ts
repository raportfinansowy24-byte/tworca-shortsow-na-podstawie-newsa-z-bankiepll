import assert from 'node:assert/strict';
import { BestEffortFlush } from '../src/server/bestEffortFlush';

let flushCount = 0;
const persisted: number[] = [];
const flusher = new BestEffortFlush(async () => {
  flushCount += 1;
  persisted.push(flushCount);
}, { delayMs: 20 });

try {
  for (let index = 0; index < 20; index += 1) flusher.schedule();
  assert.equal(flushCount, 0, 'progress scheduling must not flush synchronously on every tick');
  await new Promise((resolve) => setTimeout(resolve, 35));
  assert.equal(flushCount, 1, 'coalesced progress updates should produce one delayed flush');

  for (let index = 0; index < 20; index += 1) flusher.schedule();
  await flusher.flushNow();
  assert.equal(flushCount, 2, 'critical flush should persist pending progress immediately');
  assert.deepEqual(persisted, [1, 2]);

  console.log('Best-effort flush tests passed');
} finally {
  await flusher.flushNow();
}
