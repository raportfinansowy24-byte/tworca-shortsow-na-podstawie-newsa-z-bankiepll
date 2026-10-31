import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { FinanceShortPlan, QualityGateResult } from './shortPipeline';
import { getSupabaseServiceRoleKey } from './supabaseJobStore';
import { normalizeSupabaseProjectUrl } from './supabaseUrl';

export interface PipelineRunRecord {
  runId: string;
  jobId?: string;
  plan: FinanceShortPlan;
  source?: string;
  status: 'planned' | 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled';
  selectedHookVariant?: string;
}

export interface PipelineEventRecord {
  runId: string;
  jobId?: string;
  eventType: 'hook_generated' | 'hook_selected' | 'scene_started' | 'scene_completed' | 'motion_applied' | 'sfx_applied' | 'quality_gate' | 'render_completed' | 'render_failed' | 'retention_metric_received' | 'telegram_feedback' | 'revision_created';
  sceneIndex?: number;
  payload?: unknown;
}

export interface RetentionMetricRecord {
  runId?: string;
  jobId?: string;
  platform: string;
  externalVideoId?: string;
  hookText?: string;
  niche?: string;
  views?: number;
  averageWatchSeconds?: number;
  averageCompletionRate?: number;
  retention1s?: number;
  retention3s?: number;
  retention50Percent?: number;
  retention100Percent?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  capturedAt?: string;
  raw?: Record<string, unknown>;
}

export interface LearningSignal {
  platform: string;
  hookText: string;
  sampleSize: number;
  averageCompletionRate: number;
  averageWatchSeconds: number;
  averageShares: number;
}

export interface HookVariantRecord {
  runId: string;
  variantKey: string;
  hookText: string;
  selected?: boolean;
  generatedScore?: number;
}

let client: SupabaseClient | null = null;
let warned = false;

function getClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL?.trim();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    if (!warned) {
      warned = true;
      console.warn('[Pipeline telemetry] Supabase telemetry disabled: SUPABASE_URL or a supported service-role key alias missing.');
    }
    return null;
  }
  client = createClient(normalizeSupabaseProjectUrl(url), key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  return client;
}

function warnError(operation: string, error: { message?: string; code?: string } | null): void {
  if (!error) return;
  console.warn(`[Pipeline telemetry] ${operation} failed (${error.code || 'api'}): ${error.message || 'unknown error'}`);
}

export function toPlanTelemetry(run: PipelineRunRecord): Record<string, unknown> {
  const gate: QualityGateResult = run.plan.qualityGate;
  return {
    id: run.runId,
    job_id: run.jobId || null,
    plan_id: run.plan.planId,
    source: run.source || 'finance-v2',
    status: run.status,
    title: run.plan.title,
    article_url: run.plan.sourceUrl || null,
    niche: run.plan.article.category || 'Finanse',
    hook_text: run.plan.hook,
    cta_text: run.plan.cta,
    selected_hook_variant: run.selectedHookVariant || run.plan.hook,
    facts: run.plan.facts,
    plan: run.plan,
    quality_gate: gate,
    architecture: run.plan.architecture
  };
}

export async function recordPipelineRun(run: PipelineRunRecord): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from('short_pipeline_runs').upsert(toPlanTelemetry(run), { onConflict: 'id' });
  warnError('recordPipelineRun', error);
}

export async function recordHookVariants(runId: string, variants: HookVariantRecord[]): Promise<void> {
  const supabase = getClient();
  if (!supabase || variants.length === 0) return;
  const { error } = await supabase.from('short_pipeline_hook_variants').upsert(variants.map((variant) => ({
    run_id: runId,
    variant_key: variant.variantKey,
    hook_text: variant.hookText,
    selected: variant.selected === true,
    generated_score: variant.generatedScore ?? null
  })), { onConflict: 'run_id,variant_key' });
  warnError('recordHookVariants', error);
}

