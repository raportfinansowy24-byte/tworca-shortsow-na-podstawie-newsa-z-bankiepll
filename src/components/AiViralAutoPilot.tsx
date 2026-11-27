import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AutopilotSchedulerState, JobStatusResponse, Scene } from '../types';
import { openJobEventSource } from '../utils/jobEventSource';
import { AutonomousShortsDashboard } from './AutonomousShortsDashboard';
import { normalizeStoryboardScenes } from '../utils/storyboardPreview';

interface AiViralAutoPilotProps {
  onLoadScriptToEditor: (scenes: Scene[], musicUrl?: string) => void;
  onJobStarted: (jobId: string) => void;
  onToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const AiViralAutoPilot: React.FC<AiViralAutoPilotProps> = ({ onLoadScriptToEditor, onJobStarted, onToast }) => {
  const [schedulerState, setSchedulerState] = useState<AutopilotSchedulerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [runOnceLoading, setRunOnceLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryingArticleLink, setRetryingArticleLink] = useState<string | null>(null);
  const [removingArticleLink, setRemovingArticleLink] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<JobStatusResponse | null>(null);
  const lastNotifiedJobId = useRef<string | null>(null);
  const hasLoadedInitialState = useRef(false);
  const missingJobIds = useRef(new Set<string>());
  const lastLoadedStoryboardJobId = useRef<string | null>(null);

  const refreshSchedulerState = useCallback(async () => {
    try {
      const response = await fetch('/api/autopilot/scheduler');
      const data = await response.json();
      if (!response.ok || !data.state) {
        throw new Error(data.error || 'Nie udało się pobrać stanu automatyzacji.');
      }
      setSchedulerState(data.state);
      setLoadError(null);
    } catch (error) {
      setLoadError((error as Error).message || 'Nie udało się połączyć z automatem.');
    }
  }, []);

  useEffect(() => {
    void refreshSchedulerState();
    const timer = window.setInterval(() => void refreshSchedulerState(), 15_000);
    return () => window.clearInterval(timer);
  }, [refreshSchedulerState]);

  useEffect(() => {
    if (!schedulerState) return;
    const jobId = schedulerState?.lastRunJobId;
    if (!hasLoadedInitialState.current) {
      hasLoadedInitialState.current = true;
      lastNotifiedJobId.current = jobId || null;
      return;
    }
    if (jobId && jobId !== lastNotifiedJobId.current) {
      lastNotifiedJobId.current = jobId;
      onJobStarted(jobId);
    }
  }, [schedulerState?.lastRunJobId, onJobStarted]);

  // Show the real autopilot job state on this page. Polling remains active as a fallback to SSE.
  useEffect(() => {
    const jobId = schedulerState?.lastRunJobId;
    if (!jobId || missingJobIds.current.has(jobId)) { setActiveJob(null); return; }
    let cancelled = false;
    let source: EventSource | null = null;
    let poll: number | null = null;
    const stopTrackingIfFinished = (job: JobStatusResponse) => {
      if (job.status === 'queued' || job.status === 'processing') return;
      if (poll !== null) window.clearInterval(poll);
      source?.close();
      source = null;
    };
    const refreshJob = async () => {
      try {
        const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { cache: 'no-store' });
        if (response.status === 404) {
          missingJobIds.current.add(jobId);
          if (poll !== null) window.clearInterval(poll);
          source?.close();
          source = null;
          if (!cancelled) setActiveJob(null);
          return;
        }
        if (response.ok) {
          const job = await response.json() as JobStatusResponse;
          if (!cancelled) {
            setActiveJob(job);
            stopTrackingIfFinished(job);
          }
        }
      } catch { /* Preserve the last known state during transient network failures. */ }
    };
    void refreshJob();
    poll = window.setInterval(() => void refreshJob(), 2500);
    void openJobEventSource(jobId).then((eventSource) => {
      if (cancelled) { eventSource.close(); return; }
      source = eventSource;
      eventSource.onmessage = (event) => {
        try {
          const job = JSON.parse(event.data) as JobStatusResponse;
          if (!cancelled) { setActiveJob(job); stopTrackingIfFinished(job); }
        } catch { /* HTTP polling remains the fallback for malformed events. */ }
      };
      eventSource.onerror = () => { eventSource.close(); if (source === eventSource) source = null; };
    }).catch(() => { /* HTTP polling remains active when SSE is unavailable. */ });
    return () => { cancelled = true; if (poll !== null) window.clearInterval(poll); source?.close(); };
  }, [schedulerState?.lastRunJobId]);

