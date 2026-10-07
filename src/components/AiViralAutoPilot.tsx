import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Zap,
  Play,
  Pause,
  Film,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Download,
  ExternalLink,
  Code2,
  Layers,
  Flame,
  Globe,
  Music,
  Sliders,
  Radio,
  Eye,
  ArrowRight,
  Volume2,
  VolumeX,
  Mic,
  Type,
  Newspaper,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Scene, JobStatusResponse, CaptionStyle, BankierArticle, ViralScene } from '../types';
import { BankierNewsFeed } from './BankierNewsFeed';
import { VideoPreview } from './VideoPreview';
import { StockFootageGrid } from './StockFootageGrid';

interface AiViralAutoPilotProps {
  onLoadScriptToEditor: (scenes: Scene[], musicUrl?: string) => void;
  onJobStarted: (jobId: string) => void;
  onToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

const TOPIC_PRESETS = [
  {
    icon: '📊',
    title: 'Rynki i Inwestycje',
    topic: 'Dlaczego 90% inwestorów traci kapitał ulegając emocjom na giełdzie',
    niche: 'Finanse & Biznes'
  },
  {
    icon: '🧠',
    title: 'Kognitywistyka i Mózg',
    topic: 'Jak kora przedczołowa podejmuje kluczowe decyzje pod presją czasu',
    niche: 'Psychologia'
  },
  {
    icon: '🤖',
    title: 'Architektura AI',
    topic: 'Rzeczywisty wpływ modeli autonomicznych na globalną produktywność i rynek pracy',
    niche: 'AI & Tech'
  },
  {
    icon: '🏛️',
    title: 'Filozofia Strategii',
    topic: 'Zasada racjonalnej dyscypliny i chłodnej kalkulacji w czasach rynkowego chaosu',
    niche: 'Strategia'
  },
  {
    icon: '💡',
    title: 'Przewaga Konkurencyjna',
    topic: 'Nawyki analityczne i asymetria informacji w budowaniu długoterminowej wartości',
    niche: 'Finanse'
  },
  {
    icon: '🌍',
    title: 'Makroekonomia',
    topic: 'Globalne przepływy kapitałowe i mechanizmy inflacji w nowoczesnej gospodarce',
    niche: 'Ekonomia'
  }
];

const SWIPE_FILE_HOOKS = [
  {
    id: 'swipe-1',
    category: 'Banki & Oszczędności',
    formula: 'contrarian_claim' as const,
    title: 'Banki NIE chcą, żebyś o tym wiedział',
    hookText: 'Banki nie chcą, żebyś znał ten prosty trick oszczędnościowy na koncie',
    impact: '⚡ High Virality (+85% w 3s)'
  },
  {
    id: 'swipe-2',
    category: 'Banki & Oszczędności',
    formula: 'mistake_warning' as const,
    title: 'Stop! Lokata 0.01% to strata kapitału',
    hookText: 'Stop! Jeśli trzymasz oszczędności na zwykłym koncie, inflacja zjada Twój kapitał każdego dnia',
    impact: '⚠️ Warning (+90% w 3s)'
  },
  {
    id: 'swipe-3',
    category: 'Giełda GPW & ETF',
    formula: 'transformation' as const,
    title: 'Co się stanie po 10 latach inwestowania 100 zł',
    hookText: 'Co się stanie, gdy zamiast w banku, zainwestujesz 100 zł miesięcznie w indeks WIG20 lub ETF',
    impact: '📈 Data Transformation (+95% w 3s)'
  },
  {
    id: 'swipe-4',
    category: 'Giełda GPW & ETF',
    formula: 'mistake_warning' as const,
    title: '5 błędów początkujących inwestorów na GPW',
    hookText: 'Pięć kosztownych błędów, które popełnia 90% początkujących inwestorów na giełdzie',
    impact: '⚠️ High Retention (+88% w 3s)'
  },
  {
    id: 'swipe-5',
    category: 'Podatki & Budżet',
    formula: 'list_tease' as const,
    title: '3 ulgi podatkowe, o których nie mówi księgowy',
    hookText: 'Trzy legalne ulgi podatkowe w Polsce, o których nie dowiesz się od przeciętnego księgowego',
    impact: '📋 List Tease (+92% w 3s)'
  },
  {
    id: 'swipe-6',
    category: 'Kredyty & RPP',
    formula: 'contrarian_claim' as const,
    title: 'Stopy procentowe RPP a Twój kredyt',
    hookText: 'Stopy procentowe znów w centrum uwagi – zobacz co RPP ukrywa przed polskimi kredytobiorcami',
    impact: '⚡ Urgent (+87% w 3s)'
  },
  {
    id: 'swipe-7',
    category: 'Psychologia Pieniędzy',
    formula: 'myth_buster' as const,
    title: 'Obalamy mit oszczędzania na małej kawie',
    hookText: 'Obalamy powszechny mit: oszczędzanie na drobnych przyjemnościach NIE uczyni Cię bogatym',
    impact: '💡 Myth Buster (+84% w 3s)'
  }
];

export const AiViralAutoPilot: React.FC<AiViralAutoPilotProps> = ({ onLoadScriptToEditor, onJobStarted, onToast }) => {
  const [activeMode, setActiveMode] = useState<'create' | 'translate'>('create');
  const [topic, setTopic] = useState('Dlaczego rynki finansowe nagradzają dyscyplinę, a nie emocje');
  const [niche, setNiche] = useState('Finanse & Biznes');
  const [targetLanguage, setTargetLanguage] = useState('Polski');
  const [sceneCount, setSceneCount] = useState(2);
  const [resolution, setResolution] = useState('720x1280');

  const [showSwipeFileModal, setShowSwipeFileModal] = useState<boolean>(false);

  // Bankier.pl Live News State
  const [selectedBankierArticle, setSelectedBankierArticle] = useState<BankierArticle | null>(null);
  const [showBankierFeed, setShowBankierFeed] = useState<boolean>(true);
  const [includeBankierContext, setIncludeBankierContext] = useState<boolean>(true);

  const handleSelectBankierArticle = (article: BankierArticle) => {
    setSelectedBankierArticle(article);
    setTopic(article.title);
    setNiche(`Finanse & Biznes (${article.category || 'Bankier.pl'})`);
    onToast?.('success', 'Pobrano z Bankier.pl', `Ustawiono temat: "${article.title.slice(0, 50)}..."`);
  };

  const handleClearBankierArticle = () => {
    setSelectedBankierArticle(null);
  };

  const buildArticleContextString = (article: BankierArticle | null): string | undefined => {
    if (!article || !includeBankierContext) return undefined;
    let ctx = `Tytuł artykułu z Bankier.pl: "${article.title}"\nPodsumowanie i fakty: ${article.description}`;
    if (article.keyTakeaway) {
      ctx += `\nKluczowy wniosek analityczny: ${article.keyTakeaway}`;
    }
    if (article.suggestedHook) {
      ctx += `\nSugerowany hook/teza: ${article.suggestedHook}`;
    }
    if (article.suggestedSearchKeywords && article.suggestedSearchKeywords.length > 0) {
      ctx += `\nSugerowane tematy ujęć wideo: ${article.suggestedSearchKeywords.join(', ')}`;
    }
    return ctx;
  };

  // Translation mode text input
  const [translationScriptText, setTranslationScriptText] = useState(
    'This is a recording of a question that was sent in asking for a translation of this video: "Can artificial intelligence completely replace human video editors in the next five years, or will it remain just an assistant for creators?"'
  );

  // Generation status
  const [generatingScript, setGeneratingScript] = useState(false);
  const [autoPilotLoading, setAutoPilotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [generatedScript, setGeneratedScript] = useState<{
    title: string;
    description: string;
    hook: string;
    scenes: any[];
    backgroundMusicUrl: string;
  } | null>(null);

  // Stock Footage Verification & Preview state
  const [verifyFootageBeforeRender, setVerifyFootageBeforeRender] = useState<boolean>(true);
  const [isRefreshingFootage, setIsRefreshingFootage] = useState<boolean>(false);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);

  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Lektor Text-to-Speech (TTS) State
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsVoice, setTtsVoice] = useState('pl-PL-MarekNeural');
  const [ttsSpeed, setTtsSpeed] = useState(1.15);
  const [syncDurationWithVoice, setSyncDurationWithVoice] = useState(true);
  const [voicePreviewLoading, setVoicePreviewLoading] = useState(false);
  const [voicePreviewPlaying, setVoicePreviewPlaying] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Auto-switch default voice when language changes
  useEffect(() => {
    if (targetLanguage === 'Polski') {
      setTtsVoice('pl-PL-MarekNeural');
    } else if (targetLanguage === 'Angielski (EN)') {
      setTtsVoice('en-US-ChristopherNeural');
    } else if (targetLanguage === 'Niemiecki (DE)') {
      setTtsVoice('de-DE-ConradNeural');
    } else if (targetLanguage === 'Hiszpański (ES)') {
      setTtsVoice('es-ES-AlvaroNeural');
    } else if (targetLanguage === 'Francuski (FR)') {
      setTtsVoice('fr-FR-HenriNeural');
    } else if (targetLanguage === 'Ukraiński (UK)') {
      setTtsVoice('uk-UA-OstapNeural');
    }
  }, [targetLanguage]);