export async function updatePipelineRunStatus(runId: string, status: PipelineRunRecord['status'], jobId?: string, extra: Record<string, unknown> = {}): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from('short_pipeline_runs').update({ status, job_id: jobId || null, ...extra, updated_at: new Date().toISOString() }).eq('id', runId);
  warnError('updatePipelineRunStatus', error);
}

export async function recordPipelineEvent(event: PipelineEventRecord): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from('short_pipeline_events').insert({
    run_id: event.runId,
    job_id: event.jobId || null,
    event_type: event.eventType,
    scene_index: typeof event.sceneIndex === 'number' ? event.sceneIndex : null,
    payload: event.payload || {},
    occurred_at: new Date().toISOString()
  });
  warnError('recordPipelineEvent', error);
}

export async function recordRetentionMetric(metric: RetentionMetricRecord): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;
  const { error } = await supabase.from('short_retention_metrics').insert({
    run_id: metric.runId || null,
    job_id: metric.jobId || null,
    platform: metric.platform,
    external_video_id: metric.externalVideoId || null,
    hook_text: metric.hookText || null,
    niche: metric.niche || null,
    views: metric.views ?? null,
    average_watch_seconds: metric.averageWatchSeconds ?? null,
    average_completion_rate: metric.averageCompletionRate ?? null,
    retention_1s: metric.retention1s ?? null,
    retention_3s: metric.retention3s ?? null,
    retention_50_percent: metric.retention50Percent ?? null,
    retention_100_percent: metric.retention100Percent ?? null,
    likes: metric.likes ?? null,
    comments: metric.comments ?? null,
    shares: metric.shares ?? null,
    saves: metric.saves ?? null,
    captured_at: metric.capturedAt || new Date().toISOString(),
    raw: metric.raw || {}
  });
  warnError('recordRetentionMetric', error);
}

export async function getLearningSignals(niche: string, limit = 20, platform?: string): Promise<LearningSignal[]> {
  const supabase = getClient();
  if (!supabase) return [];
  let query = supabase
    .from('short_retention_metrics')
    .select('platform,hook_text,average_completion_rate,average_watch_seconds,shares')
    .eq('niche', niche)
    .not('hook_text', 'is', null)
    .order('captured_at', { ascending: false })
    .limit(5000);
  if (platform) query = query.eq('platform', platform);
  const { data, error } = await query;
  if (error) {
    warnError('getLearningSignals', error);
    return [];
  }
  const groups = new Map<string, LearningSignal & { completionTotal: number; watchTotal: number; watchSamples: number; shareTotal: number }>();
  for (const row of data || []) {
    const hookText = String((row as any).hook_text || '').trim();
    const rowPlatform = String((row as any).platform || 'unknown');
    const completion = Number((row as any).average_completion_rate);
    if (!hookText || !Number.isFinite(completion) || completion < 0 || completion > 1) continue;
    const key = `${rowPlatform}\u0000${hookText}`;
    const group = groups.get(key) || {
      platform: rowPlatform, hookText, sampleSize: 0, averageCompletionRate: 0,
      averageWatchSeconds: 0, averageShares: 0, completionTotal: 0, watchTotal: 0, watchSamples: 0, shareTotal: 0
    };
    group.sampleSize += 1;
    group.completionTotal += completion;
    const watch = Number((row as any).average_watch_seconds);
    if (Number.isFinite(watch) && watch >= 0) { group.watchTotal += watch; group.watchSamples += 1; }
    group.shareTotal += Math.max(0, Number((row as any).shares) || 0);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map(({ completionTotal, watchTotal, watchSamples, shareTotal, ...signal }) => ({
      ...signal,
      averageCompletionRate: completionTotal / signal.sampleSize,
      averageWatchSeconds: watchSamples ? watchTotal / watchSamples : 0,
      averageShares: shareTotal / signal.sampleSize
    }))
    .sort((a, b) => b.averageCompletionRate - a.averageCompletionRate)
    .slice(0, Math.min(Math.max(limit, 1), 100));
}
