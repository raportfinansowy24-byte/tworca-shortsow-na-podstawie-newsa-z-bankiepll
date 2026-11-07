import fs from 'node:fs';
import path from 'node:path';

export type ByteRange = { start: number; end: number };
export function parseByteRange(value: string, size: number): ByteRange | null {
  if (!Number.isSafeInteger(size) || size < 0 || !/^bytes=\d*-\d*$/.test(value)) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value)!;
  if ((!match[1] && !match[2]) || size === 0) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]), size - 1) : size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return null;
  return { start, end };
}
export function isSafeExportPath(exportsDir: string, candidate: string): boolean {
  const root = path.resolve(exportsDir); const resolved = path.resolve(candidate);
  if (path.dirname(resolved) !== root) return false;
  try {
    const realRoot = fs.realpathSync(root); const realFile = fs.realpathSync(resolved);
    return realFile.startsWith(`${realRoot}${path.sep}`) && fs.statSync(realFile).isFile();
  } catch { return false; }
}
