import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Volume2, VolumeX, Film, Layers, Sparkles } from 'lucide-react';
import type { Scene } from '../types';

interface StoryboardDraftPreviewProps {
  scenes: Scene[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  backgroundMusicUrl?: string;
}

export const StoryboardDraftPreview: React.FC<StoryboardDraftPreviewProps> = ({
  scenes,
  isOpen,
  onClose,
  title = 'Szybki Podgląd Storyboardu (Draft)',
  backgroundMusicUrl
}) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [elapsedSceneTime, setElapsedSceneTime] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const activeScene: Scene | undefined = scenes[currentSceneIndex];
  const sceneDuration = activeScene?.duration || 2.25;
  const totalDuration = scenes.reduce((acc, sc) => acc + (sc.duration || 2.25), 0);

  // Calculate cumulative elapsed time across scenes
  const cumulativeTimeBeforeCurrent = scenes
    .slice(0, currentSceneIndex)
    .reduce((acc, sc) => acc + (sc.duration || 2.25), 0);
  const currentTotalElapsed = cumulativeTimeBeforeCurrent + elapsedSceneTime;

  const nextScene = useCallback(() => {
    setCurrentSceneIndex((prev) => {
      if (prev + 1 < scenes.length) {
        return prev + 1;
      }
      return 0; // Loop to beginning
    });
    setElapsedSceneTime(0);
  }, [scenes.length]);

  const prevScene = useCallback(() => {
    setCurrentSceneIndex((prev) => (prev > 0 ? prev - 1 : scenes.length - 1));
    setElapsedSceneTime(0);
  }, [scenes.length]);

