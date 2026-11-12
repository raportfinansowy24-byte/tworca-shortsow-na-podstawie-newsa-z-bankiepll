import assert from 'node:assert/strict';
import {
  GEMINI_FALLBACK_MODEL,
  isRetryableModelProviderError,
  OPENAI_PRIMARY_MODEL,
  OPENAI_REASONING_EFFORT,
  requestOpenAiScript
} from '../src/server/modelRouting';

assert.equal(OPENAI_PRIMARY_MODEL, 'gpt-6.1-sol');
assert.equal(GEMINI_FALLBACK_MODEL, 'gemini-3.8-flash');
assert.equal(OPENAI_REASONING_EFFORT, 'low');
assert.equal(isRetryableModelProviderError(new Error('OpenAI Responses API HTTP 500: server_error')), true);
assert.equal(isRetryableModelProviderError(new Error('OpenAI Responses API HTTP 429: rate limit')), true);
assert.equal(isRetryableModelProviderError(new Error('OpenAI Responses API HTTP 401: unauthorized')), false);

let capturedUrl = '';
let capturedInit: RequestInit | undefined;
const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
  capturedUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  capturedInit = init;
  return new Response(JSON.stringify({
    id: 'resp_test',
    output: [{
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: '{"title":"Test","scenes":[]}' }]
    }]
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}) as typeof fetch;

const output = await requestOpenAiScript({
  apiKey: 'test-only-key',
  contents: 'Zwróć poprawny JSON.',
  fetchImpl: fakeFetch
});
assert.equal(output, '{"title":"Test","scenes":[]}');
assert.equal(capturedUrl, 'https://api.openai.com/v1/responses');
assert.equal((capturedInit?.headers as Record<string, string>).Authorization, 'Bearer test-only-key');
assert.ok(capturedInit?.signal instanceof AbortSignal);
const body = JSON.parse(String(capturedInit?.body));
assert.equal(body.model, OPENAI_PRIMARY_MODEL);
assert.deepEqual(body.reasoning, { effort: 'low' });
assert.deepEqual(body.text, { format: { type: 'json_object' } });
assert.equal(body.store, false);
assert.equal('temperature' in body, false, 'GPT-6.1 Sol must not receive temperature when reasoning is enabled');
assert.equal(body.input, 'Zwróć poprawny JSON.');

const convenienceFetch = (async () => new Response(JSON.stringify({
  output_text: '{"ok":true}'
}), { status: 200 })) as typeof fetch;
assert.equal(await requestOpenAiScript({
  apiKey: 'test-only-key',
  contents: 'JSON',
  fetchImpl: convenienceFetch
}), '{"ok":true}');

const serverErrorFetch = (async () => new Response(JSON.stringify({
  error: { message: 'temporary backend error', type: 'server_error' }
}), { status: 500 })) as typeof fetch;
await assert.rejects(() => requestOpenAiScript({
  apiKey: 'test-only-key',
  contents: 'JSON',
  fetchImpl: serverErrorFetch
}), /OpenAI Responses API HTTP 500/);

await assert.rejects(() => requestOpenAiScript({
  apiKey: '  ',
  contents: 'JSON',
  fetchImpl: fakeFetch
}), /Brak OPENAI_API_KEY/);

console.log('Model routing tests passed');