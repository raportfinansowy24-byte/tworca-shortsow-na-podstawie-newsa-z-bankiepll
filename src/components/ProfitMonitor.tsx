import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  Eye,
  EyeOff,
  Percent,
  Play
} from 'lucide-react';
import { ProfitMonitorState, VideoProfitLog } from '../types';

interface ProfitMonitorProps {
  profitState: ProfitMonitorState;
  onRefresh?: () => void;
  /**
   * Pozwala użytkownikowi zachować narzędzie ukryte/dyskretne
   * zgodnie z wytyczną: "To narzędzie nie musi być dla mnie widoczne."
   */
  initiallyHidden?: boolean;
}

export const ProfitMonitor: React.FC<ProfitMonitorProps> = ({
  profitState,
  onRefresh,
  initiallyHidden = true
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(!initiallyHidden);
  const [activeTab, setActiveTab] = useState<'overview' | 'logs'>('overview');

  const {
    targetGoalEur,
    totalProjectedEur,
    progressPercent,
    remainingEur,
    totalCompletedVideos,
    dailyProjectedEur,
    avgEurPerVideo,
    videosNeededToGoal,
    logs
  } = profitState;

  return (
    <div className="bg-slate-950/90 border border-emerald-500/30 rounded-2xl overflow-hidden shadow-2xl transition-all">
      {/* Discreet Header Bar (Minimalistyczny pasek z możliwością rozwinięcia) */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-950 flex items-center justify-between cursor-pointer hover:bg-slate-900/80 transition select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-black text-white tracking-wide flex items-center gap-1.5">
              Profit Monitor <span className="text-emerald-400 font-mono text-[11px] font-bold">10 000 € Goal</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
              {progressPercent.toFixed(1)}% ({totalProjectedEur.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Do celu: <strong className="text-emerald-300">{remainingEur.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</strong> ({videosNeededToGoal} wideo)
          </span>
          <div className="text-slate-400 hover:text-white transition">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Detailed Dashboard */}
      {isOpen && (
        <div className="p-5 border-t border-slate-800/80 space-y-4">
          {/* Progress Bar towards 10,000 EUR */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Postęp celu: <strong>10 000,00 € miesięcznie</strong>
              </span>
              <span className="font-bold text-emerald-400 font-mono">
                {totalProjectedEur.toFixed(2)} € / {targetGoalEur.toFixed(2)} € ({progressPercent.toFixed(1)}%)
              </span>
            </div>

            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/50"
                style={{ width: `${Math.min(Math.max(progressPercent, 2), 100)}%` }}
              />
            </div>
          </div>

          {/* 4 Financial Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                Wygenerowane Filmy
              </span>
              <span className="text-lg font-black text-white font-mono block">
                {totalCompletedVideos}
              </span>
              <span className="text-[10px] text-slate-400">
                autonomiczny lejek
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                Średnia Prognoza / Film
              </span>
              <span className="text-lg font-black text-emerald-400 font-mono block">
                {avgEurPerVideo.toFixed(2)} €
              </span>
              <span className="text-[10px] text-slate-400">
                konwersja CPS/CPA
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                Dzienny Run-Rate (4x wideo)
              </span>
              <span className="text-lg font-black text-teal-300 font-mono block">
                {dailyProjectedEur.toFixed(2)} €
              </span>
              <span className="text-[10px] text-slate-400">
                4 publikacje / dobę
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                Pozostało do 10 000 €
              </span>
              <span className="text-lg font-black text-amber-300 font-mono block">
                {remainingEur.toFixed(2)} €
              </span>
              <span className="text-[10px] text-slate-400">
                potrzeba jeszcze ~{videosNeededToGoal} filmów
              </span>
            </div>
          </div>

          {/* Projected Earnings Log Per Video */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Rejestr prognozowanego dochodu dla wygenerowanych filmów:
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Zarejestrowano wydań: {logs.length}
              </span>
            </div>

            {logs.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-center text-slate-400">
                Brak zarejestrowanych filmów w bieżącej sesji. Po wygenerowaniu pierwszego Shorta pojawi się tu kalkulacja przychodu.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-[10px] font-bold">
                          {log.slot === 'manual' ? 'Ręczny' : log.slot}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-indigo-300 text-[10px] font-semibold">
                          {log.productCategory}
                        </span>
                      </div>
                      <div className="text-white font-semibold line-clamp-1" title={log.videoTitle}>
                        {log.videoTitle}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto font-mono text-xs">
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block">Prognoza:</span>
                        <span className="text-emerald-400 font-bold font-mono">
                          +{log.projectedEur.toFixed(2)} €
                        </span>
                      </div>
                      <div className="text-right border-l border-slate-800 pl-3">
                        <span className="text-slate-400 text-[10px] block">Wnioski:</span>
                        <span className="text-slate-200 font-bold">
                          ~{log.estApplications} szt.
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
