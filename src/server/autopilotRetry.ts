export const MAX_STORYBOARD_QA_REPAIR_ATTEMPTS = 3;
export const MAX_AUTOPILOT_RETRY_ATTEMPTS = 2;
export const MAX_AUTOPILOT_RETRY_QUEUE_SIZE = 50;

export interface RetryableAutopilotArticle {
  title: string;
  link: string;
  description?: string;
  summary?: string;
  category?: string;
  pubDate?: string;
  imageUrl?: string | null;
}

export interface AutopilotRetryEntry {
  article: RetryableAutopilotArticle;
  /** Number of failed full-run attempts. 1 means the initial run failed and one retry is pending. */
  failedAttempts: number;
  status: 'pending' | 'exhausted';
  lastError: string;
  firstFailedAt: string;
  lastFailedAt: string;
  lastFailedJobId?: string;
  retryPayloadJobId?: string;
}

export function recordAutopilotFailure(
  entries: AutopilotRetryEntry[],
  article: RetryableAutopilotArticle,
  error: string,
  jobId?: string,
  now = new Date().toISOString(),
  maxRetries = MAX_AUTOPILOT_RETRY_ATTEMPTS
): AutopilotRetryEntry[] {
  const key = String(article.link || article.title || '').trim();
  if (!key) return entries;

  const previous = entries.find((entry) =>
    String(entry.article?.link || entry.article?.title || '').trim() === key
  );
  const failedAttempts = (previous?.failedAttempts || 0) + 1;
  const next: AutopilotRetryEntry = {
    article: { ...article },
    failedAttempts,
    status: failedAttempts <= Math.max(0, maxRetries) ? 'pending' : 'exhausted',
    lastError: String(error || 'Nieznany błąd').slice(0, 3000),
    firstFailedAt: previous?.firstFailedAt || now,
    lastFailedAt: now,
    ...(jobId ? { lastFailedJobId: jobId, retryPayloadJobId: jobId } : previous?.lastFailedJobId ? { lastFailedJobId: previous.lastFailedJobId } : {}),
    ...(!jobId && previous?.retryPayloadJobId ? { retryPayloadJobId: previous.retryPayloadJobId } : {})
  };

  return [next, ...entries.filter((entry) =>
    String(entry.article?.link || entry.article?.title || '').trim() !== key
  )].slice(0, MAX_AUTOPILOT_RETRY_QUEUE_SIZE);
}

export interface LegacyAutopilotFailureState {
  lastRunStatus?: string;
  lastRunArticle?: { link?: string | null } | null;
  processedUrls?: string[];
  history?: Array<{ articleLink?: string; status?: string }>;
  retryQueue?: AutopilotRetryEntry[];
}

/**
 * Before the retry queue existed, the scheduler marked a selected article as
 * processed before QA. Recover only the most recent failed item, and only when
 * no successful history record proves that it already rendered.
 */
export function findLegacyFailedAutopilotArticleUrl(
  state: LegacyAutopilotFailureState
): string | null {
  if (state.lastRunStatus !== 'failed' || (state.retryQueue || []).length > 0) return null;
  const candidateLink = String(
    state.lastRunArticle?.link || state.processedUrls?.[0] || ''
  ).trim();
  if (!candidateLink) return null;
  const alreadyCompleted = (state.history || []).some((entry) =>
    entry.articleLink === candidateLink && entry.status === 'completed'
  );
  return alreadyCompleted ? null : candidateLink;
}

export function getNextPendingAutopilotRetry(
  entries: AutopilotRetryEntry[]
): AutopilotRetryEntry | null {
  return entries.find((entry) => entry.status === 'pending') || null;
}

export function resolveAutopilotRetry(
  entries: AutopilotRetryEntry[],
  articleLink: string
): AutopilotRetryEntry[] {
  const key = String(articleLink || '').trim();
  if (!key) return entries;
  return entries.filter((entry) => String(entry.article?.link || '').trim() !== key);
}

export interface NarrationRetryCacheMetadata {
  text: string;
  durationSeconds: number;
  language: string;
  voiceId: string;
  speed: number;
  wordTimings: Array<{ word: string; start: number; end: number }>;
}

export function isCompatibleNarrationRetryCache(
  value: unknown,
  expected: { text: string; language: string; voiceId: string; speed: number }
): value is NarrationRetryCacheMetadata {
  if (!value || typeof value !== 'object') return false;
  const metadata = value as Partial<NarrationRetryCacheMetadata>;
  if (
    metadata.text !== expected.text ||
    metadata.language !== expected.language ||
    metadata.voiceId !== expected.voiceId ||
    !Number.isFinite(metadata.speed) ||
    Math.abs(Number(metadata.speed) - expected.speed) > 0.0001 ||
    !Number.isFinite(metadata.durationSeconds) ||
    Number(metadata.durationSeconds) <= 0 ||
    !Array.isArray(metadata.wordTimings)
  ) return false;

  const expectedWords = expected.text.trim().split(/\s+/u).filter(Boolean);
  if (metadata.wordTimings.length !== expectedWords.length) return false;
  const normalizeWord = (word: string) => String(word || '').toLocaleLowerCase('pl-PL')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
  return metadata.wordTimings.every((timing, index) =>
    Boolean(timing) &&
    typeof timing.word === 'string' &&
    normalizeWord(timing.word) === normalizeWord(expectedWords[index]) &&
    Number.isFinite(timing.start) &&
    Number.isFinite(timing.end) &&
    Number(timing.start) >= 0 &&
    Number(timing.end) > Number(timing.start)
  );
}

export interface QaRepairLoopResult<T, R extends { status: string }> {
  value: T;
  report: R;
  attempts: number;
  errors: string[];
  passed: boolean;
}

/**
 * Run bounded storyboard repairs until QA passes. A failed model/repair call
 * does not discard the candidate: the loop proceeds with the same findings
 * and exposes the previous error to the next repair attempt.
 */
export async function repairUntilPass<T, R extends { status: string }>(options: {
  initialValue: T;
  initialReport: R;
  maxAttempts?: number;
  revise: (report: R, attempt: number, previousError?: string) => Promise<T>;
  evaluate: (value: T) => R;
  onAttempt?: (attempt: number, report: R, previousError?: string) => void;
}): Promise<QaRepairLoopResult<T, R>> {
  const maxAttempts = Math.max(0, Math.min(5, Math.floor(options.maxAttempts ?? MAX_STORYBOARD_QA_REPAIR_ATTEMPTS)));
  let value = options.initialValue;
  let report = options.initialReport;
  let attempts = 0;
  let previousError: string | undefined;
  const errors: string[] = [];

  while (report.status !== 'pass' && attempts < maxAttempts) {
    attempts += 1;
    options.onAttempt?.(attempts, report, previousError);
    try {
      const revisedValue = await options.revise(report, attempts, previousError);
      const revisedReport = options.evaluate(revisedValue);
      value = revisedValue;
      report = revisedReport;
      previousError = undefined;
    } catch (error) {
      previousError = error instanceof Error ? error.message : String(error);
      errors.push(previousError.slice(0, 1200));
    }
  }

  return {
    value,
    report,
    attempts,
    errors,
    passed: report.status === 'pass'
  };
}
