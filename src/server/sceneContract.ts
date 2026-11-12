export const FINANCE_SHORT_SCENE_COUNT = 8;
export const MAX_SCENE_COUNT = 8;
export const TARGET_SHORT_DURATION_SECONDS = 23;
export const MAX_SHORT_DURATION_SECONDS = 28;
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
  return scenes.every((scene: any) => ['pexels', 'pixabay'].includes(scene?.source) && Number.isSafeInteger(scene?.pexelsId) && scene.pexelsId > 0 && (scene.source !== 'pixabay' || (Number.isSafeInteger(scene?.pixabayId) && typeof scene.pixabayId === 'number' && scene.pixabayId > 0 && scene.stockId === 'pixabay:' + scene.pixabayId))) &&
    new Set(ids).size === FINANCE_SHORT_SCENE_COUNT;
}

export function isSafeFinanceDataVisualSvg(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const svg = value.trim();
  return svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">') &&
    svg.endsWith('</svg>') &&
    !/(?:<\s*(?:script|foreignObject|image|iframe|style)\b|(?:href|xlink:href)\s*=|on[a-z]+\s*=|<!DOCTYPE|<!ENTITY)/i.test(svg) &&
    !/url\((?!#)/i.test(svg);
}

export function hasCompleteFinanceSceneVisualAssets(scenes: unknown): boolean {
  if (!Array.isArray(scenes) || scenes.length !== FINANCE_SHORT_SCENE_COUNT) return false;
  const pexelsIds: number[] = [];
  for (const scene of scenes as any[]) {
    if (scene?.visualMode === 'data_visual') {
      if (!isSafeFinanceDataVisualSvg(scene.visualSvg)) return false;
      continue;
    }
    if (!['pexels', 'pixabay'].includes(scene?.source) || !Number.isSafeInteger(scene?.pexelsId) || scene.pexelsId <= 0) return false;
    if (scene.source === 'pixabay' && (!Number.isSafeInteger(scene?.pixabayId) || typeof scene.pixabayId !== 'number' || scene.pixabayId <= 0 || scene.stockId !== 'pixabay:' + scene.pixabayId)) return false;
    pexelsIds.push(scene.pexelsId);
  }
  return new Set(pexelsIds).size === pexelsIds.length;
}

export function sceneDurationsForCount(sceneCount: number): number[] {
  if (!Number.isInteger(sceneCount) || sceneCount < 1 || sceneCount > MAX_SCENE_COUNT) {
    throw new Error(`Liczba scen musi być liczbą całkowitą od 1 do ${MAX_SCENE_COUNT}.`);
  }

  if (sceneCount === FINANCE_SHORT_SCENE_COUNT) {
    return Array.from({ length: FINANCE_SHORT_SCENE_COUNT }, () => TARGET_SHORT_DURATION_SECONDS / FINANCE_SHORT_SCENE_COUNT);
  }

  return Array.from({ length: sceneCount }, () => TARGET_SHORT_DURATION_SECONDS / sceneCount);
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

  baseSceneDurations.forEach((baseDuration, index) => {
    if (!Number.isFinite(baseDuration) || baseDuration <= 0) {
      throw new Error(`Nieprawidłowy budżet czasu sceny ${index + 1}.`);
    }
    const narrationDuration = narrationDurations[index];
    if (narrationDuration !== null && narrationDuration !== undefined &&
        (!Number.isFinite(narrationDuration) || narrationDuration <= 0)) {
      throw new Error(`Nieprawidłowa długość lektora sceny ${index + 1}.`);
    }
  });

  // First reserve enough time for every complete spoken segment. Only then
  // distribute the optional scene tails from the remaining global budget.
  // A fixed 0.12s per scene could add 0.96s to an eight-scene Short and push
  // a valid 27.9s narration past the agreed 28s cap.
  const durationsWithPaddingScale = (paddingScale: number) => baseSceneDurations.map((baseDuration, index) => {
    const narrationDuration = narrationDurations[index];
    if (narrationDuration === null || narrationDuration === undefined) return baseDuration;
    return Math.max(baseDuration, narrationDuration + narrationPaddingSeconds * paddingScale);
  });
  const totalDuration = (durations: number[]) => durations.reduce((sum, duration) => sum + duration, 0);
  const unpaddedDurations = durationsWithPaddingScale(0);
  const unpaddedTotal = totalDuration(unpaddedDurations);
  if (unpaddedTotal > maxTotalDurationSeconds + 0.001) {
    throw new Error(
      `Narracja wymaga łącznie ${unpaddedTotal.toFixed(2)} s bez dodatkowego zapasu scen. ` +
      `Maksymalny czas Shorta to ${maxTotalDurationSeconds.toFixed(0)} s. ` +
      'Lektor nie został przyspieszony ani ucięty. Skróć tekst scen i spróbuj ponownie.'
    );
  }

  const fullyPaddedDurations = durationsWithPaddingScale(1);
  if (totalDuration(fullyPaddedDurations) <= maxTotalDurationSeconds) return fullyPaddedDurations;

  // Find the largest uniform share of the requested per-scene padding that
  // fits. This preserves all speech while keeping the concatenated video cap.
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 48; iteration++) {
    const midpoint = (low + high) / 2;
    if (totalDuration(durationsWithPaddingScale(midpoint)) <= maxTotalDurationSeconds) {
      low = midpoint;
    } else {
      high = midpoint;
    }
  }
  return durationsWithPaddingScale(low);
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
