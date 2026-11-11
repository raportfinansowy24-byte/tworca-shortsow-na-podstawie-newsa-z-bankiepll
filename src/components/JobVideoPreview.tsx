import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  Film,
  Download,
  Volume2,
  VolumeX,
  Eye,
  Maximize2,
  CheckCircle2
} from 'lucide-react';
import { JobStatusResponse } from '../types';

export interface JobVideoPreviewProps {
  job: JobStatusResponse;
  onOpenModal?: (job: JobStatusResponse) => void;
  onToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  autoPlay?: boolean;
}

export const JobVideoPreview: React.FC<JobVideoPreviewProps> = ({
  job,
  onOpenModal,
  onToast,
  autoPlay = false
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [duration, setDuration] = useState<number>(job.duration || 0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Derive reliable video source URL with fallback paths
  const videoSrc = React.useMemo(() => {
    let base = job.outputUrl;
    if (!base) {
      if (job.outputFilename) {
        base = `/api/exports/${encodeURIComponent(job.outputFilename)}`;
      } else {
        base = `/api/exports/combined_video_${encodeURIComponent(job.id)}.mp4`;
      }
    }
    if (retryCount > 0) {
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}_retry=${retryCount}_t=${Date.now()}`;
    }
    return base;
  }, [job.outputUrl, job.outputFilename, job.id, retryCount]);

  // Reset state when job or source changes
  useEffect(() => {
    setIsLoading(true);
    setIsReady(false);
    setHasError(false);
    setRetryCount(0);
    setIsPlaying(false);
  }, [job.id, job.outputUrl, job.outputFilename]);

  // Handle retry
  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setRetryCount((prev) => prev + 1);
    if (onToast) {
      onToast('info', 'Ponawianie próby', 'Sprawdzanie dostępności pliku MP4...');
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleDownload = async () => {
    const filename = job.outputFilename || `video_${job.id}.mp4`;
    try {
      if (onToast) onToast('info', 'Pobieranie', `Pobieranie ${filename}...`);
      const downloadUrl = `/api/exports/${encodeURIComponent(filename)}/download`;
      const res = await fetch(downloadUrl).catch(() => null);
      if (res && res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } else {
        // Fallback direct link
        const link = document.createElement('a');
        link.href = videoSrc;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      if (onToast) onToast('success', 'Pobrano', `Plik ${filename} został zapisany.`);
    } catch (err) {
      if (onToast) onToast('error', 'Błąd pobierania', (err as Error).message);
    }
  };

  if (job.status !== 'completed') {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-800/90 space-y-2.5">
      {/* Header bar with filename and quick controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Film className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-white">Podgląd wideo MP4:</span>
          <code className="text-indigo-300 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px] truncate max-w-[220px]">
            {job.outputFilename || 'combined_video.mp4'}
          </code>
          {job.fileSize && (
            <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">
              ({(job.fileSize / (1024 * 1024)).toFixed(2)} MB)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium border border-slate-800 transition"
          >
            {isExpanded ? 'Zwiń odtwarzacz' : 'Rozwiń podgląd'}
          </button>

          {onOpenModal && (
            <button
              type="button"
              onClick={() => onOpenModal(job)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium flex items-center gap-1 border border-slate-700 transition"
              title="Otwórz pełny odtwarzacz w oknie"
            >
              <Eye className="w-3 h-3 text-indigo-400" />
              <span>Pełny ekran</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-sm transition active:scale-95"
          >
            <Download className="w-3 h-3" />
            <span>Pobierz</span>
          </button>
        </div>
      </div>

      {/* Embedded HTML5 Video Player Container */}
      {isExpanded && (
        <div className="relative bg-slate-950 border border-slate-800/80 rounded-xl overflow-hidden shadow-inner p-3 flex flex-col sm:flex-row items-center gap-4">
          {/* Vertical 9:16 Video Canvas */}
          <div className="relative aspect-[9/16] w-36 sm:w-44 max-h-72 bg-black rounded-lg overflow-hidden border border-slate-800 shadow-md shrink-0 flex items-center justify-center group">
            {/* Native HTML5 Video Element */}
            <video
              ref={videoRef}
              src={videoSrc}
              poster={job.thumbnailUrl}
              preload="metadata"
              playsInline
              loop
              muted={isMuted}
              autoPlay={autoPlay}
              onLoadedMetadata={() => {
                setIsLoading(false);
                setIsReady(true);
                setHasError(false);
                if (videoRef.current) {
                  setDuration(videoRef.current.duration || job.duration || 0);
                }
              }}
              onCanPlay={() => {
                setIsLoading(false);
                setIsReady(true);
              }}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              onClick={togglePlay}
              className={`w-full h-full object-cover cursor-pointer transition-opacity duration-300 ${
                isReady && !hasError ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Loading Spinner Overlay */}
            {isLoading && !hasError && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center">
                <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
                <span className="text-[11px] font-medium text-slate-300">Ładowanie MP4...</span>
                <span className="text-[9px] text-slate-500 mt-0.5">Sprawdzanie pliku wyjściowego</span>
              </div>
            )}

            {/* Error Overlay with Retry Button */}
            {hasError && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-3 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
                <div className="text-[11px] text-slate-300 font-medium leading-snug">
                  Plik wideo ładuje się na serwerze...
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition active:scale-95"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Ponów próbę</span>
                </button>
              </div>
            )}

            {/* Play/Pause Hover Overlay Badge */}
            {isReady && !hasError && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-slate-900/80 border border-white/20 text-white flex items-center justify-center shadow-lg backdrop-blur-xs">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-white" />}
                </div>
              </div>
            )}

            {/* Bottom mini controls overlay on video */}
            {isReady && !hasError && (
              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="p-1 rounded-md bg-black/60 text-white/90 hover:text-white backdrop-blur-xs text-[10px]"
                  title={isMuted ? 'Włącz dźwięk' : 'Wycisz dźwięk'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>

                <span className="px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono text-white/90 backdrop-blur-xs">
                  {currentTime.toFixed(0)}s / {duration ? `${duration.toFixed(0)}s` : '18s'}
                </span>
              </div>
            )}
          </div>

          {/* Video Metadata & Controls Info Column */}
          <div className="flex-1 w-full space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Renderowanie ukończone (Format 9:16 Shorts)
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                1080x1920 (TikTok / YouTube)
              </span>
            </div>

            {/* Timeline Progress Slider */}
            {isReady && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{currentTime.toFixed(1)}s</span>
                  <span>{duration ? `${duration.toFixed(1)}s` : '18.0s'}</span>
                </div>
                <div
                  className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    if (!videoRef.current || !duration) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    videoRef.current.currentTime = pos * duration;
                  }}
                >
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-100"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Video description or article summary */}
            {job.articleTitle && (
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300">
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider mb-0.5">Tytuł newsa:</span>
                <span className="font-medium text-white line-clamp-2">{job.articleTitle}</span>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!isReady || hasError}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition border border-slate-700 active:scale-95"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                <span>{isPlaying ? 'Wstrzymaj' : 'Odtwórz wideo'}</span>
              </button>

              <button
                type="button"
                onClick={toggleMute}
                disabled={!isReady || hasError}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition border border-slate-800"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isMuted ? 'Wyłącz wyciszenie' : 'Wycisz dźwięk'}</span>
              </button>

              <button
                type="button"
                onClick={handleRetry}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded-lg text-xs font-medium flex items-center gap-1 transition border border-slate-800"
                title="Odśwież plik wideo"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Odśwież plik</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
