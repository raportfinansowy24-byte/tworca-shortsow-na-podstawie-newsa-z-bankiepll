import assert from 'node:assert/strict';
import {
  GEMINI_PRIMARY_MODEL,
  getGeminiApiKeys,
  shouldRotateGeminiKey,
  withGeminiKeyRotation
} from '../src/server/modelRouting';

assert.equal(GEMINI_PRIMARY_MODEL, 'gemini-4-hydrogen');

const sevenKeyEnvironment = Object.fromEntries(
  Array.from({ length: 7 }, (_, index) => [`GEMINI_API_KEY_${index + 1}`, `key-${index + 1}`])
) as Record<string, string>;
const keys = getGeminiApiKeys({
  ...sevenKeyEnvironment,
  GEMINI_API_KEY: 'legacy-key'
});
assert.deepEqual(keys.map((key) => key.name), [
  'GEMINI_API_KEY_1',
  'GEMINI_API_KEY_2',
  'GEMINI_API_KEY_3',
  'GEMINI_API_KEY_4',
  'GEMINI_API_KEY_5',
  'GEMINI_API_KEY_6',
  'GEMINI_API_KEY_7',
  'GEMINI_API_KEY'
]);
assert.deepEqual(keys.map((key) => key.apiKey), [
  'key-1', 'key-2', 'key-3', 'key-4', 'key-5', 'key-6', 'key-7', 'legacy-key'
]);
assert.equal(getGeminiApiKeys({ GEMINI_API_KEY_1: 'same', GEMINI_API_KEY_2: 'same' }).length, 1);
assert.equal(getGeminiApiKeys({ GEMINI_API_KEY: 'legacy-only' })[0]?.name, 'GEMINI_API_KEY');
assert.equal(getGeminiApiKeys({}).length, 0);

assert.equal(shouldRotateGeminiKey(new Error('HTTP 429 RESOURCE_EXHAUSTED')), true);
assert.equal(shouldRotateGeminiKey(new Error('HTTP 503 UNAVAILABLE')), true);
assert.equal(shouldRotateGeminiKey(new Error('HTTP 401 API key invalid')), true);
assert.equal(shouldRotateGeminiKey(new Error('HTTP 400 API_KEY_INVALID')), true);
assert.equal(shouldRotateGeminiKey(new Error('HTTP 400 invalid response schema')), false);
assert.equal(shouldRotateGeminiKey(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })), true);
assert.equal(shouldRotateGeminiKey(new Error('AbortError: This operation was aborted')), true);

const calls: string[] = [];
const failover = await withGeminiKeyRotation({
  keys,
  operation: async (apiKey, keyName) => {
    calls.push(keyName);
    if (apiKey !== 'key-7') throw new Error('HTTP 429 RESOURCE_EXHAUSTED');
    return 'Hydrogen response';
  }
});
assert.deepEqual(calls, [
  'GEMINI_API_KEY_1', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3', 'GEMINI_API_KEY_4',
  'GEMINI_API_KEY_5', 'GEMINI_API_KEY_6', 'GEMINI_API_KEY_7'
]);
assert.equal(failover.result, 'Hydrogen response');
assert.equal(failover.keyName, 'GEMINI_API_KEY_7');

const fallbackKeys = [
  { name: 'GEMINI_API_KEY_1' as const, apiKey: 'primary-one' },
  { name: 'GEMINI_API_KEY_2' as const, apiKey: 'primary-two' }
];

const timeoutFailoverCalls: string[] = [];
const timeoutFailover = await withGeminiKeyRotation({
  keys: fallbackKeys,
  operation: async (apiKey, keyName) => {
    timeoutFailoverCalls.push(keyName);
    if (apiKey === 'primary-one') throw Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
    return 'Recovered after timeout';
  }
});
assert.deepEqual(timeoutFailoverCalls, ['GEMINI_API_KEY_1', 'GEMINI_API_KEY_2']);
assert.equal(timeoutFailover.result, 'Recovered after timeout');
assert.equal(timeoutFailover.keyName, 'GEMINI_API_KEY_2');

const nonRetryableCalls: string[] = [];
await assert.rejects(() => withGeminiKeyRotation({
  keys,
  operation: async (_apiKey, keyName) => {
    nonRetryableCalls.push(keyName);
    throw new Error('HTTP 400 invalid response schema');
  }
}), /HTTP 400/);
assert.deepEqual(nonRetryableCalls, ['GEMINI_API_KEY_1'], '400 validation errors should not be retried with other keys');

await assert.rejects(() => withGeminiKeyRotation({
  keys: [],
  operation: async () => 'unused'
}), /Brak kluczy Gemini/);

console.log('Gemini Hydrogen model routing tests passed');

const {
  GEMINI_DEFAULT_FALLBACK_MODEL,
  getGeminiFallbackModels,
  withGeminiModelFallback
} = await import('../src/server/modelRouting');

assert.deepEqual(getGeminiFallbackModels({} as NodeJS.ProcessEnv), [GEMINI_DEFAULT_FALLBACK_MODEL]);
assert.deepEqual(getGeminiFallbackModels({ GEMINI_FALLBACK_MODEL: 'off' } as NodeJS.ProcessEnv), []);
assert.deepEqual(getGeminiFallbackModels({ GEMINI_FALLBACK_MODEL: 'gemini-3.5-flash-lite' } as NodeJS.ProcessEnv), ['gemini-3.5-flash-lite']);
assert.throws(() => getGeminiFallbackModels({ GEMINI_FALLBACK_MODEL: '../invalid' } as NodeJS.ProcessEnv), /invalid model identifier/);

