import React from 'react';
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, Film, Pause, Play, RefreshCw } from 'lucide-react';
import type { AutopilotSchedulerState } from '../types';

interface AutonomousShortsDashboardProps {
  state: AutopilotSchedulerState | null;
  loading: boolean;
  error?: string | null;
  onToggle: () => void;
  onRunOnce: () => void;
  runOnceLoading: boolean;
}

function formatDate(value?: string | null): string {
  if (!value) return 'Brak ukończonych przebiegów';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Nieznany czas' : date.toLocaleString('pl-PL');
}

function statusLabel(status?: string): string {
  switch (status) {
    case 'running':
    case 'processing':
      return 'W trakcie';
    case 'queued':
      return 'W kolejce';
    case 'completed':
      return 'Gotowy';
    case 'failed':
      return 'Błąd';
    default:
      return 'Oczekuje';
  }
}

export const AutonomousShortsDashboard: React.FC<AutonomousShortsDashboardProps> = ({ state, loading, error, onToggle, onRunOnce, runOnceLoading }) => {
  const enabled = Boolean(state?.enabled);
  const runOnceDisabled = !state || runOnceLoading || state.lastRunStatus === 'running';
  const history = state?.history || [];
  const slots = state?.dailySlots?.length ? state.dailySlots : ['06:00', '11:00', '16:00', '21:00'];

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8 text-slate-100">
      <section className="overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 shadow-2xl sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-200">
              <Film className="h-3.5 w-3.5" /> Autopilot shortów
            </p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Produkcja bez ręcznego wybierania</h1>
            <p className="text-sm leading-relaxed text-slate-300">
              System sam wybiera kwalifikujący się news z Bankier.pl, tworzy polski scenariusz, dobiera materiały i renderuje pionowy short. Nie musisz wskazywać tematu, hooka, storyboardu, głosu ani ujęć.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              onClick={onRunOnce}
              disabled={runOnceDisabled}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-700/80 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {runOnceLoading || state?.lastRunStatus === 'running' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
              {runOnceLoading ? 'Uruchamiam render…' : state?.lastRunStatus === 'running' ? 'Render w toku…' : 'Renderuj jeden testowy short'}
            </button>
            {state && (
              <button
                type="button"
                onClick={onToggle}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-950/70 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                role="switch"
                aria-checked={enabled}
                aria-label="Harmonogram czterech shortów dziennie"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {enabled ? 'Wyłącz automat' : 'Włącz 4× dziennie'}
              </button>
            )}
            <p className="max-w-xs text-center text-xs text-slate-400">Jeden short z automatycznie dobranego newsu. Nie włącza harmonogramu ani publikacji.</p>
          </div>
        </div>
      </section>

      {!state ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300" role="status">
          {error ? <><AlertTriangle className="mr-2 inline h-4 w-4 text-amber-300" />{error} Ponawiam próbę automatycznie.</> : <><RefreshCw className="mr-2 inline h-4 w-4 animate-spin text-indigo-300" /> Pobieram stan automatyzacji…</>}
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status automatu</p>
              <p className={`mt-2 text-lg font-bold ${enabled ? 'text-emerald-300' : 'text-slate-300'}`}>
                {enabled ? 'Aktywny' : 'Wyłączony'}
              </p>
              <p className="mt-1 text-xs text-slate-500">{enabled ? 'Serwer sam uruchamia zaplanowane cykle.' : 'Nie będzie generowania ani selekcji newsów, dopóki automat pozostaje wyłączony.'}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Następny przebieg</p>
              <p className="mt-2 text-lg font-bold text-white">{state.nextRun?.slot || '—'}</p>
              <p className="mt-1 text-xs text-slate-400">{enabled ? state.nextRun?.countdownFormatted || 'Oczekiwanie na harmonogram' : 'Harmonogram wstrzymany'}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ostatni cykl</p>
              <p className="mt-2 text-lg font-bold text-white">{statusLabel(state.lastRunStatus)}</p>
              <p className="mt-1 text-xs text-slate-400">{formatDate(state.lastRunTime)}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Wykonane przebiegi</p>
              <p className="mt-2 text-lg font-bold text-white">{state.runsCount || 0}</p>
              <p className="mt-1 text-xs text-slate-400">Automatyczne generowanie i render</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-indigo-300" />
              <h2 className="font-bold text-white">Stały harmonogram</h2>
              <span className="text-xs text-slate-400">{slots.join(' · ')} · {state.timeZone || 'strefa czasu serwera'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <div key={slot} className={`rounded-xl border px-3 py-3 text-center font-mono text-sm ${enabled && state.nextRun?.slot === slot ? 'border-indigo-400/70 bg-indigo-500/10 text-indigo-200' : 'border-slate-800 bg-slate-950/50 text-slate-300'}`}>
                  {slot}{enabled && state.nextRun?.slot === slot ? <span className="ml-2 text-[10px] font-sans uppercase text-indigo-300">następny</span> : null}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-white">News wybierany automatycznie</h2>
              <p className="text-xs text-slate-400">{enabled ? 'Kandydat do kolejnego shorta; nie wymaga ręcznego zaznaczenia.' : 'News zostanie dobrany automatycznie po włączeniu harmonogramu.'}</p>
              </div>
              {state.candidateViralityScore && <span className="w-fit rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-bold text-pink-200">Ocena algorytmu: {state.candidateViralityScore.totalScore}/100</span>}
            </div>
            <p className="font-semibold text-slate-100">{state.candidateArticle?.title || (enabled ? 'Czekam na dostępny artykuł z Bankier.pl.' : 'Harmonogram jest wyłączony.')}</p>
            {state.candidateArticle?.description && <p className="mt-2 line-clamp-3 text-sm text-slate-400">{state.candidateArticle.description}</p>}
            {state.candidateArticle?.link && <a className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-indigo-200" href={state.candidateArticle.link} target="_blank" rel="noreferrer">Źródło: Bankier.pl <ExternalLink className="h-3 w-3" /></a>}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-white">Historia wygenerowanych shortów</h2>
                <p className="text-xs text-slate-400">Tu sprawdzisz wynik automatu i pobierzesz gotowy plik.</p>
              </div>
              <span className="text-xs text-slate-500">Pokazano {Math.min(history.length, 8)} z {history.length}</span>
            </div>
            {history.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">Po pierwszym cyklu pojawi się tu status i link do gotowego shorta.</p>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 8).map((item) => (
                  <article key={item.id || item.jobId} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {item.status === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : item.status === 'failed' ? <AlertTriangle className="h-3.5 w-3.5 text-rose-300" /> : <Clock3 className="h-3.5 w-3.5 text-amber-300" />}
                        <span className="font-semibold text-slate-200">{statusLabel(item.status)}</span>
                        <span className="text-slate-500">{formatDate(item.timestamp)}</span>
                        {item.viralityScore && <span className="text-pink-200">{item.viralityScore.totalScore}/100</span>}
                      </div>
                      <p className="line-clamp-2 text-sm font-semibold text-white">{item.articleTitle}</p>
                      {item.error && <p className="text-xs text-rose-300">{item.error}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {item.articleLink && <a href={item.articleLink} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-slate-200">News</a>}
                      {item.videoUrl && <a href={item.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-600"><ExternalLink className="h-3.5 w-3.5" /> MP4</a>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <p className="text-center text-xs leading-relaxed text-slate-500">
            Automat generuje i renderuje materiały. Nie publikuje ich samodzielnie w mediach społecznościowych; publikacja pozostaje osobnym, zatwierdzanym krokiem.
          </p>
        </>
      )}
    </main>
  );
};
