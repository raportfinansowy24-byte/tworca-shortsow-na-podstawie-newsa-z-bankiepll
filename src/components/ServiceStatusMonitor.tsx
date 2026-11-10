import React, { useEffect, useState, useCallback } from 'react';
import { Video, Film, Volume2, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Key, Clock, Activity, WifiOff } from 'lucide-react';
import { DetailedServicesHealth, ServiceHealthItem } from '../types';

interface ServiceStatusMonitorProps {
  className?: string;
  autoRefreshIntervalSeconds?: number;
}

export const ServiceStatusMonitor: React.FC<ServiceStatusMonitorProps> = ({
  className = '',
  autoRefreshIntervalSeconds = 15
}) => {
  const [data, setData] = useState<DetailedServicesHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/services/health', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Błąd HTTP ${res.status}`);
      }
      const json: DetailedServicesHealth = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      setError((err as Error).message || 'Nie udało się pobrać stanu usług');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void fetchHealth();
    }, autoRefreshIntervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, autoRefreshIntervalSeconds, fetchHealth]);

  const renderStatusBadge = (status: ServiceHealthItem['status']) => {
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ONLINE
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            OGRANICZONY
          </span>
        );
      case 'key_missing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
            <Key className="w-3.5 h-3.5 text-indigo-400" />
            BRAK KLUCZA
          </span>
        );
      case 'offline':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-700/60">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            OFFLINE
          </span>
        );
    }
  };

  const getOverallBadge = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    if (status === 'healthy') {
      return {
        text: 'Wszystkie usłu do generacji sprawne',
        bg: 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300',
        dot: 'bg-emerald-400 animate-pulse'
      };
    }
    if (status === 'degraded') {
      return {
        text: 'Wykryto ograniczenia w usługach zależnych',
        bg: 'bg-amber-950/40 border-amber-800/80 text-amber-300',
        dot: 'bg-amber-400'
      };
    }
    return {
      text: 'Błąd kluczowych usł do generacji wideo',
      bg: 'bg-rose-950/40 border-rose-800/80 text-rose-300',
      dot: 'bg-rose-400'
    };
  };

  const pexels = data?.services.pexels;
  const ffmpeg = data?.services.ffmpeg;
  const elevenLabs = data?.services.elevenLabs;
  const overall = data?.status || 'unhealthy';
  const overallBadge = getOverallBadge(overall);

  return (
    <div
      data-testid="service_status_monitor"
      className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100 tracking-wide">
              Monitoring Usług Wideo w Czasie Rzeczywistym
            </h3>
            <p className="text-xs text-slate-400">
              Pexels API · FFmpeg Renderer · ElevenLabs Voice Synthesizer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none mr-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/30"
            />
            <span>Auto-odświeżanie ({autoRefreshIntervalSeconds}s)</span>
          </label>

          <button
            data-testid="refresh_services_health_button"
            onClick={() => void fetchHealth()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors disabled:opacity-50"
            title="Odśwież stan usług"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Sprawdzanie...' : 'Odśwież'}</span>
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className={`mt-4 px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs font-medium ${overallBadge.bg}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${overallBadge.dot}`} />
          <span>{overallBadge.text}</span>
        </div>
        {lastUpdated && (
          <span className="text-slate-400 font-normal">
            Ostatni pomiar: {lastUpdated.toLocaleTimeString('pl-PL')}
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        {/* 1. Pexels API Card */}
        <div
          data-testid="pexels_health_card"
          className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Video className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm text-slate-200">Pexels API</span>
              </div>
              {pexels ? renderStatusBadge(pexels.status) : <span className="text-xs text-slate-500">...</span>}
            </div>

            <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px]">
              {pexels?.message || 'Ładowanie stanu Pexels API...'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Opóźnienie: {pexels?.latencyMs !== undefined ? `${pexels.latencyMs} ms` : '—'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Key className="w-3 h-3 text-slate-500" />
              <span>Klucz: {pexels?.hasKey ? 'Obecny' : 'Brak'}</span>
            </div>
          </div>
        </div>

        {/* 2. FFmpeg Renderer Card */}
        <div
          data-testid="ffmpeg_health_card"
          className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <Film className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm text-slate-200">FFmpeg Renderer</span>
              </div>
              {ffmpeg ? renderStatusBadge(ffmpeg.status) : <span className="text-xs text-slate-500">...</span>}
            </div>

            <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px]">
              {ffmpeg?.message || 'Ładowanie stanu FFmpeg...'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1 truncate max-w-[60%]" title={ffmpeg?.version}>
              <Clock className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate">{ffmpeg?.version ? ffmpeg.version.split(' ')[0] + ' ' + (ffmpeg.version.split(' ')[2] || '') : '—'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Kolejka:</span>
              <span className="font-medium text-slate-300">{ffmpeg?.activeJobs ?? 0} z.</span>
            </div>
          </div>
        </div>

        {/* 3. ElevenLabs Synthesizer Card */}
        <div
          data-testid="elevenlabs_health_card"
          className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                  <Volume2 className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm text-slate-200">ElevenLabs Synth</span>
              </div>
              {elevenLabs ? renderStatusBadge(elevenLabs.status) : <span className="text-xs text-slate-500">...</span>}
            </div>

            <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px]">
              {elevenLabs?.message || 'Ładowanie stanu ElevenLabs...'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Opóźnienie: {elevenLabs?.latencyMs !== undefined ? `${elevenLabs.latencyMs} ms` : '—'}</span>
            </div>
            <div className="flex items-center gap-1 truncate max-w-[50%]" title={elevenLabs?.voiceId}>
              <span className="text-slate-500 shrink-0">Głos:</span>
              <span className="font-medium text-slate-300 truncate">{elevenLabs?.voiceId ? elevenLabs.voiceId.slice(0, 8) + '...' : 'Domyślny'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
