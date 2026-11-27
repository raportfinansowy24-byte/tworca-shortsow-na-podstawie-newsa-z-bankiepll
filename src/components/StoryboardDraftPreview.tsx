import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Film, Layers, Pause, Play, SkipBack, SkipForward, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import type { Scene } from '../types';

interface StoryboardDraftPreviewProps {
  scenes: Scene[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  backgroundMusicUrl?: string;
}

function getSceneDuration(scene?: Scene): number {
  if (!scene) return 2.25;
  const duration = Number(scene.duration);
  if (Number.isFinite(duration) && duration > 0) return Math.min(duration, 120);
  const start = Number(scene.trimStart ?? 0);
  const end = Number(scene.trimEnd);
  return Number.isFinite(end) && end > start ? end - start : 2.25;
}

function safeColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const color = value.trim();
  return color.length <= 48 && /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\))$/i.test(color)
    ? color
    : fallback;
}

function boxColor(value?: string): string {
  if (!value) return 'transparent';
  const [base, alphaText] = value.split('@');
  const alpha = alphaText === undefined ? 1 : Math.max(0, Math.min(1, Number(alphaText)));
  const color = safeColor(base, 'transparent');
  const rgb: Record<string, string> = {
    black: '0, 0, 0',
    white: '255, 255, 255',
    red: '255, 0, 0',
    yellow: '255, 255, 0',
    lime: '0, 255, 0',
    green: '0, 128, 0',
    cyan: '0, 255, 255',
    blue: '0, 0, 255'
  };
  if (rgb[color.toLowerCase()]) return `rgba(${rgb[color.toLowerCase()]}, ${alpha})`;
  if (color.startsWith('#') && /^#[0-9a-f]{6}$/i.test(color)) {
    const value = color.slice(1);
    return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${alpha})`;
  }
  return color;
}

export const StoryboardDraftPreview: React.FC<StoryboardDraftPreviewProps> = ({
  scenes,
  isOpen,
  onClose,
  title = 'Interaktywny podgląd scenorysu',
  backgroundMusicUrl
}) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [elapsedSceneTime, setElapsedSceneTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const sceneKey = useMemo(() => scenes.map((scene) => scene.id).join('|'), [scenes]);
  const activeScene = scenes[currentSceneIndex];
  const sceneDuration = getSceneDuration(activeScene);
  const totalDuration = scenes.reduce((sum, scene) => sum + getSceneDuration(scene), 0);
  const elapsedBeforeScene = scenes.slice(0, currentSceneIndex).reduce((sum, scene) => sum + getSceneDuration(scene), 0);
  const totalElapsed = Math.min(totalDuration, elapsedBeforeScene + elapsedSceneTime);
  const progress = sceneDuration > 0 ? Math.min(1, elapsedSceneTime / sceneDuration) : 0;
  const captionText = activeScene?.subtitles || activeScene?.voiceover_text || activeScene?.voiceoverText || '';
  const words = captionText.trim().split(/\s+/u).filter(Boolean);
  const currentWordIndex = words.length ? Math.min(words.length - 1, Math.floor(progress * words.length)) : -1;
  const caption = activeScene?.captionStyle;
  const captionPosition = caption?.position || 'bottom';
  const captionFontSize = Math.max(15, Math.min(38, ((caption?.fontSize || 68) * 270) / 720));
  const captionColor = safeColor(caption?.fontColor, '#ffffff');
  const outlineColor = safeColor(caption?.outlineColor, '#000000');
  const captionOutline = Math.max(0, Math.min(24, caption?.outlineWidth || 5));
  const captionBackground = boxColor(caption?.boxColor);
  const captionAlignment = caption?.alignment || 'center';
  const currentSceneLabel = `Scena ${currentSceneIndex + 1} z ${scenes.length}`;
  const timestampLabel = `${totalElapsed.toFixed(1)}s / ${totalDuration.toFixed(1)}s`;

  const goToScene = useCallback((index: number) => {
    if (!scenes.length) return;
    setCurrentSceneIndex((index + scenes.length) % scenes.length);
    setElapsedSceneTime(0);
  }, [scenes.length]);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentSceneIndex(0);
    setElapsedSceneTime(0);
    setIsPlaying(true);
  }, [isOpen, sceneKey]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') goToScene(currentSceneIndex + 1);
      if (event.key === 'ArrowLeft') goToScene(currentSceneIndex - 1);
      if (event.code === 'Space' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        setIsPlaying((playing) => !playing);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, goToScene, currentSceneIndex]);

  useEffect(() => {
    if (!isOpen || !isPlaying || !activeScene) return;
    const timer = window.setInterval(() => {
      setElapsedSceneTime((elapsed) => elapsed + 0.05);
    }, 50);
    return () => window.clearInterval(timer);
  }, [isOpen, isPlaying, activeScene?.id]);

  useEffect(() => {
    if (!isOpen || !activeScene || elapsedSceneTime < sceneDuration) return;
    goToScene(currentSceneIndex + 1);
  }, [isOpen, activeScene, elapsedSceneTime, sceneDuration, currentSceneIndex, goToScene]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!isPlaying || !isOpen) {
      video.pause();
      return;
    }
    void video.play().catch(() => undefined);
  }, [isPlaying, isOpen, currentSceneIndex, activeScene?.videoUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.2;
    audio.muted = isMuted;
    if (isPlaying && isOpen && !isMuted && backgroundMusicUrl) {
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [isPlaying, isOpen, isMuted, backgroundMusicUrl]);

  const handleVideoMetadata = () => {
    const video = videoRef.current;
    if (!video || !activeScene) return;
    const requestedStart = Math.max(0, activeScene.trimStart ?? 0);
    const safeStart = Number.isFinite(video.duration) ? Math.min(requestedStart, Math.max(0, video.duration - 0.05)) : requestedStart;
    try { video.currentTime = safeStart; } catch { /* The browser may not have seeked metadata yet. */ }
    if (isPlaying) void video.play().catch(() => undefined);
  };

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !activeScene) return;
    const start = Math.max(0, activeScene.trimStart ?? 0);
    const requestedEnd = activeScene.trimEnd;
    const end = typeof requestedEnd === 'number' && requestedEnd > start
      ? Math.min(requestedEnd, Number.isFinite(video.duration) ? video.duration : requestedEnd)
      : video.duration;
    if (Number.isFinite(end) && end > start && video.currentTime >= end - 0.03) {
      video.currentTime = Math.min(start, Math.max(0, video.duration - 0.05));
    }
  };

  if (!isOpen) return null;

  const captionPositionClass = captionPosition === 'top'
    ? 'top-[9%]'
    : captionPosition === 'center'
      ? 'top-1/2 -translate-y-1/2'
      : 'bottom-[8%]';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={title}>
      {backgroundMusicUrl && <audio ref={audioRef} src={backgroundMusicUrl} loop preload="none" />}
      <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl md:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-30 rounded-full border border-white/10 bg-black/70 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
          aria-label="Zamknij podgląd"
        >
          <X className="h-5 w-5" />
        </button>

        <section className="flex items-center justify-center border-b border-slate-800 bg-slate-900/70 p-4 md:w-1/2 md:border-b-0 md:border-r">
          {activeScene ? (
            <div className="relative aspect-[9/16] w-[min(68vw,310px)] overflow-hidden rounded-2xl border border-slate-700 bg-black shadow-xl">
              {activeScene.visualMode === 'data_visual' && activeScene.visualSvg ? (
                <img
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(activeScene.visualSvg)}`}
                  alt={activeScene.subtitles || `Wizualizacja sceny ${currentSceneIndex + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : activeScene.videoUrl ? (
                <video
                  key={`${activeScene.id}:${activeScene.videoUrl}`}
                  ref={videoRef}
                  src={activeScene.videoUrl}
                  muted
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={handleVideoMetadata}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoMetadata}
                  className="h-full w-full object-cover"
                />
              ) : activeScene.thumbnailUrl || activeScene.imageUrl ? (
                <img
                  src={activeScene.thumbnailUrl || activeScene.imageUrl}
                  alt={`Scena ${currentSceneIndex + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-6 text-center">
                  <Film className="mb-3 h-10 w-10 text-slate-500" />
                  <p className="text-sm font-bold text-white">{activeScene.subtitles || `Scena ${currentSceneIndex + 1}`}</p>
                  {activeScene.searchKeyword && <p className="mt-2 text-xs text-slate-400">Wyszukiwane ujęcie: {activeScene.searchKeyword}</p>}
                  <p className="mt-3 text-[10px] text-amber-300">Brak zapisanego pliku wizualnego dla tej sceny.</p>
                </div>
              )}

              {captionText && (
                <div className={`pointer-events-none absolute inset-x-3 z-10 flex justify-center ${captionPositionClass}`}>
                  <div
                    className="max-w-full rounded-lg px-2.5 py-2"
                    style={{
                      backgroundColor: captionBackground,
                      color: captionColor,
                      textAlign: captionAlignment,
                      fontFamily: '"Montserrat Black", Impact, sans-serif',
                      fontSize: `${captionFontSize}px`,
                      fontWeight: 900,
                      lineHeight: 1.08,
                      letterSpacing: '0.015em',
                      WebkitTextStroke: `${Math.max(0.4, captionOutline * 0.22)}px ${outlineColor}`,
                      textShadow: `0 2px 4px #000, 0 0 ${Math.max(2, captionOutline)}px ${outlineColor}`,
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {words.map((word, index) => {
                      const shouldHighlight = ['word-by-word', 'karaoke'].includes(caption?.animation || '') && index === currentWordIndex;
                      return (
                        <React.Fragment key={`${index}-${word}`}>
                          {index > 0 ? ' ' : ''}
                          <span style={shouldHighlight ? { color: safeColor(caption?.highlightColor, '#ff3030') } : undefined}>{word}</span>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/65 px-2 py-1 text-[10px] font-semibold text-white">
                {currentSceneLabel}
              </div>
              <div className="absolute right-2 top-2 rounded-full border border-white/10 bg-black/65 px-2 py-1 text-[10px] font-semibold text-slate-200">
                {activeScene.visualMode === 'data_visual' ? 'DATA VISUAL' : 'VIDEO'}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
                <div className="h-full bg-emerald-400 transition-[width]" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex aspect-[9/16] w-[min(68vw,310px)] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-6 text-center">
              <Film className="mb-4 h-10 w-10 text-slate-600" />
              <h3 className="text-base font-bold text-white">Brak scen do podglądu</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">Po wygenerowaniu scenorysu przez Auto-Pilot tutaj pojawią się prawdziwe klipy, wizualizacje i teksty scen.</p>
            </div>
          )}
        </section>

        <section className="flex min-h-0 flex-1 flex-col justify-between gap-5 overflow-y-auto p-5 md:w-1/2 md:p-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-emerald-300"><Sparkles className="h-4 w-4" /></span>
              <div>
                <h2 className="pr-10 text-sm font-bold text-white">{title}</h2>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Animatic 9:16 · podgląd na żywo</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">Podgląd korzysta ze scen zapisanych w zadaniu Auto-Pilota. Odtwarza klipy z uwzględnieniem punktów trim i stylu napisów. Finalne timing lektora, animacje ASS i eksport MP4 wykonuje serwerowy FFmpeg.</p>
          </div>

          {scenes.length > 0 ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 font-mono text-xs text-slate-400">
                  <span>{timestampLabel}</span>
                  <span>{scenes.length} scen</span>
                </div>
                <div className="grid h-2 gap-1" style={{ gridTemplateColumns: `repeat(${scenes.length}, minmax(0, 1fr))` }}>
                  {scenes.map((scene, index) => {
                    const fraction = index < currentSceneIndex ? 1 : index > currentSceneIndex ? 0 : progress;
                    return (
                      <button
                        key={scene.id}
                        type="button"
                        onClick={() => goToScene(index)}
                        title={`Przejdź do sceny ${index + 1} · ${getSceneDuration(scene).toFixed(1)} s`}
                        aria-label={`Przejdź do sceny ${index + 1}`}
                        className="h-full overflow-hidden rounded-full bg-slate-800"
                      >
                        <span className="block h-full rounded-full bg-emerald-400 transition-[width] duration-75" style={{ width: `${fraction * 100}%` }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-200">{currentSceneLabel}</span>
                  <span className="font-mono text-slate-400">{sceneDuration.toFixed(1)} s</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tekst sceny / lektora</p>
                <p className="text-sm leading-relaxed text-slate-200">{activeScene?.voiceover_text || activeScene?.voiceoverText || captionText || 'Brak tekstu narracji.'}</p>
                {activeScene?.searchKeyword && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Layers className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                    <span className="truncate">Ujęcie: {activeScene.searchKeyword}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => goToScene(currentSceneIndex - 1)} className="rounded-xl bg-slate-800 p-2.5 text-slate-200 transition hover:bg-slate-700" title="Poprzednia scena" aria-label="Poprzednia scena">
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setIsPlaying((playing) => !playing)} className="rounded-xl bg-emerald-600 p-3 text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500" title={isPlaying ? 'Wstrzymaj' : 'Odtwarzaj'} aria-label={isPlaying ? 'Wstrzymaj' : 'Odtwarzaj'}>
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
                  </button>
                  <button type="button" onClick={() => goToScene(currentSceneIndex + 1)} className="rounded-xl bg-slate-800 p-2.5 text-slate-200 transition hover:bg-slate-700" title="Następna scena" aria-label="Następna scena">
                    <SkipForward className="h-4 w-4" />
                  </button>
                </div>
                {backgroundMusicUrl && (
                  <button type="button" onClick={() => setIsMuted((muted) => !muted)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${isMuted ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200'}`}>
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    {isMuted ? 'Włącz muzykę' : 'Wycisz muzykę'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
              Podgląd zostanie wypełniony danymi po wygenerowaniu scenorysu. Nie wyświetlam przykładowych klipów jako materiału produkcyjnego.
            </div>
          )}
          <button type="button" onClick={onClose} className="self-end rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white">Zamknij podgląd</button>
        </section>
      </div>
    </div>
  );
};