  // Animated Subtitles (Word-by-Word Hormozi / MrBeast style) State
  const [captionAnimation, setCaptionAnimation] = useState<'word-by-word' | 'single-word' | 'classic'>('word-by-word');
  const [highlightColor, setHighlightColor] = useState<'yellow' | 'lime' | 'cyan' | 'red' | 'white'>('yellow');
  const [captionPosition, setCaptionPosition] = useState<'bottom' | 'center' | 'top'>('bottom');

  // Interactive Live Animation Preview State
  const [previewWordIndex, setPreviewWordIndex] = useState(0);
  const previewWords = ['CZY', 'WIESZ,', 'ŻE', 'TEN', 'FORMAT', 'ZDOBYWA', 'MILIONY', 'WYŚWIETLEŃ?'];

  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewWordIndex((prev) => (prev + 1) % previewWords.length);
    }, 420);
    return () => clearInterval(timer);
  }, [previewWords.length]);

  // Voice Preview Playback Handler
  const handleToggleVoicePreview = async () => {
    if (voicePreviewPlaying && audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setVoicePreviewPlaying(false);
      return;
    }

    setVoicePreviewLoading(true);
    try {
      const sampleText = targetLanguage === 'Polski'
        ? 'Cześć! To jest podgląd ultra-realistycznego głosu lektora dla Twoich filmów. Brzmi dynamicznie i profesjonalnie!'
        : 'Hello! This is a preview of the high-energy AI voiceover for your viral shorts.';

      const res = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          language: targetLanguage,
          voice: ttsVoice,
          speed: ttsSpeed
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Błąd generowania próbki głosu');

      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }

      const audio = new Audio(data.audioUrl || data.streamUrl);
      audioPreviewRef.current = audio;
      audio.onplay = () => setVoicePreviewPlaying(true);
      audio.onended = () => setVoicePreviewPlaying(false);
      audio.onerror = () => {
        setVoicePreviewPlaying(false);
        onToast?.('error', 'Błąd odtwarzacza', 'Nie można odtworzyć próbki lektora.');
      };
      await audio.play();
    } catch (err) {
      onToast?.('error', 'Błąd próbki audio', (err as Error).message);
    } finally {
      setVoicePreviewLoading(false);
    }
  };

  // Resilient Dual-Channel Job Tracker (SSE + Polling Fallback)
  const trackJob = (jobId: string) => {
    setActiveJobId(jobId);
    onJobStarted(jobId);

    let isDone = false;
    let eventSource: EventSource | null = null;
    let pollInterval: any = null;

    const stopTracking = () => {
      isDone = true;
      if (eventSource) {
        try {
          eventSource.close();
        } catch {}
        eventSource = null;
      }
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const handleUpdate = (parsedJob: JobStatusResponse) => {
      setJobStatus(parsedJob);
      if (parsedJob.status === 'completed') {
        onToast?.('success', 'Wideo zmontowane!', 'Film Auto-Pilot został pomyślnie zrenderowany.');
        stopTracking();
      } else if (parsedJob.status === 'failed') {
        onToast?.('error', 'Błąd renderowania Auto-Pilot', parsedJob.error || 'Wystąpił błąd renderowania.');
        stopTracking();
      }
    };

    try {
      eventSource = new EventSource(`/api/jobs/${jobId}/stream`);
      eventSource.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data);
          handleUpdate(parsed);
        } catch {}
      };
      eventSource.onerror = () => {
        if (eventSource) {
          try {
            eventSource.close();
          } catch {}
          eventSource = null;
        }
      };
    } catch {}

    // Polling fallback every 1200ms to guarantee completion even if SSE drops
    pollInterval = setInterval(async () => {
      if (isDone) return;
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const data: JobStatusResponse = await res.json();
          handleUpdate(data);
        }
      } catch {}
    }, 1200);
  };

  // Update video for a single scene in the visual grid
  const handleUpdateSceneVideo = (
    sceneIndex: number,
    newVideo: { videoUrl: string; thumbnailUrl: string; searchKeyword?: string; photographer?: string; source?: 'pexels' | 'curated' }
  ) => {
    if (!generatedScript) return;
    const updatedScenes = [...generatedScript.scenes];
    if (updatedScenes[sceneIndex]) {
      updatedScenes[sceneIndex] = {
        ...updatedScenes[sceneIndex],
        videoUrl: newVideo.videoUrl,
        thumbnailUrl: newVideo.thumbnailUrl,
        searchKeyword: newVideo.searchKeyword || updatedScenes[sceneIndex].searchKeyword,
        photographer: newVideo.photographer,
        source: newVideo.source || 'pexels'
      };
      setGeneratedScript({
        ...generatedScript,
        scenes: updatedScenes
      });

      const appScenes: Scene[] = updatedScenes.map((s: any, i: number) => ({
        id: `gen-scene-${Date.now()}-${i}`,
        videoUrl: s.videoUrl,
        thumbnailUrl: s.thumbnailUrl,
        subtitles: s.subtitles,
        voiceover_text: s.voiceover_text || s.subtitles,
        trimStart: 0,
        trimEnd: s.duration || 4,
        captionStyle: s.captionStyle || {
          fontSize: 54,
          fontColor: 'white',
          outlineColor: 'black',
          outlineWidth: 6,
          boxColor: 'black@0.6',
          position: captionPosition,
          animation: captionAnimation,
          highlightColor: highlightColor
        }
      }));
      onLoadScriptToEditor(appScenes, generatedScript.backgroundMusicUrl);
    }
  };

  // Re-fetch fresh Pexels footage for all scenes
  const handleRefreshAllFootage = async () => {
    if (!generatedScript || !generatedScript.scenes || generatedScript.scenes.length === 0) return;
    setIsRefreshingFootage(true);
    try {
      const keywords = generatedScript.scenes.map((s: any) => s.searchKeyword || topic);
      const res = await fetch('/api/stock/fetch-scene-footage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, topic })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nie udało się odświeżyć ujęć z Pexels');

      if (data.footage && Array.isArray(data.footage)) {
        const updatedScenes = generatedScript.scenes.map((sc: any, idx: number) => {
          const fresh = data.footage[idx];
          if (fresh) {
            return {
              ...sc,
              videoUrl: fresh.videoUrl,
              thumbnailUrl: fresh.thumbnailUrl,
              source: fresh.source,
              photographer: fresh.photographer
            };
          }
          return sc;
        });

        setGeneratedScript({
          ...generatedScript,
          scenes: updatedScenes
        });
        onToast?.('success', 'Odświeżono ujęcia Pexels', `Pobrano nowe miniatury i ujęcia dla ${updatedScenes.length} scen.`);
      }
    } catch (err) {
      onToast?.('error', 'Błąd odświeżania ujęć', (err as Error).message);
    } finally {
      setIsRefreshingFootage(false);
    }
  };

  // Start rendering with verified scenes (called from StockFootageGrid or Auto-Pilot)
  const handleStartRenderWithVerifiedScenes = async (scenesToRender: ViralScene[]) => {
    setAutoPilotLoading(true);
    setError(null);
    setJobStatus(null);

    try {
      const payloadScenes = scenesToRender.map((s) => ({
        text: s.voiceover_text || s.subtitles,
        subtitles: s.subtitles,
        video_url: s.videoUrl,
        duration: s.duration || 9.0,
        searchKeyword: s.searchKeyword,
        captionStyle: s.captionStyle || {
          position: captionPosition,
          animation: captionAnimation,
          highlightColor: highlightColor,
          fontColor: 'white',
          outlineColor: 'black',
          outlineWidth: 6,
          boxColor: 'black@0.6'
        }
      }));

      const res = await fetch('/api/auto-pilot-shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: generatedScript?.title || topic,
          niche,
          scenes: payloadScenes,
          outputResolution: resolution,
          async: true,
          tts: ttsEnabled,
          ttsLanguage: targetLanguage,
          ttsVoice,
          ttsSpeed,
          syncDurationWithVoice,
          captionAnimation,
          highlightColor,
          backgroundMusicUrl: generatedScript?.backgroundMusicUrl
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Nie udało się uruchomić renderowania');
      }

      onToast?.('success', 'Renderowanie uruchomione!', `Zatwierdzone materiały Pexels wysłano do silnika FFmpeg (ID: ${data.jobId})`);
      trackJob(data.jobId);
    } catch (err) {
      const msg = (err as Error).message || 'Wystąpił błąd podczas uruchamiania renderowania';
      setError(msg);
      onToast?.('error', 'Błąd renderowania', msg);
    } finally {
      setAutoPilotLoading(false);
    }
  };

  // Fetch script and Pexels footage thumbnails for user verification before render
  const handleFetchAndVerifyFootage = async () => {
    if (activeMode === 'create' && !topic.trim()) return;
    if (activeMode === 'translate' && !translationScriptText.trim()) return;

    setGeneratingScript(true);
    setError(null);

    try {
      let data: any;
      if (activeMode === 'translate') {
        const res = await fetch('/api/translate-video-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scriptText: translationScriptText,
            targetLanguage,
            sceneCount
          })
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Nie udało się przetłumaczyć wideo');
      } else {
        const res = await fetch('/api/generate-viral-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            niche,
            articleContext: buildArticleContextString(selectedBankierArticle),
            bankierArticle: selectedBankierArticle,
            language: targetLanguage,
            sceneCount
          })
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Nie udało się pobrać materiałów i scenariusza');
      }

      setGeneratedScript(data);

      const appScenes: Scene[] = (data.scenes || []).map((s: any, i: number) => ({
        id: `gen-scene-${Date.now()}-${i}`,
        videoUrl: s.videoUrl,
        thumbnailUrl: s.thumbnailUrl,
        subtitles: s.subtitles,
        voiceover_text: s.voiceover_text || s.subtitles,
        trimStart: 0,
        trimEnd: s.duration || 4,
        captionStyle: {
          fontSize: 54,
          fontColor: 'white',
          outlineColor: 'black',
          outlineWidth: 6,
          boxColor: 'black@0.6',
          position: captionPosition,
          animation: captionAnimation,
          highlightColor: highlightColor
        }
      }));

      onLoadScriptToEditor(appScenes, data.backgroundMusicUrl);
      onToast?.('success', 'Pobrano materiały z Pexels!', 'Zweryfikuj miniatury w siatce poniżej i kliknij „Zatwierdź & Renderuj”.');
    } catch (err) {
      const msg = (err as Error).message || 'Wystąpił błąd podczas pobierania materiałów z Pexels';
      setError(msg);
      onToast?.('error', 'Błąd pobierania materiałów', msg);
    } finally {
      setGeneratingScript(false);
    }
  };

  // Auto-Pilot Execution Flow
  const handleAutoPilotRun = async () => {
    if (activeMode === 'create' && !topic.trim()) return;
    if (activeMode === 'translate' && !translationScriptText.trim()) return;

    // If verification before render is enabled and user hasn't generated/verified footage yet:
    if (verifyFootageBeforeRender && (!generatedScript || !generatedScript.scenes || generatedScript.scenes.length === 0)) {
      await handleFetchAndVerifyFootage();
      return;
    }

    // If footage is already generated and verified, start rendering immediately!
    if (generatedScript && generatedScript.scenes && generatedScript.scenes.length > 0) {
      await handleStartRenderWithVerifiedScenes(generatedScript.scenes);
      return;
    }

    // Direct one-shot render (when verification is disabled)
    setAutoPilotLoading(true);
    setError(null);
    setJobStatus(null);
    setGeneratedScript(null);

    try {
      if (activeMode === 'translate') {
        const transRes = await fetch('/api/translate-video-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scriptText: translationScriptText,
            targetLanguage,
            sceneCount
          })
        });

        const transData = await transRes.json();
        if (!transRes.ok) throw new Error(transData.error || 'Błąd tłumaczenia wideo');

        setGeneratedScript(transData);

        const combineRes = await fetch('/api/combine-scenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenes: (transData.scenes || []).map((sc: any) => ({
              ...sc,
              captionStyle: {
                position: captionPosition,
                animation: captionAnimation,
                highlightColor,
                fontSize: 54,
                outlineWidth: 6,
                fontColor: 'white'
              }
            })),
            backgroundMusicUrl: transData.backgroundMusicUrl,
            audioVolume: ttsEnabled ? 0.2 : 0.3,
            outputResolution: resolution,
            fps: 30,
            async: true,
            tts: ttsEnabled,
            ttsLanguage: targetLanguage,
            ttsVoice,
            ttsSpeed,
            syncDurationWithVoice,
            captionAnimation,
            highlightColor
          })
        });

        const combineData = await combineRes.json();
        if (!combineRes.ok) throw new Error(combineData.error || 'Błąd uruchomienia renderera MP4');

        onToast?.('success', 'Auto-Pilot uruchomiony!', `Rozpoczęto renderowanie filmu z lektorem i napisami (ID: ${combineData.jobId})`);
        trackJob(combineData.jobId);
      } else {
        const res = await fetch('/api/auto-pilot-shorts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            niche,
            articleContext: buildArticleContextString(selectedBankierArticle),
            bankierArticle: selectedBankierArticle,
            language: targetLanguage,
            outputResolution: resolution,
            async: true,
            tts: ttsEnabled,
            ttsLanguage: targetLanguage,
            ttsVoice,
            ttsSpeed,
            syncDurationWithVoice,
            captionAnimation,
            highlightColor
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Nie udało się uruchomić Auto-Pilota');
        }

        setGeneratedScript(data.script);
        onToast?.('success', 'Auto-Pilot uruchomiony!', `Stworzono scenariusz i rozpoczęto renderowanie z lektorem (ID: ${data.jobId})`);
        trackJob(data.jobId);
      }
    } catch (err) {
      const msg = (err as Error).message || 'Wystąpił nieoczekiwany błąd';
      setError(msg);
      onToast?.('error', 'Błąd żądania Auto-Pilot', msg);
    } finally {
      setAutoPilotLoading(false);
    }
  };

  // Generate Script Only
  const handleGenerateScriptOnly = async () => {
    if (activeMode === 'create' && !topic.trim()) return;
    if (activeMode === 'translate' && !translationScriptText.trim()) return;

    setGeneratingScript(true);
    setError(null);

    try {
      let data: any;
      if (activeMode === 'translate') {
        const res = await fetch('/api/translate-video-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scriptText: translationScriptText,
            targetLanguage,
            sceneCount
          })
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Nie udało się przetłumaczyć wideo');
      } else {
        const res = await fetch('/api/generate-viral-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            niche,
            articleContext: buildArticleContextString(selectedBankierArticle),
            bankierArticle: selectedBankierArticle,
            language: targetLanguage,
            sceneCount
          })
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Nie udało się wygenerować skryptu');
      }

      setGeneratedScript(data);

      const appScenes: Scene[] = data.scenes.map((s: any, i: number) => ({
        id: `gen-scene-${Date.now()}-${i}`,
        videoUrl: s.videoUrl,
        subtitles: s.subtitles,
        voiceover_text: s.voiceover_text || s.subtitles,
        trimStart: 0,
        trimEnd: s.duration || 4,
        captionStyle: {
          fontSize: 54,
          fontColor: 'white',
          outlineColor: 'black',
          outlineWidth: 6,
          boxColor: 'black@0.6',
          position: captionPosition,
          animation: captionAnimation,
          highlightColor: highlightColor
        }
      }));

      onLoadScriptToEditor(appScenes, data.backgroundMusicUrl);
      onToast?.('success', 'Scenariusz AI wygenerowany!', 'Nowo utworzone sceny z lektorem i animowanymi napisami zostały załadowane do edytora.');
    } catch (err) {
      const msg = (err as Error).message || 'Wystąpił błąd podczas generowania scenariusza';
      setError(msg);
      onToast?.('error', 'Błąd generowania scenariusza', msg);
    } finally {
      setGeneratingScript(false);
    }
  };

  const makePayloadJSON = JSON.stringify(
    {
      topic: '{{1.topic}}',
      niche: '{{1.niche}}',
      tts: ttsEnabled,
      ttsLanguage: targetLanguage === 'Polski' ? 'pl' : 'en',
      captionAnimation: captionAnimation,
      highlightColor: highlightColor,
      syncDurationWithVoice: syncDurationWithVoice,
      outputResolution: resolution,
      async: true,
      webhookUrl: 'https://hook.eu1.make.com/fck3exut5hpc4xdbuqr1sgha7fglyuhw'
    },
    null,
    2
  );

  return (
    <div className="space-y-8">
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 p-6 sm:p-8 rounded-3xl border border-indigo-500/30 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            AI Generator Viral Shorts (Bezobsługowy Auto-Pilot)
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Zamień jeden temat w gotowy, viralowy film Short 9:16 z montażem i napisami
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed">
            Sztuczna inteligencja Gemini pisze scenariusz, dobiera wideo w tle w wysokiej rozdzielczości, nakłada chwytliwe napisy czcionką <strong>Montserrat-Bold</strong>, miksuje ścieżkę muzyczną i wywołuje silnik FFmpeg bez żadnego wysiłku!
          </p>
        </div>
      </div>

      {/* Control Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Input Form */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          {/* Mode Switcher Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              1. Tryb Tworzenia / Tłumaczenia Wideo
            </h3>

            <div className="flex items-center gap-1.5 bg-slate-950 p-1 border border-slate-800 rounded-xl text-xs">
              <button
                onClick={() => setActiveMode('create')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  activeMode === 'create'
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Generuj z Tematu
              </button>

              <button
                onClick={() => setActiveMode('translate')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  activeMode === 'translate'
                    ? 'bg-purple-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> Tłumaczenie Nagrania
              </button>
            </div>
          </div>

          {activeMode === 'create' ? (
            <>
              {/* Presets Grid */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Popularne Viralowe Nisze (Gotowe Wzorce):</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {TOPIC_PRESETS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setTopic(p.topic);
                        setNiche(p.niche);
                      }}
                      className={`p-3 text-left rounded-xl border text-xs transition flex flex-col gap-1.5 ${
                        topic === p.topic
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-medium shadow-md shadow-indigo-950'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-base">{p.icon}</span>
                      <span className="font-semibold text-white line-clamp-1">{p.title}</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">{p.niche}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input & Bankier.pl Live Feed Integration */}
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-200">
                      Wpisz własny temat na film Short:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowBankierFeed(!showBankierFeed)}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
                    >
                      <Newspaper className="w-3.5 h-3.5 text-amber-400" />
                      <span>{showBankierFeed ? 'Zwiń wiadomości z Bankier.pl' : 'Pokaż najświeższe z Bankier.pl'}</span>
                      {showBankierFeed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="np. 5 najgroźniejszych miejsc na ziemi, o których nie wiesz... lub wybierz news poniżej"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                    {topic && (
                      <button
                        type="button"
                        onClick={() => {
                          setTopic('');
                          setSelectedBankierArticle(null);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 rounded-md"
                        title="Wyczyść temat"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Mandatory CTA Branding Indicator */}
                  <div className="mt-2 flex items-center justify-between text-[11px] px-3 py-1.5 rounded-lg bg-red-950/20 border border-red-500/20 text-slate-400">
                    <span className="flex items-center gap-1.5 text-red-300 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-red-400" />
                      Dopasowane CTA:
                    </span>
                    <span className="text-white font-mono font-semibold">
                      „Sprawdź na raport-finansowy24.pl”
                    </span>
                  </div>

                  {/* 🚀 VIRAL STRATEGY 2026: 100% Automated Bankier.pl News Hook Engine */}
                  <div className="pt-3.5 mt-3 border-t border-slate-800/80">
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900 to-indigo-950/40 border border-emerald-500/30 shadow-lg space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                              Autonomiczny Dobór Hooka (Gemini AI + Bankier.pl)
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold uppercase">
                              100% Automatyzacja
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            Brak konieczności manualnego wyboru. Model Gemini w ułamku sekundy analizuje fakty, liczby i sentyment artykułu z Bankier.pl, samodzielnie dopasowując najbardziej hipnotyzujący hook w 1. sekundzie (Ostrzeżenie / Contrarian / Ranking / Obalanie Mitu) oraz montaż 2 komplementarnych ujęć.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowSwipeFileModal(true)}
                          className="text-[11px] font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-950/80 border border-indigo-500/40 hover:border-indigo-400 px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shrink-0 active:scale-95"
                        >
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>Baza Tematów & Hooków</span>
                        </button>
                      </div>

                      {selectedBankierArticle && (
                        <div className="pt-2.5 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-amber-300/90 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            Wybrany news z Bankier.pl: <strong className="text-white">"{selectedBankierArticle.title.slice(0, 70)}..."</strong> — Gemini automatycznie wygeneruje scenariusz 18s z lektorem i brandingiem raport-finansowy24.pl.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Selected Bankier.pl Article Active Info Card */}
                {selectedBankierArticle && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs flex flex-col gap-2 shadow-md">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px] uppercase">
                          Bankier.pl • {selectedBankierArticle.category || 'Wiadomości'}
                        </span>
                        {selectedBankierArticle.isGrounded ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-semibold text-[10px] flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            SEARCH GROUNDED
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-300 font-medium">
                            Wybrany artykuł źródłowy
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleClearBankierArticle}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-1 text-[11px]"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Odłącz</span>
                      </button>
                    </div>

                    <p className="text-slate-200 text-xs font-semibold leading-snug">
                      {selectedBankierArticle.title}
                    </p>

                    {selectedBankierArticle.description && (
                      <p className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed">
                        {selectedBankierArticle.description}
                      </p>
                    )}

                    {selectedBankierArticle.keyTakeaway && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-amber-500/20 text-[11px] text-amber-300/90">
                        <span className="font-semibold text-amber-400">Wniosek analityczny:</span> {selectedBankierArticle.keyTakeaway}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-amber-500/20">
                      <label className="flex items-center gap-2 cursor-pointer text-[11px] text-amber-200">
                        <input
                          type="checkbox"
                          checked={includeBankierContext}
                          onChange={(e) => setIncludeBankierContext(e.target.checked)}
                          className="rounded border-slate-700 text-amber-500 focus:ring-0 w-3.5 h-3.5"
                        />
                        <span>Przekaż treść i liczby do AI w scenariuszu wideo</span>
                      </label>

                      <a
                        href={selectedBankierArticle.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <span>Zobacz na Bankier.pl</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Bankier.pl Live Feed Component */}
                {showBankierFeed && (
                  <BankierNewsFeed
                    selectedArticleId={selectedBankierArticle?.id}
                    onSelectArticle={handleSelectBankierArticle}
                    onToast={onToast}
                  />
                )}
              </div>
            </>
          ) : (
            /* Video Translation Input Mode */
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-purple-300">
                Wklej nagranie, transkrypcję lub pytanie do przetłumaczenia na wideo Short:
              </label>
              <textarea
                value={translationScriptText}
                onChange={(e) => setTranslationScriptText(e.target.value)}
                rows={4}
                placeholder="Wklej tutaj dowolny tekst, pytania z nagrania lub scenariusz..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition leading-relaxed"
              />
              <p className="text-[11px] text-slate-400">
                Gemini AI przeanalizuje treść nagrania, przetłumaczy na wybrany język i podzieli na idealne sceny z dopasowanym wideo oraz napisami Montserrat.
              </p>
            </div>
          )}

          {/* Configuration Options Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Docelowy Język:</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Polski">🇵🇱 Polski</option>
                <option value="English">🇬🇧 English</option>
                <option value="Español">🇪🇸 Español</option>
                <option value="Deutsch">🇩🇪 Deutsch</option>
                <option value="Français">🇫🇷 Français</option>
                <option value="Italiano">🇮🇹 Italiano</option>
                <option value="Українська">🇺🇦 Українська</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kategoria / Nisza:</label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Psychologia">Psychologia</option>
                <option value="Kosmos">Kosmos</option>
                <option value="Motywacja">Motywacja & Stoicyzm</option>
                <option value="AI & Tech">AI & Nowe Technologie</option>
                <option value="Ciekawostki">Ciekawostki i Fakty</option>
                <option value="Finanse">Finanse & Sukces</option>
                <option value="Historia">Historia & Tajemnice</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Sceny (Długość):</label>
              <select
                value={sceneCount}
                onChange={(e) => setSceneCount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={2}>⚡ 2 dynamiczne sceny Pexels (18s - Rekomendowane: 2x 9s + cięcie + CTA)</option>
                <option value={1}>1 scena (18s - Pojedynczy klip)</option>
                <option value={3}>3 sceny (~18s - 3x 6s)</option>
                <option value={4}>4 sceny (~18s)</option>
                <option value={5}>5 scen (~20s)</option>
                <option value={6}>6 scen (~24s)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Format Wideo:</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="720x1280">Pionowe 720p HD (9:16 - Szybki render)</option>
                <option value="1080x1920">Pionowe 1080p (9:16 Full HD)</option>
                <option value="1280x720">Poziome 720p (16:9 HD)</option>
                <option value="720x720">Kwadrat 720p (1:1)</option>
              </select>
            </div>
          </div>

          {/* Advanced Features: Lektor AI & Animated Subtitles Panel */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            {/* Lektor Text-to-Speech Block */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border transition ${ttsEnabled ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Lektor Text-to-Speech (Synteza Mowy AI)</span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-400/30 uppercase">
                        {targetLanguage}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Automatyczne czytanie tekstu każdej sceny przez naturalnego lektora w wybranym języku.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleVoicePreview}
                    disabled={voicePreviewLoading || !ttsEnabled}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                    title="Odsłuchaj próbkę głosu"
                  >
                    {voicePreviewLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    ) : voicePreviewPlaying ? (
                      <Pause className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span>{voicePreviewPlaying ? 'Zatrzymaj próbkę' : 'Odsłuchaj lektora'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      ttsEnabled ? 'bg-indigo-600' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        ttsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {ttsEnabled && (
                <div className="pt-3 border-t border-slate-800/60 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Wybór głosu lektora */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <span>Profil głosu AI (Neural Voices):</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-normal">HD</span>
                        </label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <select
                          value={ttsVoice}
                          onChange={(e) => setTtsVoice(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        >
                          {targetLanguage === 'Polski' ? (
                            <>
                              <optgroup label="⚡ Głosy Lektorskie AI (Neural HD — Zróżnicowane & Sprawdzone)">
                                <option value="pl-PL-MarekNeural">🎙️ Marek — Męski dynamiczny (Rekomendowany do Shorts & Biznes)</option>
                                <option value="pl-PL-ZofiaNeural">🎙️ Zofia — Żeński naturalny & wyrazisty (Ciepła narracja)</option>
                                <option value="pl-PL-MarekNeural-deep">🎙️ Krzysztof — Męski głęboki bas (Kino, Storytelling & Raporty)</option>
                                <option value="pl-PL-ZofiaNeural-expressive">✨ Maja — Żeński młody & ekspresyjny (Shorts, Virale & TikTok)</option>
                                <option value="pl-PL-MarekNeural-energy">⚡ Patryk — Męski wysoka energia (TikTok, Agresywny Hook)</option>
                                <option value="pl-PL-ZofiaNeural-pro">💼 Anna — Żeński spokojny & profesjonalny (Analizy B2B)</option>
                              </optgroup>
                              <optgroup label="🌟 Profile ElevenLabs (Autonomiczny inteligentny fallback)">
                                <option value="eleven_adam">✨ Adam — Głęboki kinowy narrator (PL/EN)</option>
                                <option value="eleven_antoni">✨ Antoni — Wyrazisty autorytatywny lektor (PL/EN)</option>
                                <option value="eleven_rachel">✨ Rachel — Spokojna, profesjonalna lektorka (PL/EN)</option>
                                <option value="eleven_bella">✨ Bella — Młoda, ekspresyjna narratorka (PL/EN)</option>
                                <option value="eleven_josh">✨ Josh — Dynamiczny męski shorts (PL/EN)</option>
                                <option value="eleven_george">✨ George — Kinowy storyteller (PL/EN)</option>
                                <option value="eleven_liam">✨ Liam — Nowoczesny lektor TikTok (PL/EN)</option>
                              </optgroup>
                            </>
                          ) : targetLanguage === 'Angielski (EN)' ? (
                            <>
                              <optgroup label="⚡ Neural HD Voices (Fast, Clear & Natural)">
                                <option value="en-US-ChristopherNeural">🎙️ Christopher — Male Energetic (Viral Shorts / MrBeast)</option>
                                <option value="en-US-JennyNeural">🎙️ Jenny — Female Warm & Natural Storyteller</option>
                                <option value="en-US-GuyNeural">🎙️ Guy — Male News Anchor (Authoritative / Bloomberg)</option>
                                <option value="en-US-AvaNeural">✨ Ava — Female Expressive & Modern (Shorts / Reels)</option>
                                <option value="en-US-AndrewNeural">🎙️ Andrew — Male Deep Cinematic Narrator</option>
                                <option value="en-US-BrianNeural">🎙️ Brian — Male Natural Tech & Business</option>
                                <option value="en-US-EmmaNeural">🎙️ Emma — Female Conversational & Crisp</option>
                                <option value="en-GB-RyanNeural">🎙️ Ryan — Male British Accent (London)</option>
                                <option value="en-GB-SoniaNeural">🎙️ Sonia — Female British Accent (BBC)</option>
                              </optgroup>
                              <optgroup label="🌟 ElevenLabs Studio Voices">
                                <option value="eleven_adam">✨ Adam — Deep Cinematic Narrator</option>
                                <option value="eleven_rachel">✨ Rachel — Professional Storyteller</option>
                                <option value="eleven_josh">✨ Josh — Energetic Viral Shorts</option>
                                <option value="eleven_bella">✨ Bella — Expressive Female</option>
                                <option value="eleven_george">✨ George — Warm Storyteller</option>
                              </optgroup>
                            </>
                          ) : targetLanguage === 'Niemiecki (DE)' ? (
                            <>
                              <optgroup label="⚡ Microsoft Edge Neural (Deutsch)">
                                <option value="de-DE-ConradNeural">🎙️ Conrad — Männlich Dynamic (Nachrichten & Wirtschaft)</option>
                                <option value="de-DE-KatjaNeural">🎙️ Katja — Weiblich Natürlich & Professionell</option>
                                <option value="de-DE-KillianNeural">⚡ Killian — Männlich Energetisch (Shorts / TikTok)</option>
                              </optgroup>
                              <optgroup label="🌟 ElevenLabs Studio AI">
                                <option value="eleven_adam">✨ Adam (Multilingual Deutsch)</option>
                                <option value="eleven_rachel">✨ Rachel (Multilingual Deutsch)</option>
                              </optgroup>
                            </>
                          ) : targetLanguage === 'Hiszpański (ES)' ? (
                            <>
                              <optgroup label="⚡ Microsoft Edge Neural (Español)">
                                <option value="es-ES-AlvaroNeural">🎙️ Alvaro — Masculino Dinámico</option>
                                <option value="es-ES-ElviraNeural">🎙️ Elvira — Femenino Natural</option>
                              </optgroup>
                              <optgroup label="🌟 ElevenLabs Studio AI">
                                <option value="eleven_adam">✨ Adam (Multilingual Español)</option>
                                <option value="eleven_rachel">✨ Rachel (Multilingual Español)</option>
                              </optgroup>
                            </>
                          ) : targetLanguage === 'Francuski (FR)' ? (
                            <>
                              <optgroup label="⚡ Microsoft Edge Neural (Français)">
                                <option value="fr-FR-HenriNeural">🎙️ Henri — Masculin Élégant</option>
                                <option value="fr-FR-DeniseNeural">🎙️ Denise — Féminin Naturel</option>
                              </optgroup>
                              <optgroup label="🌟 ElevenLabs Studio AI">
                                <option value="eleven_adam">✨ Adam (Multilingual Français)</option>
                                <option value="eleven_rachel">✨ Rachel (Multilingual Français)</option>
                              </optgroup>
                            </>
                          ) : (
                            <>
                              <optgroup label="⚡ Microsoft Edge Neural (Українська)">
                                <option value="uk-UA-OstapNeural">🎙️ Ostap — Чоловічий Динамічний</option>
                                <option value="uk-UA-PolinaNeural">🎙️ Polina — Жіночий Природний</option>
                              </optgroup>
                              <optgroup label="🌟 ElevenLabs Studio AI">
                                <option value="eleven_adam">✨ Adam (Multilingual)</option>
                              </optgroup>
                            </>
                          )}
                        </select>

                        {/* Dedicated Listen Button */}
                        <button
                          type="button"
                          onClick={handleToggleVoicePreview}
                          disabled={voicePreviewLoading || !ttsEnabled}
                          className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 shrink-0 ${
                            voicePreviewPlaying
                              ? 'bg-rose-600/20 border-rose-500/50 text-rose-300 hover:bg-rose-600/30'
                              : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white shadow-sm'
                          } disabled:opacity-40`}
                          title="Odsłuchaj próbkę wybranego głosu"
                        >
                          {voicePreviewLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                          ) : voicePreviewPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5 text-rose-300 animate-pulse" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Szybkość lektora */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-300 font-semibold">
                          Tempo mowy (Speed Multiplier):
                        </label>
                        <span className="text-indigo-400 font-mono font-bold">{ttsSpeed.toFixed(2)}x</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { val: 1.0, label: '1.0x (Norm)' },
                          { val: 1.15, label: '1.15x (Shorts)' },
                          { val: 1.25, label: '1.25x (Viral)' },
                          { val: 1.4, label: '1.4x (Fast)' }
                        ].map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => setTtsSpeed(preset.val)}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition border ${
                              Math.abs(ttsSpeed - preset.val) < 0.01
                                ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm'
                                : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-900">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncDurationWithVoice}
                        onChange={(e) => setSyncDurationWithVoice(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                      />
                      <span>Wydłuż scenę wideo do tempa lektora (Smart Audio Sync)</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">Ducking muzyki: -70%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Animowane Napisy Word-by-Word Block */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-300">
                    <Type className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Animowane Napisy Word-by-Word</span>
                      <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-[10px] font-semibold border border-yellow-400/30">
                        Hormozi / TikTok Style
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Wypalane przez silnik libass z czcionką Montserrat-Bold i dynamicznym podświetlaniem wyraz po wyrazie.
                    </p>
                  </div>
                </div>
              </div>

              {/* Style & Color Selector Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {/* Style Mode */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Animacja Tekstu:</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setCaptionAnimation('word-by-word')}
                      className={`py-1.5 px-2 rounded-lg font-medium transition text-center ${
                        captionAnimation === 'word-by-word' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Word-by-Word
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptionAnimation('single-word')}
                      className={`py-1.5 px-2 rounded-lg font-medium transition text-center ${
                        captionAnimation === 'single-word' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Pojedyncze
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptionAnimation('classic')}
                      className={`py-1.5 px-2 rounded-lg font-medium transition text-center ${
                        captionAnimation === 'classic' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Klasyczne
                    </button>
                  </div>
                </div>

                {/* Highlight Color Palette */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kolor Wyróżnienia:</label>
                  <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                    {[
                      { id: 'yellow', name: 'Złoty Neon', hex: '#FFD700', border: 'border-yellow-400' },
                      { id: 'lime', name: 'Zieleń Neon', hex: '#00FF66', border: 'border-emerald-400' },
                      { id: 'cyan', name: 'Cyan Błękit', hex: '#00E5FF', border: 'border-cyan-400' },
                      { id: 'red', name: 'Koral Czerwień', hex: '#FF3366', border: 'border-rose-400' },
                      { id: 'white', name: 'Czysta Biel', hex: '#FFFFFF', border: 'border-white' }
                    ].map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setHighlightColor(col.id as any)}
                        title={col.name}
                        className={`w-7 h-7 rounded-lg transition-transform flex items-center justify-center ${
                          highlightColor === col.id ? 'scale-110 ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: col.hex }}
                      >
                        {highlightColor === col.id && (
                          <Check className="w-4 h-4 text-black stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pozycja na Ekranie:</label>
                  <select
                    value={captionPosition}
                    onChange={(e) => setCaptionPosition(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="bottom">Dolna (Optymalna dla Shorts 9:16)</option>
                    <option value="center">Środek (Maksymalna Uwaga Widza)</option>
                    <option value="top">Górna (Dla specyficznych kadrów)</option>
                  </select>
                </div>
              </div>

              {/* Live Interactive Word-by-Word Preview Widget */}
              <div className="mt-3 bg-gradient-to-br from-slate-900 via-black to-slate-950 border border-slate-800 rounded-xl p-4 overflow-hidden relative shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-2">
                  <span className="flex items-center gap-1.5 text-yellow-400">
                    <Sparkles className="w-3.5 h-3.5" /> Podgląd efektu na żywo (Montserrat-Bold + libass):
                  </span>
                  <span className="uppercase text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                    Styl: {captionAnimation}
                  </span>
                </div>

                <div className="py-4 px-2 min-h-[64px] flex items-center justify-center text-center">
                  {captionAnimation === 'single-word' ? (
                    <motion.div
                      key={previewWordIndex}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.15, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="font-extrabold text-2xl tracking-wider uppercase px-4 py-1.5 rounded-lg bg-black/80 border-2"
                      style={{
                        color: highlightColor === 'yellow' ? '#FFD700' : highlightColor === 'lime' ? '#00FF66' : highlightColor === 'cyan' ? '#00E5FF' : highlightColor === 'red' ? '#FF3366' : '#FFFFFF',
                        borderColor: highlightColor === 'yellow' ? '#FFD700' : highlightColor === 'lime' ? '#00FF66' : highlightColor === 'cyan' ? '#00E5FF' : highlightColor === 'red' ? '#FF3366' : '#FFFFFF',
                        textShadow: '0 2px 8px rgba(0,0,0,0.9)'
                      }}
                    >
                      {previewWords[previewWordIndex]}
                    </motion.div>
                  ) : captionAnimation === 'word-by-word' ? (
                    <div className="flex flex-wrap items-center justify-center gap-2 font-extrabold text-base tracking-wide uppercase">
                      {previewWords.map((w, idx) => {
                        const isCurrent = idx === previewWordIndex;
                        return (
                          <span
                            key={idx}
                            className={`transition-all duration-150 rounded px-1.5 py-0.5 ${
                              isCurrent
                                ? 'scale-110 shadow-lg font-black'
                                : 'text-slate-200 opacity-80'
                            }`}
                            style={{
                              color: isCurrent
                                ? highlightColor === 'yellow' ? '#FFD700' : highlightColor === 'lime' ? '#00FF66' : highlightColor === 'cyan' ? '#00E5FF' : highlightColor === 'red' ? '#FF3366' : '#FFFFFF'
                                : '#FFFFFF',
                              backgroundColor: isCurrent ? 'rgba(0, 0, 0, 0.75)' : 'transparent',
                              textShadow: isCurrent ? '0 0 10px rgba(0,0,0,0.8)' : '0 1px 3px rgba(0,0,0,0.9)'
                            }}
                          >
                            {w}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="font-extrabold text-lg text-white bg-black/70 px-4 py-1.5 rounded-lg tracking-wide uppercase border border-slate-700">
                      CZY WIESZ, ŻE TEN FORMAT ZDOBYWA MILIONY WYŚWIETLEŃ?
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Errors */}
          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <div>
                <strong>Błąd wywołania AI:</strong> {error}
              </div>
            </div>
          )}

          {/* Footage Verification Option */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={verifyFootageBeforeRender}
                onChange={(e) => setVerifyFootageBeforeRender(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 w-4 h-4"
              />
              <span className="font-semibold text-white">
                Wyświetl siatkę miniatur Pexels do weryfikacji przed renderem
              </span>
            </label>
            <span className="text-[11px] text-emerald-400 font-medium">
              ✓ Podgląd kadrów i podmiana klipów Pexels
            </span>
          </div>

          {/* Main Execution Trigger Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-800">
            <button
              onClick={handleAutoPilotRun}
              disabled={autoPilotLoading || generatingScript}
              className="w-full sm:flex-1 py-3.5 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-950 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {autoPilotLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Uruchamianie Renderera FFmpeg...
                </>
              ) : generatingScript ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Pobieranie materiałów z Pexels...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-pulse" />
                  {generatedScript && generatedScript.scenes?.length > 0
                    ? '🚀 Zatwierdź & Renderuj Film (FFmpeg)'
                    : '⚡ Generuj i Zweryfikuj Ujęcia Pexels'}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleFetchAndVerifyFootage}
              disabled={autoPilotLoading || generatingScript}
              className="w-full sm:w-auto py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              title="Pobierz ujęcia z Pexels do weryfikacji"
            >
              <Film className="w-4 h-4 text-cyan-400" />
              <span>Podgląd Ujęć Pexels</span>
            </button>

            <button
              onClick={handleGenerateScriptOnly}
              disabled={autoPilotLoading || generatingScript}
              className="w-full sm:w-auto py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Do Edytora</span>
            </button>
          </div>
        </div>

        {/* API Endpoint & Integration Box for Make.com / n8n */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm border-b border-slate-800 pb-3">
              <Code2 className="w-4 h-4" />
              Bezobsługowy Endpoint Make.com
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Dla całkowitej automatyzacji w <strong>Make.com</strong> lub <strong>n8n</strong> wyślij zapytanie <code className="text-indigo-300 font-mono">POST /api/auto-pilot-shorts</code>. System sam wygeneruje napisy i zmontuje wideo!
            </p>

            <div className="relative">
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 overflow-x-auto leading-tight">
                {makePayloadJSON}
              </pre>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(makePayloadJSON);
                  setCopiedPayload(true);
                  setTimeout(() => setCopiedPayload(false), 2000);
                }}
                className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition flex items-center gap-1"
              >
                {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="p-3 bg-purple-950/30 border border-purple-500/20 rounded-xl text-xs text-purple-200 space-y-1">
            <div className="font-semibold text-purple-300 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-purple-400" />
              Status & SSE Webhook Stream
            </div>
            <p className="text-[11px] text-purple-300/80">
              Odbieraj powiadomienie o gotowym pliku MP4 na Twój webhook Make.com lub nasłuchuj SSE stream.
            </p>
          </div>
        </div>
      </div>

      {/* 🌟 PEXELS STOCK FOOTAGE VISUAL VERIFICATION GRID */}
      {generatedScript && generatedScript.scenes && generatedScript.scenes.length > 0 && (
        <StockFootageGrid
          scenes={generatedScript.scenes}
          onUpdateSceneVideo={handleUpdateSceneVideo}
          onStartRender={handleStartRenderWithVerifiedScenes}
          onRefreshAllFootage={handleRefreshAllFootage}
          isRendering={autoPilotLoading}
          isLoadingFootage={isRefreshingFootage || generatingScript}
          onToast={onToast}
        />
      )}

      {/* Generated Result & Real-Time Render Player */}
      {(generatedScript || jobStatus) && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Wygenerowany Viral Short
              </span>
              <h3 className="text-xl font-bold text-white">
                {generatedScript?.title || topic}
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {generatedScript?.description}
              </p>
            </div>

            {jobStatus?.outputUrl && (
              <a
                href={jobStatus.outputUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950 transition flex items-center gap-2 shrink-0"
              >
                <Download className="w-4 h-4" /> Pobierz Gotowy MP4
              </a>
            )}
          </div>

          {/* Render Progress Monitor */}
          {jobStatus && (
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-2">
                  <RefreshCw
                    className={`w-4 h-4 text-indigo-400 ${
                      jobStatus.status === 'processing' ? 'animate-spin' : ''
                    }`}
                  />
                  Status FFmpeg Renderera: <strong className="text-white">{jobStatus.step}</strong>
                </span>
                <span className="font-mono text-indigo-400 font-bold text-sm">
                  {jobStatus.progress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
                <motion.div
                  className={`h-full rounded-full transition-all duration-300 ${
                    jobStatus.status === 'completed'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : jobStatus.status === 'failed'
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400'
                  }`}
                  style={{ width: `${jobStatus.progress}%` }}
                />
              </div>

              {/* Status details */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span>FPS: {jobStatus.fps || 30}</span>
                <span>Klatka: {jobStatus.frame || 0}</span>
                <span>Czas renderu: {jobStatus.time || '00:00'}</span>
                <span>Prędkość: {jobStatus.speed || '1.0x'}</span>
              </div>
            </div>
          )}

          {/* Player & Scene Breakdown Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Video Preview & Player */}
            <div className="lg:col-span-5">
              {jobStatus?.outputUrl ? (
                <VideoPreview
                  videoUrl={jobStatus.outputUrl}
                  thumbnailUrl={jobStatus.thumbnailUrl}
                  title={generatedScript?.title || topic}
                  duration={jobStatus.duration || 18}
                  fileSize={jobStatus.fileSize}
                  jobId={jobStatus.id}
                  variant="card"
                  onToast={onToast}
                  autoPlay={false}
                />
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center aspect-[9/16] max-h-[520px] w-full">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
                  <p className="text-xs font-semibold text-slate-200">Generowanie wideo przez FFmpeg...</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
                    Po zrenderowaniu wideo ukaże się tutaj interaktywny odtwarzacz i miniatura.
                  </p>
                </div>
              )}
            </div>

            {/* Generated Scenes Table */}
            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" /> Sekwencja Scen & Napisów Montserrat-Bold
              </h4>

              <div className="space-y-3">
                {generatedScript?.scenes.map((sc, i) => (
                  <div
                    key={i}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-4 hover:border-slate-700 transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0">
                      #{i + 1}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="text-xs font-extrabold text-yellow-300 font-mono tracking-wide">
                        "{sc.subtitles}"
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3">
                        <span>⏱️ {sc.duration || 4}s</span>
                        <span>🎬 Wideo: {sc.searchKeyword || 'Stock Clip'}</span>
                        <span className="text-indigo-400">Montserrat-Bold</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Call to action highlight */}
                <div className="p-3.5 bg-gradient-to-r from-red-950/40 to-amber-950/20 border border-red-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider">
                      CTA
                    </span>
                    <span className="text-slate-300">
                      Głos lektora & napisy kończą się wezwaniem:
                    </span>
                  </div>
                  <span className="text-red-400 font-mono font-bold">
                    raport-finansowy24.pl
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 🚀 VIRAL STRATEGY 2026: Swipe File Modal */}
      <AnimatePresence>
        {showSwipeFileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      Baza Viralowych Hooków Finansowych (Swipe File 2026)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Sprawdzone nagłówki z wysokim wskaźnikiem retencji dla portalu <strong className="text-amber-300">raport-finansowy24.pl</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSwipeFileModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Swipe File Items Grid */}
              <div className="space-y-3">
                {SWIPE_FILE_HOOKS.map((hook) => (
                  <div
                    key={hook.id}
                    className="p-4 bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-2xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-amber-300">
                          {hook.category}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold">
                          {hook.impact}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-200 transition">
                        "{hook.hookText}"
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setTopic(hook.hookText);
                        setShowSwipeFileModal(false);
                        onToast?.('success', 'Wczytano Hook Viralowy', `Ustawiono temat: "${hook.title}"`);
                      }}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shrink-0 shadow-md shadow-amber-950/40"
                    >
                      <Zap className="w-3.5 h-3.5 fill-slate-950" />
                      Graj Ten Hook
                    </button>
                  </div>
                ))}
              </div>

              {/* Footer info */}
              <div className="pt-3 border-t border-slate-800 text-center text-[11px] text-slate-500 flex items-center justify-between">
                <span>Kliknij dowolny hook, aby natychmiast uzupełnić generator.</span>
                <span className="text-amber-400 font-mono font-semibold">raport-finansowy24.pl</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
