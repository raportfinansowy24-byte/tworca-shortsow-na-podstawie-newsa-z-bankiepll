import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  Download,
  Copy,
  Check,
  ExternalLink,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Camera,
  Film,
  Sparkles,
  X,
  Gauge,
  CheckCircle2,
  Cloud,
  RefreshCw
} from 'lucide-react';
import {
  exportVideoUrlToDrive,
  getOrCreateAppFolder,
  getAccessToken,
  googleSignIn
} from '../services/googleDriveService';

export interface VideoPreviewProps {
  /** The completion URL returned by the FFmpeg service */
  videoUrl: string;
  /** Optional pre-generated thumbnail URL (e.g. from server) */
  thumbnailUrl?: string;
  /** Optional title or filename */
  title?: string;
  /** Estimated or actual duration in seconds */
  duration?: number;
  /** File size in bytes or formatted string */
  fileSize?: number | string;
  /** Job ID */
  jobId?: string;
  /** Display variant: 'card' (inline panel), 'compact' (dense thumbnail), 'modal' (floating popup) */
  variant?: 'card' | 'compact' | 'modal';
  /** Close handler if opened in modal/dismissible state */
  onClose?: () => void;
  /** Callback when user downloads the video */
  onDownload?: () => void;
  /** Toast notifier */
  onToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  /** Autoplay video when preview component loads */
  autoPlay?: boolean;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoUrl,
  thumbnailUrl,
  title,
  duration,
  fileSize,
  jobId,
  variant = 'card',
  onClose,
  onDownload,
  onToast,
  autoPlay = false
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(duration || 18);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Thumbnail / Poster state
  const [capturedThumb, setCapturedThumb] = useState<string | null>(thumbnailUrl || null);
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<any>(null);

  // Google Drive Export State
  const [isUploadingToDrive, setIsUploadingToDrive] = useState<boolean>(false);
  const [driveUploadProgress, setDriveUploadProgress] = useState<number>(0);
  const [uploadedDriveUrl, setUploadedDriveUrl] = useState<string | null>(null);

  const handleExportToGoogleDrive = async () => {
    if (!videoUrl) return;
    setIsUploadingToDrive(true);
    setDriveUploadProgress(10);
    try {
      const token = await getAccessToken();
      if (!token) {
        const signinRes = await googleSignIn();
        if (!signinRes?.accessToken) {
          throw new Error('Wymagane zalogowanie do konta Google.');
        }
      }

      const folderId = await getOrCreateAppFolder('Raport Finansowy 24 - Shorts');
      const filename = title ? (title.endsWith('.mp4') ? title : `${title}.mp4`) : `Short_Video_${Date.now()}.mp4`;

      const result = await exportVideoUrlToDrive({
        videoUrl,
        fileName: filename,
        folderId,
        onProgress: (pct) => setDriveUploadProgress(pct)
      });

      if (result.webViewLink) {
        setUploadedDriveUrl(result.webViewLink);
      }
      onToast?.('success', 'Zapisano na Dysku Google!', `Plik "${result.name}" został pomyślnie zapisany w Google Drive.`);
    } catch (err: any) {
      console.error('Błąd eksportu do Google Drive:', err);
      onToast?.('error', 'Błąd zapisu do Google Drive', err.message || 'Wystąpił problem podczas eksportu.');
    } finally {
      setIsUploadingToDrive(false);
      setDriveUploadProgress(0);
    }
  };

  // Sync external thumbnail prop
  useEffect(() => {
    if (thumbnailUrl) {
      setCapturedThumb(thumbnailUrl);
    }
  }, [thumbnailUrl]);

