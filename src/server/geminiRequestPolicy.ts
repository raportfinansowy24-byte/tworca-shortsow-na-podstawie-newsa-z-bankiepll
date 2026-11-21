export const GEMINI_REQUEST_BUDGET_MS = 45_000;
export const GEMINI_HTTP_TIMEOUT_MS = 20_000;
export const GEMINI_NARRATION_REVISION_BUDGET_MS = 45_000;

export function getGeminiRemainingBudgetMs(deadlineAt: number, now = Date.now()): number {
  if (!Number.isFinite(deadlineAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.floor(deadlineAt - now));
}

export function getGeminiHttpOptions(remainingBudgetMs: number): {
  timeout: number;
  retryOptions: { attempts: 1 };
} | null {
  if (!Number.isFinite(remainingBudgetMs) || remainingBudgetMs <= 0) return null;
  return {
    timeout: Math.max(1, Math.min(GEMINI_HTTP_TIMEOUT_MS, Math.floor(remainingBudgetMs))),
    retryOptions: { attempts: 1 }
  };
}
