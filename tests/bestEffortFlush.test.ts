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
} finally {
  await flusher.flushNow();
}

let releaseFirstFlush!: () => void;
let firstFlushStarted!: () => void;
const firstFlushStartedPromise = new Promise<void>((resolve) => { firstFlushStarted = resolve; });
const firstFlushReleasePromise = new Promise<void>((resolve) => { releaseFirstFlush = resolve; });
let currentState = 1;
const persistedStates: number[] = [];
const raceFlusher = new BestEffortFlush(async () => {
  const snapshot = currentState;
  firstFlushStarted();
  if (snapshot === 1) await firstFlushReleasePromise;
  persistedStates.push(snapshot);
}, { delayMs: 5 });

try {
  raceFlusher.schedule();
  await firstFlushStartedPromise;
  currentState = 2;
  raceFlusher.schedule();
  releaseFirstFlush();
  await raceFlusher.flushNow();
  assert.deepEqual(persistedStates, [1, 2], 'state scheduled during active flush must be persisted by a second flush');
} finally {
  await raceFlusher.flushNow();
}

let attempts = 0;
let reportedErrors = 0;
const retryFlusher = new BestEffortFlush(async () => {
  attempts += 1;
  if (attempts === 1) throw new Error('injected background flush failure');
}, {
  delayMs: 5,
  onError: () => { reportedErrors += 1; }
});

try {
  retryFlusher.schedule();
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.ok(attempts >= 2, 'failed background flush must be retried');
  assert.equal(reportedErrors, 1, 'background flush rejection must be reported once');
} finally {
  await retryFlusher.flushNow();
}

let criticalAttempts = 0;
const criticalFlusher = new BestEffortFlush(async () => {
  criticalAttempts += 1;
  if (criticalAttempts === 1) throw new Error('injected critical flush failure');
}, { delayMs: 100 });
criticalFlusher.schedule();
await assert.rejects(criticalFlusher.flushNow(), /injected critical flush failure/);
assert.equal(criticalAttempts, 1, 'critical flush must execute exactly once before rejecting');

let releaseActiveFailure!: () => void;
const activeFailureStarted = new Promise<void>((resolve) => {
  const release = () => resolve();
  releaseActiveFailure = release;
});
let activeFailureCalls = 0;
const activeFailureFlusher = new BestEffortFlush(async () => {
  activeFailureCalls += 1;
  if (activeFailureCalls > 1) return;
  await activeFailureStarted;
  throw new Error('injected active background flush failure');
}, { delayMs: 5 });
activeFailureFlusher.schedule();
await new Promise((resolve) => setTimeout(resolve, 15));
const waitingFlush = activeFailureFlusher.flushNow();
releaseActiveFailure();
await assert.rejects(waitingFlush, /injected active background flush failure/);
assert.equal(activeFailureCalls, 1, 'flushNow must await and propagate the active background failure');

console.log('Best-effort flush tests passed');