  // Handle auto-capturing client-side thumbnail if none is provided from server
  useEffect(() => {
    if (capturedThumb || !videoUrl) return;

    const tempVideo = document.createElement('video');
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.src = videoUrl;
    tempVideo.currentTime = 1.2;
    tempVideo.muted = true;

    const handleLoadedData = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = tempVideo.videoWidth || 720;
        canvas.height = tempVideo.videoHeight || 1280;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          if (dataUrl && dataUrl.length > 100) {
            setCapturedThumb(dataUrl);
          }
        }
      } catch {
        // Fallback gracefully if cross-origin restrictions apply
      }
    };

    tempVideo.addEventListener('seeked', handleLoadedData);
    tempVideo.addEventListener('loadeddata', () => {
      tempVideo.currentTime = 1.2;
    });

    return () => {
      tempVideo.removeEventListener('seeked', handleLoadedData);
    };
  }, [videoUrl, capturedThumb]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration || duration || 18);
      setVideoLoaded(true);
      if (autoPlay) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn('Autoplay blocked:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackRate(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Capture instant frame snapshot from current video frame
  const captureFrameSnapshot = () => {
    if (!videoRef.current) return;
    setIsGeneratingSnapshot(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedThumb(dataUrl);

        // Download snapshot
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `snapshot_${title ? title.replace(/\s+/g, '_') : 'video'}_${Math.floor(video.currentTime)}s.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        onToast?.('success', 'Zapisano miniaturę', `Pobrano kadr z sekundy ${video.currentTime.toFixed(1)}s.`);
      }
    } catch (err) {
      console.warn('Snapshot error:', err);
      onToast?.('warning', 'Podgląd kadru', 'Nie udało się zapisać zrzutu przez zabezpieczenia CORS.');
    } finally {
      setIsGeneratingSnapshot(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(videoUrl);
    setCopiedUrl(true);
    onToast?.('success', 'Skopiowano URL wideo', 'Adres URL gotowego filmu MP4 znajduje się w schowku.');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = title || 'wygenerowane_wideo_rf24.mp4';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formattedFileSize = () => {
    if (typeof fileSize === 'string') return fileSize;
    if (typeof fileSize === 'number' && fileSize > 0) {
      return `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
    }
    return null;
  };

  // Auto-hide controls when playing and mouse is still
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  // ==========================================
  // COMPACT VARIANT (Thumbnail with mini play)
  // ==========================================
  if (variant === 'compact') {
    return (
      <div className="relative group w-20 h-28 sm:w-24 sm:h-36 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shrink-0 cursor-pointer shadow-md">
        {capturedThumb ? (
          <img
            src={capturedThumb}
            alt={title || 'Miniatura wideo'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-2 text-center">
            <Film className="w-5 h-5 text-amber-400 mb-1" />
            <span className="text-[9px] text-slate-400">9:16</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-3.5 h-3.5 fill-slate-950 ml-0.5" />
          </div>
        </div>

        <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[9px] font-mono text-slate-200">
          {formatTime(videoDuration)}
        </div>
      </div>
    );
  }

  // ==========================================
  // CARD & MODAL VARIANTS
  // ==========================================
  const content = (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all ${
        variant === 'modal' ? 'max-w-md w-full mx-auto' : 'w-full'
      }`}
    >
      {/* Top Header Bar */}
      <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Film className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate leading-snug">
              {title || 'Wygenerowany film wideo'}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>Shorts 9:16</span>
              <span aria-hidden="true">·</span>
              <span>{formatTime(videoDuration)}</span>
              {formattedFileSize() && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formattedFileSize()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {variant === 'modal' && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Zamknij podgląd"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Video Viewport (9:16 Ratio) */}
      <div className="relative bg-black flex items-center justify-center overflow-hidden aspect-[9/16] max-h-[520px] w-full mx-auto group">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={capturedThumb || undefined}
          loop={isLooping}
          muted={isMuted}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onError={() => setHasError(true)}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Big Center Play/Pause Overlay Indicator when paused or hovered */}
        <AnimatePresence>
          {(!isPlaying || showControls) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px] cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform">
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-slate-950" />
                ) : (
                  <Play className="w-6 h-6 fill-slate-950 ml-1" />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Fallback */}
        {hasError && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <Film className="w-8 h-8 text-rose-400 mb-2" />
            <p className="text-xs font-semibold text-slate-200">Nie udało się załadować odtwarzacza wideo.</p>
            <p className="text-[11px] text-slate-500 mt-1">Plik może być jeszcze w trakcie buforowania lub pobierania.</p>
            <a
              href={videoUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-white hover:bg-slate-700 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Pobierz bezpośrednio
            </a>
          </div>
        )}

        {/* Lightweight Bottom Overlay Controls Bar */}
        <div
          className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-6 flex flex-col gap-2 transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Progress Timeline Scrubber */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={videoDuration || 18}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-700/80 accent-amber-500 rounded-lg cursor-pointer hover:h-2 transition-all"
            />
          </div>

          {/* Controls Buttons Row */}
          <div className="flex items-center justify-between text-xs text-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="p-1 rounded hover:bg-white/10 text-white transition"
                title={isPlaying ? 'Pauza' : 'Odtwórz'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className="p-1 rounded hover:bg-white/10 text-white transition"
                title={isMuted ? 'Włącz dźwięk' : 'Wycisz'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-12 h-1 bg-slate-700 accent-amber-500 rounded cursor-pointer hidden sm:inline-block"
              />

              <span className="text-[11px] font-mono text-slate-300 ml-1">
                {formatTime(currentTime)} / {formatTime(videoDuration)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Playback speed toggle */}
              <button
                type="button"
                onClick={cycleSpeed}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 hover:bg-white/20 text-amber-300 transition"
                title="Zmień prędkość odtwarzania"
              >
                {playbackRate}x
              </button>

              {/* Loop toggle */}
              <button
                type="button"
                onClick={() => setIsLooping(!isLooping)}
                className={`p-1 rounded transition ${
                  isLooping ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-white'
                }`}
                title="Pętla (Loop)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Capture frame snapshot */}
              <button
                type="button"
                onClick={captureFrameSnapshot}
                disabled={isGeneratingSnapshot}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition"
                title="Zapisz kadr jako miniaturę (PNG)"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition"
                title="Pełny ekran"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action & Metadata Card Footer */}
      <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-3">
        {/* Direct Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pobierz wideo MP4</span>
          </button>

          {uploadedDriveUrl ? (
            <a
              href={uploadedDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-semibold transition flex items-center gap-1.5"
              title="Otwórz plik na Dysku Google"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Dysk Google</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <button
              type="button"
              onClick={handleExportToGoogleDrive}
              disabled={isUploadingToDrive}
              className="py-2 px-3 rounded-xl bg-sky-600/90 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-sky-950"
              title="Zapisz ten film wideo bezpośrednio na swoim Dysku Google"
            >
              {isUploadingToDrive ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dysk ({driveUploadProgress}%)</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Dysk Google</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyLink}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5 border border-slate-700"
            title="Kopiuj bezpośredni URL wideo"
          >
            {copiedUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Skopiowano</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Kopiuj link</span>
              </>
            )}
          </button>

          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition border border-slate-700 flex items-center gap-1"
            title="Otwórz plik wideo w nowej karcie przeglądarki"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Lightweight URL Copy Bar */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800/80 rounded-xl px-2.5 py-1.5">
          <input
            type="text"
            readOnly
            value={videoUrl}
            className="w-full bg-transparent text-[11px] font-mono text-slate-400 focus:outline-none select-all"
          />
        </div>

        {/* Unboxed Metadata Footer adhering to zero-pill discipline */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> FFmpeg Render Complete
            </span>
            <span aria-hidden="true">·</span>
            <span>H.264 / AAC</span>
          </div>
          {jobId && <span className="font-mono text-[10px] text-slate-600 truncate max-w-[120px]">{jobId}</span>}
        </div>
      </div>
    </div>
  );

  // Modal wrapping if requested
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return content;
};
