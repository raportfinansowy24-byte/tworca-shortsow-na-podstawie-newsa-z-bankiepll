export const FINANCE_SHORT_SCENE_COUNT = 8;
export const MAX_SCENE_COUNT = 8;
export const MAX_SHORT_DURATION_SECONDS = 30;
export const SCENE_NARRATION_PADDING_SECONDS = 0.12;

export function getSceneCountError(expectedSceneCount: unknown, actualSceneCount: number): string | null {
  if (!Number.isInteger(expectedSceneCount) || (expectedSceneCount as number) < 1 || (expectedSceneCount as number) > MAX_SCENE_COUNT) {
    return `expectedSceneCount musi być liczbą całkowitą od 1 do ${MAX_SCENE_COUNT}.`;
  }

  const expected = expectedSceneCount as number;
  if (actualSceneCount !== expected) {
    return `Oczekiwano ${expected} scen, otrzymano ${actualSceneCount}. Brakujące sceny nie są kopiowane; popraw scenariusz i wyślij go ponownie.`;
  }

  return null;
}

export function hasUniquePexelsSceneIds(scenes: unknown): boolean {
  if (!Array.isArray(scenes) || scenes.length !== FINANCE_SHORT_SCENE_COUNT) return false;
  const ids = scenes.map((scene: any) => scene?.pexelsId);
  return scenes.every((scene: any) => scene?.source === 'pexels' && Number.isSafeInteger(scene?.pexelsId)) &&
    new Set(ids).size === FINANCE_SHORT_SCENE_COUNT;
}

export function sceneDurationsForCount(sceneCount: number): number[] {
  if (!Number.isInteger(sceneCount) || sceneCount < 1 || sceneCount > MAX_SCENE_COUNT) {
    throw new Error(`Liczba scen musi być liczbą całkowitą od 1 do ${MAX_SCENE_COUNT}.`);
  }

  if (sceneCount === FINANCE_SHORT_SCENE_COUNT) {
    return [2, 2, 2, 2, 2.5, 2.5, 2.5, 2.5];
  }

  return Array.from({ length: sceneCount }, () => 18 / sceneCount);
}

/**
 * Extend each scene just enough to contain its natural TTS audio.
 * This preserves the selected ElevenLabs speed and prevents FFmpeg from
 * truncating narration. The total video remains bounded.
 */
export function sceneDurationsWithNarration(
  baseSceneDurations: number[],
  narrationDurations: Array<number | null | undefined>,
  maxTotalDurationSeconds = MAX_SHORT_DURATION_SECONDS,
  narrationPaddingSeconds = SCENE_NARRATION_PADDING_SECONDS
): number[] {
  if (!Array.isArray(baseSceneDurations) || baseSceneDurations.length === 0 ||
      !Array.isArray(narrationDurations) || narrationDurations.length !== baseSceneDurations.length) {
    throw new Error('Budżety scen i długości narracji muszą zawierać tyle samo elementów.');
  }
  if (!Number.isFinite(maxTotalDurationSeconds) || maxTotalDurationSeconds <= 0 ||
      !Number.isFinite(narrationPaddingSeconds) || narrationPaddingSeconds < 0) {
    throw new Error('Nieprawidłowa konfiguracja limitu czasu Shorta.');
  }

  const durations = baseSceneDurations.map((baseDuration, index) => {
    if (!Number.isFinite(baseDuration) || baseDuration <= 0) {
      throw new Error(`Nieprawidłowy budżet czasu sceny ${index + 1}.`);
    }
    const narrationDuration = narrationDurations[index];
    if (narrationDuration === null || narrationDuration === undefined) return baseDuration;
    if (!Number.isFinite(narrationDuration) || narrationDuration <= 0) {
      throw new Error(`Nieprawidłowa długość lektora sceny ${index + 1}.`);
    }
    return Math.max(baseDuration, narrationDuration + narrationPaddingSeconds);
  });

  const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
  if (totalDuration > maxTotalDurationSeconds + 0.001) {
    throw new Error(
      `Narracja wymaga łącznie ${totalDuration.toFixed(2)} s. Maksymalny czas Shorta to ${maxTotalDurationSeconds.toFixed(0)} s. ` +
      'Lektor nie został przyspieszony ani ucięty. Skróć tekst scen i spróbuj ponownie.'
    );
  }

  return durations;
}

export function sceneRequestMetadata(sourceValue: unknown, requestIdValue: unknown, fallbackSource: string) {
  const source = typeof sourceValue === 'string' && /^[a-zA-Z0-9._-]{1,48}$/.test(sourceValue)
    ? sourceValue
    : fallbackSource;
  const requestId = typeof requestIdValue === 'string' && /^[a-zA-Z0-9._-]{1,80}$/.test(requestIdValue)
    ? requestIdValue
    : `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return { source, requestId };
}
