export interface NarrationAudioSliceInput {
  startSeconds: number;
  audioDurationSeconds: number;
  outputDurationSeconds: number;
}

/**
 * Extract a scene from the one continuous TTS file.
 * Use the audio filter timeline instead of output-side -ss so seeking and
 * atrim cannot disagree about whether timestamps are relative to the source
 * or to the output. Reset PTS before padding each isolated scene.
 */
export function buildNarrationAudioSliceFilter(input: NarrationAudioSliceInput): string {
  const { startSeconds, audioDurationSeconds, outputDurationSeconds } = input;
  if (!Number.isFinite(startSeconds) || startSeconds < 0 ||
      !Number.isFinite(audioDurationSeconds) || audioDurationSeconds <= 0 ||
      !Number.isFinite(outputDurationSeconds) || outputDurationSeconds < audioDurationSeconds) {
    throw new Error('Nieprawidłowe parametry wycinania fragmentu ciągłej narracji.');
  }

  const paddingSeconds = outputDurationSeconds - audioDurationSeconds;
  const parts = [
    `atrim=start=${startSeconds.toFixed(4)}:duration=${audioDurationSeconds.toFixed(4)}`,
    'asetpts=PTS-STARTPTS'
  ];
  if (paddingSeconds > 0.0001) {
    parts.push(`apad=pad_dur=${paddingSeconds.toFixed(4)}`);
  }
  parts.push(`atrim=duration=${outputDurationSeconds.toFixed(4)}`);
  return parts.join(',');
}

export function isNarrationAudioSliceValid(input: {
  exists: boolean;
  sizeBytes: number;
  measuredDurationSeconds: number;
  expectedDurationSeconds: number;
}): boolean {
  if (!input.exists || !Number.isFinite(input.sizeBytes) || input.sizeBytes < 1000 ||
      !Number.isFinite(input.measuredDurationSeconds) || input.measuredDurationSeconds <= 0 ||
      !Number.isFinite(input.expectedDurationSeconds) || input.expectedDurationSeconds <= 0) {
    return false;
  }
  const durationTolerance = Math.max(0.08, input.expectedDurationSeconds * 0.02);
  return Math.abs(input.measuredDurationSeconds - input.expectedDurationSeconds) <= durationTolerance;
}
