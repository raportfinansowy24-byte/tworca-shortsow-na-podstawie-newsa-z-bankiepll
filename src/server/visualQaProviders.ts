export interface VisualQaProvider<T> {
  model: string;
  analyze: () => Promise<T>;
}

export interface VisualQaRetryOptions {
  maxAttempts?: number;
  delaysMs?: number[];
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
  sleep?: (delayMs: number) => Promise<void>;
}

export function isRetryableVisualQaError(error: Error): boolean {
  const message = error.message;
  const status = Number((error as Error & { status?: unknown }).status);
  if (Number.isFinite(status) && (status === 408 || status === 425 || status === 429 || status >= 500)) return true;
  return /\bHTTP\s+(?:408|425|429|5\d\d)\b/i.test(message) ||
    /\b(?:UNAVAILABLE|RESOURCE_EXHAUSTED|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|fetch failed|network error|timed? ?out|overloaded|currently experiencing high demand)\b/i.test(message) ||
    /pust(?:ą|a|e) odpowiedź|nie zwrócił obiektu JSON|wyników dla \d+ z \d+ wymaganych scen/i.test(message);
}

export async function retryVisualQa<T>(
  operation: () => Promise<T>,
  options: VisualQaRetryOptions = {}
): Promise<T> {
  const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? 3));
  const delaysMs = options.delaysMs ?? [800, 2000];
  const sleep = options.sleep ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      if (attempt >= maxAttempts || !(options.shouldRetry ?? isRetryableVisualQaError)(error)) throw error;
      options.onRetry?.(attempt, error);
      await sleep(delaysMs[Math.min(attempt - 1, delaysMs.length - 1)] ?? 0);
    }
  }
}

export async function runVisualQaWithFallback<T>(
  providers: VisualQaProvider<T>[],
  onFailure?: (model: string, error: Error) => void
): Promise<{ model: string; result: T }> {
  const failures: string[] = [];
  for (const provider of providers) {
    try {
      return { model: provider.model, result: await provider.analyze() };
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      failures.push(`${provider.model}: ${error.message}`);
      onFailure?.(provider.model, error);
    }
  }
  if (failures.length === 0) throw new Error('Nie skonfigurowano providera analizy semantycznej.');
  throw new Error(failures.join(' | ').slice(0, 1000));
}

export type InlineVisualQaPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export function buildOpenAiVisualQaContent(
  instructions: string,
  imageParts: InlineVisualQaPart[]
): Array<Record<string, unknown>> {
  return [
    { type: 'text', text: instructions },
    ...imageParts.map((part) => 'text' in part
      ? { type: 'text', text: part.text }
      : {
          type: 'image_url',
          image_url: {
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            detail: 'auto'
          }
        })
  ];
}

export async function requestOpenAiVisualQa(params: {
  apiKey: string;
  model: string;
  instructions: string;
  imageParts: InlineVisualQaPart[];
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) throw new Error('Brak OPENAI_API_KEY dla zapasowej analizy wizualnej.');
  const fetchImpl = params.fetchImpl || fetch;
  const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: params.model,
      messages: [{ role: 'user', content: buildOpenAiVisualQaContent(params.instructions, params.imageParts) }],
      response_format: { type: 'json_object' }
    }),
    signal: AbortSignal.timeout(45_000)
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 500);
    throw new Error(`OpenAI visual QA API HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }

  const payload: any = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map((part: any) => typeof part?.text === 'string' ? part.text : '').join('')
      : '';
  if (!text.trim()) throw new Error('OpenAI visual QA zwróciło pustą odpowiedź.');
  return text;
}
