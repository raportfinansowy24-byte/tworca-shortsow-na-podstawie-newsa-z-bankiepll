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


/** Public exports are media deliverables only; internal state and cache files stay private. */
const PUBLIC_EXPORT_EXTENSIONS = new Set(['.mp4', '.jpg', '.jpeg', '.png', '.webp', '.mp3', '.wav', '.m4a']);

export function isPublicExportFilename(filename: string): boolean {
  if (
    typeof filename !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/u.test(filename) ||
    filename === '.' ||
    filename === '..'
  ) return false;
  return PUBLIC_EXPORT_EXTENSIONS.has(path.extname(filename).toLowerCase());
}
