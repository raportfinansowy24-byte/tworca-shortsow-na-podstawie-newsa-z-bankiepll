export const GEMINI_PRIMARY_MODEL = 'gemini-4-hydrogen';

export const GEMINI_DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash-lite';

export function getGeminiFallbackModels(env: Record<string, string | undefined> = process.env): string[] {
  const configured = env.GEMINI_FALLBACK_MODEL?.trim();
  if (!configured || configured.toLowerCase() === 'default') return [GEMINI_DEFAULT_FALLBACK_MODEL];
  if (configured.toLowerCase() === 'off') return [];
  const models = [...new Set(configured.split(',').map((model) => model.trim()).filter(Boolean))];
  if (models.some((model) => !/^[a-z0-9][a-z0-9.-]{0,99}$/u.test(model))) {
    throw new Error('GEMINI_FALLBACK_MODEL contains an invalid model identifier.');
  }
  return models.filter((model) => model !== GEMINI_PRIMARY_MODEL);
}

export type GeminiApiKeyName =
  | 'GEMINI_API_KEY'
  | `GEMINI_API_KEY_${1 | 2 | 3 | 4 | 5 | 6 | 7}`;

export interface GeminiApiKey {
  name: GeminiApiKeyName;
  apiKey: string;
}

type GeminiEnvironment = Record<string, string | undefined>;

export function getGeminiApiKeys(env: GeminiEnvironment = process.env): GeminiApiKey[] {
  // Prefer the explicitly numbered pool; retain the old unnumbered secret as a legacy fallback.
  const names: GeminiApiKeyName[] = [
    'GEMINI_API_KEY_1',
    'GEMINI_API_KEY_2',
    'GEMINI_API_KEY_3',
    'GEMINI_API_KEY_4',
    'GEMINI_API_KEY_5',
    'GEMINI_API_KEY_6',
    'GEMINI_API_KEY_7',
    'GEMINI_API_KEY'
  ];
  const seen = new Set<string>();
  return names.flatMap((name) => {
    const apiKey = env[name]?.trim();
    if (!apiKey || seen.has(apiKey)) return [];
    seen.add(apiKey);
    return [{ name, apiKey }];
  });
}

// Rotate the first key on every Gemini request. The production request budget is
// shorter than the worst-case time needed to probe all seven keys sequentially,
// so a fixed key order would repeatedly favour GEMINI_API_KEY_1 and starve later keys.
let geminiApiKeyRotationCursor = 0;

