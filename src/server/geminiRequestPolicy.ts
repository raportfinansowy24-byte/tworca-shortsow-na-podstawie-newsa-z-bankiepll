export const GEMINI_REQUEST_BUDGET_MS = 45_000;
export const GEMINI_HTTP_TIMEOUT_MS = 20_000;
// Gemini rejects manually supplied deadlines shorter than 10 seconds (HTTP 400).
export const GEMINI_MIN_HTTP_TIMEOUT_MS = 10_000;
export const GEMINI_NARRATION_REVISION_BUDGET_MS = 45_000;

export function getGeminiRemainingBudgetMs(deadlineAt: number, now = Date.now()): number {
  if (!Number.isFinite(deadlineAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.floor(deadlineAt - now));
}

export function getGeminiHttpOptions(remainingBudgetMs: number): {
  timeout: number;
  retryOptions: { attempts: 1 };
} | null {
  // Do not send a request that the Gemini API will reject for being below its
  // 10-second minimum deadline. This is a local budget exhaustion, not an API error.
  if (!Number.isFinite(remainingBudgetMs) || remainingBudgetMs < GEMINI_MIN_HTTP_TIMEOUT_MS) return null;
  return {
    timeout: Math.min(GEMINI_HTTP_TIMEOUT_MS, Math.floor(remainingBudgetMs)),
    retryOptions: { attempts: 1 }
  };
}
