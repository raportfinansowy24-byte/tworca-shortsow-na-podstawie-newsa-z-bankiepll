export const DEFAULT_SECONDS_PER_SPEECH_UNIT = 0.4;
export const MAX_NARRATION_CALIBRATION_SAMPLES = 80;

export type NarrationCalibrationStore = {
  version: 1;
  profiles: Record<string, number[]>;
};

export type NarrationCalibrationSample = {
  text: string;
  durationSeconds: number;
  speed: number;
};

export type NarrationFitRevisionInput = {
  sceneTexts: string[];
  estimatedSceneDurations: number[];
  totalEstimatedDurationSeconds: number;
  targetDurationSeconds: number;
  maxTotalDurationSeconds: number;
  attemptNumber: number;
};

export type NarrationFitResult = {
  sceneTexts: string[];
  estimatedNarrationDurations: number[];
  estimatedSceneDurations: number[];
  totalEstimatedDurationSeconds: number;
  revisionAttempts: number;
  reachedTargetDuration: boolean;
};

export function countNarrationSpeechUnits(text: string): number {
  const normalized = String(text || '').trim();
  if (!normalized) return 0;
  const words = normalized.split(/\s+/u).filter(Boolean).length;
  const pauses = (normalized.match(/[,;:]/gu) || []).length * 0.18;
  const sentenceEnds = (normalized.match(/[.!?…]+(?=\s|$)/gu) || []).length * 0.32;
  return words + pauses + sentenceEnds;
}

export function getNarrationCalibrationProfileKey(input: {
  language: string;
  voiceId: string;
  modelId: string;
}): string {
  return [input.language, input.voiceId, input.modelId]
    .map((value) => String(value || '').trim().toLowerCase())
    .join('|');
}

export function emptyNarrationCalibrationStore(): NarrationCalibrationStore {
  return { version: 1, profiles: {} };
}

