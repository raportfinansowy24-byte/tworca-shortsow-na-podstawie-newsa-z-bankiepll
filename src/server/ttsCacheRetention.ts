import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_TTS_CACHE_TTL_DAYS = 30;
export const DEFAULT_TTS_CACHE_MAX_BYTES = 512 * 1024 * 1024;
const DEFAULT_INCOMPLETE_ENTRY_TTL_MS = 60 * 60 * 1000;
const DEFAULT_TEMP_FILE_TTL_MS = 24 * 60 * 60 * 1000;

export interface TtsCacheRetentionOptions {
  ttlMs?: number;
  maxBytes?: number;
  now?: number;
  incompleteEntryTtlMs?: number;
  tempFileTtlMs?: number;
  preserveKeys?: string[];
}

export interface TtsCacheRetentionResult {
  inspectedEntries: number;
  retainedEntries: number;
  deletedEntries: number;
  deletedBytes: number;
  remainingBytes: number;
  deletedTempFiles: number;
  skipped: boolean;
}

interface CachePair {
  key: string;
  audioPath: string;
  metadataPath: string;
  bytes: number;
  lastUsedAt: number;
}

function positiveInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export function getTtsCacheDirectory(env: NodeJS.ProcessEnv = process.env): string {
  return env.TTS_CACHE_DIR?.trim() ||
    path.join(env.SHORTS_EXPORTS_DIR?.trim() || '/app/exports', 'tts-cache');
}

export function getTtsCacheRetentionOptions(env: NodeJS.ProcessEnv = process.env): Pick<TtsCacheRetentionOptions, 'ttlMs' | 'maxBytes'> {
  const ttlDays = positiveInteger(env.TTS_CACHE_TTL_DAYS, DEFAULT_TTS_CACHE_TTL_DAYS, 1, 365);
  const maxBytes = positiveInteger(env.TTS_CACHE_MAX_BYTES, DEFAULT_TTS_CACHE_MAX_BYTES, 16 * 1024 * 1024, 10 * 1024 * 1024 * 1024);
  return { ttlMs: ttlDays * 24 * 60 * 60 * 1000, maxBytes };
}

/**
 * Removes only hash-named TTS audio/metadata pairs. Calibration files and
 * unrelated files are deliberately left untouched. A fresh half-written pair
 * is retained briefly to avoid racing atomic two-file writes.
 */