  // Load the actual scene assets saved with the latest Auto-Pilot job into the shared preview/editor.
  useEffect(() => {
    if (!activeJob || lastLoadedStoryboardJobId.current === activeJob.id) return;
    const rawScenes = Array.isArray(activeJob.scenes) ? activeJob.scenes : [];
    if (!rawScenes.length) return;
    const previewScenes = normalizeStoryboardScenes(rawScenes, activeJob.id);
    const hasVisualAssets = previewScenes.some((scene) =>
      Boolean(scene.videoUrl || scene.imageUrl || scene.thumbnailUrl || scene.visualSvg)
    );
    if (!previewScenes.length || !hasVisualAssets) return;

    lastLoadedStoryboardJobId.current = activeJob.id;
    const metadata = activeJob.shortMetadata || {};
    const musicUrl = typeof metadata.backgroundMusicUrl === 'string'
      ? metadata.backgroundMusicUrl
      : undefined;
    onLoadScriptToEditor(previewScenes, musicUrl);
    onToast?.('success', 'Scenorys gotowy do podglądu', `Załadowano ${previewScenes.length} scen z zadania ${activeJob.id.slice(0, 12)}.`);
  }, [activeJob, onLoadScriptToEditor, onToast]);

  const handleToggle = async () => {
    if (!schedulerState) return;
    setLoading(true);
    try {
      const response = await fetch('/api/autopilot/scheduler/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !schedulerState.enabled })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Nie udało się zmienić stanu automatu.');
      onToast?.('info', data.enabled ? 'Automat wznowiony' : 'Automat wstrzymany', data.enabled
        ? 'Zaplanowane cykle będą uruchamiać się automatycznie.'
        : 'Nowe cykle zostały wstrzymane; trwający render nie jest anulowany.');
      await refreshSchedulerState();
    } catch (error) {
      onToast?.('error', 'Nie udało się zmienić stanu automatu', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFailed = async (articleLink?: string) => {
    if (!schedulerState || retryLoading || runOnceLoading || schedulerState.lastRunStatus === 'running') return;
    setRetryLoading(true);
    if (articleLink) setRetryingArticleLink(articleLink);
    try {
      const response = await fetch('/api/autopilot/scheduler/retry-failed', {
        method: 'POST',
        headers: articleLink ? { 'Content-Type': 'application/json' } : undefined,
        body: articleLink ? JSON.stringify({ articleLink }) : undefined
      });
      const data = await response.json();
      if (!response.ok || data.success !== true) {
        throw new Error(data.error || data.message || 'Nie udało się wznowić nieudanego shorta.');
      }
      if (typeof data.jobId === 'string') {
        onJobStarted(data.jobId);
        setSchedulerState((current) => current ? {
          ...current,
          lastRunStatus: 'running',
          lastRunJobId: data.jobId,
          lastRunTime: new Date().toISOString()
        } : current);
      }
      onToast?.('success', 'Wznowiono nieudanego shorta', 'Ponawiam ten sam artykuł. Gotowy materiał nie zostanie opublikowany bez zatwierdzenia.');
      await refreshSchedulerState();
    } catch (error) {
      onToast?.('error', 'Nie udało się ponowić shorta', (error as Error).message);
      await refreshSchedulerState();
    } finally {
      setRetryLoading(false);
      setRetryingArticleLink(null);
    }
  };

  const handleRemoveRetry = async (articleLink: string) => {
    if (!articleLink || removingArticleLink || retryLoading || schedulerState?.lastRunStatus === 'running') return;
    setRemovingArticleLink(articleLink);
    try {
      const response = await fetch('/api/autopilot/scheduler/retry-failed/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleLink })
      });
      const data = await response.json();
      if (!response.ok || data.success !== true) throw new Error(data.error || 'Nie udało się usunąć wpisu.');
      onToast?.('success', 'Usunięto z kolejki', 'Wpis nie będzie już automatycznie ponawiany.');
      await refreshSchedulerState();
    } catch (error) {
      onToast?.('error', 'Nie udało się usunąć wpisu', (error as Error).message);
    } finally {
      setRemovingArticleLink(null);
    }
  };

  const handleRunOnce = async () => {
    if (!schedulerState || runOnceLoading || schedulerState.lastRunStatus === 'running') return;
    setRunOnceLoading(true);
    try {
      const response = await fetch('/api/autopilot/scheduler/run-now', { method: 'POST' });
      const data = await response.json();
      if (!response.ok || data.success !== true) {
        throw new Error(data.error || data.message || 'Nie udało się uruchomić testowego renderu.');
      }
      if (typeof data.jobId === 'string') {
        onJobStarted(data.jobId);
        setSchedulerState((current) => current ? {
          ...current,
          lastRunStatus: 'running',
          lastRunJobId: data.jobId,
          lastRunTime: new Date().toISOString()
        } : current);
      }
      onToast?.('success', 'Jeden testowy render uruchomiony', 'Powstanie jeden short. Harmonogram nie został włączony, a film nie zostanie automatycznie opublikowany.');
      await refreshSchedulerState();
    } catch (error) {
      onToast?.('error', 'Nie udało się uruchomić testowego renderu', (error as Error).message);
      await refreshSchedulerState();
    } finally {
      setRunOnceLoading(false);
    }
  };

  const jobIsActive = activeJob?.status === 'queued' || activeJob?.status === 'processing';
  const progress = typeof activeJob?.progress === 'number' && Number.isFinite(activeJob.progress)
    ? Math.max(0, Math.min(100, activeJob.progress)) : null;

  return (
    <div className="space-y-5">
    <AutonomousShortsDashboard
      state={schedulerState}
      loading={loading}
      runOnceLoading={runOnceLoading}
      error={loadError}
      onToggle={() => void handleToggle()}
      onRunOnce={() => void handleRunOnce()}
      onRetryFailed={() => void handleRetryFailed()}
      onRetryArticle={(articleLink) => void handleRetryFailed(articleLink)}
      onRemoveRetry={(articleLink) => void handleRemoveRetry(articleLink)}
      retryLoading={retryLoading}
      retryingArticleLink={retryingArticleLink}
      removingArticleLink={removingArticleLink}
    />
    {activeJob && (
      <section className="rounded-2xl border border-cyan-500/30 bg-slate-900 p-5 space-y-4" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="text-sm font-bold text-white">Postęp renderowania</h3><p className="mt-1 text-xs text-slate-400">Zadanie: <span className="font-mono">{activeJob.id}</span></p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${jobIsActive ? 'bg-cyan-500/15 text-cyan-300' : activeJob.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
            {activeJob.status === 'queued' ? 'W kolejce' : activeJob.status === 'processing' ? 'W trakcie' : activeJob.status === 'completed' ? 'Zakończono' : activeJob.status === 'cancelled' ? 'Anulowano' : 'Błąd'}
          </span>
        </div>
        <p className="text-sm text-slate-200">{activeJob.step || 'Oczekiwanie na informację o etapie…'}</p>
        {progress !== null ? <div className="space-y-1"><div className="flex justify-between text-xs text-slate-400"><span>Rzeczywisty postęp</span><span>{Math.round(progress)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} /></div></div> : <p className="text-xs text-slate-500">Backend nie udostępnił wiarygodnej wartości procentowej.</p>}
        {activeJob.error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{activeJob.error}</p>}
        {activeJob.logs && activeJob.logs.length > 0 && <div className="space-y-2"><h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ostatnie zdarzenia</h4><ol className="max-h-56 space-y-1 overflow-y-auto rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-300">{activeJob.logs.slice(-8).map((line, index) => <li key={`${activeJob.id}-${index}`} className="break-words">{line}</li>)}</ol></div>}
        {activeJob.status === 'completed' && activeJob.outputUrl && <a href={activeJob.outputUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Otwórz gotowy MP4</a>}
      </section>
    )}
    </div>
  );
};
