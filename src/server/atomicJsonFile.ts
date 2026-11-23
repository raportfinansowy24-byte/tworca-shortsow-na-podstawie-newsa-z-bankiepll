import fs from 'node:fs';
import path from 'node:path';

export interface AtomicJsonFileOptions<T> {
  filePath: string;
  parse?: (raw: string) => T;
  serialize?: (value: T) => string;
}

/**
 * Serializes snapshots through one writer and commits them with temp-file + fsync + rename.
 * The previous committed snapshot is retained as `${filePath}.bak` for recovery.
 */
export class AtomicJsonFile<T> {
  private readonly parse: (raw: string) => T;
  private readonly serialize: (value: T) => string;
  private writeChain: Promise<void> = Promise.resolve();

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

  write(value: T): Promise<void> {
    const serialized = this.serialize(value);
    this.writeChain = this.writeChain.then(() => this.commit(serialized));
    return this.writeChain;
  }

  private async commit(serialized: string): Promise<void> {
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

      try {
        await fs.promises.rm(this.backupPath, { force: true });
        await fs.promises.rename(this.filePath, this.backupPath);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
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
  } catch {
    // Directory fsync is not supported on every development filesystem.
  } finally {
    await handle?.close().catch(() => undefined);
  }
}