export async function pruneTtsCacheDirectory(
  cacheDir: string,
  options: TtsCacheRetentionOptions = {}
): Promise<TtsCacheRetentionResult> {
  const now = options.now ?? Date.now();
  const ttlMs = options.ttlMs ?? DEFAULT_TTS_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  const maxBytes = options.maxBytes ?? DEFAULT_TTS_CACHE_MAX_BYTES;
  const incompleteTtlMs = options.incompleteEntryTtlMs ?? DEFAULT_INCOMPLETE_ENTRY_TTL_MS;
  const tempFileTtlMs = options.tempFileTtlMs ?? DEFAULT_TEMP_FILE_TTL_MS;
  const preserveKeys = new Set(options.preserveKeys || []);
  const result: TtsCacheRetentionResult = {
    inspectedEntries: 0,
    retainedEntries: 0,
    deletedEntries: 0,
    deletedBytes: 0,
    remainingBytes: 0,
    deletedTempFiles: 0,
    skipped: false
  };

  if (!Number.isFinite(ttlMs) || ttlMs <= 0 || !Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error('Invalid TTS cache retention policy.');
  }

  let directoryStat: fs.Stats;
  try {
    directoryStat = await fs.promises.lstat(cacheDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return result;
    throw error;
  }
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
    return { ...result, skipped: true };
  }

  const names = await fs.promises.readdir(cacheDir);
  const keys = new Set<string>();
  const tempPaths: string[] = [];
  for (const name of names) {
    const pairMatch = /^([a-f0-9]{64})\.(mp3|json)$/u.exec(name);
    if (pairMatch) {
      keys.add(pairMatch[1]);
      continue;
    }
    if (/^[a-f0-9]{64}\.(?:mp3|json)\.[A-Za-z0-9._-]+\.tmp$/u.test(name)) {
      tempPaths.push(path.join(cacheDir, name));
    }
  }

  for (const tempPath of tempPaths) {
    try {
      const stat = await fs.promises.lstat(tempPath);
      if (stat.isFile() && now - stat.mtimeMs > tempFileTtlMs) {
        await fs.promises.unlink(tempPath);
        result.deletedTempFiles += 1;
        result.deletedBytes += stat.size;
      }
    } catch {
      // A concurrently renamed or already removed temporary file is harmless.
    }
  }

  const pairs: CachePair[] = [];
  for (const key of keys) {
    result.inspectedEntries += 1;
    const audioPath = path.join(cacheDir, key + '.mp3');
    const metadataPath = path.join(cacheDir, key + '.json');
    try {
      const [audioStat, metadataStat] = await Promise.all([
        fs.promises.lstat(audioPath).catch(() => null),
        fs.promises.lstat(metadataPath).catch(() => null)
      ]);
      const availableStats = [audioStat, metadataStat].filter((stat): stat is fs.Stats => Boolean(stat));
      const entryBytes = availableStats.reduce((total, stat) => total + stat.size, 0);
      const lastUsedAt = availableStats.reduce((latest, stat) => Math.max(latest, stat.mtimeMs), 0);
      const validPair = audioStat?.isFile() && metadataStat?.isFile();

      if (!validPair) {
        if (now - lastUsedAt > incompleteTtlMs && !preserveKeys.has(key)) {
          await Promise.all([
            fs.promises.unlink(audioPath).catch(() => undefined),
            fs.promises.unlink(metadataPath).catch(() => undefined)
          ]);
          result.deletedEntries += 1;
          result.deletedBytes += entryBytes;
        } else {
          // Do not count an incomplete young entry as a healthy cache pair.
          result.remainingBytes += entryBytes;
        }
        continue;
      }

      if (now - lastUsedAt > ttlMs && !preserveKeys.has(key)) {
        await Promise.all([fs.promises.unlink(audioPath), fs.promises.unlink(metadataPath)]);
        result.deletedEntries += 1;
        result.deletedBytes += entryBytes;
        continue;
      }

      pairs.push({ key, audioPath, metadataPath, bytes: entryBytes, lastUsedAt });
      result.remainingBytes += entryBytes;
    } catch {
      // Retention is best-effort; one inaccessible cache entry must not stop rendering.
    }
  }

  if (result.remainingBytes > maxBytes) {
    const oldestFirst = pairs
      .filter((pair) => !preserveKeys.has(pair.key))
      .sort((a, b) => a.lastUsedAt - b.lastUsedAt);
    for (const pair of oldestFirst) {
      if (result.remainingBytes <= maxBytes) break;
      await Promise.all([
        fs.promises.unlink(pair.audioPath).catch(() => undefined),
        fs.promises.unlink(pair.metadataPath).catch(() => undefined)
      ]);
      result.remainingBytes = Math.max(0, result.remainingBytes - pair.bytes);
      result.deletedBytes += pair.bytes;
      result.deletedEntries += 1;
    }
  }

  // Recount actual retained cache pairs. The count is diagnostic and not used for decisions.
  result.retainedEntries = 0;
  for (const pair of pairs) {
    try {
      await Promise.all([fs.promises.access(pair.audioPath), fs.promises.access(pair.metadataPath)]);
      result.retainedEntries += 1;
    } catch {
      // Removed by expiration/size policy.
    }
  }

  return result;
}

/** Touch both files so LRU eviction reflects successful cache hits. */
export async function touchTtsCacheEntry(cacheDir: string, key: string, now = Date.now()): Promise<void> {
  if (!/^[a-f0-9]{64}$/u.test(key)) return;
  const date = new Date(now);
  await Promise.all([
    fs.promises.utimes(path.join(cacheDir, key + '.mp3'), date, date),
    fs.promises.utimes(path.join(cacheDir, key + '.json'), date, date)
  ]);
}
