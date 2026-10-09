import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Target,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  HelpCircle
} from 'lucide-react';
import { TrendsMonitorData, BankierTrendKeyword } from '../types';

interface TrendsMonitorPanelProps {
  onSelectKeywordNarrative?: (keyword: string, category: string) => void;
  defaultExpanded?: boolean;
}

export const TrendsMonitorPanel: React.FC<TrendsMonitorPanelProps> = ({
  onSelectKeywordNarrative,
  defaultExpanded = false
}) => {
  const [data, setData] = useState<TrendsMonitorData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [activeTab, setActiveTab] = useState<'trends' | 'funnel'>('trends');

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/news/trends-monitor');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (err) {
      console.warn('Nie udało się pobrać danych Trends Monitor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
    const timer = setInterval(fetchTrends, 60000); // Odświeżaj trendy co 60 sekund
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all">
      {/* Header bar with toggle */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Trends Monitor: Analiza Słów Kluczowych Bankier.pl
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                Cel: 10 000 € / mc
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Uzasadnienie wyborów narracyjnych SI i mechanizm konwersji wiralowej do portalu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick inline badges if collapsed */}
          {!isExpanded && data?.topKeywords && (
            <div className="hidden sm:flex items-center gap-1.5 text-[10px]">
              {data.topKeywords.slice(0, 3).map((k, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80 font-medium"
                >
                  #{idx + 1} {k.keyword.split('&')[0].trim()} ({k.sharePercent}%)
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fetchTrends();
            }}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-40"
            title="Odśwież analizę trendów"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <div className="text-slate-400">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="p-5 border-t border-slate-800 space-y-4">
          {/* Tab selector */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('trends')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'trends'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>TOP 5 Słów Kluczowych & Uzasadnienie SI</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('funnel')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'funnel'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Model 10 000 € / mc (Lejek Afiliacyjny)</span>
              </button>
            </div>

            <span className="text-[10px] text-slate-400 font-mono hidden md:block">
              Przeanalizowano: {data?.totalArticlesAnalyzed || 0} artykułów Bankier.pl
            </span>
          </div>

          {activeTab === 'trends' ? (
            <div className="space-y-4">
              {/* Algorithmic Narrative Justification Box */}
              {data?.viralNarrativeJustification && (
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Uzasadnienie Autonomicznego Wyboru Narracji przez Reżysera SI:
                  </div>
                  <p className="text-slate-200 leading-relaxed text-xs">
                    {data.viralNarrativeJustification}
                  </p>
                </div>
              )}

              {/* Top 5 Keywords Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {data?.topKeywords?.map((item: BankierTrendKeyword, idx: number) => {
                  const isTop = idx === 0;
                  return (
                    <div
                      key={idx}
                      onClick={() => onSelectKeywordNarrative?.(item.keyword, item.category)}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 cursor-pointer transition ${
                        isTop
                          ? 'bg-indigo-950/50 border-indigo-500/60 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-950/40'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`px-1.5 py-0.5 rounded font-black font-mono ${
                            isTop ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="text-indigo-400 font-bold font-mono">
                            {item.sharePercent}% uwagi
                          </span>
                        </div>

                        <div>
                          <div className="text-xs font-extrabold text-white line-clamp-2 leading-tight">
                            {item.keyword}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                            {item.category}
                          </div>
                        </div>

                        <div className="space-y-1 pt-1 border-t border-slate-900 text-[10px]">
                          <span className="text-slate-400 block font-semibold">Kąt psychologiczny:</span>
                          <p className="text-slate-300 line-clamp-2 leading-snug">
                            {item.narrativeAngle}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-900/80 space-y-1">
                        <span className="text-[9px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                          <DollarSign className="w-2.5 h-2.5" /> Konwersja 10k €:
                        </span>
                        <p className="text-[10px] text-slate-400 line-clamp-2">
                          {item.monetizationHook}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Funnel & 10 000 EUR Math Tab */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Cel Finansowy
                  </span>
                  <span className="text-xl font-black text-emerald-400 font-mono block">
                    10 000 € / mc
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ok. 43 000 PLN czystego zysku
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Średnia Prowizja CPS / CPA
                  </span>
                  <span className="text-xl font-black text-amber-400 font-mono block">
                    45,00 €
                  </span>
                  <span className="text-[10px] text-slate-400">
                    kredyty, pożyczki, konta premium
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Potrzebne Wnioski
                  </span>
                  <span className="text-xl font-black text-cyan-400 font-mono block">
                    ~7.5 / dzień
                  </span>
                  <span className="text-[10px] text-slate-400">
                    222 konwersji w miesiącu
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Docelowe Wyświetlenia Shorts
                  </span>
                  <span className="text-xl font-black text-purple-400 font-mono block">
                    ~590k / mc
                  </span>
                  <span className="text-[10px] text-slate-400">
                    4 filmy x ~5 000 views na wideo
                  </span>
                </div>
              </div>

              {/* Exact Funnel Architecture Flow */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  Rzeczywisty Lejek Konwersji (Bez Iluzji i Złudzeń):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <strong className="text-indigo-300 block mb-1">Krok 1: Wirusowy Short 9:16</strong>
                    <p className="text-slate-400">
                      Autonomiczny montaż 4x/dobę. Hook wizualny Pexels z napisem Hormozi zatrzymuje uwagę (retencja 85%+).
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <strong className="text-indigo-300 block mb-1">Krok 2: Wezwanie do Działania</strong>
                    <p className="text-slate-400">
                      Przypięty komentarz i link w bio: „Sprawdź ile zaoszczędzisz na kalkulatorze w raport-finansowy24.pl”.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <strong className="text-indigo-300 block mb-1">Krok 3: Porównywarka na Żywo</strong>
                    <p className="text-slate-400">
                      Użytkownik wprowadza kwotę i klika sprawdzoną ofertę. Routing przechodzi przez bezpieczny <code>/api/go</code>.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <strong className="text-emerald-400 block mb-1">Krok 4: Wypłata Afiliacji</strong>
                    <p className="text-slate-400">
                      Bank rozlicza wniosek (30–250 EUR). Zrealizowanie 7.5 wniosku dziennie daje 10 000 EUR zysku miesięcznie.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
