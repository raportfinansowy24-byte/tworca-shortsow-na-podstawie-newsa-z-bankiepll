import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type RenderJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type DriveExportStatus = 'uploading' | 'completed' | 'failed';
export type TelegramApprovalStatus = 'waiting_for_render' | 'pending' | 'approved' | 'rejected' | 'failed_to_send';

export interface ShortJobSnapshot {
  id: string;
  source?: string;
  status: RenderJobStatus;
  progress: number;
  step?: string;
  error?: string;
  title?: string;
  articleTitle?: string;
  articleUrl?: string;
  articleCategory?: string;
  scenes?: unknown[];
  shortMetadata?: Record<string, unknown>;
  outputUrl?: string;
  outputFilename?: string;
  thumbnailUrl?: string;
  thumbnailFilename?: string;
  duration?: number;
  fileSize?: number;
  exportStatus?: 'not_started' | DriveExportStatus;
  driveFileId?: string;
  driveUrl?: string;
  driveFileName?: string;
  exportError?: string;
  telegramApprovalStatus?: TelegramApprovalStatus;
  telegramApprovalMessageId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShortJobExportSnapshot {
  id: string;
  jobId: string;
  provider: 'google_drive';
  status: DriveExportStatus;
  driveFileId?: string;
  driveWebViewLink?: string;
  driveFileName?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
  updatedAt: string;
}

let client: SupabaseClient | null = null;
let configurationChecked = false;
let configurationError: string | null = null;
const warnedMessages = new Set<string>();
const pendingJobs = new Map<string, ShortJobSnapshot>();
const flushTimers = new Map<string, NodeJS.Timeout>();
const jobWriteChains = new Map<string, Promise<void>>();
const JOB_SNAPSHOT_INTERVAL_MS = 2000;

function warnOnce(key: string, message: string): void {
  if (warnedMessages.has(key)) return;
  warnedMessages.add(key);
  console.warn(message);
}

function getServiceRoleKeyKind(key: string): 'service_role' | 'not_service_role' {
  if (key.startsWith('sb_secret_')) return 'service_role';
  const parts = key.split('.');
  if (parts.length !== 3) return 'not_service_role';
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { role?: string };
    return payload.role === 'service_role' ? 'service_role' : 'not_service_role';
  } catch {
    return 'not_service_role';
  }
}

function getSupabaseClient(): SupabaseClient | null {
  if (client) return client;
  if (configurationChecked && configurationError) return null;
  configurationChecked = true;

  const url = process.env.SUPABASE_URL?.trim() || '';
  const key = process.env.SUPABASE_KEY?.trim() || '';
  if (!url || !key) {
    configurationError = 'missing';
    warnOnce('config-missing', '[Supabase] Historia zadań wyłączona: ustaw SUPABASE_URL i SUPABASE_KEY (server-side service role).');
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname) throw new Error('invalid url');
  } catch {
    configurationError = 'invalid-url';
    warnOnce('config-url', '[Supabase] Historia zadań wyłączona: SUPABASE_URL musi być pełnym adresem HTTPS projektu.');
    return null;
  }

  if (getServiceRoleKeyKind(key) !== 'service_role') {
    configurationError = 'invalid-key';
    warnOnce('config-key', '[Supabase] Historia zadań wyłączona: SUPABASE_KEY musi być kluczem secret/service_role używanym wyłącznie po stronie serwera.');
    return null;
  }

  client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: { headers: { 'X-Client-Info': 'raportfinansowy24-short-history/1.0' } }
  });
  return client;
}

export function toSupabaseJobRow(job: ShortJobSnapshot): Record<string, unknown> {
  return {
    id: job.id,
    source: job.source || 'unknown',
    status: job.status,
    progress: job.progress,
    step: job.step || null,
    error: job.error || null,
    title: job.title || null,
    article_title: job.articleTitle || null,
    article_url: job.articleUrl || null,
    article_category: job.articleCategory || null,
    scenes: Array.isArray(job.scenes) ? job.scenes : [],
    short_metadata: job.shortMetadata || {},
    output_url: job.outputUrl || null,
    output_filename: job.outputFilename || null,
    thumbnail_url: job.thumbnailUrl || null,
    thumbnail_filename: job.thumbnailFilename || null,
    duration_seconds: typeof job.duration === 'number' ? job.duration : null,
    file_size_bytes: typeof job.fileSize === 'number' ? job.fileSize : null,
    export_status: job.exportStatus || 'not_started',
    drive_file_id: job.driveFileId || null,
    drive_web_view_link: job.driveUrl || null,
    drive_file_name: job.driveFileName || null,
    export_error: job.exportError || null,
    telegram_approval_status: job.telegramApprovalStatus || null,
    telegram_message_id: typeof job.telegramApprovalMessageId === 'number' ? job.telegramApprovalMessageId : null,
    created_at: job.createdAt,
    updated_at: job.updatedAt
  };
}

