import assert from 'node:assert/strict';
import {
  GEMINI_PRIMARY_MODEL,
  getGeminiApiKeys,
  shouldRotateGeminiKey,
  withGeminiKeyRotation
} from '../src/server/modelRouting';

assert.equal(GEMINI_PRIMARY_MODEL, 'gemini-4-hydrogen');

const keys = getGeminiApiKeys({
  GEMINI_API_KEY: '  key-one  ',
  GEMINI_API_KEY_2: 'key-two',
  GEMINI_API_KEY_3: 'key-three'
});
assert.deepEqual(keys.map((key) => key.name), [
  'GEMINI_API_KEY',
  'GEMINI_API_KEY_2',
  'GEMINI_API_KEY_3'
]);
assert.deepEqual(keys.map((key) => key.apiKey), ['key-one', 'key-two', 'key-three']);
assert.equal(getGeminiApiKeys({ GEMINI_API_KEY: 'same', GEMINI_API_KEY_2: 'same' }).length, 1);
assert.equal(getGeminiApiKeys({}).length, 0);

assert.equal(shouldRotateGeminiKey(new Error('HTTP 429 RESOURCE_EXHAUSTED')), true);
assert.equal(shouldRotateGeminiKey(new Error('HTTP 503 UNAVAILABLE')), true);
assert.equal(shouldRotateGeminiKey(new Error('HTTP 401 API key invalid')), true);
assert.equal(shouldRotateGeminiKey(new Error('HTTP 400 API_KEY_INVALID')), true);
assert.equal(shouldRotateGeminiKey(new Error('HTTP 400 invalid response schema')), false);

const calls: string[] = [];
const failover = await withGeminiKeyRotation({
  keys,
  operation: async (apiKey, keyName) => {
    calls.push(keyName);
    if (apiKey !== 'key-three') throw new Error('HTTP 429 RESOURCE_EXHAUSTED');
    return 'Hydrogen response';
  }
});
assert.deepEqual(calls, ['GEMINI_API_KEY', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3']);
assert.equal(failover.result, 'Hydrogen response');
assert.equal(failover.keyName, 'GEMINI_API_KEY_3');

const nonRetryableCalls: string[] = [];
await assert.rejects(() => withGeminiKeyRotation({
  keys,
  operation: async (_apiKey, keyName) => {
    nonRetryableCalls.push(keyName);
    throw new Error('HTTP 400 invalid response schema');
  }
}), /HTTP 400/);
assert.deepEqual(nonRetryableCalls, ['GEMINI_API_KEY'], '400 validation errors should not be retried with other keys');

await assert.rejects(() => withGeminiKeyRotation({
  keys: [],
  operation: async () => 'unused'
}), /Brak kluczy Gemini/);

console.log('Gemini Hydrogen model routing tests passed');
