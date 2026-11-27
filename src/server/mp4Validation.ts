import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import type { Stats } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { isPublicExportFilename } from './byteRange';

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
export interface ResolvedPublicExportFile {
  filename: string;
  filePath: string;
  stats: Stats;
}

/** Resolves a requested export name only by matching a regular file returned by readdir. */
export async function resolvePublicExportFile(
  exportsDirectory: string,
  requestedFilename: string
): Promise<ResolvedPublicExportFile | null> {
  if (!isPublicExportFilename(requestedFilename)) return null;

  let root: string;
  try {
    root = await fs.realpath(exportsDirectory);
  } catch {
    return null;
  }

  let matchingFilename: string | undefined;
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    matchingFilename = entries.find((entry) => entry.isFile() && entry.name === requestedFilename)?.name;
  } catch {
    return null;
  }
  if (!matchingFilename) return null;

  const filePath = path.join(root, matchingFilename);
  try {
    const stats = await fs.lstat(filePath, { bigint: false });
    if (!stats.isFile() || stats.isSymbolicLink()) return null;
    const realPath = await fs.realpath(filePath);
    if (path.dirname(realPath) !== root) return null;
    return { filename: matchingFilename, filePath: realPath, stats };
  } catch {
    return null;
  }
}


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

/** Validates an MP4 selected from the exports directory, never an arbitrary user-supplied path. */
export async function validateMp4File(exportsDirectory: string, filename: string, requireAudio = false): Promise<Mp4ValidationResult> {
  if (path.extname(filename).toLowerCase() !== '.mp4') return invalid('Nieprawidłowa nazwa pliku MP4.');
  const resolved = await resolvePublicExportFile(exportsDirectory, filename);
  if (!resolved) return invalid('Plik MP4 nie istnieje lub nie znajduje się bezpiecznie w katalogu eksportów.');

  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'stream=codec_type,codec_name,width,height',
      '-show_entries', 'format=duration,size,format_name',
      '-of', 'json',
      resolved.filePath
    ], { timeout: 12_000, maxBuffer: 1024 * 1024 });
    return validateMp4ProbeOutput(stdout, resolved.stats.size, requireAudio);
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
