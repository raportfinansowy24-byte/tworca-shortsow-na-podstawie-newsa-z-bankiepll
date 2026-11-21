import https from 'node:https';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

export type ElevenLabsRequestPurpose = 'short-narration' | 'preview' | 'voice-list' | 'other';

export type ElevenLabsRequestContext = {
  purpose?: ElevenLabsRequestPurpose;
  jobId?: string;
};

type RequestLogger = Pick<Console, 'info' | 'warn'>;

type RequestRuntime = {
  request?: typeof https.request;
  logger?: RequestLogger;
  timeoutMs?: number;
  createRequestId?: () => string;
};

function safeJobId(value?: string): string | undefined {
  if (!value) return undefined;
  const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  return sanitized || undefined;
}

function endpointLabel(endpoint: string): string {
  if (/^\/v1\/text-to-speech\/[^/]+\/with-timestamps(?:\?|$)/.test(endpoint)) {
    return '/v1/text-to-speech/{voiceId}/with-timestamps';
  }
  if (endpoint.startsWith('/v1/voices')) return '/v1/voices';
  return endpoint.split('?')[0].replace(/\/[a-zA-Z0-9_-]{20,}(?=\/|$)/g, '/{id}').slice(0, 120);
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  const code = String((error as NodeJS.ErrnoException).code || '');
  return /^[A-Z0-9_]{1,40}$/.test(code) ? code : undefined;
}

function getErrorName(error: unknown): string {
  if (error instanceof Error && /^[A-Za-z]+Error$/.test(error.name)) return error.name;
  return 'Error';
}

export function requestElevenLabsApi(
  method: 'GET' | 'POST',
  endpoint: string,
  payload?: unknown,
  signal?: AbortSignal,
  context: ElevenLabsRequestContext = {},
  runtime: RequestRuntime = {}
): Promise<{ statusCode: number; body: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return Promise.reject(new Error('Brakuje ELEVENLABS_API_KEY. Skonfiguruj klucz ElevenLabs po stronie serwera.'));
  if (signal?.aborted) return Promise.reject(new Error('Żądanie ElevenLabs anulowane wraz z renderem.'));

  const body = payload === undefined ? undefined : JSON.stringify(payload);
  const payloadText = payload && typeof payload === 'object' && 'text' in payload && typeof (payload as { text?: unknown }).text === 'string'
    ? (payload as { text: string }).text
    : undefined;
  const requestBodyBytes = body ? Buffer.byteLength(body) : 0;
  const requestId = runtime.createRequestId?.() || randomUUID();
  const startedAt = process.hrtime.bigint();
  const logger = runtime.logger || console;
  const safeId = safeJobId(context.jobId);
  const base = {
    requestId,
    purpose: context.purpose || 'other',
    ...(safeId ? { jobId: safeId } : {}),
    method,
    endpoint: endpointLabel(endpoint),
    requestBodyBytes,
    ...(payloadText !== undefined ? { textChars: payloadText.length } : {})
  };

  const elapsedMs = () => Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  const writeLog = (level: 'info' | 'warn', event: string, fields: Record<string, unknown> = {}) => {
    const message = '[ElevenLabs HTTP] ' + JSON.stringify({
      ...base,
      event,
      elapsedMs: Math.round(elapsedMs()),
      ...fields
    });
    logger[level](message);
  };

  writeLog('info', 'request_started', { inactivityTimeoutMs: runtime.timeoutMs ?? 30_000 });

  return new Promise((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    let requestSentMs: number | null = null;
    let responseHeadersMs: number | null = null;
    let firstByteMs: number | null = null;
    let responseBytes = 0;
    let responseStatusCode = 0;

    const fail = (error: unknown, failureType: string, stage: 'request' | 'response') => {
      if (settled) return;
      settled = true;
      const errorCode = getErrorCode(error);
      writeLog('warn', 'request_failed', {
        failureType,
        stage,
        errorName: getErrorName(error),
        ...(errorCode ? { errorCode } : {}),
        requestSentMs,
        responseHeadersMs,
        firstByteMs,
        responseBytes,
        responseStatusCode: responseStatusCode || null
      });
      reject(error instanceof Error ? error : new Error('Żądanie ElevenLabs zakończyło się błędem.'));
    };

    const requestFactory = runtime.request || https.request;
    let req: ReturnType<typeof https.request>;
    try {
      req = requestFactory('https://api.elevenlabs.io' + endpoint, {
        method,
        ...(signal ? { signal } : {}),
        headers: {
          'xi-api-key': apiKey,
          'Accept': 'application/json',
          ...(body ? { 'Content-Type': 'application/json', 'Content-Length': String(requestBodyBytes) } : {})
        },
        timeout: runtime.timeoutMs ?? 30_000
      }, (res: IncomingMessage) => {
        responseStatusCode = res.statusCode || 0;
        responseHeadersMs = Math.round(elapsedMs());
        writeLog('info', 'response_headers', {
          statusCode: responseStatusCode,
          responseHeadersMs
        });

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer | string) => {
          if (firstByteMs === null) firstByteMs = Math.round(elapsedMs());
          const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          responseBytes += data.length;
          chunks.push(data);
        });
        res.on('aborted', () => {
          fail(new Error('Odpowiedź ElevenLabs została przerwana.'), 'response_aborted', 'response');
        });
        res.on('error', (error: Error) => {
          fail(error, 'response_error', 'response');
        });
        res.on('end', () => {
          if (settled) return;
          settled = true;
          const totalMs = Math.round(elapsedMs());
          writeLog('info', 'response_complete', {
            statusCode: responseStatusCode,
            requestSentMs,
            responseHeadersMs,
            timeToFirstByteMs: firstByteMs,
            responseBodyMs: responseHeadersMs === null ? null : Math.max(0, totalMs - responseHeadersMs),
            totalMs,
            responseBytes
          });
          resolve({
            statusCode: responseStatusCode,
            body: Buffer.concat(chunks).toString('utf8')
          });
        });
      });
    } catch (error) {
      fail(error, 'request_setup_error', 'request');
      return;
    }

    req.on('finish', () => {
      requestSentMs = Math.round(elapsedMs());
      writeLog('info', 'request_body_sent', { requestSentMs });
    });
    req.on('timeout', () => {
      timedOut = true;
      req.destroy(new Error('Przekroczono limit czasu żądania ElevenLabs.'));
    });
    req.on('error', (error: Error) => {
      const failureType = signal?.aborted ? 'aborted' : timedOut ? 'inactivity_timeout' : 'network_error';
      fail(error, failureType, 'request');
    });

    try {
      if (body) req.write(body);
      req.end();
    } catch (error) {
      fail(error, 'request_write_error', 'request');
    }
  });
}
