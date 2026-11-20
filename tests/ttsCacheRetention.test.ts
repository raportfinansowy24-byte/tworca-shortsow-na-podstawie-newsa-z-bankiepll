import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_TTS_CACHE_MAX_BYTES,
  DEFAULT_TTS_CACHE_TTL_DAYS,
  getTtsCacheDirectory,
  getTtsCacheRetentionOptions,
  pruneTtsCacheDirectory,
  touchTtsCacheEntry
} from '../src/server/ttsCacheRetention';

const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tts-cache-retention-'));
const cacheDir = path.join(root, 'cache');
const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const key = (digit: string) => digit.repeat(64);
const writeEntry = async (name: string, audioSize: number, metadataSize: number, mtime: number) => {
  const audio = path.join(cacheDir, name + '.mp3');
  const metadata = path.join(cacheDir, name + '.json');
  await fs.promises.writeFile(audio, Buffer.alloc(audioSize, 1));
  await fs.promises.writeFile(metadata, Buffer.alloc(metadataSize, 2));
  const date = new Date(mtime);
  await fs.promises.utimes(audio, date, date);
  await fs.promises.utimes(metadata, date, date);
  return { audio, metadata };
};

try {
  assert.equal(DEFAULT_TTS_CACHE_TTL_DAYS, 30);
  assert.equal(DEFAULT_TTS_CACHE_MAX_BYTES, 512 * 1024 * 1024);
  assert.equal(
    getTtsCacheDirectory({ TTS_CACHE_DIR: '/tmp/custom-tts-cache' } as NodeJS.ProcessEnv),
    '/tmp/custom-tts-cache'
  );
  assert.deepEqual(
    getTtsCacheRetentionOptions({ TTS_CACHE_TTL_DAYS: '7', TTS_CACHE_MAX_BYTES: '16777216' } as NodeJS.ProcessEnv),
    { ttlMs: 7 * day, maxBytes: 16 * 1024 * 1024 }
  );
  assert.deepEqual(
    getTtsCacheRetentionOptions({ TTS_CACHE_TTL_DAYS: '0', TTS_CACHE_MAX_BYTES: 'bad' } as NodeJS.ProcessEnv),
    { ttlMs: 30 * day, maxBytes: 512 * 1024 * 1024 }
  );

  const missing = await pruneTtsCacheDirectory(path.join(root, 'missing'), { now });
  assert.equal(missing.inspectedEntries, 0);

  await fs.promises.mkdir(cacheDir, { recursive: true });
  const expired = await writeEntry(key('a'), 10, 10, now - 31 * day);
  const old = await writeEntry(key('b'), 8, 4, now - 3 * day);
  const recent = await writeEntry(key('c'), 8, 4, now - 1 * day);
  await fs.promises.writeFile(path.join(cacheDir, 'narration-calibration.json'), '{"keep":true}');

  const expiredResult = await pruneTtsCacheDirectory(cacheDir, { now, ttlMs: 30 * day, maxBytes: 1024 });
  assert.equal(expiredResult.deletedEntries, 1, 'entries older than TTL must be removed');
  assert.equal(await fs.promises.access(expired.audio).then(() => true).catch(() => false), false);
  assert.equal(await fs.promises.access(old.audio).then(() => true).catch(() => false), true);
  assert.equal(await fs.promises.access(recent.audio).then(() => true).catch(() => false), true);
  assert.equal(await fs.promises.readFile(path.join(cacheDir, 'narration-calibration.json'), 'utf8'), '{"keep":true}');

  const sizeResult = await pruneTtsCacheDirectory(cacheDir, { now, ttlMs: 30 * day, maxBytes: 20 });
  assert.equal(sizeResult.deletedEntries, 1, 'least recently used pair must be evicted to meet size limit');
  assert.equal(await fs.promises.access(old.audio).then(() => true).catch(() => false), false);
  assert.equal(await fs.promises.access(recent.audio).then(() => true).catch(() => false), true);
  assert.equal(sizeResult.remainingBytes <= 20, true);

  const preserved = await writeEntry(key('d'), 20, 20, now - 2 * day);
  const preserveResult = await pruneTtsCacheDirectory(cacheDir, {
    now,
    ttlMs: 30 * day,
    maxBytes: 20,
    preserveKeys: [key('d')]
  });
  assert.equal(await fs.promises.access(preserved.audio).then(() => true).catch(() => false), true);
  assert.equal(preserveResult.remainingBytes > 20, true, 'the entry currently being written must not be removed');

  const freshPartial = path.join(cacheDir, key('e') + '.mp3');
  const stalePartial = path.join(cacheDir, key('f') + '.json');
  await fs.promises.writeFile(freshPartial, Buffer.alloc(6));
  await fs.promises.writeFile(stalePartial, Buffer.alloc(7));
  await fs.promises.utimes(stalePartial, new Date(now - 2 * 60 * 60 * 1000), new Date(now - 2 * 60 * 60 * 1000));
  const partialResult = await pruneTtsCacheDirectory(cacheDir, {
    now,
    ttlMs: 30 * day,
    maxBytes: 1024,
    incompleteEntryTtlMs: 60 * 60 * 1000
  });
  assert.equal(await fs.promises.access(freshPartial).then(() => true).catch(() => false), true);
  assert.equal(await fs.promises.access(stalePartial).then(() => true).catch(() => false), false);
  assert.equal(partialResult.deletedEntries, 1, 'stale incomplete cache pairs must be removed');

  const tempOld = path.join(cacheDir, key('1') + '.mp3.1.2.3.tmp');
  const tempNew = path.join(cacheDir, key('2') + '.json.1.2.3.tmp');
  await fs.promises.writeFile(tempOld, 'old');
  await fs.promises.writeFile(tempNew, 'new');
  await fs.promises.utimes(tempOld, new Date(now - 2 * day), new Date(now - 2 * day));
  const tempResult = await pruneTtsCacheDirectory(cacheDir, { now, ttlMs: 30 * day, maxBytes: 1024 });
  assert.equal(tempResult.deletedTempFiles, 1);
  assert.equal(await fs.promises.access(tempOld).then(() => true).catch(() => false), false);
  assert.equal(await fs.promises.access(tempNew).then(() => true).catch(() => false), true);

  await touchTtsCacheEntry(cacheDir, key('c'), now + 5000).catch(() => undefined);
  console.log('TTS cache retention tests passed');
} finally {
  await fs.promises.rm(root, { recursive: true, force: true });
}
