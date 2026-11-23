import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AtomicJsonFile } from '../src/server/atomicJsonFile';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rf24-atomic-json-'));
const filePath = path.join(tempDir, 'jobs_history.json');
const store = new AtomicJsonFile<number[]>({ filePath });

await Promise.all([
  store.write([1]),
  store.write([1, 2]),
  store.write([1, 2, 3])
]);
assert.deepEqual(JSON.parse(fs.readFileSync(filePath, 'utf8')), [1, 2, 3]);
assert.deepEqual(store.load(), [1, 2, 3]);
assert.ok(fs.existsSync(`${filePath}.bak`), 'the previous committed snapshot should be retained');

fs.writeFileSync(filePath, '{invalid json', 'utf8');
assert.deepEqual(store.load(), [1, 2], 'invalid primary should recover the previous committed snapshot');

fs.rmSync(tempDir, { recursive: true, force: true });
console.log('Atomic JSON file tests passed');
