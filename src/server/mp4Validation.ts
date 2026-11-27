import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface Mp4ProbeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
}
export interface Mp4ProbeFormat {
  duration?: string | number;
  size?: string | number;
  format_name?: string;
}
export interface Mp4ProbeDocument {
  streams?: Mp4ProbeStream[];
  format?: Mp4ProbeFormat;
}
export interface Mp4ValidationResult {
  valid: boolean;
  reason?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  hasAudio: boolean;
  probedSizeBytes?: number;
}
const invalid = (reason: string, hasAudio = false): Mp4ValidationResult => ({ valid: false, reason, hasAudio });
export function validateMp4ProbeOutput(output: string, actualSizeBytes: number, requireAudio = false): Mp4ValidationResult {
  if (!Number.isSafeInteger(actualSizeBytes) || actualSizeBytes < 1024) return invalid('Plik MP4 jest pusty lub zbyt mały.');
  let document: Mp4ProbeDocument;
  try {
    const parsed: unknown = JSON.parse(output);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return invalid('ffprobe zwrócił nieprawidłową strukturę JSON.');
    document = parsed as Mp4ProbeDocument;
  } catch {
    return invalid('ffprobe zwrócił nieprawidłowy JSON.');
  }

  const streams = Array.isArray(document.streams) ? document.streams : [];
  const video = streams.find((stream) => stream?.codec_type === 'video');
  const hasAudio = streams.some((stream) => stream?.codec_type === 'audio');
  const width = Number(video?.width);
  const height = Number(video?.height);
  const durationSeconds = Number(document.format?.duration);
  const parsedSize = Number(document.format?.size);
  const formatName = typeof document.format?.format_name === 'string'
    ? document.format.format_name.toLowerCase().split(',')
    : [];

  if (!video) return invalid('Plik nie zawiera strumienia wideo.', hasAudio);
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
    return invalid('Strumień wideo nie ma prawidłowych wymiarów.', hasAudio);
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return invalid('Plik nie ma prawidłowego czasu trwania.', hasAudio);
  if (!formatName.includes('mp4')) return invalid('Kontener pliku nie został rozpoznany jako MP4.', hasAudio);
  if (requireAudio && !hasAudio) return invalid('Plik nie zawiera wymaganego strumienia audio.', hasAudio);
  if (Number.isFinite(parsedSize) && parsedSize > 0 && parsedSize !== actualSizeBytes) {
    return invalid('Rozmiar pliku zgłoszony przez ffprobe nie zgadza się z rozmiarem na dysku.', hasAudio);
  }

  return {
    valid: true,
    durationSeconds,
    width,
    height,
    hasAudio,
    probedSizeBytes: Number.isSafeInteger(parsedSize) && parsedSize > 0 ? parsedSize : actualSizeBytes
  };
}

/** Validates an MP4 using an allow-listed filename and a canonical path confined to the export root. */
export async function validateMp4File(exportsDirectory: string, filename: string, requireAudio = false): Promise<Mp4ValidationResult> {
  if (
    typeof filename !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/u.test(filename) ||
    path.extname(filename).toLowerCase() !== '.mp4'
  ) return invalid('Nieprawidłowa nazwa pliku MP4.');

  let root: string;
  try {
    root = await fs.realpath(exportsDirectory);
  } catch {
    return invalid('Katalog eksportów nie jest dostępny.');
  }
  let filePath = path.resolve(root, filename);
  if (!filePath.startsWith(`${root}${path.sep}`)) return invalid('Plik MP4 znajduje się poza katalogiem eksportów.');

  let stats;
  try {
    filePath = await fs.realpath(filePath);
    if (!filePath.startsWith(`${root}${path.sep}`)) return invalid('Plik MP4 rozwiązuje się poza katalogiem eksportów.');
    stats = await fs.lstat(filePath, { bigint: false });
    if (!stats.isFile() || stats.isSymbolicLink()) return invalid('Ścieżka MP4 nie wskazuje na zwykły plik.');
  } catch {
    return invalid('Plik MP4 nie istnieje lub nie można go bezpiecznie odczytać.');
  }

  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'stream=codec_type,codec_name,width,height',
      '-show_entries', 'format=duration,size,format_name',
      '-of', 'json',
      filePath
    ], { timeout: 12_000, maxBuffer: 1024 * 1024 });
    return validateMp4ProbeOutput(stdout, stats.size, requireAudio);
  } catch (error) {
    const details = error && typeof error === 'object' && 'stderr' in error && typeof error.stderr === 'string'
      ? error.stderr.trim().slice(0, 240)
      : error instanceof Error ? error.message.slice(0, 240) : 'ffprobe nie mógł odczytać pliku.';
    return invalid(details || 'ffprobe nie mógł odczytać pliku.');
  }
}

export interface CompletedMp4Candidate {
  status: string;
  outputFilename?: string | null;
}

/** Returns only completed jobs whose MP4 files passed the production validator. */
export async function selectValidCompletedMp4Jobs<T extends CompletedMp4Candidate>(
  candidates: T[],
  limit: number,
  validate: (filename: string) => Promise<Mp4ValidationResult>,
  onInvalid: (job: T, reason: string) => void
): Promise<T[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);
  const selected: T[] = [];
  for (const job of candidates) {
    if (job.status !== 'completed' || typeof job.outputFilename !== 'string' || !job.outputFilename) continue;
    const result = await validate(job.outputFilename);
    if (!result.valid) {
      onInvalid(job, result.reason || 'Nieprawidłowy plik MP4.');
      continue;
    }
    selected.push(job);
    if (selected.length >= boundedLimit) break;
  }
  return selected;
}