export function parseNarrationCalibrationStore(value: unknown): NarrationCalibrationStore {
  if (!value || typeof value !== 'object') return emptyNarrationCalibrationStore();
  const candidate = value as { version?: unknown; profiles?: unknown };
  if (candidate.version !== 1 || !candidate.profiles || typeof candidate.profiles !== 'object' || Array.isArray(candidate.profiles)) {
    return emptyNarrationCalibrationStore();
  }
  const profiles: Record<string, number[]> = {};
  for (const [key, rawSamples] of Object.entries(candidate.profiles as Record<string, unknown>)) {
    if (!Array.isArray(rawSamples)) continue;
    const samples = rawSamples.filter((sample): sample is number =>
      typeof sample === 'number' && Number.isFinite(sample) && sample >= 0.18 && sample <= 1.2
    ).slice(-MAX_NARRATION_CALIBRATION_SAMPLES);
    if (samples.length) profiles[key] = samples;
  }
  return { version: 1, profiles };
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function getCalibratedSecondsPerSpeechUnit(
  store: NarrationCalibrationStore,
  profileKey: string
): number {
  const samples = store.profiles[profileKey] || [];
  if (samples.length >= 3) return median(samples.slice(-MAX_NARRATION_CALIBRATION_SAMPLES));
  if (samples.length > 0) {
    const observed = median(samples);
    const confidence = samples.length / 5;
    return DEFAULT_SECONDS_PER_SPEECH_UNIT * (1 - confidence) + observed * confidence;
  }
  return DEFAULT_SECONDS_PER_SPEECH_UNIT;
}

export function recordNarrationCalibrationSamples(
  store: NarrationCalibrationStore,
  profileKey: string,
  samples: NarrationCalibrationSample[]
): NarrationCalibrationStore {
  const next = parseNarrationCalibrationStore(store);
  const profileSamples = [...(next.profiles[profileKey] || [])];
  for (const sample of samples) {
    const speechUnits = countNarrationSpeechUnits(sample.text);
    const speed = Number.isFinite(sample.speed) && sample.speed > 0 ? Math.min(1.2, Math.max(0.7, sample.speed)) : 1;
    if (!Number.isFinite(sample.durationSeconds) || sample.durationSeconds <= 0 || speechUnits <= 0) continue;
    const secondsPerUnit = sample.durationSeconds * speed / speechUnits;
    if (Number.isFinite(secondsPerUnit) && secondsPerUnit >= 0.18 && secondsPerUnit <= 1.2) {
      profileSamples.push(secondsPerUnit);
    }
  }
  next.profiles[profileKey] = profileSamples.slice(-MAX_NARRATION_CALIBRATION_SAMPLES);
  return next;
}

export function estimateNarrationDurationSeconds(
  text: string,
  secondsPerSpeechUnit = DEFAULT_SECONDS_PER_SPEECH_UNIT,
  speed = 1
): number {
  if (!Number.isFinite(secondsPerSpeechUnit) || secondsPerSpeechUnit <= 0) {
    throw new Error('Nieprawidłowa kalibracja tempa narracji.');
  }
  if (!Number.isFinite(speed) || speed <= 0) throw new Error('Nieprawidłowe tempo TTS.');
  const speechUnits = countNarrationSpeechUnits(text);
  if (speechUnits <= 0) return 0;
  return speechUnits * secondsPerSpeechUnit / Math.min(1.2, Math.max(0.7, speed));
}

function numericTokens(text: string): string[] {
  return (String(text || '').match(/\d+(?:[.,]\d+)?/gu) || []).map((token) => token.replace(',', '.'));
}

function preservesNumericFacts(originalText: string, revisedText: string): boolean {
  const remaining = new Map<string, number>();
  for (const token of numericTokens(revisedText)) remaining.set(token, (remaining.get(token) || 0) + 1);
  for (const token of numericTokens(originalText)) {
    const count = remaining.get(token) || 0;
    if (count <= 0) return false;
    remaining.set(token, count - 1);
  }
  return true;
}

export async function fitNarrationBeforeTts(input: {
  sceneTexts: string[];
  baseSceneDurations: number[];
  secondsPerSpeechUnit: number;
  speed: number;
  targetDurationSeconds: number;
  maxTotalDurationSeconds: number;
  narrationPaddingSeconds?: number;
  maxRevisionAttempts?: number;
  revise?: (revision: NarrationFitRevisionInput) => Promise<readonly string[] | null>;
}): Promise<NarrationFitResult> {
  const {
    sceneTexts,
    baseSceneDurations,
    secondsPerSpeechUnit,
    speed,
    targetDurationSeconds,
    maxTotalDurationSeconds,
    narrationPaddingSeconds = 0.12
  } = input;
  if (!Array.isArray(sceneTexts) || sceneTexts.length === 0 || sceneTexts.some((text) => typeof text !== 'string' || !text.trim())) {
    throw new Error('Każda scena musi zawierać tekst lektora przed estymacją TTS.');
  }
  if (!Array.isArray(baseSceneDurations) || baseSceneDurations.length !== sceneTexts.length ||
      baseSceneDurations.some((duration) => !Number.isFinite(duration) || duration <= 0)) {
    throw new Error('Budżety scen i teksty narracji muszą zawierać tyle samo poprawnych elementów.');
  }
  if (!Number.isFinite(targetDurationSeconds) || targetDurationSeconds <= 0 ||
      !Number.isFinite(maxTotalDurationSeconds) || maxTotalDurationSeconds < targetDurationSeconds ||
      !Number.isFinite(narrationPaddingSeconds) || narrationPaddingSeconds < 0) {
    throw new Error('Nieprawidłowa konfiguracja limitów estymacji narracji.');
  }

  const maxRevisionAttempts = Math.min(2, Math.max(0, Math.floor(input.maxRevisionAttempts ?? 2)));
  let currentTexts = [...sceneTexts];
  let revisionAttempts = 0;

  const calculate = () => {
    const estimatedNarrationDurations = currentTexts.map((text) =>
      estimateNarrationDurationSeconds(text, secondsPerSpeechUnit, speed)
    );
    const estimatedSceneDurations = estimatedNarrationDurations.map((duration, index) =>
      Math.max(baseSceneDurations[index], duration + narrationPaddingSeconds)
    );
    const totalEstimatedDurationSeconds = estimatedSceneDurations.reduce((sum, duration) => sum + duration, 0);
    return { estimatedNarrationDurations, estimatedSceneDurations, totalEstimatedDurationSeconds };
  };

  let estimate = calculate();
  while (estimate.totalEstimatedDurationSeconds > targetDurationSeconds + 0.001 &&
         revisionAttempts < maxRevisionAttempts && input.revise) {
    revisionAttempts++;
    const revised = await input.revise({
      sceneTexts: [...currentTexts],
      estimatedSceneDurations: [...estimate.estimatedSceneDurations],
      totalEstimatedDurationSeconds: estimate.totalEstimatedDurationSeconds,
      targetDurationSeconds,
      maxTotalDurationSeconds,
      attemptNumber: revisionAttempts
    });
    if (!revised) break;
    if (revised.length !== currentTexts.length) {
      throw new Error('Korekta narracji zwróciła nieprawidłową liczbę scen.');
    }
    const candidateTexts = revised.map((text, index) => {
      if (typeof text !== 'string' || !text.trim()) throw new Error(`Korekta narracji pozostawiła pustą scenę ${index + 1}.`);
      if (index === currentTexts.length - 1 && text.trim() !== currentTexts[index].trim()) {
        throw new Error('Korekta narracji nie może zmieniać końcowego CTA.');
      }
      if (!preservesNumericFacts(currentTexts[index], text)) {
        throw new Error(`Korekta narracji zmieniła lub usunęła wartość liczbową w scenie ${index + 1}; zmiana została odrzucona.`);
      }
      if (countNarrationSpeechUnits(text) > countNarrationSpeechUnits(currentTexts[index]) + 0.001) {
        throw new Error(`Korekta narracji zwiększyła długość sceny ${index + 1}; zmiana została odrzucona.`);
      }
      return text.trim();
    });
    if (candidateTexts.every((text, index) => text === currentTexts[index].trim())) break;
    currentTexts = candidateTexts;
    estimate = calculate();
  }

  if (estimate.totalEstimatedDurationSeconds > maxTotalDurationSeconds + 0.001) {
    throw new Error(
      `Szacowana narracja wymaga ${estimate.totalEstimatedDurationSeconds.toFixed(2)} s po ${revisionAttempts} próbach korekty. ` +
      `Twardy limit to ${maxTotalDurationSeconds.toFixed(0)} s. TTS nie został uruchomiony; skróć tekst i spróbuj ponownie.`
    );
  }

  return {
    sceneTexts: currentTexts,
    ...estimate,
    revisionAttempts,
    reachedTargetDuration: estimate.totalEstimatedDurationSeconds <= targetDurationSeconds + 0.001
  };
}
