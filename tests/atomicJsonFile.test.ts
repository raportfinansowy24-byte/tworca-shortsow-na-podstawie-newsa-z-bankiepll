import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AtomicJsonFile } from '../src/server/atomicJsonFile';

class FailOnceAtomicJsonFile<T> extends AtomicJsonFile<T> {
  private shouldFail = true;
  protected override async commit(serialized: string): Promise<void> {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw new Error('injected commit failure');
    }
    return super.commit(serialized);
  }
}

class FailAfterBackupAtomicJsonFile<T> extends AtomicJsonFile<T> {
  private shouldFail = true;

  constructor(options: ConstructorParameters<typeof AtomicJsonFile<T>>[0]) {
    super({
      ...options,
      afterBackup: async () => {
        if (this.shouldFail) {
          this.shouldFail = false;
          throw new Error('injected failure after backup promotion');
        }
      }
    });
  }
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rf24-atomic-json-'));
try {
  const filePath = path.join(tempDir, 'jobs_history.json');
  const store = new AtomicJsonFile<number[]>({ filePath });

  await store.write([1]);
  await store.write([1, 2]);
  assert.deepEqual(JSON.parse(fs.readFileSync(filePath, 'utf8')), [1, 2]);
  assert.deepEqual(store.load(), [1, 2]);
  assert.ok(fs.existsSync(`${filePath}.bak`), 'the previous committed snapshot should be retained');

  fs.writeFileSync(filePath, '{invalid json', 'utf8');
  assert.deepEqual(store.load(), [1], 'invalid primary should recover the previous committed snapshot');

  fs.rmSync(filePath, { force: true });
  await store.write([3]);
  assert.deepEqual(store.load(), [3], 'a missing primary should not require deleting the backup first');

  const failPath = path.join(tempDir, 'fail-once.json');
  const failOnce = new FailOnceAtomicJsonFile<number[]>({ filePath: failPath });
  await assert.rejects(failOnce.write([10]), /injected commit failure/);
  await failOnce.write([11]);
  assert.deepEqual(failOnce.load(), [11], 'a failed commit must not poison later writes');

  const rotationPath = path.join(tempDir, 'rotation-failure.json');
  const rotationFailure = new FailAfterBackupAtomicJsonFile<number[]>({ filePath: rotationPath });
  await rotationFailure.write([20]);
  await assert.rejects(rotationFailure.write([21]), /injected failure after backup promotion/);
  assert.deepEqual(rotationFailure.load(), [20], 'failure after primary backup must recover the previous snapshot');
  await rotationFailure.write([22]);
  assert.deepEqual(rotationFailure.load(), [22], 'writer must continue after rotation recovery');

  const coalescedPath = path.join(tempDir, 'coalesced.json');
  let commitCount = 0;
  let activeCommits = 0;
  let maxActiveCommits = 0;
  class CountingAtomicJsonFile extends AtomicJsonFile<number[]> {
    protected override async commit(serialized: string): Promise<void> {
      commitCount += 1;
      activeCommits += 1;
      maxActiveCommits = Math.max(maxActiveCommits, activeCommits);
      await new Promise((resolve) => setTimeout(resolve, 10));
      try {
        await super.commit(serialized);
      } finally {
        activeCommits -= 1;
      }
    }
  }
  const coalesced = new CountingAtomicJsonFile({ filePath: coalescedPath });
  await Promise.all(Array.from({ length: 20 }, (_, index) => coalesced.write([index])));
  assert.ok(commitCount < 20, `expected coalescing, got ${commitCount} commits`);
  assert.equal(maxActiveCommits, 1, 'coalesced writer must never commit snapshots concurrently');
  assert.deepEqual(coalesced.load(), [19]);

  const boundaryPath = path.join(tempDir, 'drain-boundary.json');
  class BoundaryAtomicJsonFile extends AtomicJsonFile<number[]> {
    secondWrite: Promise<void> | undefined;

    protected override async onDrainIdle(): Promise<void> {
      if (!this.secondWrite) this.secondWrite = this.write([31]);
    }
  }
  const boundary = new BoundaryAtomicJsonFile({ filePath: boundaryPath });
  await boundary.write([30]);
  await boundary.secondWrite;
  assert.deepEqual(boundary.load(), [31], 'a write at drain completion must be drained and persisted');

  console.log('Atomic JSON file tests passed');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
