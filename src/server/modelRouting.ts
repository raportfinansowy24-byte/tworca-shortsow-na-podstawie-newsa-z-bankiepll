export const OPENAI_PRIMARY_MODEL = 'gpt-6.1-sol';
export const GEMINI_FALLBACK_MODEL = 'gemini-3.8-flash';
export const OPENAI_REASONING_EFFORT = 'low' as const;

export interface OpenAiScriptRequest {
  apiKey: string;
  contents: string;
  fetchImpl?: typeof fetch;
}

function extractResponseText(payload: any): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload?.output)) return '';
  return payload.output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((part: any) => part?.type === 'output_text' && typeof part.text === 'string')
    .map((part: any) => part.text)
    .join('\n')
    .trim();
}

export async function requestOpenAiScript(params: OpenAiScriptRequest): Promise<string> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) throw new Error('Brak OPENAI_API_KEY dla głównego modelu redakcyjnego.');

  const fetchImpl = params.fetchImpl || fetch;
  const response = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_PRIMARY_MODEL,
      instructions: 'You are a precise Polish-language financial news Shorts editor. Follow source facts and output requirements exactly. Never invent facts. Return valid JSON only.',
      input: params.contents,
      reasoning: { effort: OPENAI_REASONING_EFFORT },
      text: { format: { type: 'json_object' } },
      store: false
    }),
    signal: AbortSignal.timeout(90_000)
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 700);
    throw new Error(`OpenAI Responses API HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }

  const payload: any = await response.json();
  const text = extractResponseText(payload);
  if (!text) throw new Error('OpenAI Responses API zwróciło pustą odpowiedź tekstową.');
  return text;
}

export function isRetryableModelProviderError(error: Error): boolean {
  return /\bHTTP\s+(?:408|409|425|429|500|502|503|504)\b/i.test(error.message) ||
    /\b(?:ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|fetch failed|network error|timed? ?out|overloaded)\b/i.test(error.message);
}