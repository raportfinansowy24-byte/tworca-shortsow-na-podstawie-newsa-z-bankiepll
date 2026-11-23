import fs from 'node:fs';
import path from 'node:path';

export interface AtomicJsonFileOptions<T> {
  filePath: string;
  parse?: (raw: string) => T;
  serialize?: (value: T) => string;
  beforePromote?: () => void | Promise<void>;
  afterBackup?: () => void | Promise<void>;
}

type Waiter = { resolve: () => void; reject: (error: unknown) => void };

/**
 * Serializes snapshots through one coalescing writer and commits them with
 * temp-file + fsync + rename. The previous valid committed snapshot is
 * retained as `${filePath}.bak` for recovery.
 */
export class AtomicJsonFile<T> {
  private readonly parse: (raw: string) => T;
  private readonly serialize: (value: T) => string;
  private pending?: { serialized: string; waiters: Waiter[] };
  private drainPromise: Promise<void> | undefined;

  constructor(private readonly options: AtomicJsonFileOptions<T>) {
    this.parse = options.parse ?? ((raw) => JSON.parse(raw) as T);
    this.serialize = options.serialize ?? ((value) => JSON.stringify(value, null, 2));
  }

  get filePath(): string {
    return this.options.filePath;
  }

  get backupPath(): string {
    return `${this.options.filePath}.bak`;
  }

  load(): T | undefined {
    for (const candidate of [this.filePath, this.backupPath]) {
      try {
        return this.parse(fs.readFileSync(candidate, 'utf8'));
      } catch {
        // Try the recovery snapshot when the primary file is absent or invalid.
      }
    }
    return undefined;
  }

  /**
   * Coalesces snapshots that arrive while a commit is in flight. Every caller
   * is settled by the next committed snapshot; a failed commit rejects only
   * the callers represented by that snapshot and does not poison the writer.
   */
  write(value: T): Promise<void> {
    const serialized = this.serialize(value);
    const promise = new Promise<void>((resolve, reject) => {
      if (this.pending) {
        this.pending.serialized = serialized;
        this.pending.waiters.push({ resolve, reject });
      } else {
        this.pending = { serialized, waiters: [{ resolve, reject }] };
      }
    });
    this.startDrain();
    return promise;
  }

  private startDrain(): Promise<void> {
    if (this.drainPromise) return this.drainPromise;

    const drainPromise = Promise.resolve().then(() => this.drain());
    const trackedPromise = drainPromise.finally(() => {
      if (this.drainPromise === trackedPromise) {
        this.drainPromise = undefined;
      }
      if (this.pending) this.startDrain();
    });
    this.drainPromise = trackedPromise;
    return trackedPromise;
  }

  private async drain(): Promise<void> {
    while (this.pending) {
      const current = this.pending;
      this.pending = undefined;
      try {
        await this.commit(current.serialized);
        current.waiters.forEach(({ resolve }) => resolve());
      } catch (error) {
        current.waiters.forEach(({ reject }) => reject(error));
      }
    }
  }

  protected async commit(serialized: string): Promise<void> {
    const directory = path.dirname(this.filePath);
    await fs.promises.mkdir(directory, { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    let tempHandle: fs.promises.FileHandle | undefined;
    try {
      tempHandle = await fs.promises.open(tempPath, 'w');
      await tempHandle.writeFile(serialized, 'utf8');
      await tempHandle.sync();
      await tempHandle.close();
      tempHandle = undefined;
      await this.options.beforePromote?.();

      // Never replace the recovery copy with an invalid primary snapshot.
      let primaryIsValid = false;
      try {
        this.parse(await fs.promises.readFile(this.filePath, 'utf8'));
        primaryIsValid = true;
      } catch {
        // A missing/corrupt primary is replaced directly; the existing backup stays intact.
      }
      if (primaryIsValid) {
        // POSIX rename replaces the old backup atomically; there is no rm window.
        await fs.promises.rename(this.filePath, this.backupPath);
        await this.options.afterBackup?.();
      }
      await fs.promises.rename(tempPath, this.filePath);
      await syncDirectory(directory);
    } finally {
      if (tempHandle) await tempHandle.close().catch(() => undefined);
      await fs.promises.rm(tempPath, { force: true }).catch(() => undefined);
    }
  }
}

async function syncDirectory(directory: string): Promise<void> {
  let handle: fs.promises.FileHandle | undefined;
  try {
    handle = await fs.promises.open(directory, 'r');
    await handle.sync();
  } catch (error) {
    if (!isUnsupportedDirectorySyncError(error)) throw error;
    // Directory fsync is not supported on every development filesystem.
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

function isUnsupportedDirectorySyncError(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code
    : undefined;
  return code === 'EINVAL' || code === 'ENOTSUP' || code === 'EOPNOTSUPP';
}
