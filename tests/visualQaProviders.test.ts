import assert from 'node:assert/strict';
import { parseCompleteVisualSemanticResponse, parseVisualSemanticResponse, buildVisualSemanticReport } from '../src/server/shortsVisualSemanticQa';
import { buildOpenAiVisualQaContent, requestOpenAiVisualQa, retryVisualQa, runVisualQaWithFallback } from '../src/server/visualQaProviders';

let retryAttempts = 0;
const scheduledDelays: number[] = [];
const recoveredResult = await retryVisualQa(async () => {
  retryAttempts++;
  if (retryAttempts < 3) throw new Error('Gemini HTTP 503 UNAVAILABLE');
  return 'odzyskany wynik';
}, {
  maxAttempts: 3,
  delaysMs: [10, 20],
  sleep: async (delayMs) => { scheduledDelays.push(delayMs); }
});
assert.equal(recoveredResult, 'odzyskany wynik');
assert.equal(retryAttempts, 3, 'provider jest ponawiany do uzyskania wyniku');
assert.deepEqual(scheduledDelays, [10, 20], 'retry stosuje rosnące opóźnienie');

let permanentFailureAttempts = 0;
await assert.rejects(() => retryVisualQa(async () => {
  permanentFailureAttempts++;
  throw new Error('OpenAI visual QA API HTTP 400: invalid model');
}, { maxAttempts: 3, sleep: async () => {} }), /HTTP 400/);
assert.equal(permanentFailureAttempts, 1, 'błędy konfiguracji 4xx nie są ponawiane');

const calls: string[] = [];
const providerFailures: string[] = [];
const fallbackResult = await runVisualQaWithFallback([
  {
    model: 'gemini-3.8-flash',
    analyze: async () => {
      calls.push('gemini');
      throw new Error('HTTP 503 unavailable');
    }
  },
  {
    model: 'openai:gpt-6.1-sol',
    analyze: async () => {
      calls.push('openai');
      return parseCompleteVisualSemanticResponse(JSON.stringify({ results: [
        { scene: 1, match: true, confidence: 0.93, reason: 'Klatka odpowiada lektorowi.' }
      ] }), 1);
    }
  }
], (model, error) => providerFailures.push(`${model}: ${error.message}`));
assert.deepEqual(calls, ['gemini', 'openai'], 'OpenAI jest wywoływany dopiero po awarii Gemini');
assert.equal(fallbackResult.model, 'openai:gpt-6.1-sol');
assert.equal(buildVisualSemanticReport(1, fallbackResult.result, fallbackResult.model).status, 'pass');
assert.deepEqual(providerFailures, ['gemini-3.8-flash: HTTP 503 unavailable']);

const partialProviderCalls: string[] = [];
const completeGeminiResponse = JSON.stringify({ results: [
  { scene: 1, match: true, confidence: 0.9, reason: 'Pasuje.' }
] });
const completeOpenAiResponse = JSON.stringify({ results: [
  { scene: 1, match: true, confidence: 0.9, reason: 'Pasuje.' },
  { scene: 2, match: false, confidence: 0.85, reason: 'Nie pasuje.' }
] });
const partialFallback = await runVisualQaWithFallback([
  {
    model: 'gemini-3.8-flash',
    analyze: async () => {
      partialProviderCalls.push('gemini');
      return parseCompleteVisualSemanticResponse(completeGeminiResponse, 2);
    }
  },
  {
    model: 'openai:gpt-6.1-sol',
    analyze: async () => {
      partialProviderCalls.push('openai');
      return parseCompleteVisualSemanticResponse(completeOpenAiResponse, 2);
    }
  }
]);
assert.deepEqual(partialProviderCalls, ['gemini', 'openai'], 'brak wyniku dla którejkolwiek sceny uruchamia fallback');
assert.equal(partialFallback.model, 'openai:gpt-6.1-sol');
assert.equal(partialFallback.result.length, 2);
assert.throws(() => parseCompleteVisualSemanticResponse('{"results":[]}', 2), /0 z 2 wymaganych scen/);

let fallbackCalled = false;
const primaryResult = await runVisualQaWithFallback([
  { model: 'gemini-3.8-flash', analyze: async () => ['gemini result'] },
  { model: 'openai:gpt-6.1-sol', analyze: async () => { fallbackCalled = true; return ['openai result']; } }
]);
assert.equal(primaryResult.model, 'gemini-3.8-flash');
assert.equal(fallbackCalled, false, 'OpenAI nie jest wywoływany, jeśli Gemini działa');

await assert.rejects(() => runVisualQaWithFallback([
  { model: 'gemini-3.8-flash', analyze: async () => { throw new Error('503'); } },
  { model: 'openai:gpt-6.1-sol', analyze: async () => { throw new Error('429'); } }
]), /gemini-3\.8-flash: 503 \| openai:gpt-6\.1-sol: 429/);
await assert.rejects(() => runVisualQaWithFallback([]), /Nie skonfigurowano providera/);

const parts = [
  { text: 'SCENA 1 — Tekst lektora.' },
  { inlineData: { mimeType: 'image/jpeg', data: 'ZmFrZS1pbWFnZQ==' } }
];
const content = buildOpenAiVisualQaContent('Zwróć JSON.', parts);
assert.deepEqual(content[0], { type: 'text', text: 'Zwróć JSON.' });
assert.deepEqual(content[2], {
  type: 'image_url',
  image_url: { url: 'data:image/jpeg;base64,ZmFrZS1pbWFnZQ==', detail: 'auto' }
});

let capturedUrl = '';
let capturedInit: RequestInit | undefined;
const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
  capturedUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  capturedInit = init;
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ results: [] }) } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}) as typeof fetch;
const responseText = await requestOpenAiVisualQa({
  apiKey: 'test-only-key',
  model: 'gpt-6.1-sol',
  instructions: 'Zwróć JSON.',
  imageParts: parts,
  fetchImpl: fakeFetch
});
assert.equal(capturedUrl, 'https://api.openai.com/v1/chat/completions');
assert.equal((capturedInit?.headers as Record<string, string>).Authorization, 'Bearer test-only-key');
assert.ok(capturedInit?.signal instanceof AbortSignal, 'żądanie do OpenAI ma ograniczony timeout');
const requestBody = JSON.parse(String(capturedInit?.body));
assert.equal(requestBody.model, 'gpt-6.1-sol');
assert.deepEqual(requestBody.response_format, { type: 'json_object' });
assert.equal(requestBody.messages[0].content[2].type, 'image_url');
assert.equal(parseVisualSemanticResponse(responseText, 1).length, 0);

const failingFetch = (async () => new Response('overloaded', { status: 503 })) as typeof fetch;
await assert.rejects(() => requestOpenAiVisualQa({
  apiKey: 'test-only-key',
  model: 'gpt-6.1-sol',
  instructions: 'Zwróć JSON.',
  imageParts: [],
  fetchImpl: failingFetch
}), /OpenAI visual QA API HTTP 503: overloaded/);
await assert.rejects(() => requestOpenAiVisualQa({
  apiKey: '  ',
  model: 'gpt-6.1-sol',
  instructions: 'Zwróć JSON.',
  imageParts: [],
  fetchImpl: failingFetch
}), /Brak OPENAI_API_KEY/);

console.log('Visual QA provider tests passed');