const routedCalls: string[] = [];
const fallbackEvents: Array<{ from: string; to: string; key: string }> = [];
const routed = await withGeminiModelFallback({
  keys: fallbackKeys,
  primaryModel: GEMINI_PRIMARY_MODEL,
  fallbackModels: [GEMINI_DEFAULT_FALLBACK_MODEL],
  operation: async (modelName, apiKey, keyName) => {
    routedCalls.push(modelName + ':' + keyName);
    if (modelName === GEMINI_PRIMARY_MODEL) throw new Error('HTTP 503 UNAVAILABLE');
    if (apiKey !== 'primary-two') throw new Error('HTTP 429 RESOURCE_EXHAUSTED');
    return 'fallback response';
  },
  onModelFallback: (from, to, keyName) => fallbackEvents.push({ from, to, key: keyName })
});
assert.deepEqual(routedCalls, [
  GEMINI_PRIMARY_MODEL + ':GEMINI_API_KEY_1',
  GEMINI_PRIMARY_MODEL + ':GEMINI_API_KEY_2',
  GEMINI_DEFAULT_FALLBACK_MODEL + ':GEMINI_API_KEY_1',
  GEMINI_DEFAULT_FALLBACK_MODEL + ':GEMINI_API_KEY_2'
], 'all Hydrogen keys are exhausted before a fallback model is tried');
assert.equal(routed.result, 'fallback response');
assert.equal(routed.modelName, GEMINI_DEFAULT_FALLBACK_MODEL);
assert.equal(routed.keyName, 'GEMINI_API_KEY_2');

const timeoutModelFallbackCalls: string[] = [];
const timeoutModelFallback = await withGeminiModelFallback({
  keys: [{ name: 'GEMINI_API_KEY_1', apiKey: 'timeout-key' }],
  primaryModel: GEMINI_PRIMARY_MODEL,
  fallbackModels: [GEMINI_DEFAULT_FALLBACK_MODEL],
  operation: async (modelName) => {
    timeoutModelFallbackCalls.push(modelName);
    if (modelName === GEMINI_PRIMARY_MODEL) throw Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
    return 'Recovered on fallback model';
  }
});
assert.deepEqual(timeoutModelFallbackCalls, [GEMINI_PRIMARY_MODEL, GEMINI_DEFAULT_FALLBACK_MODEL]);
assert.equal(timeoutModelFallback.result, 'Recovered on fallback model');
assert.equal(timeoutModelFallback.modelName, GEMINI_DEFAULT_FALLBACK_MODEL);
assert.deepEqual(fallbackEvents, [{
  from: GEMINI_PRIMARY_MODEL,
  to: GEMINI_DEFAULT_FALLBACK_MODEL,
  key: 'GEMINI_API_KEY_2'
}]);

const validationCalls: string[] = [];
await assert.rejects(() => withGeminiModelFallback({
  keys: fallbackKeys,
  primaryModel: GEMINI_PRIMARY_MODEL,
  fallbackModels: [GEMINI_DEFAULT_FALLBACK_MODEL],
  operation: async (modelName) => {
    validationCalls.push(modelName);
    throw new Error('HTTP 400 invalid response schema');
  }
}), /HTTP 400 invalid response schema/);
assert.deepEqual(validationCalls, [GEMINI_PRIMARY_MODEL], 'request/schema errors must not be hidden by model failover');

await assert.rejects(() => withGeminiModelFallback({
  keys: fallbackKeys,
  primaryModel: GEMINI_PRIMARY_MODEL,
  fallbackModels: [GEMINI_DEFAULT_FALLBACK_MODEL],
  operation: async (_modelName, _apiKey) => { throw new Error('HTTP 503 UNAVAILABLE'); }
}), /Nie udało się uruchomić żadnego skonfigurowanego modelu Gemini/);

console.log('Gemini model fallback tests passed');

const {
  GEMINI_HTTP_TIMEOUT_MS,
  GEMINI_NARRATION_REVISION_BUDGET_MS,
  GEMINI_REQUEST_BUDGET_MS,
  getGeminiHttpOptions,
  getGeminiRemainingBudgetMs
} = await import('../src/server/geminiRequestPolicy');

assert.equal(GEMINI_HTTP_TIMEOUT_MS, 20_000);
assert.equal(GEMINI_REQUEST_BUDGET_MS, 45_000);
assert.equal(GEMINI_NARRATION_REVISION_BUDGET_MS, 45_000);
assert.deepEqual(getGeminiHttpOptions(45_000), { timeout: 20_000, retryOptions: { attempts: 1 } });
assert.deepEqual(getGeminiHttpOptions(3_500), { timeout: 3_500, retryOptions: { attempts: 1 } });
assert.equal(getGeminiHttpOptions(0), null, 'expired request budget prevents another provider attempt');
assert.equal(getGeminiHttpOptions(-1), null, 'negative request budget prevents another provider attempt');
assert.equal(getGeminiRemainingBudgetMs(10_000, 2_500), 7_500);
assert.equal(getGeminiRemainingBudgetMs(10_000, 10_000), 0);
assert.equal(getGeminiRemainingBudgetMs(10_000, 12_000), 0);
assert.equal(getGeminiRemainingBudgetMs(Number.NaN, 0), 0);

console.log('Gemini bounded request policy tests passed');