export function getRotatedGeminiApiKeys(keys: GeminiApiKey[]): GeminiApiKey[] {
  if (keys.length <= 1) return [...keys];
  const start = geminiApiKeyRotationCursor % keys.length;
  geminiApiKeyRotationCursor = (start + 1) % keys.length;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

export function shouldRotateGeminiKey(error: unknown): boolean {
  const value = error && typeof error === 'object' ? error as {
    status?: unknown;
    response?: { status?: unknown };
  } : {};
  const status = [value.status, value.response?.status]
    .map((item) => Number(item))
    .find((item) => Number.isInteger(item) && item > 0);
  if (status && [401, 403, 408, 429, 500, 502, 503, 504].includes(status)) return true;

  const errorName = error && typeof error === 'object' && 'name' in error ? String((error as { name?: unknown }).name ?? '') : '';
  const message = error instanceof Error ? error.message : String(error);
  // Gemini's HTTP timeout is surfaced by Node fetch as AbortError. Treat it as
  // transient so key rotation/model fallback can continue within the request budget.
  if (errorName === 'AbortError' || /\b(?:AbortError|aborted|operation was aborted|request timed out)\b/i.test(message)) return true;
  return /\b(?:401|403|408|429|500|502|503|504)\b/i.test(message) ||
    /\b(?:RESOURCE_EXHAUSTED|PERMISSION_DENIED|UNAUTHENTICATED|UNAVAILABLE|INTERNAL|API_KEY_INVALID|API_KEY_SERVICE_BLOCKED|API key (?:is )?not valid|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|fetch failed|network error|timed? ?out)\b/i.test(message);
}

export async function withGeminiKeyRotation<T>(params: {
  keys: GeminiApiKey[];
  operation: (apiKey: string, keyName: GeminiApiKey['name'], remainingKeys: number) => Promise<T>;
  onKeyFailure?: (keyName: GeminiApiKey['name'], error: Error) => void;
}): Promise<{ result: T; keyName: GeminiApiKey['name'] }> {
  if (params.keys.length === 0) {
    throw new Error('Brak kluczy Gemini. Ustaw co najmniej jeden sekret GEMINI_API_KEY_1–GEMINI_API_KEY_7 (lub starszy GEMINI_API_KEY).');
  }

  const failures: string[] = [];
  let lastError: Error | null = null;
  for (let index = 0; index < params.keys.length; index++) {
    const key = params.keys[index];
    try {
      const result = await params.operation(key.apiKey, key.name, params.keys.length - index);
      return { result, keyName: key.name };
    } catch (cause) {
      lastError = cause instanceof Error ? cause : new Error(String(cause));
      params.onKeyFailure?.(key.name, lastError);
      failures.push(key.name + ': ' + lastError.message.slice(0, 240));
      if (!shouldRotateGeminiKey(lastError)) break;
    }
  }

  const failure = new Error('Gemini 4 Hydrogen nie zadziałał na dostępnych kluczach: ' + failures.join(' | '));
  (failure as Error & { cause?: unknown }).cause = lastError;
  throw failure;
}


export interface GeminiRoutedResult<T> {
  result: T;
  keyName: GeminiApiKey['name'];
  modelName: string;
}

/**
 * Try the primary Gemini model across the configured API key pool. If it is
 * unavailable/rate-limited, try lower-cost fallback models with the same keys.
 * Validation errors (HTTP 400) are not hidden by retrying a different model.
 */
export async function withGeminiModelFallback<T>(params: {
  keys: GeminiApiKey[];
  primaryModel?: string;
  fallbackModels?: string[];
  operation: (modelName: string, apiKey: string, keyName: GeminiApiKey['name'], attemptsRemaining: number) => Promise<T>;
  /** Limit key probes per model so fallback models receive time within the same request deadline. */
  maxKeysPerModel?: number;
  /** Hard cap across primary and fallback models for predictable request budgets. */
  maxTotalAttempts?: number;
  onKeyFailure?: (modelName: string, keyName: GeminiApiKey['name'], error: Error) => void;
  onModelFallback?: (primaryModel: string, fallbackModel: string, keyName: GeminiApiKey['name']) => void;
}): Promise<GeminiRoutedResult<T>> {
  const primaryModel = params.primaryModel || GEMINI_PRIMARY_MODEL;
  const models = [...new Set([primaryModel, ...(params.fallbackModels || [])].filter(Boolean))];
  if (models.length === 0) throw new Error('No Gemini models are configured.');
  if (params.keys.length === 0) {
    throw new Error('Brak kluczy Gemini. Ustaw co najmniej jeden sekret GEMINI_API_KEY_1–GEMINI_API_KEY_7 (lub starszy GEMINI_API_KEY).');
  }

  const failures: string[] = [];
  let lastError: Error | null = null;
  const maxKeysPerModel = Math.min(params.keys.length, Math.max(1, Math.floor(params.maxKeysPerModel ?? params.keys.length)));
  const maxTotalAttempts = Number.isFinite(params.maxTotalAttempts)
    ? Math.max(1, Math.floor(params.maxTotalAttempts!))
    : models.length * maxKeysPerModel;
  let attemptsUsed = 0;
  for (let index = 0; index < models.length && attemptsUsed < maxTotalAttempts; index++) {
    const modelName = models[index];
    const modelKeys = params.keys.slice(0, Math.min(maxKeysPerModel, maxTotalAttempts - attemptsUsed));
    const futureAttempts = Math.min((models.length - index - 1) * maxKeysPerModel, maxTotalAttempts - attemptsUsed - modelKeys.length);
    let attemptsInModel = 0;
    try {
      const routed = await withGeminiKeyRotation({
        keys: modelKeys,
        operation: (apiKey, keyName, remainingKeys) => {
          attemptsInModel += 1;
          return params.operation(modelName, apiKey, keyName, futureAttempts + remainingKeys);
        },
        onKeyFailure: (keyName, error) => params.onKeyFailure?.(modelName, keyName, error)
      });
      if (modelName !== primaryModel) params.onModelFallback?.(primaryModel, modelName, routed.keyName);
      return { ...routed, modelName };
    } catch (cause) {
      lastError = cause instanceof Error ? cause : new Error(String(cause));
      failures.push(modelName + ': ' + lastError.message.slice(0, 500));
      attemptsUsed += attemptsInModel;
      if (index === models.length - 1 || attemptsUsed >= maxTotalAttempts || !shouldRotateGeminiKey(lastError)) break;
    }
  }

  const failure = new Error('Nie udało się uruchomić żadnego skonfigurowanego modelu Gemini: ' + failures.join(' | '));
  (failure as Error & { cause?: unknown }).cause = lastError;
  throw failure;
}
