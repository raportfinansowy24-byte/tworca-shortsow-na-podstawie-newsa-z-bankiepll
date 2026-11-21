import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { requestElevenLabsApi } from '../src/server/elevenLabsRequest';

type Runtime = NonNullable<Parameters<typeof requestElevenLabsApi>[5]>;
type Scenario = 'success' | 'timeout' | 'abort';

function makeRuntime(scenario: Scenario, logs: string[]): Runtime {
  const request = ((url: string, options: any, onResponse: (response: any) => void) => {
    assert.equal(url, 'https://api.elevenlabs.io/v1/text-to-speech/voice_id_that_must_not_be_logged/with-timestamps?output_format=mp3_44100_128');
    assert.equal(options.timeout, 30_000);
    assert.equal(options.headers['xi-api-key'], 'elevenlabs-test-secret');

    const req = new EventEmitter() as EventEmitter & {
      write: (chunk: string) => boolean;
      end: () => void;
      destroy: (error: Error) => unknown;
    };
    req.write = () => true;
    req.destroy = (error: Error) => {
      queueMicrotask(() => req.emit('error', error));
      return req;
    };

    if (scenario === 'abort') {
      options.signal?.addEventListener('abort', () => {
        const error = Object.assign(new Error('The operation was aborted'), {
          name: 'AbortError',
          code: 'ABORT_ERR'
        });
        queueMicrotask(() => req.emit('error', error));
      }, { once: true });
    }

    req.end = () => {
      req.emit('finish');
      if (scenario === 'success') {
        queueMicrotask(() => {
          const response = new EventEmitter() as EventEmitter & { statusCode: number };
          response.statusCode = 200;
          onResponse(response);
          response.emit('data', Buffer.from('{"ok":true}', 'utf8'));
          response.emit('end');
        });
      } else if (scenario === 'timeout') {
        queueMicrotask(() => req.emit('timeout'));
      }
    };
    return req;
  }) as unknown as Runtime['request'];

  return {
    request,
    createRequestId: () => 'test-request-id',
    logger: {
      info: (message: string) => logs.push(message),
      warn: (message: string) => logs.push(message)
    }
  };
}

function parseLogs(logs: string[]) {
  const prefix = '[ElevenLabs HTTP] ';
  return logs
    .filter((line) => line.startsWith(prefix))
    .map((line) => JSON.parse(line.slice(prefix.length)) as Record<string, unknown>);
}

const previousApiKey = process.env.ELEVENLABS_API_KEY;

try {
  process.env.ELEVENLABS_API_KEY = 'elevenlabs-test-secret';

  const successLogs: string[] = [];
  const success = await requestElevenLabsApi(
    'POST',
    '/v1/text-to-speech/voice_id_that_must_not_be_logged/with-timestamps?output_format=mp3_44100_128',
    { text: 'Nie loguj treści tej narracji', model_id: 'eleven_multilingual_v2' },
    undefined,
    { purpose: 'short-narration', jobId: 'job_test_123' },
    makeRuntime('success', successLogs)
  );

  assert.equal(success.statusCode, 200);
  assert.equal(success.body, '{"ok":true}');
  const successEvents = parseLogs(successLogs);
  const complete = successEvents.find((event) => event.event === 'response_complete');
  assert.ok(complete, 'musi powstać końcowy pomiar odpowiedzi');
  assert.equal(complete?.statusCode, 200);
  assert.equal(complete?.responseBytes, Buffer.byteLength('{"ok":true}'));
  assert.equal(typeof complete?.requestSentMs, 'number');
  assert.equal(typeof complete?.responseHeadersMs, 'number');
  assert.equal(typeof complete?.timeToFirstByteMs, 'number');
  assert.equal(typeof complete?.totalMs, 'number');
  assert.equal(complete?.purpose, 'short-narration', 'pomiar musi wskazywać rodzaj żądania TTS');
  assert.ok(successEvents.some((event) => event.event === 'request_body_sent'));
  assert.ok(successEvents.some((event) => event.event === 'response_headers'));
  assert.ok(successEvents.every((event) => event.requestId === 'test-request-id'));
  assert.ok(successEvents.every((event) => event.jobId === 'job_test_123'));
  assert.equal(successLogs.join('\n').includes('elevenlabs-test-secret'), false, 'logi nie mogą ujawniać klucza API');
  assert.equal(successLogs.join('\n').includes('Nie loguj treści tej narracji'), false, 'logi nie mogą ujawniać tekstu lektora');
  assert.equal(successLogs.join('\n').includes('voice_id_that_must_not_be_logged'), false, 'logi nie mogą ujawniać ID głosu');

  const timeoutLogs: string[] = [];
  await assert.rejects(
    requestElevenLabsApi(
      'POST',
      '/v1/text-to-speech/voice_id_that_must_not_be_logged/with-timestamps?output_format=mp3_44100_128',
      { text: 'Krótki test' },
      undefined,
      { purpose: 'preview' },
      makeRuntime('timeout', timeoutLogs)
    ),
    /Przekroczono limit czasu żądania ElevenLabs/
  );
  assert.equal(parseLogs(timeoutLogs).find((event) => event.event === 'request_failed')?.failureType, 'inactivity_timeout');

  const abortLogs: string[] = [];
  const controller = new AbortController();
  const abortedRequest = requestElevenLabsApi(
    'POST',
    '/v1/text-to-speech/voice_id_that_must_not_be_logged/with-timestamps?output_format=mp3_44100_128',
    { text: 'Krótki test' },
    controller.signal,
    { purpose: 'short-narration', jobId: 'job_abort_test' },
    makeRuntime('abort', abortLogs)
  );
  controller.abort();
  await assert.rejects(abortedRequest, /aborted/i);
  assert.equal(parseLogs(abortLogs).find((event) => event.event === 'request_failed')?.failureType, 'aborted');

  console.log('ElevenLabs request telemetry tests passed');
} finally {
  if (previousApiKey === undefined) delete process.env.ELEVENLABS_API_KEY;
  else process.env.ELEVENLABS_API_KEY = previousApiKey;
}