export function rowToShortJobSnapshot(row: Record<string, any>): ShortJobSnapshot {
  return {
    id: String(row.id),
    source: row.source || 'unknown',
    status: row.status,
    progress: Number(row.progress || 0),
    step: row.step || undefined,
    error: row.error || undefined,
    title: row.title || undefined,
    articleTitle: row.article_title || undefined,
    articleUrl: row.article_url || undefined,
    articleCategory: row.article_category || undefined,
    scenes: Array.isArray(row.scenes) ? row.scenes : [],
    shortMetadata: row.short_metadata && typeof row.short_metadata === 'object' ? row.short_metadata : {},
    outputUrl: row.output_url || undefined,
    outputFilename: row.output_filename || undefined,
    thumbnailUrl: row.thumbnail_url || undefined,
    thumbnailFilename: row.thumbnail_filename || undefined,
    duration: typeof row.duration_seconds === 'number' ? row.duration_seconds : undefined,
    fileSize: typeof row.file_size_bytes === 'number' ? Number(row.file_size_bytes) : undefined,
    exportStatus: row.export_status || 'not_started',
    driveFileId: row.drive_file_id || undefined,
    driveUrl: row.drive_web_view_link || undefined,
    driveFileName: row.drive_file_name || undefined,
    exportError: row.export_error || undefined,
    telegramApprovalStatus: ['waiting_for_render', 'pending', 'approved', 'rejected', 'failed_to_send'].includes(row.telegram_approval_status)
      ? row.telegram_approval_status as TelegramApprovalStatus
      : undefined,
    telegramApprovalMessageId: typeof row.telegram_message_id === 'number' ? row.telegram_message_id : undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString()
  };
}

function snapshotCopy(job: ShortJobSnapshot): ShortJobSnapshot {
  return JSON.parse(JSON.stringify(job)) as ShortJobSnapshot;
}

async function performJobUpsert(job: ShortJobSnapshot): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { error } = await supabase.from('short_jobs').upsert(toSupabaseJobRow(job), { onConflict: 'id' });
  if (error) {
    warnOnce(`job-write:${error.code || error.message}`, `[Supabase] Nie udało się zapisać historii zadania (${error.code || 'błąd API'}). Sprawdź migrację i konfigurację; renderowanie będzie kontynuowane.`);
    return false;
  }
  return true;
}

async function flushJob(jobId: string): Promise<boolean> {
  const timer = flushTimers.get(jobId);
  if (timer) clearTimeout(timer);
  flushTimers.delete(jobId);

  let allSucceeded = true;
  let lastWrite: Promise<void> | null = null;
  while (pendingJobs.has(jobId)) {
    const snapshot = pendingJobs.get(jobId)!;
    pendingJobs.delete(jobId);
    const previousWrite = jobWriteChains.get(jobId) || Promise.resolve();
    let succeeded = false;
    const write = previousWrite.catch(() => undefined).then(async () => {
      succeeded = await performJobUpsert(snapshot);
    });
    jobWriteChains.set(jobId, write);
    lastWrite = write;
    await write;
    allSucceeded = allSucceeded && succeeded;
  }

  if (lastWrite && jobWriteChains.get(jobId) === lastWrite && !pendingJobs.has(jobId)) {
    jobWriteChains.delete(jobId);
  }
  return allSucceeded;
}

export async function persistShortJobSnapshot(job: ShortJobSnapshot): Promise<boolean> {
  if (!getSupabaseClient()) return false;
  pendingJobs.set(job.id, snapshotCopy(job));
  return flushJob(job.id);
}

/** Coalesces noisy render progress; lifecycle transitions and artifacts flush immediately. */
export function queueShortJobSnapshot(job: ShortJobSnapshot, immediate = false): void {
  if (!getSupabaseClient()) return;
  pendingJobs.set(job.id, snapshotCopy(job));

  if (immediate || ['completed', 'failed', 'cancelled'].includes(job.status)) {
    void flushJob(job.id);
    return;
  }

  if (!flushTimers.has(job.id)) {
    const timer = setTimeout(() => void flushJob(job.id), JOB_SNAPSHOT_INTERVAL_MS);
    timer.unref?.();
    flushTimers.set(job.id, timer);
  }
}

export async function loadShortJobsFromSupabase(limit = 1000): Promise<ShortJobSnapshot[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 5000);
  const { data, error } = await supabase
    .from('short_jobs')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(boundedLimit);
  if (error) {
    warnOnce(`job-read:${error.code || error.message}`, `[Supabase] Nie udało się odczytać historii zadań (${error.code || 'błąd API'}).`);
    return [];
  }
  return (data || []).map((row) => rowToShortJobSnapshot(row as Record<string, any>));
}

export async function upsertShortJobsBatch(jobs: ShortJobSnapshot[]): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || jobs.length === 0) return Boolean(supabase);
  for (let index = 0; index < jobs.length; index += 100) {
    const batch = jobs.slice(index, index + 100).map(toSupabaseJobRow);
    const { error } = await supabase.from('short_jobs').upsert(batch, { onConflict: 'id' });
    if (error) {
      warnOnce(`job-batch:${error.code || error.message}`, `[Supabase] Nie udało się przenieść części lokalnej historii zadań (${error.code || 'błąd API'}).`);
      return false;
    }
  }
  return true;
}

export async function upsertShortJobExport(exportRecord: ShortJobExportSnapshot): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { error } = await supabase.from('short_job_exports').upsert({
    id: exportRecord.id,
    job_id: exportRecord.jobId,
    provider: exportRecord.provider,
    status: exportRecord.status,
    drive_file_id: exportRecord.driveFileId || null,
    drive_web_view_link: exportRecord.driveWebViewLink || null,
    drive_file_name: exportRecord.driveFileName || null,
    error: exportRecord.error || null,
    started_at: exportRecord.startedAt,
    completed_at: exportRecord.completedAt || null,
    updated_at: exportRecord.updatedAt
  }, { onConflict: 'id' });

  if (error) {
    warnOnce(`export-write:${error.code || error.message}`, `[Supabase] Nie udało się zapisać statusu eksportu (${error.code || 'błąd API'}).`);
    return false;
  }
  return true;
}
