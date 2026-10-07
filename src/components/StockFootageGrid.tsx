import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Film,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Search,
  ExternalLink,
  Sparkles,
  Maximize2,
  X,
  Check,
  Zap,
  ArrowRight,
  Eye,
  Sliders,
  Layers,
  Camera
} from 'lucide-react';
import { ViralScene, PexelsVideoItem } from '../types';

export interface StockFootageGridProps {
  /** List of scenes with videoUrl, thumbnailUrl, subtitles, duration */
  scenes: ViralScene[];
  /** Callback when user changes/replaces video footage for a scene */
  onUpdateSceneVideo?: (sceneIndex: number, newVideo: { videoUrl: string; thumbnailUrl: string; searchKeyword?: string; photographer?: string; source?: 'pexels' | 'curated' }) => void;
  /** Callback to start rendering after verification */
  onStartRender?: (verifiedScenes: ViralScene[]) => void;
  /** Callback to re-fetch/regenerate stock footage for all scenes */
  onRefreshAllFootage?: () => void;
  /** Whether rendering is currently starting / processing */
  isRendering?: boolean;
  /** Whether footage is currently being fetched/refreshed */
  isLoadingFootage?: boolean;
  /** Toast notifier */
  onToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const StockFootageGrid: React.FC<StockFootageGridProps> = ({
  scenes,
  onUpdateSceneVideo,
  onStartRender,
  onRefreshAllFootage,
  isRendering = false,
  isLoadingFootage = false,
  onToast
}) => {
  // Verification state for each scene index
  const [verifiedScenes, setVerifiedScenes] = useState<Record<number, boolean>>({});

  // Active clip preview modal state
  const [previewClip, setPreviewClip] = useState<{
    sceneIndex: number;
    videoUrl: string;
    thumbnailUrl?: string;
    subtitles: string;
    searchKeyword?: string;
    photographer?: string;
  } | null>(null);

  // Swap / Picker modal state for a specific scene
  const [swapModalSceneIndex, setSwapModalSceneIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PexelsVideoItem[]>([]);
  const [searchingPexels, setSearchingPexels] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [quickSwappingIndex, setQuickSwappingIndex] = useState<number | null>(null);

  // Initialize all scenes as verified by default (or let user toggle)
  useEffect(() => {
    if (scenes && scenes.length > 0) {
      const initial: Record<number, boolean> = {};
      scenes.forEach((_, idx) => {
        initial[idx] = true;
      });
      setVerifiedScenes(initial);
    }
  }, [scenes.length]);

  const toggleVerify = (idx: number) => {
    setVerifiedScenes((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const allVerified = scenes.length > 0 && scenes.every((_, idx) => verifiedScenes[idx] !== false);
  const verifiedCount = scenes.filter((_, idx) => verifiedScenes[idx] !== false).length;

  // Instant 1-click Viral Boost swap: fetches top-scoring dynamic clip from Pexels for a scene
  const handleQuickDynamicSwap = async (sceneIndex: number) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    setQuickSwappingIndex(sceneIndex);
    try {
      const isHook = sceneIndex === 0;
      const viralBase = isHook ? 'stock exchange screen numbers flashing' : 'dynamic financial stock market display animation';
      const q = scene.searchKeyword || viralBase;
      const res = await fetch(`/api/stock/search-pexels?query=${encodeURIComponent(q)}&per_page=12`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd pobierania ujęć z Pexels');
      
      const videos: PexelsVideoItem[] = data.videos || [];
      if (videos.length > 0) {
        // Pick a video with different URL from current scene
        const otherVideos = videos.filter((v) => v.videoUrl !== scene.videoUrl);
        const selected = otherVideos.length > 0 ? otherVideos[0] : videos[0];
        
        onUpdateSceneVideo?.(sceneIndex, {
          videoUrl: selected.videoUrl,
          thumbnailUrl: selected.thumbnailUrl,
          searchKeyword: selected.searchKeyword || q,
          photographer: selected.photographer,
          source: selected.source || 'pexels'
        });
        setVerifiedScenes((prev) => ({ ...prev, [sceneIndex]: true }));
        onToast?.('success', '⚡ Viral Boost Aktywowany', `Scena #${sceneIndex + 1} otrzymała dynamiczne, wyselekcjonowane ujęcie 9:16 z Pexels!`);
      } else {
        onToast?.('info', 'Brak alternatyw', 'Pexels nie zwrócił dodatkowych ujęć dla tego zapytania.');
      }
    } catch (err) {
      onToast?.('error', 'Błąd Viral Boost', (err as Error).message);
    } finally {
      setQuickSwappingIndex(null);
    }
  };

  // Open swap modal and trigger initial search for the scene's keyword
  const handleOpenSwapModal = async (sceneIndex: number) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    setSwapModalSceneIndex(sceneIndex);
    const initialQuery = scene.searchKeyword || 'stock market chart finance';
    setSearchQuery(initialQuery);
    fetchPexelsAlternatives(initialQuery);
  };

  const fetchPexelsAlternatives = async (query: string) => {
    if (!query.trim()) return;
    setSearchingPexels(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/stock/search-pexels?query=${encodeURIComponent(query.trim())}&per_page=12`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Nie udało się pobrać ujęć z Pexels');
      }
      setSearchResults(data.videos || []);
      if ((data.videos || []).length === 0) {
        setSearchError('Brak ujęć pionowych dla tego hasła. Spróbuj innego zapytania.');
      }
    } catch (err) {
      const msg = (err as Error).message;
      setSearchError(msg);
      onToast?.('error', 'Błąd Pexels', msg);
    } finally {
      setSearchingPexels(false);
    }
  };

  const handleSelectAlternative = (video: PexelsVideoItem) => {
    if (swapModalSceneIndex === null) return;
    onUpdateSceneVideo?.(swapModalSceneIndex, {
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      searchKeyword: searchQuery,
      photographer: video.photographer,
      source: video.source || 'pexels'
    });
    setVerifiedScenes((prev) => ({ ...prev, [swapModalSceneIndex]: true }));
    onToast?.('success', 'Podmieniono ujęcie', `Wybrano nowe ujęcie z Pexels dla Sceny #${swapModalSceneIndex + 1}`);
    setSwapModalSceneIndex(null);
  };

  if (!scenes || scenes.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/95 border border-indigo-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Verification Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 relative z-10">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Siatka Wizualna Materiałów Wideo (Pexels)
            </span>
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
              Format 9:16 Portrait HD
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
              {verifiedCount} / {scenes.length} Zweryfikowane
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Film className="w-6 h-6 text-indigo-400" />
            Weryfikacja Miniatur & Ujęć Przed Renderowaniem
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Sprawdź miniatury ujęć stockowych pobranych z Pexels dla każdej sceny. Możesz odtworzyć podgląd wideo, wymienić ujęcie na inne z bazy Pexels, lub jednym kliknięciem zatwierdzić montaż.
          </p>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onRefreshAllFootage && (
            <button
              type="button"
              onClick={onRefreshAllFootage}
              disabled={isLoadingFootage || isRendering}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-2 shadow-sm"
              title="Pobierz inne ujęcia Pexels dla wszystkich scen"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoadingFootage ? 'animate-spin' : ''}`} />
              <span>Odśwież ujęcia</span>
            </button>
          )}

          {onStartRender && (
            <button
              type="button"
              onClick={() => onStartRender(scenes)}
              disabled={isRendering}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950/60 transition flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {isRendering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Uruchamianie Renderera...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                  <span>Zatwierdź & Renderuj FFmpeg</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Visual Grid of Video Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
        {scenes.map((scene, idx) => {
          const isVerified = verifiedScenes[idx] !== false;
          const isHookScene = idx === 0;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col bg-slate-950/80 shadow-xl ${
                isVerified
                  ? 'border-emerald-500/40 hover:border-emerald-500/70 ring-1 ring-emerald-500/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Scene Card Header Bar */}
              <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isHookScene
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  }`}>
                    {isHookScene ? '⚡ Scena 1: Viral Hook' : `🎬 Scena ${idx + 1}: Analiza & CTA`}
                  </span>

                  <span className="text-slate-400 text-xs font-mono font-medium">
                    ⏱️ {scene.duration || 9.0}s
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1">
                    <Camera className="w-3 h-3 text-cyan-400" />
                    {scene.source === 'pexels' ? 'Pexels 9:16 HD' : 'Stock 9:16'}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleVerify(idx)}
                    className={`p-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      isVerified
                        ? 'text-emerald-400 hover:text-emerald-300'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title={isVerified ? 'Ujęcie zweryfikowane' : 'Kliknij, aby zweryfikować'}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${isVerified ? 'text-emerald-400' : 'text-slate-600'}`} />
                  </button>
                </div>
              </div>

              {/* Main Visual Thumbnail & Video Preview Frame */}
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-slate-950 overflow-hidden group cursor-pointer"
                onClick={() => setPreviewClip({
                  sceneIndex: idx,
                  videoUrl: scene.videoUrl,
                  thumbnailUrl: scene.thumbnailUrl,
                  subtitles: scene.subtitles,
                  searchKeyword: scene.searchKeyword,
                  photographer: scene.photographer
                })}
              >
                {scene.thumbnailUrl ? (
                  <img
                    src={scene.thumbnailUrl}
                    alt={scene.searchKeyword || `Ujęcie dla sceny ${idx + 1}`}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <video
                    src={scene.videoUrl}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                  />
                )}

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                {/* Top Badges over Thumbnail */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                  <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[11px] font-mono font-semibold flex items-center gap-1 shadow-md">
                    <Film className="w-3 h-3 text-indigo-400" />
                    Pexels Clip
                  </span>

                  {isVerified && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> Zweryfikowano
                    </span>
                  )}
                </div>

                {/* Center Hover Play Button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/90 backdrop-blur-md text-white flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:bg-indigo-500 transition-all duration-200">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Subtitle preview strip at the bottom of the thumbnail */}
                <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-black/85 backdrop-blur-md border border-slate-700/60 shadow-lg pointer-events-none">
                  <div className="text-[10px] font-semibold text-yellow-300 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    Wypalane napisy Montserrat:
                  </div>
                  <div className="text-xs font-bold text-white leading-tight line-clamp-2">
                    "{scene.subtitles}"
                  </div>
                </div>
              </div>

              {/* Card Footer / Details & Action Controls */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 gap-2">
                    <span className="flex items-center gap-1 truncate font-mono text-cyan-300">
                      <Search className="w-3 h-3 text-cyan-400 shrink-0" />
                      Hasło Pexels: <strong className="text-slate-200">"{scene.searchKeyword || 'finance chart'}"</strong>
                    </span>
                    {scene.photographer && (
                      <span className="shrink-0 text-slate-500 text-[10px] truncate max-w-[120px]">
                        fot. {scene.photographer}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Control Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setPreviewClip({
                      sceneIndex: idx,
                      videoUrl: scene.videoUrl,
                      thumbnailUrl: scene.thumbnailUrl,
                      subtitles: scene.subtitles,
                      searchKeyword: scene.searchKeyword,
                      photographer: scene.photographer
                    })}
                    className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 border border-slate-700/70"
                    title="Odtwórz pełne wideo 9:16"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">Podgląd</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDynamicSwap(idx)}
                    disabled={quickSwappingIndex === idx}
                    className="flex-1 py-2 px-2.5 bg-gradient-to-r from-amber-600/30 to-orange-600/30 hover:from-amber-600/50 hover:to-orange-600/50 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-amber-500/40 shadow-sm disabled:opacity-50"
                    title="Automatycznie pobierz inne, ultra-dynamiczne ujęcie 9:16 z Pexels dla tej sceny"
                  >
                    <Zap className={`w-3.5 h-3.5 text-amber-400 fill-amber-400 ${quickSwappingIndex === idx ? 'animate-bounce' : ''}`} />
                    <span>{quickSwappingIndex === idx ? 'Dobieranie...' : '⚡ Viral Boost'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSwapModal(idx)}
                    className="py-2 px-2.5 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 hover:text-indigo-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 border border-indigo-500/30"
                    title="Przeszukaj bazę Pexels ręcznie"
                  >
                    <Search className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Szukaj</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleVerify(idx)}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center shrink-0 ${
                      isVerified
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                    title={isVerified ? 'Odznacz weryfikację' : 'Oznacz jako zweryfikowane'}
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Summary & Confirmation Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-emerald-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Wszystkie ujęcia Pexels gotowe do montażu</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                100% Zweryfikowane
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Ujęcia 9:16 są zsynchronizowane z czasem lektora i napisami Montserrat-Bold. Kliknij poniżej, aby zrenderować plik MP4.
            </p>
          </div>
        </div>

        {onStartRender && (
          <button
            type="button"
            onClick={() => onStartRender(scenes)}
            disabled={isRendering}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-xl shadow-xl shadow-emerald-950/60 transition flex items-center justify-center gap-2 shrink-0 active:scale-95 disabled:opacity-50"
          >
            {isRendering ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Renderowanie w toku...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                <span>🚀 Uruchom Renderowanie FFmpeg</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Modal 1: Video Preview Modal (Watch Full Vertical Video) */}
      <AnimatePresence>
        {previewClip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-bold text-white">
                    Podgląd Ujęcia: Scena #{previewClip.sceneIndex + 1}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                    Pexels 9:16
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewClip(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Video Player */}
              <div className="relative aspect-[9/16] max-h-[460px] mx-auto rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner">
                <video
                  src={previewClip.videoUrl}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  loop
                  playsInline
                />

                {/* Subtitle simulation overlay */}
                <div className="absolute bottom-4 left-3 right-3 p-3 rounded-xl bg-black/80 backdrop-blur-md border border-slate-700/60 pointer-events-none text-center">
                  <div className="text-xs font-black text-yellow-300 uppercase tracking-wide">
                    "{previewClip.subtitles}"
                  </div>
                </div>
              </div>

              {/* Info & Footer */}
              <div className="text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <span>Zapytanie: <strong className="text-slate-200">"{previewClip.searchKeyword}"</strong></span>
                {previewClip.photographer && (
                  <span>Fotograf: <strong className="text-slate-200">{previewClip.photographer}</strong></span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenSwapModal(previewClip.sceneIndex);
                    setPreviewClip(null);
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Wymień to ujęcie z bazy Pexels</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Pexels Stock Footage Alternative Picker Modal */}
      <AnimatePresence>
        {swapModalSceneIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      Wybierz Alternatywne Ujęcie z Pexels dla Sceny #{swapModalSceneIndex + 1}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Wyszukaj dowolne ujęcie wideo 9:16 i kliknij miniaturę, aby natychmiast zamienić klip.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSwapModalSceneIndex(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchPexelsAlternatives(searchQuery);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Wpisz hasło po angielsku lub polsku (np. stock market, gold vault, city night)..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={searchingPexels || !searchQuery.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0"
                >
                  {searchingPexels ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Szukaj w Pexels</span>
                </button>
              </form>

              {/* Quick Preset Keywords */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] text-slate-400 font-semibold">Viral Presety:</span>
                {[
                  { label: '⚡ Flashing Charts & Liczby', query: 'stock exchange screen numbers flashing' },
                  { label: '🏙️ Nocny Hyperlapse Miasta', query: 'city traffic night hyperlapse' },
                  { label: '💵 Liczenie Banknotów (Gotówka)', query: 'counting cash money bills dynamic' },
                  { label: '📊 Dynamiczny Wykres 3D', query: 'dynamic financial stock market display animation' },
                  { label: '🌐 Cyfrowy Matrix & AI', query: 'vibrant digital data stream animation' },
                  { label: '💎 Kryptowaluty & Trading', query: 'crypto trading chart dynamic' },
                  { label: '🚁 Dron Nad Wieżowcami', query: 'aerial night view vibrant city skyline' },
                  { label: '🏦 Złoto & Skarbiec NBP', query: 'central bank gold vault bullion' }
                ].map((preset) => (
                  <button
                    key={preset.query}
                    type="button"
                    onClick={() => {
                      setSearchQuery(preset.query);
                      fetchPexelsAlternatives(preset.query);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition border border-slate-700/60"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Search Results Grid */}
              <div className="flex-1 min-h-[280px]">
                {searchingPexels ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                    <p className="text-xs font-semibold text-slate-300">Przeszukiwanie biblioteki Pexels 9:16...</p>
                  </div>
                ) : searchError ? (
                  <div className="py-12 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-2">
                    <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
                    <p className="text-xs text-slate-300">{searchError}</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                    {searchResults.map((video) => (
                      <div
                        key={video.id}
                        onClick={() => handleSelectAlternative(video)}
                        className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-emerald-400 hover:ring-2 hover:ring-emerald-400/40 cursor-pointer transition shadow-md flex flex-col justify-end"
                      >
                        <img
                          src={video.thumbnailUrl}
                          alt={video.photographer || 'Pexels clip'}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-75 group-hover:opacity-90 transition-opacity" />

                        {/* Hover Overlay Button */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> Wybierz
                          </span>
                        </div>

                        {/* Bottom Tag */}
                        <div className="relative z-10 p-2 text-[10px] text-slate-300 truncate">
                          {video.photographer ? `fot. ${video.photographer}` : 'Pexels HD'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center text-xs text-slate-500">
                    Wpisz frazę i kliknij „Szukaj w Pexels”, aby wyświetlić ujęcia.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Kliknij dowolną miniaturę, aby zamienić ujęcie w scenie #{swapModalSceneIndex + 1}.</span>
                <button
                  type="button"
                  onClick={() => setSwapModalSceneIndex(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
                >
                  Anuluj
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
