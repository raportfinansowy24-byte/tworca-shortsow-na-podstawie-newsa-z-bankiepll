export interface ContinuousNarrationMuxOptions {
  mergedVideoPath: string;
  fullNarrationPath: string;
  backgroundMusicPath?: string | null;
  backgroundMusicVolume?: number;
  durationSeconds: number;
  outputPath: string;
}

/**
 * Scene concat contains only scene sound effects (or silent AAC), never voiceover.
 * This final mux adds exactly one untouched full-short TTS file after concat.
 */
export function buildContinuousNarrationMuxArgs(options: ContinuousNarrationMuxOptions): string[] {
  const {
    mergedVideoPath,
    fullNarrationPath,
    backgroundMusicPath = null,
    backgroundMusicVolume = 0.2,
    durationSeconds,
    outputPath
  } = options;

  if (!mergedVideoPath || !fullNarrationPath || !outputPath ||
      !Number.isFinite(durationSeconds) || durationSeconds <= 0 ||
      !Number.isFinite(backgroundMusicVolume)) {
    throw new Error('Nieprawidłowe parametry końcowego miksowania ciągłego lektora.');
  }

  const musicVolume = Math.max(0, Math.min(1, backgroundMusicVolume));
  const duration = durationSeconds.toFixed(3);
  const args = ['-y', '-i', mergedVideoPath, '-i', fullNarrationPath];
  const filter = [
    '[0:a]volume=1.0[scene_sfx]',
    `[1:a]volume=1.0,apad,atrim=duration=${duration}[full_voice]`
  ];

  if (backgroundMusicPath) {
    args.push('-i', backgroundMusicPath);
    filter.push(
      `[2:a]volume=${musicVolume.toFixed(3)},apad,atrim=duration=${duration}[music]`,
      '[scene_sfx][full_voice][music]amix=inputs=3:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95[aout]'
    );
  } else {
    filter.push(
      '[scene_sfx][full_voice]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95[aout]'
    );
  }

  return [
    ...args,
    '-filter_complex', filter.join(';'),
    '-map', '0:v',
    '-map', '[aout]',
    '-t', duration,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    outputPath
  ];
}
