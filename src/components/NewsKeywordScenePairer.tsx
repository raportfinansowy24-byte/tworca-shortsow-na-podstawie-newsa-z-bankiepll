import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Film,
  Search,
  CheckCircle2,
  RefreshCw,
  Zap,
  Tag,
  Clock,
  ChevronRight,
  TrendingUp,
  Layers,
  Sliders,
  ExternalLink,
  Eye,
  Check,
  AlertCircle
} from 'lucide-react';
import { BankierArticle, NewsContentAnalysisResult, NewsSceneSegmentKeyword, PexelsVideoItem } from '../types';

interface NewsKeywordScenePairerProps {
  article: BankierArticle | null;
  newsText?: string;
  sceneCount?: number;
  niche?: string;
  onKeywordsPaired?: (keywords: string[]) => void;
  onToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const NewsKeywordScenePairer: React.FC<NewsKeywordScenePairerProps> = ({
  article,
  newsText,
  sceneCount = 2,
  niche = 'Finanse & Biznes',
  onKeywordsPaired,
  onToast
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<NewsContentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const [customKeywords, setCustomKeywords] = useState<Record<number, string>>({});
  const [applied, setApplied] = useState<boolean>(false);

  // Automatically trigger analysis whenever a new article is selected
  useEffect(() => {
    if (article || (newsText && newsText.trim().length > 20)) {
      handleAnalyzeNews();
    } else {
      setAnalysis(null);
      setCustomKeywords({});
      setApplied(false);
    }
  }, [article?.id, article?.title, newsText]);

  const handleAnalyzeNews = async () => {
    if (!article && (!newsText || !newsText.trim())) return;

    setLoading(true);
    setError(null);
    setApplied(false);

    try {
      const res = await fetch('/api/news/analyze-scene-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article,
          newsText,
          sceneCount,
          niche
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Nie udało się przeanalizować treści newsa');
      }

      setAnalysis(data);

      // Initialize custom keywords from suggested primary keywords
      const initialKw: Record<number, string> = {};
      const kwList: string[] = [];
      data.segments?.forEach((seg: NewsSceneSegmentKeyword) => {
        initialKw[seg.sceneIndex] = seg.primaryKeyword;
        kwList.push(seg.primaryKeyword);
      });
      setCustomKeywords(initialKw);
      onKeywordsPaired?.(kwList);
      setApplied(true);

      onToast?.(
        'success',
        'Analiza newsa & Dopasowanie Pexels',
        `Przeanalizowano newsa i dopasowano słowa kluczowe dla ${data.segments?.length || 0} scen.`
      );
    } catch (err: any) {
      console.error('Error analyzing news keywords:', err);
      setError(err.message || 'Wystąpił błąd podczas analizy treści');
      onToast?.('error', 'Błąd analizy', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAlternative = (sceneIndex: number, keyword: string) => {
    setCustomKeywords((prev) => {
      const updated = { ...prev, [sceneIndex]: keyword };
      // Notify parent of updated keywords list
      const list: string[] = [];
      if (analysis?.segments) {
        analysis.segments.forEach((seg) => {
          list.push(updated[seg.sceneIndex] || seg.primaryKeyword);
        });
      }
      onKeywordsPaired?.(list);
      return updated;
    });
    setApplied(true);
    onToast?.('info', 'Zmieniono słowo Pexels', `Dla Sceny #${sceneIndex + 1} wybrano: "${keyword}"`);
  };

  const handleKeywordInputChange = (sceneIndex: number, val: string) => {
    setCustomKeywords((prev) => {
      const updated = { ...prev, [sceneIndex]: val };
      const list: string[] = [];
      if (analysis?.segments) {
        analysis.segments.forEach((seg) => {
          list.push(updated[seg.sceneIndex] || seg.primaryKeyword);
        });
      }
      onKeywordsPaired?.(list);
      return updated;
    });
    setApplied(true);
  };

  const handleApplyAll = () => {
    if (!analysis?.segments) return;
    const list: string[] = analysis.segments.map(
      (s) => customKeywords[s.sceneIndex] || s.primaryKeyword
    );
    onKeywordsPaired?.(list);
    setApplied(true);
    onToast?.('success', 'Dopasowanie aktywne', 'Słowa kluczowe zostały powiązane ze scenami Autopilota.');
  };

  if (!article && !newsText) {
    return null;
  }

  return (
    <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Analiza Treści Newsa & Dopasowanie Kadrów Pexels do Scen
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold text-[10px] flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                AUTOMATYCZNE PAROWANIE SCEN
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Inteligentny system analizuje liczby i emocje z artykułu Bankier.pl, dobierając dynamiczne angielskie zapytania do bazy Pexels dla każdej sceny.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAnalyzeNews}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-semibold text-xs transition flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Analizowanie...' : 'Odśwież analizę'}</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center gap-3 text-center">
          <div className="relative">
            <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Analizowanie treści artykułu przez Gemini AI...</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Wyodrębnianie kluczowych liczb, podmiotów rynkowych i dobieranie zapytań Pexels dla Sceny 1 (Hook 0-3s) oraz Sceny 2 (Wnioski & CTA).
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Content */}
      {analysis && !loading && (
        <div className="space-y-4">
          {/* Metadata Badges: Entities, Sentiment, Core Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px]">
            <div>
              <span className="text-slate-400 font-medium block mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-amber-400" /> Wykryte Podmioty:
              </span>
              <div className="flex flex-wrap gap-1">
                {analysis.keyEntities?.map((ent, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-semibold border border-slate-700 text-[10px]"
                  >
                    {ent}
                  </span>
                )) || <span className="text-slate-500">Rynki kapitałowe</span>}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-cyan-400" /> Napięcie Rynkowe (Hook):
              </span>
              <span className="text-cyan-300 font-semibold block leading-tight">
                {analysis.marketEmotion}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-400" /> Liczby & Wskaźniki:
              </span>
              <div className="flex flex-wrap gap-1">
                {analysis.coreMetrics?.length > 0 ? (
                  analysis.coreMetrics.map((met, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30 text-[10px]"
                    >
                      {met}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">Zgodne z publikacją</span>
                )}
              </div>
            </div>
          </div>

          {/* Segment Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {analysis.segments?.map((seg) => {
              const currentKeyword = customKeywords[seg.sceneIndex] || seg.primaryKeyword;
              const isFirst = seg.sceneIndex === 0;

              return (
                <div
                  key={seg.sceneIndex}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                    isFirst
                      ? 'bg-gradient-to-b from-amber-950/20 to-slate-950/80 border-amber-500/40'
                      : 'bg-gradient-to-b from-indigo-950/20 to-slate-950/80 border-indigo-500/40'
                  }`}
                >
                  {/* Segment Header */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          isFirst
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-indigo-500 text-white'
                        }`}
                      >
                        {isFirst ? '⚡ SCENA 1 • HOOK (0–3s)' : `📊 SCENA ${seg.sceneIndex + 1} • FAKTY & CTA`}
                      </span>

                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {isFirst ? '9.0 sekundy (Pexels #1)' : '9.0 sekundy (Pexels #2)'}
                      </span>
                    </div>

                    <h5 className="text-xs font-bold text-white pt-1">
                      {seg.segmentName}
                    </h5>

                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {seg.narrativeRole}
                    </p>
                  </div>

                  {/* Primary Keyword Input */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                      <span>Dopasowane słowo Pexels (9:16):</span>
                      <span className="text-amber-400 lowercase font-mono text-[10px]">EN Query</span>
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        value={currentKeyword}
                        onChange={(e) => handleKeywordInputChange(seg.sceneIndex, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg py-1.5 px-3 text-xs text-white font-mono placeholder-slate-500 focus:outline-none transition"
                        placeholder="Wpisz zapytanie po angielsku..."
                      />
                    </div>
                  </div>

                  {/* Alternative Keyword Chips */}
                  {seg.alternativeKeywords && seg.alternativeKeywords.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        Alternatywne ujęcia (kliknij, aby podmienić):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {seg.alternativeKeywords.map((altKw, aIdx) => {
                          const isSelected = currentKeyword.toLowerCase() === altKw.toLowerCase();
                          return (
                            <button
                              key={aIdx}
                              type="button"
                              onClick={() => handleSelectAlternative(seg.sceneIndex, altKw)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition border text-left cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                                  : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white hover:border-slate-600'
                              }`}
                            >
                              {altKw}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reasoning & Visual Mood */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/60 text-[10px] text-slate-300 space-y-1">
                    <p className="leading-relaxed">
                      <strong className="text-amber-300">Styl wizualny:</strong> {seg.visualMood}
                    </p>
                    <p className="text-slate-400 leading-relaxed italic">
                      💡 {seg.reasoning}
                    </p>
                  </div>

                  {/* Pexels Thumbnail Previews */}
                  {seg.previewVideos && seg.previewVideos.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium flex items-center justify-between">
                        <span>Kadry dopasowane z Pexels:</span>
                        <span className="text-emerald-400 font-mono text-[10px]">Zweryfikowane 9:16</span>
                      </span>

                      <div className="grid grid-cols-3 gap-1.5">
                        {seg.previewVideos.slice(0, 3).map((vid, vIdx) => (
                          <div
                            key={vIdx}
                            className="relative aspect-[9/16] rounded-lg overflow-hidden bg-slate-950 border border-slate-800 group"
                          >
                            <img
                              src={vid.thumbnailUrl}
                              alt={seg.primaryKeyword}
                              className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1">
                              <span className="text-[9px] text-white/90 font-mono truncate">
                                {vid.photographer || 'Pexels'}
                              </span>
                              {vid.duration && (
                                <span className="text-[8px] text-amber-300 font-mono">
                                  {vid.duration}s
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 text-[11px]">
                {applied
                  ? 'Słowa kluczowe zostały sparowane ze scenami. Autopilot użyje ich podczas montażu.'
                  : 'Dopasuj słowa lub zatwierdź rekomendacje dla wszystkich scen.'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleApplyAll}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Check className="w-4 h-4 text-slate-950" />
              <span>Zastosuj Słowa do Autopilota</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