  // Tick clock for playing scenes
  useEffect(() => {
    if (!isOpen || !isPlaying || scenes.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = 50;
    timerRef.current = window.setInterval(() => {
      setElapsedSceneTime((prev) => {
        const nextTime = prev + intervalMs / 1000;
        if (nextTime >= sceneDuration) {
          nextScene();
          return 0;
        }
        return nextTime;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isPlaying, sceneDuration, nextScene, scenes.length]);

  // Background music control
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying && backgroundMusicUrl) {
      audioRef.current.play().catch(() => {
        // Autoplay may be restricted by browser until user interaction
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, backgroundMusicUrl]);

  // Reset when opening modal
  useEffect(() => {
    if (isOpen) {
      setCurrentSceneIndex(0);
      setElapsedSceneTime(0);
      setIsPlaying(true);
    }
  }, [isOpen]);

  if (!isOpen || scenes.length === 0) return null;

  const narrationText = activeScene?.voiceover_text || activeScene?.voiceoverText || activeScene?.subtitles || '';
  const isDataVisual = activeScene?.visualMode === 'data_visual' && Boolean(activeScene?.visualSvg);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      {/* Background audio element for music preview */}
      {backgroundMusicUrl && (
        <audio
          ref={audioRef}
          src={backgroundMusicUrl}
          loop
          muted={isMuted}
        />
      )}

      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-full transition"
          aria-label="Zamknij podgląd"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: 9:16 Vertical Short Player */}
        <div className="md:w-1/2 p-6 flex flex-col items-center justify-center bg-slate-950/70 border-b md:border-b-0 md:border-r border-slate-800">
          <div className="relative w-[270px] sm:w-[300px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/60 bg-black flex items-center justify-center select-none">
            {/* Visual Canvas (Video / SVG / Image) */}
            {isDataVisual && activeScene?.visualSvg ? (
              <div
                className="w-full h-full flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: activeScene.visualSvg }}
              />
            ) : activeScene?.videoUrl ? (
              <video
                key={activeScene.videoUrl}
                src={activeScene.videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : activeScene?.thumbnailUrl || activeScene?.imageUrl ? (
              <img
                src={activeScene.thumbnailUrl || activeScene.imageUrl}
                alt={`Scena ${currentSceneIndex + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-4 text-center">
                <Film className="w-12 h-12 text-slate-600 mb-2" />
                <span className="text-xs font-semibold text-slate-400">Podgląd sceny roboczej</span>
              </div>
            )}

            {/* Subtitle / Caption Overlay */}
            {narrationText && (
              <div className="absolute inset-x-4 bottom-12 z-10 flex justify-center pointer-events-none">
                <div className="bg-black/75 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-white/10 text-center max-w-[90%] shadow-lg">
                  <span className="text-sm font-extrabold text-white tracking-wide leading-snug drop-shadow-md">
                    {narrationText}
                  </span>
                </div>
              </div>
            )}

            {/* Scene Index Watermark Indicator */}
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] font-bold text-slate-300 border border-white/10">
              Scena {currentSceneIndex + 1} / {scenes.length}
            </div>

            {/* Visual Mode Pill */}
            {activeScene?.visualMode && (
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-indigo-950/80 backdrop-blur-xs text-[10px] font-semibold text-indigo-300 border border-indigo-700/50">
                {activeScene.visualMode === 'data_visual' ? 'SVG Data' : 'Pexels Clip'}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Timeline & Storyboard Controls */}
        <div className="md:w-1/2 p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-base text-slate-100">{title}</h3>
            </div>
            <p className="text-xs text-slate-400">
              Podgląd klatek i narracji w proporcjach 9:16 przed uruchomieniem renderera FFmpeg.
            </p>
          </div>

          {/* Interactive Multi-Segment Timeline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>{currentTotalElapsed.toFixed(1)}s</span>
              <span>Łącznie: {totalDuration.toFixed(1)}s</span>
            </div>

            {/* 8 Scene Progress Bars */}
            <div className="grid grid-cols-8 gap-1.5 h-2">
              {scenes.map((sc, idx) => {
                const isPast = idx < currentSceneIndex;
                const isCurrent = idx === currentSceneIndex;
                const progressFraction = isPast
                  ? 1
                  : isCurrent
                  ? Math.min(1, elapsedSceneTime / sceneDuration)
                  : 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCurrentSceneIndex(idx);
                      setElapsedSceneTime(0);
                    }}
                    className="relative h-full rounded-full bg-slate-800 overflow-hidden cursor-pointer hover:opacity-80 transition"
                    title={`Przejdź do sceny ${idx + 1} (${(sc.duration || 2.25).toFixed(1)}s)`}
                  >
                    <div
                      className={`h-full transition-all duration-75 ${
                        isCurrent ? 'bg-emerald-400' : isPast ? 'bg-slate-400' : 'bg-transparent'
                      }`}
                      style={{ width: `${progressFraction * 100}%` }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Scene Details Card */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Scena {currentSceneIndex + 1} z {scenes.length}
              </span>
              <span className="text-slate-500 font-mono">
                {sceneDuration.toFixed(1)} sekundy
              </span>
            </div>

            <div className="text-xs text-slate-200 bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 leading-relaxed font-sans">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                Tekst Lektora / Napisów:
              </span>
              „{narrationText || '(Brak tekstu lektora dla tej sceny)'}”
            </div>

            {activeScene?.searchKeyword && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-slate-500">Asset:</span>
                <span className="text-slate-300 font-mono truncate">{activeScene.searchKeyword}</span>
              </div>
            )}
          </div>

          {/* Playback Controls */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevScene}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Poprzednia scena"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsPlaying((prev) => !prev)}
                className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition shadow-lg shadow-emerald-600/30"
                title={isPlaying ? 'Wstrzymaj' : 'Odtwarzaj'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
              </button>

              <button
                type="button"
                onClick={nextScene}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Następna scena"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Audio Mute Toggle */}
            {backgroundMusicUrl && (
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  isMuted
                    ? 'bg-slate-800/80 border-slate-700 text-slate-400'
                    : 'bg-indigo-950/80 border-indigo-700/60 text-indigo-300'
                }`}
                title="Podgląd muzyki w tle"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
                <span>{isMuted ? 'Muzyka wyciszona' : 'Muzyka aktywna'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
