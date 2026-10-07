export interface CaptionStyle {
  fontSize?: number;
  fontColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
  boxColor?: string;
  position?: 'bottom' | 'center' | 'top';
  alignment?: 'center' | 'left' | 'right';
  animation?: 'word-by-word' | 'single-word' | 'karaoke' | 'classic';
  highlightColor?: 'yellow' | 'green' | 'lime' | 'cyan' | 'red' | 'white';
}

export interface Scene {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  duration?: number;
  subtitles: string;
  voiceoverText?: string;
  voiceover_text?: string;
  captionStyle: CaptionStyle;
  trimStart?: number;
  trimEnd?: number;
  searchKeyword?: string;
}

export interface CombinePayload {
  scenes: {
    videoUrl?: string;
    imageUrl?: string;
    duration?: number;
    subtitles?: string;
    voiceover_text?: string;
    voiceoverText?: string;
    captionStyle?: CaptionStyle;
    trimStart?: number;
    trimEnd?: number;
  }[];
  audioUrl?: string;
  backgroundMusicUrl?: string;
  audioVolume?: number;
  outputResolution?: string;
  fps?: number;
  async?: boolean;
  webhookUrl?: string;
  tts?: boolean;
  ttsLanguage?: string;
  ttsVoice?: string;
  ttsSpeed?: number;
  syncDurationWithVoice?: boolean;
  captionAnimation?: 'word-by-word' | 'single-word' | 'karaoke' | 'classic';
  highlightColor?: 'yellow' | 'green' | 'lime' | 'cyan' | 'red' | 'white';
}

export interface SystemHealth {
  status: string;
  service: string;
  ffmpeg: string;
  fontStatus: {
    name: string;
    ready: boolean;
    path: string;
  };
  activeJobsCount: number;
  timestamp: string;
}

export interface JobStatusResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  step: string;
  frame?: number;
  fps?: number;
  time?: string;
  speed?: string;
  logs?: string[];
  outputUrl?: string;
  outputFilename?: string;
  thumbnailUrl?: string;
  thumbnailFilename?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ViralScriptRequest {
  topic?: string;
  niche?: string;
  language?: string;
  sceneCount?: number;
}

export interface ViralScene {
  subtitles: string;
  voiceover_text?: string;
  voiceoverText?: string;
  duration: number;
  searchKeyword: string;
  videoUrl: string;
  thumbnailUrl?: string;
  source?: 'pexels' | 'curated';
  photographer?: string;
  pexelsId?: number;
  captionStyle: CaptionStyle;
  trimStart?: number;
  trimEnd?: number;
}

export interface PexelsVideoItem {
  id: number;
  videoUrl: string;
  thumbnailUrl: string;
  searchKeyword?: string;
  width?: number;
  height?: number;
  duration?: number;
  photographer?: string;
  photographerUrl?: string;
  source?: 'pexels' | 'curated';
}

export interface ViralScriptResponse {
  title: string;
  description: string;
  hook: string;
  scenes: ViralScene[];
  backgroundMusicUrl: string;
  audioVolume: number;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

export interface BankierArticle {
  id: string;
  title: string;
  link: string;
  description: string;
  imageUrl?: string | null;
  pubDate: string;
  formattedDate?: string;
  category?: string;
  isGrounded?: boolean;
  keyTakeaway?: string;
  suggestedSearchKeywords?: string[];
  suggestedHook?: string;
}

export interface GroundedSource {
  title: string;
  url: string;
}

export interface GroundedBankierHeadline {
  id: string;
  title: string;
  summary: string;
  category: string;
  sourceUrl: string;
  pubDate: string;
  keyTakeaway?: string;
  suggestedSearchKeywords?: string[];
  suggestedHook?: string;
  isGrounded?: boolean;
}

export interface GroundedBankierResponse {
  success: boolean;
  model: string;
  queryTime: string;
  headlines: GroundedBankierHeadline[];
  groundingSources: GroundedSource[];
  searchQueries?: string[];
  error?: string;
  fallback?: boolean;
}

export interface RecentCompletedJob {
  id: string;
  status: string;
  step: string;
  filename: string;
  fileSize: string | number;
  downloadUrl: string;
  outputUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt?: string;
  timestampFormatted: string;
}
