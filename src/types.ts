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

export interface NewsSceneSegmentKeyword {
  sceneIndex: number;
  segmentName: string;
  narrativeRole: string;
  primaryKeyword: string;
  alternativeKeywords: string[];
  visualMood: string;
  reasoning: string;
  previewVideos?: PexelsVideoItem[];
}

export interface NewsContentAnalysisResult {
  success: boolean;
  articleTitle: string;
  sourceCategory?: string;
  keyEntities: string[];
  marketEmotion: string;
  coreMetrics: string[];
  storySummary: string;
  segments: NewsSceneSegmentKeyword[];
  modelUsed?: string;
  analyzedAt: string;
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

export interface AiViralDecisions {
  detectedNiche: string;
  hookStrategy: string;
  optimalVoice: string;
  voiceSpeed: number;
  highlightColor: 'yellow' | 'lime' | 'red' | 'cyan' | 'white';
  captionAnimation: 'word-by-word' | 'single-word' | 'classic';
  sceneCount: number;
  resolution: string;
  musicMood?: string;
  explanation: string;
}

export interface ViralityScore {
  totalScore: number; // 0 - 100
  rating: 'VIRAL_EXPLOSION' | 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'STANDARD';
  sentiment: {
    type: 'alert' | 'positive' | 'urgent' | 'controversial' | 'neutral';
    label: string;
    emotionalTriggers: string[];
    sentimentScore: number; // 0 - 25
  };
  trendAlignment: {
    matchedKeyword: string;
    trendRank: number; // 1 - 5 (0 if non-ranked)
    sharePercent: number;
    trendScore: number; // 0 - 35
  };
  retentionHook: {
    hookStrength: number; // 0 - 20
    openingAngle: string;
    targetAudience: string;
  };
  monetizationFit: {
    product: string;
    monetizationScore: number; // 0 - 20
    projectedCpaEur: number;
  };
  rationale: string;
}

export interface AutopilotRunRecord {
  id: string;
  timestamp: string;
  slot: string;
  articleTitle: string;
  articleLink: string;
  articleCategory?: string;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  outputFilename?: string;
  duration?: number;
  error?: string;
  aiDecisions?: AiViralDecisions;
  viralityScore?: ViralityScore;
  projectedEarnings?: {
    estViews: number;
    estCtrPercent: number;
    estClicksToBio: number;
    estConversionRatePercent: number;
    estApplications: number;
    avgCpaEur: number;
    projectedEur: number;
    monetizationProduct: string;
  };
}

export interface VideoProfitLog {
  id: string;
  timestamp: string;
  videoTitle: string;
  slot: string;
  jobId: string;
  status: 'completed' | 'processing' | 'queued' | 'failed';
  estViews: number;
  estClicksToBio: number;
  estApplications: number;
  avgCpaEur: number;
  projectedEur: number;
  productCategory: string;
}

export interface ProfitMonitorState {
  targetGoalEur: number; // 10 000 EUR
  totalProjectedEur: number;
  progressPercent: number;
  remainingEur: number;
  totalCompletedVideos: number;
  dailyProjectedEur: number;
  avgEurPerVideo: number;
  videosNeededToGoal: number;
  logs: VideoProfitLog[];
}

export interface AutopilotSchedulerState {
  enabled: boolean;
  dailySlots: string[];
  category: string;
  voice: string;
  sceneCount: number;
  resolution: string;
  niche: string;
  aiDirectorMode?: boolean;
  lastExecutedSlot: string | null;
  lastRunTime: string | null;
  lastRunStatus: 'idle' | 'running' | 'completed' | 'failed';
  lastRunArticle: { title: string; link: string; category?: string } | null;
  lastRunJobId: string | null;
  runsCount: number;
  history: AutopilotRunRecord[];
  processedUrls: string[];
  nextRun?: {
    time: string;
    slot: string;
    countdownMinutes: number;
    countdownFormatted: string;
  };
  candidateArticle?: BankierArticle | null;
  candidateViralityScore?: ViralityScore | null;
}

export interface BankierTrendKeyword {
  keyword: string;
  count: number;
  sharePercent: number;
  category: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'alert';
  narrativeAngle: string;
  monetizationHook: string; // Jak słowo kluczowe konwertuje na produkty finansowe / 10 000 EUR
}

export interface TrendsMonitorData {
  topKeywords: BankierTrendKeyword[];
  totalArticlesAnalyzed: number;
  analyzedCategories: string[];
  lastUpdated: string;
  viralNarrativeJustification: string;
  monetizationTarget: {
    monthlyGoalEur: number;
    estimatedRequiredViews: number;
    avgCpaEur: number;
    dailyConversionsNeeded: number;
    recommendedProductFunnel: string;
  };
}


