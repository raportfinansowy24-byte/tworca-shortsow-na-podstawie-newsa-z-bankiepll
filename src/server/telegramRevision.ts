export const MAX_TELEGRAM_REVISIONS = 5;
export const MAX_TELEGRAM_FEEDBACK_LENGTH = 1800;

export function normalizeTelegramFeedback(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (!clean || clean.length > MAX_TELEGRAM_FEEDBACK_LENGTH) return null;
  return clean;
}

export function nextTelegramRevisionNumber(current: unknown): number | null {
  const revision = typeof current === 'number' && Number.isFinite(current) ? Math.max(0, Math.floor(current)) : 0;
  return revision < MAX_TELEGRAM_REVISIONS ? revision + 1 : null;
}
