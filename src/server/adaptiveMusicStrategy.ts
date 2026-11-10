export type FinancialMusicSentiment = 'urgent_tension' | 'bullish_growth' | 'analytical_neutral';

export interface AdaptiveMusicTrack {
  id: string;
  sentiment: FinancialMusicSentiment;
  name: string;
  url: string;
  tempo: string;
  recommendedVolume: number;
  description: string;
}

export const ADAPTIVE_MUSIC_CATALOG: Record<FinancialMusicSentiment, AdaptiveMusicTrack> = {
  urgent_tension: {
    id: 'track_tension',
    sentiment: 'urgent_tension',
    name: 'Pilne & Spadki (Tension Beat)',
    url: 'https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3',
    tempo: 'fast / focused',
    recommendedVolume: 0.18,
    description: 'Napięty, dynamiczny podkład podkreślający powagę sytuacji, spadki na giełdzie lub afery rynkowe.'
  },
  bullish_growth: {
    id: 'track_bullish',
    sentiment: 'bullish_growth',
    name: 'Hossa & Sukces (Tech House Vibes)',
    url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    tempo: 'upbeat 124 BPM',
    recommendedVolume: 0.20,
    description: 'Energetyczny, nowoczesny beat sukcesu pasujący do rekordowych zysków, wzrostów i dywidend.'
  },
  analytical_neutral: {
    id: 'track_analytical',
    sentiment: 'analytical_neutral',
    name: 'Raport Analityczny (Deep Focus)',
    url: 'https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3',
    tempo: 'medium / neutral',
    recommendedVolume: 0.16,
    description: 'Zrównoważony, minimalistyczny podkład lo-fi / deep nieodciągający uwagi od skomplikowanych danych i stóp NBP.'
  }
};

const TENSION_KEYWORDS = [
  'spad', 'krach', 'tąpnię', 'tapnie', 'afer', 'kryzys', 'panik', 'kar', 'zarzut',
  'przecen', 'strat', 'dramat', 'upadł', 'upadl', 'recesj', 'niepewn', 'załama', 'zalama',
  'minus', 'czerwon', 'ostrzeż', 'ostrzez', 'ryzyko', 'spór', 'spor', 'pozew', 'śledzt', 'sledzt'
];

const BULLISH_KEYWORDS = [
  'wzrost', 'rekord', 'hoss', 'zysk', 'sukces', 'dywidend', 'przełom', 'przelom',
  'rajd', 'zwyżk', 'zwyzk', 'zielon', 'milion', 'miliard', 'plus', 'odbici', 'szczyt',
  'lider', 'wystrzał', 'wystrzal', 'awans', 'faworyt', 'zarob'
];

/**
 * Deterministically classifies article or headline sentiment for background music mood.
 */
export function detectArticleSentiment(title = '', content = ''): FinancialMusicSentiment {
  const text = `${title} ${content}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let tensionScore = 0;
  for (const kw of TENSION_KEYWORDS) {
    const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const regex = new RegExp(`\\b${kwNorm}`, 'i');
    if (regex.test(text)) {
      tensionScore += 2;
    }
  }

  let bullishScore = 0;
  for (const kw of BULLISH_KEYWORDS) {
    const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const regex = new RegExp(`\\b${kwNorm}`, 'i');
    if (regex.test(text)) {
      bullishScore += 2;
    }
  }

  if (tensionScore > bullishScore && tensionScore >= 2) {
    return 'urgent_tension';
  }

  if (bullishScore > tensionScore && bullishScore >= 2) {
    return 'bullish_growth';
  }

  // Default for interest rates, macroeconomic stats, neutral news
  return 'analytical_neutral';
}

/**
 * Selects background music URL adapted to topic sentiment.
 * Preserves user's custom URL if explicitly supplied.
 */
export function selectAdaptiveBackgroundMusic(options: {
  title?: string;
  content?: string;
  customUrl?: string;
  preferredSentiment?: FinancialMusicSentiment;
}): { url: string; track: AdaptiveMusicTrack; sentiment: FinancialMusicSentiment; isCustom: boolean } {
  if (options.customUrl && options.customUrl.trim()) {
    const sentiment = options.preferredSentiment || detectArticleSentiment(options.title, options.content);
    const fallbackTrack = ADAPTIVE_MUSIC_CATALOG[sentiment];
    return {
      url: options.customUrl.trim(),
      track: { ...fallbackTrack, url: options.customUrl.trim(), name: 'Własny podkład użytkownika' },
      sentiment,
      isCustom: true
    };
  }

  const sentiment = options.preferredSentiment || detectArticleSentiment(options.title, options.content);
  const track = ADAPTIVE_MUSIC_CATALOG[sentiment];

  return {
    url: track.url,
    track,
    sentiment,
    isCustom: false
  };
}
