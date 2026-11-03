export const SCENE_TTS_CONCURRENCY = 2;

export const FAST_H264_OPTIONS = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p'] as const;

export type FfmpegProbe = {
  streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
  format?: { duration?: string | number };
};

export async function mapWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  const limit = Math.max(1, Math.min(items.length, Math.floor(concurrency) || 1));
  let nextIndex = 0;
  let failed = false;
  let failure: unknown;

  const runWorker = async (): Promise<void> => {
    while (!failed) {
      const index = nextIndex++;
      if (index >= items.length) return;
      try {
        await worker(items[index], index);
      } catch (error) {
        if (!failed) {
          failed = true;
          failure = error;
        }
        return;
      }
    }
  };

  await Promise.all(Array.from({ length: limit }, () => runWorker()));
  if (failed) throw failure;
}

export function buildConcatArgs(listPath: string, outputPath: string, streamCopy: boolean): string[] {
  const inputArgs = ['-y', '-f', 'concat', '-safe', '0', '-i', listPath];
  if (streamCopy) return [...inputArgs, '-c', 'copy', '-movflags', '+faststart', outputPath];
  return [...inputArgs, ...FAST_H264_OPTIONS, '-c:a', 'aac', '-movflags', '+faststart', outputPath];
}

export function isValidConcatenatedVideo(
  probe: FfmpegProbe,
  expectedWidth: number,
  expectedHeight: number,
  requireAudio: boolean,
  maxDurationSeconds: number
): boolean {
  const video = probe.streams?.find((stream) => stream.codec_type === 'video');
  const hasAudio = Boolean(probe.streams?.some((stream) => stream.codec_type === 'audio'));
  const duration = Number(probe.format?.duration);
  return Boolean(
    video && video.width === expectedWidth && video.height === expectedHeight &&
    (!requireAudio || hasAudio) && Number.isFinite(duration) && duration > 0 &&
    duration <= maxDurationSeconds + 0.25
  );
}
