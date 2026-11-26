import {
  parseOfferCatalogPayload,
  type OfferCategoryDefinition,
  type VisibleOfferCandidate
} from '../utils/financeOfferMatching';

export type OfferCatalogFailureKind =
  | 'invalid_endpoint'
  | 'http_error'
  | 'timeout'
  | 'network_error'
  | 'invalid_json'
  | 'invalid_payload';

interface OfferCatalogFetchBase {
  category: OfferCategoryDefinition;
  endpointHost: string;
  endpointPath: string;
  elapsedMs: number;
}

export interface OfferCatalogFetchSuccess extends OfferCatalogFetchBase {
  ok: true;
  httpStatus: number;
  responseItems: number;
  offers: VisibleOfferCandidate[];
}

export interface OfferCatalogFetchFailure extends OfferCatalogFetchBase {
  ok: false;
  failureKind: OfferCatalogFailureKind;
  error: string;
  httpStatus?: number;
  contentType?: string;
}

export type OfferCatalogFetchResult = OfferCatalogFetchSuccess | OfferCatalogFetchFailure;

function safeErrorMessage(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  return value
    .replace(/[\\r\\n\\t]+/g, ' ')
    .replace(/https?:\\/\\/[^\\s"'\x60]+/gi, '[url]')
    .replace(/((?:api[_-]?key|token|secret|authorization)\\s*[=:]\\s*)[^\\s,;]+/gi, '$1[REDACTED]')
    .slice(0, 180) || 'Nieznany błąd żądania.';
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const value = error as { code?: unknown; cause?: unknown };
  if (typeof value.code === 'string') return value.code;
  if (value.cause && typeof value.cause === 'object' &&
      typeof (value.cause as { code?: unknown }).code === 'string') {
    return (value.cause as { code: string }).code;
  }
  return undefined;
}

function getFailureKind(error: unknown): 'timeout' | 'network_error' {
  const name = error && typeof error === 'object' && 'name' in error
    ? String((error as { name?: unknown }).name || '')
    : '';
  const message = error instanceof Error ? error.message : String(error);
  if (name === 'TimeoutError' || name === 'AbortError' ||
      /timeout|timed out|aborted/i.test(message)) return 'timeout';
  return 'network_error';
}

export async function fetchOfferCatalogCategory(
  category: OfferCategoryDefinition,
  sourceBase: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 8_000
): Promise<OfferCatalogFetchResult> {
  const startedAt = Date.now();
  let endpoint: URL;

  try {
    endpoint = new URL(`/get-category-campaigns/${encodeURIComponent(category.apiKey)}`, sourceBase);
  } catch (error) {
    return {
      ok: false,
      category,
      endpointHost: '[invalid-url]',
      endpointPath: '/get-category-campaigns/[category]',
      elapsedMs: Date.now() - startedAt,
      failureKind: 'invalid_endpoint',
      error: safeErrorMessage(error)
    };
  }

  const base = {
    category,
    endpointHost: endpoint.host,
    endpointPath: endpoint.pathname,
    get elapsedMs() { return Date.now() - startedAt; }
  };

  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      headers: { Accept: 'application/json', 'User-Agent': 'raport-finansowy24-offer-catalog/1.0' },
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    const code = getErrorCode(error);
    const message = safeErrorMessage(error);
    return {
      ...base,
      ok: false,
      failureKind: getFailureKind(error),
      error: code ? `${message} (code=${code})` : message
    };
  }

  const contentType = response.headers.get('content-type') || 'unknown';
  if (!response.ok) {
    return {
      ...base,
      ok: false,
      failureKind: 'http_error',
      httpStatus: response.status,
      contentType,
      error: `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    return {
      ...base,
      ok: false,
      failureKind: 'invalid_json',
      httpStatus: response.status,
      contentType,
      error: safeErrorMessage(error)
    };
  }

  if (!Array.isArray(payload)) {
    const payloadType = payload === null ? 'null' : Array.isArray(payload) ? 'array' : typeof payload;
    return {
      ...base,
      ok: false,
      failureKind: 'invalid_payload',
      httpStatus: response.status,
      contentType,
      error: `Oczekiwano tablicy kart ofert; otrzymano: ${payloadType}.`
    };
  }

  return {
    ...base,
    ok: true,
    httpStatus: response.status,
    contentType,
    responseItems: payload.length,
    offers: parseOfferCatalogPayload(payload)
  } as OfferCatalogFetchSuccess;
}
