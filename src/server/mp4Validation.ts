import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
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

export function validateMp4ProbeOutput(
  output: string,
  actualSizeBytes: number,
  requireAudio = false
): Mp4ValidationResult {
  if (!Number.isFinite(actualSizeBytes) || actualSizeBytes < 1024) {
    return { valid: false, reason: 'Plik MP4 jest pusty lub zbyt mały.', hasAudio: false };
  }

  let document: Mp4ProbeDocument;
  try {
    document = JSON.parse(output) as Mp4ProbeDocument;
  } catch {
    return { valid: false, reason: 'ffprobe zwrócił nieprawidłowy JSON.', hasAudio: false };
  }

  const streams = Array.isArray(document.streams) ? document.streams : [];
  const video = streams.find((stream) => stream?.codec_type === 'video');
  const hasAudio = streams.some((stream) => stream?.codec_type === 'audio');
  const width = Number(video?.width);
  const height = Number(video?.height);
  const durationSeconds = Number(document.format?.duration);
  const probedSizeBytes = Number(document.format?.size);
  const formatName = typeof document.format?.format_name === 'string' ? document.format.format_name : '';

  if (!video) return { valid: false, reason: 'Plik nie zawiera strumienia wideo.', hasAudio };
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return { valid: false, reason: 'Strumień wideo nie ma prawidłowych wymiarów.', hasAudio };
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { valid: false, reason: 'Plik nie ma prawidłowego czasu trwania.', hasAudio };
  }
  if (formatName && !/(^|,)(mov|mp4)(,|$)/i.test(formatName)) {
    return { valid: false, reason: 'Kontener pliku nie jest rozpoznany jako MP4.', hasAudio };
  }
  if (requireAudio && !hasAudio) {
    return { valid: false, reason: 'Plik nie zawiera wymaganego strumienia audio.', hasAudio };
  }

  return {
    valid: true,
    durationSeconds,
    width,
    height,
    hasAudio,
    probedSizeBytes: Number.isFinite(probedSizeBytes) && probedSizeBytes > 0 ? probedSizeBytes : undefined
  };
}

export async function validateMp4File(filePath: string): Promise<Mp4ValidationResult> {
  let stats: Awaited<ReturnType<typeof fs.lstat>>;
  try {
    stats = await fs.lstat(filePath);
  } catch {
    return { valid: false, reason: 'Plik MP4 nie istnieje.', hasAudio: false };
  }
  if (!stats.isFile()) return { valid: false, reason: 'Ścieżka MP4 nie wskazuje na zwykły plik.', hasAudio: false };

  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'stream=codec_type,width,height',
      '-show_entries', 'format=duration,size,format_name',
      '-of', 'json',
      filePath
    ], { timeout: 12_000, maxBuffer: 1024 * 1024 });
    return validateMp4ProbeOutput(stdout, stats.size);
  } catch (error) {
    const details = error && typeof error === 'object' && 'stderr' in error && typeof error.stderr === 'string'
      ? error.stderr.trim().slice(0, 240)
      : error instanceof Error ? error.message.slice(0, 240) : 'ffprobe nie mógł odczytać pliku.';
    return { valid: false, reason: details || 'ffprobe nie mógł odczytać pliku.', hasAudio: false };
  }
}
