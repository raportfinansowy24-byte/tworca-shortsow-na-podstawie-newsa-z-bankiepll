export const FINANCE_SHORT_SCENE_COUNT = 8;
export const MAX_SCENE_COUNT = 8;

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

export function sceneRequestMetadata(sourceValue: unknown, requestIdValue: unknown, fallbackSource: string) {
  const source = typeof sourceValue === 'string' && /^[a-zA-Z0-9._-]{1,48}$/.test(sourceValue)
    ? sourceValue
    : fallbackSource;
  const requestId = typeof requestIdValue === 'string' && /^[a-zA-Z0-9._-]{1,80}$/.test(requestIdValue)
    ? requestIdValue
    : `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return { source, requestId };
}
