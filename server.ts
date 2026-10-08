import express from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const execPromise = promisify(exec);

const PORT = 3000;
const app = express();

// Initialize GoogleGenAI SDK on server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

// Curated Vertical (9:16) Motion Graphics & Stock Video Library (Mixkit / Coverr / Pexels CDN)
// Optimized for seamless looping, financial charts, modern cityscapes, and high-tech aesthetics
const CURATED_MOTION_CLIPS_POOL = [
  {
    title: 'Giełda & Wykresy Świecowe (Finanse / Trading)',
    keywords: ['giełda', 'akcje', 'finanse', 'pieniądz', 'inwestycje', 'trading', 'finance', 'stock', 'market', 'chart', 'candlestick', 'crypto', 'bitcoin', 'bankier', 'economy'],
    url: 'https://assets.mixkit.co/videos/preview/mixkit-stock-market-candlestick-charts-and-graphs-41315-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=640&q=80'
  },
  {
    title: 'Metropolia Nocą & Drapacze Chmur (Biznes / Gospodarka)',
    keywords: ['miasto', 'metropolia', 'biznes', 'drapacze', 'wieżowce', 'sukces', 'city', 'drone', 'skyscrapers', 'building', 'metropolis', 'urban', 'night', 'corporate'],
    url: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-city-skyscrapers-at-night-42416-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=640&q=80'
  },
  {
    title: 'Cyfrowy Matrix & Animacja Danych (AI / Technologia)',
    keywords: ['ai', 'sztuczna inteligencja', 'technologia', 'dane', 'kod', 'sieci', 'komputer', 'tech', 'cyber', 'code', 'data', 'algorithm', 'digital', 'neural', 'matrix'],
    url: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-graphs-and-data-31913-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=640&q=80'
  },
  {
    title: 'Przeliczanie Gotówki & Pieniądze (Kapitał / Waluty)',
    keywords: ['pieniądze', 'gotówka', 'waluty', 'dolar', 'euro', 'złoty', 'banknoty', 'money', 'cash', 'currency', 'bills', 'wealth', 'millionaire'],
    url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-counting-a-stack-of-euro-bills-48243-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=640&q=80'
  },
  {
    title: 'Cyberpunk & Neonowy Tunel (Nowoczesność / Przyszłość)',
    keywords: ['przyszłość', 'neon', 'cyberpunk', 'tunel', 'dynamika', 'future', 'tunnel', 'neon', 'glow', 'abstract', 'motion', 'loop'],
    url: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-tunnel-with-neon-lights-42845-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=640&q=80'
  },
  {
    title: 'Koło Luksusowego Samochodu & Prędkość (Adrenalina / Motoryzacja)',
    keywords: ['samochód', 'auto', 'prędkość', 'luksus', 'adrenalina', 'car', 'speed', 'luxury', 'wheel', 'drive', 'hypercar', 'fast'],
    url: 'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-the-wheel-of-a-luxury-car-spinning-42512-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=640&q=80'
  },
  {
    title: 'Fale Oceanu & Klif (Natura / Spokój / Psychologia)',
    keywords: ['natura', 'ocean', 'morze', 'klif', 'psychologia', 'mózg', 'spokój', 'nature', 'ocean', 'water', 'cliff', 'waves', 'calm', 'landscape'],
    url: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-ocean-waves-crashing-on-rocks-42414-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=640&q=80'
  },
  {
    title: 'Głęboki Kosmos & Gwiazdy (Wszechświat / Filozofia)',
    keywords: ['kosmos', 'gwiazdy', 'galaktyka', 'wszechświat', 'filozofia', 'space', 'galaxy', 'stars', 'cosmos', 'universe', 'deep space'],
    url: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=640&q=80'
  }
];

export interface ResolvedStockVideo {
  videoUrl: string;
  thumbnailUrl: string;
  searchKeyword?: string;
  source: 'pexels' | 'curated';
  pexelsId?: number;
  width?: number;
  height?: number;
  duration?: number;
  photographer?: string;
  photographerUrl?: string;
}

// Negative keywords that signal static, slow, or irrelevant footage
const NEGATIVE_VIDEO_SLUG_TERMS = [
  'eraser',
  'writing-on-a-paper',
  'writing-notes',
  'taking-notes',
  'drawing',
  'gymnast',
  'training',
  'reading-a-book',
  'doctor',
  'medical',
  'cooking',
  'fitness',
  'sport',
  'wedding',
  'beach-vacation',
  'illustration',
  'cartoon',
  'blackboard',
  'whiteboard',
  'pencil',
  'holding-coffee',
  'hand-holding-pen',
  'signing-paper',
  'static-portrait',
  'smiling-at-camera',
  'exhausted',
  'tired',
  'depressed',
  'sad-man',
  'sad-woman',
  'sitting-at-desk',
  'person-using-laptop',
  'working-on-laptop',
  'typing-on-keyboard',
  'typing',
  'man-in-front-of-laptop',
  'talking-on-phone',
  'drinking-coffee',
  'drinking',
  'eating',
  'sleeping',
  'staring-at-screen',
  'office-worker-sitting',
  'casual-meeting',
  'interview',
  'portrait',
  'looking-at-camera',
  'bored',
  'senior',
  'elderly',
  'couch',
  'sofa',
  'slow',
  'walk',
  'walking-slowly'
];

// Positive keywords that indicate high-energy, viral motion graphics & cinematic b-roll
const DYNAMIC_VIRAL_BOOST_TERMS = [
  'timelapse',
  'hyperlapse',
  'dynamic',
  'animation',
  'flashing',
  'trading',
  'candlestick',
  'exchange',
  'skyline',
  'aerial',
  'traffic',
  'stream',
  'cash',
  'banknotes',
  'drone',
  'display',
  'charts',
  'night',
  'vault',
  'luxury',
  'speed',
  'fast',
  'matrix',
  'cyber',
  'digital',
  'neon',
  'rush',
  'glitch',
  'ticker',
  'crypto'
];

// Intelligent keyword translator & enhancer: converts Polish domain terms into proven, dynamic vertical (9:16) Pexels queries
function translateAndEnrichViralKeyword(
  rawQuery: string,
  sceneIndex: number = 0,
  totalScenes: number = 2,
  context?: string
): string {
  const combined = `${rawQuery || ''} ${context || ''}`.toLowerCase().trim();

  // Polish finance & viral concept mapping to tested dynamic Pexels visual queries
  if (
    combined.includes('stóp') ||
    combined.includes('stopy') ||
    combined.includes('rpp') ||
    combined.includes('nbp') ||
    combined.includes('rada polityki') ||
    combined.includes('odsetk')
  ) {
    if (sceneIndex === 0) return 'stock exchange screen numbers flashing';
    if (sceneIndex === 1) return 'central bank gold vault bullion';
    return 'dynamic financial stock market display animation';
  }

  if (
    combined.includes('kredyt') ||
    combined.includes('hipotek') ||
    combined.includes('mieszkan') ||
    combined.includes('deweloper') ||
    combined.includes('nieruchom')
  ) {
    if (sceneIndex === 0) return 'city traffic night hyperlapse';
    if (sceneIndex === 1) return 'aerial night view vibrant city skyline';
    return 'modern architecture skyscraper drone';
  }

  if (
    combined.includes('inflacj') ||
    combined.includes('drożyzn') ||
    combined.includes('drożej') ||
    combined.includes('cen') ||
    combined.includes('koszt')
  ) {
    if (sceneIndex === 0) return 'counting cash money bills dynamic';
    if (sceneIndex === 1) return 'fast stock market trading chart timelapse';
    return 'dynamic financial stock market display animation';
  }

  if (
    combined.includes('podatek') ||
    combined.includes('belk') ||
    combined.includes('fiskus') ||
    combined.includes('urząd skarbowy') ||
    combined.includes('strat') ||
    combined.includes('prowizj')
  ) {
    if (sceneIndex === 0) return 'stock exchange screen numbers flashing';
    if (sceneIndex === 1) return 'counting cash money bills dynamic';
    return 'corporate boardroom financial discussion glass office';
  }

  if (
    combined.includes('akcj') ||
    combined.includes('giełd') ||
    combined.includes('gpw') ||
    combined.includes('wig') ||
    combined.includes('spółk') ||
    combined.includes('orlen') ||
    combined.includes('trading')
  ) {
    if (sceneIndex === 0) return 'stock exchange screen numbers flashing';
    if (sceneIndex === 1) return 'fast stock market trading chart timelapse';
    return 'dynamic financial stock market display animation';
  }

  if (
    combined.includes('krypto') ||
    combined.includes('bitcoin') ||
    combined.includes('btc') ||
    combined.includes('ethereum') ||
    combined.includes('eth') ||
    combined.includes('blockchain')
  ) {
    if (sceneIndex === 0) return 'crypto trading chart dynamic';
    if (sceneIndex === 1) return 'dynamic cryptocurrency trading on tablets and screens';
    return 'cyber digital network glowing';
  }

  if (
    combined.includes('złot') ||
    combined.includes('gold') ||
    combined.includes('bullion') ||
    combined.includes('kruszc') ||
    combined.includes('sztabk')
  ) {
    if (sceneIndex === 0) return 'gold bullion shiny luxury';
    if (sceneIndex === 1) return 'central bank gold vault bullion';
    return 'counting cash money bills dynamic';
  }

  if (
    combined.includes('walut') ||
    combined.includes('dolar') ||
    combined.includes('euro') ||
    combined.includes('forex') ||
    combined.includes('kurs')
  ) {
    if (sceneIndex === 0) return 'counting cash money bills dynamic';
    if (sceneIndex === 1) return 'stock exchange screen numbers flashing';
    return 'fast stock market trading chart timelapse';
  }

  if (
    combined.includes('ai') ||
    combined.includes('sztuczn') ||
    combined.includes('technol') ||
    combined.includes('kod') ||
    combined.includes('cyfr') ||
    combined.includes('robot') ||
    combined.includes('automatyz')
  ) {
    if (sceneIndex === 0) return 'cyber digital network glowing';
    if (sceneIndex === 1) return 'vibrant digital data stream animation';
    return 'dynamic network connections abstract animation';
  }

  if (
    combined.includes('sukces') ||
    combined.includes('luksus') ||
    combined.includes('mająt') ||
    combined.includes('bogact') ||
    combined.includes('milioner') ||
    combined.includes('biznes') ||
    combined.includes('przedsiębiorc')
  ) {
    if (sceneIndex === 0) return 'aerial night view vibrant city skyline';
    if (sceneIndex === 1) return 'city traffic night hyperlapse';
    return 'corporate boardroom financial discussion glass office';
  }

  // If query is in English, clean it and enrich with dynamic viral qualifiers
  let clean = (rawQuery || 'finance stock market')
    .replace(/[^\w\s-]/gi, ' ')
    .replace(/\b(warning|mistake|illustration|draw|drawing|concept|documentation|compliance|bars|paper|notes|eraser|slide|tutorial)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean || clean.length < 3) {
    clean = sceneIndex === 0 ? 'stock exchange screen numbers flashing' : 'dynamic financial stock market display animation';
  }

  // Ensure dynamic movement modifiers
  const hasDynamic = /(dynamic|timelapse|hyperlapse|aerial|drone|flashing|animation|motion|speed|rush)/i.test(clean);
  if (!hasDynamic) {
    if (sceneIndex === 0) {
      clean = `${clean} timelapse dynamic`;
    } else {
      clean = `${clean} dynamic animation`;
    }
  }

  return clean;
}

// Dynamically search vertical portrait (9:16) stock video from Pexels API with viral candidate scoring & deduplication
async function searchPexelsVideoDetailed(
  query: string,
  options?: { sceneIndex?: number; avoidVideoIds?: number[]; avoidUrls?: string[]; context?: string }
): Promise<ResolvedStockVideo | null> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!pexelsKey || !pexelsKey.trim()) return null;

  const sceneIndex = options?.sceneIndex ?? 0;
  const avoidIds = options?.avoidVideoIds ?? [];
  const avoidUrls = options?.avoidUrls ?? [];
  const enrichedQuery = translateAndEnrichViralKeyword(query, sceneIndex, 2, options?.context);

  try {
    const searchUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(enrichedQuery)}&orientation=portrait&per_page=25`;
    console.log(`[Pexels API] Szukanie ultra-dynamicznego ujęcia 9:16 dla hasła: "${enrichedQuery}" (Scena #${sceneIndex + 1})...`);

    const res = await fetch(searchUrl, {
      headers: {
        Authorization: pexelsKey.trim(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!res.ok) {
      console.warn(`[Pexels API] Błąd HTTP ${res.status}: ${res.statusText}`);
      return null;
    }

    const data: any = await res.json();
    if (data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
      // Score and select the most dynamic, high-impact vertical video
      const candidates: Array<{ video: any; verticalMp4: any; score: number }> = [];

      for (const video of data.videos) {
        if (avoidIds.includes(video.id)) continue;

        const slug = (video.url || '').toLowerCase();
        const hasNegative = NEGATIVE_VIDEO_SLUG_TERMS.some((neg) => slug.includes(neg));
        if (hasNegative) continue;

        if (Array.isArray(video.video_files)) {
          // Look for vertical MP4 (1080p, 720p)
          const verticalMp4 = video.video_files.find((f: any) =>
            f.file_type === 'video/mp4' && f.height > f.width && f.height >= 1280
          ) || video.video_files.find((f: any) =>
            f.file_type === 'video/mp4' && f.height > f.width
          );

          if (verticalMp4 && verticalMp4.link) {
            if (avoidUrls.includes(verticalMp4.link)) continue;

            let score = 50;
            // Reward high-energy motion b-roll keywords
            for (const boost of DYNAMIC_VIRAL_BOOST_TERMS) {
              if (slug.includes(boost)) score += 25;
            }
            // Prefer videos of optimal viral duration (8s to 30s)
            if (video.duration >= 8 && video.duration <= 30) score += 20;
            // Prefer 1080p / 2160p Full HD
            if (verticalMp4.height >= 1920) score += 20;

            candidates.push({ video, verticalMp4, score });
          }
        }
      }

      // Sort by score descending
      candidates.sort((a, b) => b.score - a.score);

      const picked = candidates[0];
      if (picked) {
        console.log(`✓ [Pexels API Wybrano Dynamiczne 9:16] "${enrichedQuery}" (score: ${picked.score}) -> ID ${picked.video.id} (${picked.verticalMp4.width}x${picked.verticalMp4.height}, ${picked.video.duration}s)`);
        return {
          videoUrl: picked.verticalMp4.link,
          thumbnailUrl: picked.video.image || picked.video.video_pictures?.[0]?.picture || '',
          pexelsId: picked.video.id,
          width: picked.verticalMp4.width,
          height: picked.verticalMp4.height,
          duration: picked.video.duration,
          photographer: picked.video.user?.name,
          photographerUrl: picked.video.user?.url,
          searchKeyword: enrichedQuery,
          source: 'pexels'
        };
      }

      // Fallback within Pexels if all candidates were filtered
      for (const video of data.videos) {
        if (Array.isArray(video.video_files)) {
          const verticalMp4 = video.video_files.find((f: any) =>
            f.file_type === 'video/mp4' && f.height > f.width
          );
          if (verticalMp4 && verticalMp4.link) {
            return {
              videoUrl: verticalMp4.link,
              thumbnailUrl: video.image || video.video_pictures?.[0]?.picture || '',
              pexelsId: video.id,
              width: verticalMp4.width,
              height: verticalMp4.height,
              duration: video.duration,
              photographer: video.user?.name,
              photographerUrl: video.user?.url,
              searchKeyword: enrichedQuery,
              source: 'pexels'
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[Pexels API Błąd]`, (err as Error).message);
  }
  return null;
}

// Search multiple alternative clips for a given query (for gallery / swapping)
async function searchPexelsMultiple(
  query: string,
  perPage: number = 8,
  avoidVideoIds?: number[]
): Promise<ResolvedStockVideo[]> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!pexelsKey || !pexelsKey.trim()) return [];

  const enrichedQuery = translateAndEnrichViralKeyword(query, 0, 2);

  try {
    const searchUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(enrichedQuery)}&orientation=portrait&per_page=${Math.max(perPage, 14)}`;
    const res = await fetch(searchUrl, {
      headers: {
        Authorization: pexelsKey.trim(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!res.ok) return [];
    const data: any = await res.json();
    if (!data.videos || !Array.isArray(data.videos)) return [];

    const candidates: Array<{ video: any; verticalMp4: any; score: number }> = [];

    for (const video of data.videos) {
      if (avoidVideoIds && avoidVideoIds.includes(video.id)) continue;

      const slug = (video.url || '').toLowerCase();
      const hasNegative = NEGATIVE_VIDEO_SLUG_TERMS.some((neg) => slug.includes(neg));
      if (hasNegative) continue;

      if (Array.isArray(video.video_files)) {
        const verticalMp4 = video.video_files.find((f: any) =>
          f.file_type === 'video/mp4' && f.height > f.width && f.height >= 1280
        ) || video.video_files.find((f: any) =>
          f.file_type === 'video/mp4' && f.height > f.width
        );

        if (verticalMp4 && verticalMp4.link) {
          let score = 50;
          for (const boost of DYNAMIC_VIRAL_BOOST_TERMS) {
            if (slug.includes(boost)) score += 20;
          }
          if (video.duration >= 8 && video.duration <= 45) score += 15;
          if (verticalMp4.height >= 1920) score += 15;

          candidates.push({ video, verticalMp4, score });
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, perPage).map(({ video, verticalMp4 }) => ({
      videoUrl: verticalMp4.link,
      thumbnailUrl: video.image || video.video_pictures?.[0]?.picture || '',
      pexelsId: video.id,
      width: verticalMp4.width,
      height: verticalMp4.height,
      duration: video.duration,
      photographer: video.user?.name,
      photographerUrl: video.user?.url,
      searchKeyword: enrichedQuery,
      source: 'pexels' as const
    }));
  } catch (err) {
    console.warn('[searchPexelsMultiple Błąd]', (err as Error).message);
    return [];
  }
}

// Dynamically search vertical portrait (9:16) stock video from Pexels API (backward-compatible)
async function searchPexelsVideo(query: string): Promise<string | null> {
  const detailed = await searchPexelsVideoDetailed(query);
  return detailed ? detailed.videoUrl : null;
}

// Synchronous stock video resolver matching keywords with thumbnail
function getStockVideoWithThumbnail(query: string, index: number): { url: string; thumbnailUrl: string; title: string } {
  if (!query) {
    const item = CURATED_MOTION_CLIPS_POOL[index % CURATED_MOTION_CLIPS_POOL.length];
    return { url: item.url, thumbnailUrl: item.thumbnailUrl, title: item.title };
  }
  const lower = query.toLowerCase();
  const matched = CURATED_MOTION_CLIPS_POOL.find((item) =>
    item.keywords.some((k) => lower.includes(k))
  );
  if (matched) {
    return { url: matched.url, thumbnailUrl: matched.thumbnailUrl, title: matched.title };
  }
  const fallback = CURATED_MOTION_CLIPS_POOL[index % CURATED_MOTION_CLIPS_POOL.length];
  return { url: fallback.url, thumbnailUrl: fallback.thumbnailUrl, title: fallback.title };
}

// Synchronous stock video resolver matching keywords
function getStockVideoUrl(query: string, index: number): string {
  return getStockVideoWithThumbnail(query, index).url;
}

// Asynchronous stock or Pexels video resolver with full metadata, dynamic scoring & deduplication
async function resolveStockOrPexelsVideoDetailed(
  query: string,
  index: number = 0,
  avoidVideoIds?: number[]
): Promise<ResolvedStockVideo> {
  if (process.env.PEXELS_API_KEY && process.env.PEXELS_API_KEY.trim()) {
    const pexelsResult = await searchPexelsVideoDetailed(query, {
      sceneIndex: index,
      avoidVideoIds
    });
    if (pexelsResult) return pexelsResult;
  }
  const fallback = getStockVideoWithThumbnail(query, index);
  return {
    videoUrl: fallback.url,
    thumbnailUrl: fallback.thumbnailUrl,
    searchKeyword: query,
    source: 'curated'
  };
}

// Asynchronous stock or Pexels video resolver
async function resolveStockOrPexelsVideo(query: string, index: number, avoidVideoIds?: number[]): Promise<string> {
  const detailed = await resolveStockOrPexelsVideoDetailed(query, index, avoidVideoIds);
  return detailed.videoUrl;
}

// Enable JSON body parsing with higher limit for payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Directories
const WORK_DIR = process.cwd();
const TEMP_DIR = path.join(WORK_DIR, 'temp');
const EXPORTS_DIR = path.join(WORK_DIR, 'exports');
const FONTS_DIR = path.join(WORK_DIR, 'fonts');
const MONTSERRAT_FONT_PATH = path.join(FONTS_DIR, 'Montserrat-Bold.ttf');

// Ensure necessary directories exist
[TEMP_DIR, EXPORTS_DIR, FONTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper to compute public URL respecting proxies
function getPublicBaseUrl(req: express.Request): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

// Serve exported videos statically with CORS & range support
app.use('/exports', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
}, express.static(EXPORTS_DIR, {
  acceptRanges: true,
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
    }
  }
}), (req, res) => {
  res.status(404).json({
    error: 'Plik wideo nie został znaleziony.',
    message: 'Plik mógł zostać usunięty podczas restartu serwera lub adres jest nieprawidłowy.'
  });
});

// Dedicated Video Streaming Endpoint with HTTP 206 Partial Content support
app.get('/api/exports/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(EXPORTS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Nie znaleziono pliku wideo' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Serve fonts statically if needed
app.use('/fonts', express.static(FONTS_DIR));

// In-memory job store & real-time progress structure
interface Job {
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

const JOBS_DB_PATH = path.join(EXPORTS_DIR, 'jobs_history.json');
const jobsStore = new Map<string, Job>();
const sseSubscribers = new Map<string, Set<express.Response>>();

function saveJobsToDisk() {
  try {
    if (!fs.existsSync(EXPORTS_DIR)) {
      fs.mkdirSync(EXPORTS_DIR, { recursive: true });
    }
    const jobsArray = Array.from(jobsStore.values());
    fs.writeFileSync(JOBS_DB_PATH, JSON.stringify(jobsArray, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Nie można zapisać historii zadań na dysk:', (err as Error).message);
  }
}

function loadJobsFromDisk() {
  try {
    if (!fs.existsSync(EXPORTS_DIR)) {
      fs.mkdirSync(EXPORTS_DIR, { recursive: true });
    }
    if (fs.existsSync(JOBS_DB_PATH)) {
      const data = fs.readFileSync(JOBS_DB_PATH, 'utf-8');
      const jobsArray: Job[] = JSON.parse(data);
      if (Array.isArray(jobsArray)) {
        jobsArray.forEach(job => {
          if (job && job.id) {
            jobsStore.set(job.id, job);
          }
        });
        console.log(`[Historia] Załadowano ${jobsStore.size} zadań renderowania z pamięci dyskowej (${JOBS_DB_PATH})`);
      }
    }

    // Auto-discover exported .mp4 files on disk that might be missing from jobs_history.json
    if (fs.existsSync(EXPORTS_DIR)) {
      const files = fs.readdirSync(EXPORTS_DIR);
      for (const file of files) {
        if (file.endsWith('.mp4')) {
          const filePath = path.join(EXPORTS_DIR, file);
          const stats = fs.statSync(filePath);
          let existingJob = Array.from(jobsStore.values()).find(j => j.outputFilename === file);
          if (!existingJob) {
            const match = file.match(/combined_video_(job_[^\.]+)\.mp4/);
            const jobId = match ? match[1] : `job_disk_${stats.mtimeMs}`;
            const discoveredJob: Job = {
              id: jobId,
              status: 'completed',
              progress: 100,
              step: 'Renderowanie zakończone pomyślnie!',
              logs: [`[${new Date(stats.mtimeMs).toLocaleTimeString()}] Automatyczne przywrócenie pliku wideo MP4 z pamięci dyskowej`],
              outputFilename: file,
              fileSize: stats.size,
              createdAt: new Date(stats.birthtimeMs || stats.mtimeMs).toISOString(),
              updatedAt: new Date(stats.mtimeMs).toISOString()
            };
            jobsStore.set(jobId, discoveredJob);
          }
        }
      }
    }
    saveJobsToDisk();
  } catch (err) {
    console.warn('Nie można załadować historii zadań z dysku:', (err as Error).message);
  }
}

// Broadcast job updates over SSE and update jobsStore
function updateJobProgress(
  jobId: string,
  update: Partial<Job>,
  logMsg?: string
) {
  const job = jobsStore.get(jobId);
  if (!job) return;

  if (update.status) job.status = update.status;
  if (typeof update.progress === 'number') job.progress = Math.min(100, Math.max(0, Math.round(update.progress)));
  if (update.step) job.step = update.step;
  if (typeof update.frame === 'number') job.frame = update.frame;
  if (typeof update.fps === 'number') job.fps = update.fps;
  if (update.time) job.time = update.time;
  if (update.speed) job.speed = update.speed;
  if (update.outputUrl) job.outputUrl = update.outputUrl;
  if (update.outputFilename) job.outputFilename = update.outputFilename;
  if (update.thumbnailUrl) job.thumbnailUrl = update.thumbnailUrl;
  if (update.thumbnailFilename) job.thumbnailFilename = update.thumbnailFilename;
  if (update.fileSize) job.fileSize = update.fileSize;
  if (update.error) job.error = update.error;
  job.updatedAt = new Date().toISOString();

  if (logMsg) {
    if (!job.logs) job.logs = [];
    job.logs.push(`[${new Date().toLocaleTimeString()}] ${logMsg}`);
    if (job.logs.length > 40) job.logs.shift(); // keep recent logs
  }

  // Broadcast to connected SSE subscribers
  const subscribers = sseSubscribers.get(jobId);
  if (subscribers && subscribers.size > 0) {
    const dataString = `data: ${JSON.stringify(job)}\n\n`;
    subscribers.forEach((res) => {
      try {
        res.write(dataString);
      } catch (err) {
        console.warn('SSE write failed:', (err as Error).message);
      }
    });
  }

  saveJobsToDisk();
}

// Download Montserrat-Bold.ttf font if missing
async function ensureMontserratFont(): Promise<boolean> {
  if (fs.existsSync(MONTSERRAT_FONT_PATH)) {
    const stats = fs.statSync(MONTSERRAT_FONT_PATH);
    if (stats.size > 10000) {
      console.log('✓ Montserrat-Bold.ttf font is ready at:', MONTSERRAT_FONT_PATH);
      return true;
    }
  }

  console.log('⏳ Montserrat-Bold.ttf not found. Downloading font...');
  const fontUrls = [
    'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-700-normal.ttf',
    'https://cdn.jsdelivr.net/npm/@fontsource/montserrat/files/montserrat-latin-700-normal.ttf',
    'https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm453WzAfrCUrU9gRV91.ttf'
  ];

  for (const fontUrl of fontUrls) {
    try {
      await downloadFile(fontUrl, MONTSERRAT_FONT_PATH);
      const stats = fs.statSync(MONTSERRAT_FONT_PATH);
      if (stats.size > 10000) {
        console.log(`✓ Montserrat-Bold.ttf successfully downloaded (${stats.size} bytes)`);
        return true;
      }
    } catch (err) {
      console.warn(`Failed downloading font from ${fontUrl}:`, (err as Error).message);
    }
  }

  console.error('⚠️ Could not download Montserrat-Bold.ttf. FFmpeg will fallback to default system fonts if needed.');
  return false;
}

// Helper to generate a stylized vertical video background or audio when remote download fails
function generateLocalFallbackVideo(destPath: string, duration = 6): Promise<void> {
  return new Promise((resolve, reject) => {
    if (destPath.endsWith('.mp3') || destPath.endsWith('.wav') || destPath.endsWith('.m4a')) {
      const audioCmd = `ffmpeg -y -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -c:a libmp3lame -b:a 128k -t ${duration} "${destPath}"`;
      exec(audioCmd, (err) => {
        if (err) return reject(err);
        resolve();
      });
      return;
    }

    const palette = [
      { bg: '0x1e1b4b', grid: '0x312e81' },
      { bg: '0x0f172a', grid: '0x334155' },
      { bg: '0x172554', grid: '0x1d4ed8' },
      { bg: '0x064e3b', grid: '0x047857' },
      { bg: '0x3b0764', grid: '0x6b21a8' }
    ];
    const choice = palette[Math.floor(Math.random() * palette.length)];
    const ffmpegCmd = `ffmpeg -y -f lavfi -i "color=c=${choice.bg}:s=720x1280:d=${duration},drawgrid=w=60:h=60:t=1:c=${choice.grid}@0.2" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -c:v libx264 -pix_fmt yuv420p -c:a aac -t ${duration} "${destPath}"`;
    exec(ffmpegCmd, (err) => {
      if (err) {
        console.error('[Fallback Video Error]', err);
        return reject(err);
      }
      resolve();
    });
  });
}

// Utility to download a file from HTTP/HTTPS URL with download progress logging and fallback
function downloadFile(fileUrl: string, destPath: string, jobId?: string): Promise<void> {
  if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('http')) {
    console.warn(`[Download] Nieprawidłowy adres URL: ${fileUrl}. Generowanie lokalnego tła...`);
    if (jobId) updateJobProgress(jobId, {}, 'Generowanie lokalnego tła wideo w 720p...');
    return generateLocalFallbackVideo(destPath, 6);
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = fileUrl.startsWith('https') ? https : http;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(fileUrl);
    } catch {
      return generateLocalFallbackVideo(destPath, 6).then(resolve).catch(reject);
    }

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': '*/*'
    };

    const request = client.get(fileUrl, { headers }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        const redirectUrl = new URL(response.headers.location, fileUrl).toString();
        return downloadFile(redirectUrl, destPath, jobId).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200 && response.statusCode !== 206) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        console.warn(`[Download Warning] Remote server returned HTTP ${response.statusCode} for ${fileUrl}. Generating fallback video background...`);
        if (jobId) {
          updateJobProgress(jobId, {}, `Zewnętrzny serwer wideo zwrócił kod ${response.statusCode}. Wygenerowano eleganckie tło zastępcze.`);
        }
        return generateLocalFallbackVideo(destPath, 6).then(resolve).catch(reject);
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close(() => resolve());
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      console.warn(`[Download Error] ${err.message}. Generating fallback video background...`);
      if (jobId) {
        updateJobProgress(jobId, {}, 'Nie można pobrać wideo z zewnętrznego URL. Użyto tła zastępczego.');
      }
      return generateLocalFallbackVideo(destPath, 6).then(resolve).catch(reject);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      console.warn(`[Download Timeout] ${fileUrl}. Generating fallback video background...`);
      return generateLocalFallbackVideo(destPath, 6).then(resolve).catch(reject);
    });
  });
}

// Utility to safely download audio files (with strict timeout, without generating dummy video)
async function downloadAudioFile(fileUrl: string, destPath: string, timeoutMs: number = 5000): Promise<boolean> {
  if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('http')) {
    return false;
  }

  return new Promise((resolve) => {
    try {
      const file = fs.createWriteStream(destPath);
      const client = fileUrl.startsWith('https') ? https : http;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'audio/*, */*'
      };

      const req = client.get(fileUrl, { headers }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          const redirectUrl = new URL(res.headers.location, fileUrl).toString();
          return downloadAudioFile(redirectUrl, destPath, timeoutMs).then(resolve);
        }

        if (res.statusCode !== 200 && res.statusCode !== 206) {
          file.close();
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          return resolve(false);
        }

        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            const exists = fs.existsSync(destPath) && fs.statSync(destPath).size > 1000;
            resolve(exists);
          });
        });
      });

      req.on('error', () => {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        resolve(false);
      });

      req.setTimeout(timeoutMs, () => {
        req.destroy();
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        resolve(false);
      });
    } catch {
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      resolve(false);
    }
  });
}

// Interfaces for Scene Request Body
interface CaptionStyle {
  fontSize?: number;
  fontColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
  boxColor?: string;
  position?: 'bottom' | 'center' | 'top';
  alignment?: 'center' | 'left' | 'right';
  fontPath?: string;
  animation?: 'word-by-word' | 'single-word' | 'karaoke' | 'classic';
  highlightColor?: 'yellow' | 'green' | 'cyan' | 'red' | 'white';
}

interface SceneInput {
  videoUrl?: string;
  imageUrl?: string;
  duration?: number;
  scene_duration?: number;
  subtitles?: string;
  voiceover_text?: string;
  caption?: string;
  text?: string;
  captionStyle?: CaptionStyle;
  trimStart?: number;
  trimEnd?: number;
  ttsVoice?: string;
  ttsSpeed?: number;
}

interface CombineScenesPayload {
  scenes: SceneInput[];
  audioUrl?: string;
  backgroundMusicUrl?: string;
  audioVolume?: number;
  voiceoverUrl?: string;
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
  highlightColor?: 'yellow' | 'green' | 'cyan' | 'red' | 'white';
}

// Language normalizer for Google TTS
function normalizeLanguageCode(lang?: string): string {
  if (!lang) return 'pl';
  const l = lang.trim().toLowerCase();
  if (l.startsWith('pl') || l.includes('pol')) return 'pl';
  if (l.startsWith('en') || l.includes('ang') || l.includes('eng')) return 'en';
  if (l.startsWith('es') || l.includes('hiszp') || l.includes('span')) return 'es';
  if (l.startsWith('de') || l.includes('niem') || l.includes('ger')) return 'de';
  if (l.startsWith('fr') || l.includes('franc') || l.includes('fren')) return 'fr';
  if (l.startsWith('it') || l.includes('włos') || l.includes('ital')) return 'it';
  if (l.startsWith('uk') || l.startsWith('ua') || l.includes('ukr')) return 'uk';
  return l.slice(0, 2);
}

// Curated Neural & ElevenLabs Voices Catalog
export const ELEVEN_VOICES_MAP: Record<string, string> = {
  'eleven_adam': 'pNInz6obpgDQGcFmaJgB',
  'eleven_antoni': 'ErXwobaYiN019PkySvjV',
  'eleven_rachel': '21m00Tcm4TlvDq8ikWAM',
  'eleven_bella': 'EXAVITQu4vr4xnSDxMaL',
  'eleven_josh': 'TxGEqnHWrfWFTfGW9XjX',
  'eleven_charlie': 'IKne3meq5aSn9XLyUdCD',
  'eleven_george': 'JBFqnCBsd6RMkjVDRZzb',
  'eleven_liam': 'TX3LPaxmHKxFdv7VOQHJ'
};

export const NEURAL_VOICES_CATALOG = [
  // Polski (PL) - Zróżnicowane profile lektorskie (Męskie, Żeńskie, Kinowe, Dynamiczne)
  { id: 'pl-PL-MarekNeural', name: 'Marek (Męski - Dynamiczny / Biznes & Shorts)', lang: 'pl', provider: 'edge', gender: 'Male', description: 'Głęboki, radiowy głos - idealny na Shortsy biznesowe, analizy i wiadomości' },
  { id: 'pl-PL-ZofiaNeural', name: 'Zofia (Żeński - Naturalny & Wyrazisty)', lang: 'pl', provider: 'edge', gender: 'Female', description: 'Ciepła, naturalna narratorka z nienaganną dykcją' },
  { id: 'pl-PL-MarekNeural-deep', name: 'Krzysztof (Męski - Głęboki Bas / Kino & Storytelling)', lang: 'pl', provider: 'edge', gender: 'Male', description: 'Basowy, autorytatywny głos lektorski o kinowym brzmieniu' },
  { id: 'pl-PL-ZofiaNeural-expressive', name: 'Maja (Żeński - Młody, Ekspresyjny & Nowoczesny)', lang: 'pl', provider: 'edge', gender: 'Female', description: 'Świeża, dynamiczna narratorka do treści viralowych i lifestyle' },
  { id: 'pl-PL-MarekNeural-energy', name: 'Patryk (Męski - Wysoka Energia / TikTok Hook)', lang: 'pl', provider: 'edge', gender: 'Male', description: 'Szybki, energetyczny lektor przyciągający uwagę w pierwszych 3 sekundach' },
  { id: 'pl-PL-ZofiaNeural-pro', name: 'Anna (Żeński - Spokojny & Profesjonalny / Raport B2B)', lang: 'pl', provider: 'edge', gender: 'Female', description: 'Elegancka, profesjonalna lektorka do analiz finansowych i raportów' },

  // Angielski (EN)
  { id: 'en-US-ChristopherNeural', name: 'Christopher (Male - Viral Shorts / High Energy)', lang: 'en', provider: 'edge', gender: 'Male', description: 'Szybki, energiczny głos w stylu MrBeast i TikTok' },
  { id: 'en-US-JennyNeural', name: 'Jenny (Female - Warm & Natural Storyteller)', lang: 'en', provider: 'edge', gender: 'Female', description: 'Ciepła i naturalna narratorka amerykańska' },
  { id: 'en-US-GuyNeural', name: 'Guy (Male - News Anchor / Authoritative)', lang: 'en', provider: 'edge', gender: 'Male', description: 'Klasyczny głos prezentera wiadomości CNN/Bloomberg' },
  { id: 'en-US-AvaNeural', name: 'Ava (Female - Expressive & Modern)', lang: 'en', provider: 'edge', gender: 'Female', description: 'Młoda, nowoczesna narratorka do Shorts i Reels' },
  { id: 'en-US-AndrewNeural', name: 'Andrew (Male - Deep Cinematic Narrator)', lang: 'en', provider: 'edge', gender: 'Male', description: 'Głęboki męski głos kinowy do filmów dokumentalnych' },
  { id: 'en-US-BrianNeural', name: 'Brian (Male - Natural Tech & Business)', lang: 'en', provider: 'edge', gender: 'Male', description: 'Współczesny, wyrazisty głos lektora technologicznego' },
  { id: 'en-US-EmmaNeural', name: 'Emma (Female - Conversational & Crisp)', lang: 'en', provider: 'edge', gender: 'Female', description: 'Czysty, przyjazny głos konwersacyjny' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (Male - British Accent / London)', lang: 'en', provider: 'edge', gender: 'Male', description: 'Stylowy brytyjski akcent lektorski' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (Female - British Accent / BBC)', lang: 'en', provider: 'edge', gender: 'Female', description: 'Klasyczna brytyjska narracja' },

  // Niemiecki (DE)
  { id: 'de-DE-ConradNeural', name: 'Conrad (Männlich - Dynamic / Nachrichten)', lang: 'de', provider: 'edge', gender: 'Male', description: 'Niemiecki lektor dynamiczny' },
  { id: 'de-DE-KatjaNeural', name: 'Katja (Weiblich - Natürlich & Professionell)', lang: 'de', provider: 'edge', gender: 'Female', description: 'Niemiecka narratorka profesjonalna' },
  { id: 'de-DE-KillianNeural', name: 'Killian (Männlich - Energetisch)', lang: 'de', provider: 'edge', gender: 'Male', description: 'Niemiecki lektor o wysokiej energii' },

  // Hiszpański (ES)
  { id: 'es-ES-AlvaroNeural', name: 'Alvaro (Masculino - Dinámico)', lang: 'es', provider: 'edge', gender: 'Male', description: 'Hiszpański głos męski' },
  { id: 'es-ES-ElviraNeural', name: 'Elvira (Femenino - Natural)', lang: 'es', provider: 'edge', gender: 'Female', description: 'Hiszpański głos żeński' },

  // Francuski (FR)
  { id: 'fr-FR-HenriNeural', name: 'Henri (Masculin - Élégant)', lang: 'fr', provider: 'edge', gender: 'Male', description: 'Francuski głos lektorski' },
  { id: 'fr-FR-DeniseNeural', name: 'Denise (Féminin - Naturel)', lang: 'fr', provider: 'edge', gender: 'Female', description: 'Francuska narratorka' },

  // Ukraiński (UK)
  { id: 'uk-UA-OstapNeural', name: 'Ostap (Чоловічий - Динамічний)', lang: 'uk', provider: 'edge', gender: 'Male', description: 'Ukraiński lektor męski' },
  { id: 'uk-UA-PolinaNeural', name: 'Polina (Жіночий - Природний)', lang: 'uk', provider: 'edge', gender: 'Female', description: 'Ukraińska narratorka żeńska' },

  // Włoski (IT)
  { id: 'it-IT-DiegoNeural', name: 'Diego (Maschile - Dinamico)', lang: 'it', provider: 'edge', gender: 'Male', description: 'Włoski lektor męski' },
  { id: 'it-IT-ElsaNeural', name: 'Elsa (Femminile - Naturale)', lang: 'it', provider: 'edge', gender: 'Female', description: 'Włoska lektorka' }
];

export function resolveNeuralVoice(requestedVoice?: string, langCode: string = 'pl'): string {
  const cleanLang = normalizeLanguageCode(langCode);

  if (requestedVoice && requestedVoice.trim()) {
    const v = requestedVoice.trim();

    // Map ElevenLabs voice keys to distinct, tailored personas if ElevenLabs is not active
    if (v.startsWith('eleven_')) {
      if (cleanLang === 'pl') {
        if (v === 'eleven_rachel') return 'pl-PL-ZofiaNeural';
        if (v === 'eleven_bella') return 'pl-PL-ZofiaNeural-expressive';
        if (v === 'eleven_adam') return 'pl-PL-MarekNeural-deep';
        if (v === 'eleven_george') return 'pl-PL-MarekNeural-deep';
        if (v === 'eleven_josh' || v === 'eleven_liam') return 'pl-PL-MarekNeural-energy';
        return 'pl-PL-MarekNeural';
      } else {
        if (v === 'eleven_rachel') return 'en-US-JennyNeural';
        if (v === 'eleven_bella') return 'en-US-AvaNeural';
        if (v === 'eleven_adam') return 'en-US-AndrewNeural';
        if (v === 'eleven_george') return 'en-US-GuyNeural';
        if (v === 'eleven_josh' || v === 'eleven_liam') return 'en-US-ChristopherNeural';
        return 'en-US-ChristopherNeural';
      }
    }

    // Direct Neural Voice matching (including styles like -deep, -energy, -expressive, -pro)
    return v;
  }

  // Language default
  if (cleanLang === 'pl') return 'pl-PL-MarekNeural';
  if (cleanLang === 'en') return 'en-US-ChristopherNeural';
  if (cleanLang === 'de') return 'de-DE-ConradNeural';
  if (cleanLang === 'es') return 'es-ES-AlvaroNeural';
  if (cleanLang === 'fr') return 'fr-FR-HenriNeural';
  if (cleanLang === 'uk') return 'uk-UA-OstapNeural';
  if (cleanLang === 'it') return 'it-IT-DiegoNeural';
  return 'pl-PL-MarekNeural';
}

// Generate single chunk using ElevenLabs API
async function generateElevenLabsAudio(
  text: string,
  voiceId: string,
  destPath: string,
  speed: number = 1.15,
  tempDir: string
): Promise<boolean> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !apiKey.trim()) return false;

  const actualVoiceId = voiceId.startsWith('eleven_')
    ? (ELEVEN_VOICES_MAP[voiceId] || 'pNInz6obpgDQGcFmaJgB')
    : voiceId;

  const rawPath = path.resolve(tempDir, `el_raw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.mp3`);

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      text: text.slice(0, 1000),
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.05,
        use_speaker_boost: true
      }
    });

    const req = https.request(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(actualVoiceId)}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey.trim(),
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 12000
      },
      (res) => {
        if (res.statusCode !== 200) {
          console.warn(`[ElevenLabs API] HTTP status ${res.statusCode}`);
          resolve(false);
          return;
        }

        const file = fs.createWriteStream(rawPath);
        res.pipe(file);
        file.on('finish', async () => {
          file.close(async () => {
            try {
              if (fs.existsSync(rawPath) && fs.statSync(rawPath).size > 300) {
                // If custom speed multiplier requested, adjust tempo via FFmpeg
                if (Math.abs(speed - 1.0) > 0.03) {
                  const atempoVal = Math.max(0.5, Math.min(speed, 2.0)).toFixed(2);
                  await execPromise(`ffmpeg -y -i "${rawPath}" -filter:a "atempo=${atempoVal}" -c:a libmp3lame -b:a 128k "${destPath}"`);
                  try { fs.unlinkSync(rawPath); } catch {}
                } else {
                  fs.copyFileSync(rawPath, destPath);
                  try { fs.unlinkSync(rawPath); } catch {}
                }
                resolve(fs.existsSync(destPath) && fs.statSync(destPath).size > 300);
              } else {
                resolve(false);
              }
            } catch (err) {
              console.warn('[ElevenLabs Audio Post-process Error]', err);
              resolve(false);
            }
          });
        });
        file.on('error', () => {
          file.close();
          resolve(false);
        });
      }
    );

    req.on('error', (err) => {
      console.warn('[ElevenLabs Request Error]', err.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

function calculateRateString(speed: number = 1.15): string {
  // speed 1.0 -> '+0%', 1.15 -> '+15%', 1.25 -> '+25%', 0.9 -> '-10%'
  const safeSpeed = Math.max(0.6, Math.min(speed, 2.0));
  const diff = Math.round((safeSpeed - 1.0) * 100);
  return diff >= 0 ? `+${diff}%` : `${diff}%`;
}

// Split long text into natural chunks for TTS synthesis
function splitIntoTtsChunks(text: string, maxLen: number = 180): string[] {
  const clean = text.replace(/[\r\n]+/g, ' ').trim();
  if (!clean) return [];
  const words = clean.split(/\s+/);
  const chunks: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxLen) {
      if (cur) chunks.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) chunks.push(cur.trim());
  return chunks.length > 0 ? chunks : [clean];
}

// Generate single chunk using Microsoft Edge Neural TTS
async function generateEdgeNeuralChunk(
  text: string,
  voice: string,
  destPath: string,
  speed: number = 1.15,
  timeoutMs: number = 6000
): Promise<boolean> {
  return new Promise(async (resolve) => {
    let resolved = false;
    let timer: any = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        if (fs.existsSync(destPath) && fs.statSync(destPath).size < 200) {
          try { fs.unlinkSync(destPath); } catch {}
        }
      }
    };

    timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    try {
      let baseVoice = voice || 'pl-PL-MarekNeural';
      let pitchStr = '+0Hz';

      if (baseVoice.endsWith('-deep')) {
        baseVoice = baseVoice.replace('-deep', '');
        pitchStr = '-16Hz';
      } else if (baseVoice.endsWith('-energy')) {
        baseVoice = baseVoice.replace('-energy', '');
        pitchStr = '+18Hz';
      } else if (baseVoice.endsWith('-expressive')) {
        baseVoice = baseVoice.replace('-expressive', '');
        pitchStr = '+14Hz';
      } else if (baseVoice.endsWith('-pro')) {
        baseVoice = baseVoice.replace('-pro', '');
        pitchStr = '-8Hz';
      }

      const tts = new MsEdgeTTS();
      await tts.setMetadata(baseVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const rateStr = calculateRateString(speed);
      const streamObj = tts.toStream(text, { rate: rateStr, pitch: pitchStr });
      
      const file = fs.createWriteStream(destPath);
      streamObj.audioStream.pipe(file);

      file.on('finish', () => {
        file.close(() => {
          cleanup();
          const exists = fs.existsSync(destPath) && fs.statSync(destPath).size > 200;
          resolve(exists);
        });
      });

      file.on('error', () => {
        file.close();
        cleanup();
        resolve(false);
      });
    } catch (err) {
      cleanup();
      resolve(false);
    }
  });
}

// Download single fallback TTS audio chunk (Google TTS)
function downloadTtsChunk(text: string, lang: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(text);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`;
    const file = fs.createWriteStream(destPath);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        return reject(new Error(`Google TTS returned HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

// Measure audio duration using ffprobe
function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    exec(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      (err, stdout) => {
        if (err) return resolve(0);
        const dur = parseFloat(stdout.trim());
        resolve(isNaN(dur) ? 0 : dur);
      }
    );
  });
}

// Fast and High-Quality Neural TTS Generator with speed control & automatic fallback
async function generateTtsAudio(
  text: string,
  lang: string,
  destPath: string,
  tempDir: string,
  requestedVoice?: string,
  speedMultiplier: number = 1.15
): Promise<number> {
  const cleanLang = normalizeLanguageCode(lang);
  const voiceToUse = resolveNeuralVoice(requestedVoice, cleanLang);
  const safeSpeed = typeof speedMultiplier === 'number' && speedMultiplier > 0.5 ? speedMultiplier : 1.15;
  const cleanText = text.replace(/[\r\n]+/g, ' ').trim();

  if (!cleanText) return 0;

  // 1. Try ElevenLabs API only if requested voice is explicitly ElevenLabs and API key is configured
  if (requestedVoice && requestedVoice.startsWith('eleven_') && process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.trim()) {
    try {
      const elevenSuccess = await generateElevenLabsAudio(cleanText, requestedVoice, destPath, safeSpeed, tempDir);
      if (elevenSuccess && fs.existsSync(destPath)) {
        const dur = await getAudioDuration(destPath);
        if (dur > 0) {
          return dur;
        }
      }
    } catch (elErr) {
      console.warn(`[ElevenLabs TTS Info] Switch to matching Neural voice (${voiceToUse}):`, (elErr as Error).message);
    }
  }

  // 2. Try Neural TTS with Microsoft Edge (Ultra realistic, diverse & fast)
  try {
    const neuralSuccess = await generateEdgeNeuralChunk(cleanText, voiceToUse, destPath, safeSpeed, 7000);
    if (neuralSuccess && fs.existsSync(destPath)) {
      const dur = await getAudioDuration(destPath);
      if (dur > 0) {
        return dur;
      }
    }
  } catch (neuralErr) {
    console.warn(`[Neural TTS Info] Switch to accelerated fallback voice:`, (neuralErr as Error).message);
  }

  // 2. Accelerated Fallback with FFmpeg atempo filter
  try {
    const chunks = splitIntoTtsChunks(cleanText);
    const chunkFiles: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkFile = path.resolve(tempDir, `tts_chunk_${Date.now()}_${i}.mp3`);
      await downloadTtsChunk(chunks[i], cleanLang, chunkFile);
      chunkFiles.push(chunkFile);
    }

    const unacceleratedConcat = path.resolve(tempDir, `tts_raw_${Date.now()}.mp3`);
    if (chunkFiles.length === 1) {
      fs.copyFileSync(chunkFiles[0], unacceleratedConcat);
    } else {
      const listFile = path.resolve(tempDir, `tts_concat_${Date.now()}.txt`);
      fs.writeFileSync(listFile, chunkFiles.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
      await execPromise(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${unacceleratedConcat}"`);
      try { if (fs.existsSync(listFile)) fs.unlinkSync(listFile); } catch {}
    }

    // Clean individual chunks
    chunkFiles.forEach((f) => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {} });

    // Apply speed tempo acceleration using FFmpeg
    const atempoVal = Math.max(0.5, Math.min(safeSpeed, 2.0)).toFixed(2);
    await execPromise(`ffmpeg -y -i "${unacceleratedConcat}" -filter:a "atempo=${atempoVal}" -c:a libmp3lame -b:a 128k "${destPath}"`);
    try { if (fs.existsSync(unacceleratedConcat)) fs.unlinkSync(unacceleratedConcat); } catch {}

    return getAudioDuration(destPath);
  } catch (fallbackErr) {
    console.error('[TTS Generation Error]', fallbackErr);
    return 0;
  }
}

// Convert seconds to ASS time format (h:mm:ss.cc)
function formatAssTime(seconds: number): string {
  const safeSec = Math.max(0, seconds);
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = Math.floor(safeSec % 60);
  const centis = Math.floor((safeSec % 1) * 100);
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

// Word-by-Word Animated Subtitle Generator (Advanced SubStation Alpha .ass format)
// Produces signature Hormozi / MrBeast / TikTok viral karaoke captions
function generateWordByWordAss(
  text: string,
  duration: number,
  options: {
    animation?: 'word-by-word' | 'single-word' | 'karaoke' | 'classic';
    highlightColor?: 'yellow' | 'green' | 'cyan' | 'red' | 'white';
    position?: 'bottom' | 'center' | 'top';
    fontSize?: number;
    outlineWidth?: number;
  } = {}
): string {
  const words = text.trim().replace(/[\r\n]+/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';

  const safeDuration = Math.max(duration, 1.0);
  const highlightColor =
    options.highlightColor === 'green' ? '&H0022C55E&' :
    options.highlightColor === 'cyan' ? '&H00FFFF00&' :
    options.highlightColor === 'red' ? '&H002222FF&' :
    options.highlightColor === 'white' ? '&H00FFFFFF&' :
    '&H0000E6FF&'; // Default signature electric gold/yellow

  const mode = options.animation || 'word-by-word';
  const position = options.position || 'bottom';
  const alignment = position === 'center' ? 5 : position === 'top' ? 8 : 2;
  const marginV = position === 'center' ? 0 : position === 'top' ? 160 : 220;
  const fontSize = options.fontSize || 54;
  const outlineWidth = options.outlineWidth || 6;

  let totalChars = 0;
  words.forEach((w) => { totalChars += Math.max(w.length, 2); });

  const wordTimings: { word: string; start: number; end: number }[] = [];
  let currentTime = 0;
  words.forEach((w, i) => {
    const wordDur = (Math.max(w.length, 2) / totalChars) * safeDuration;
    const start = currentTime;
    const end = i === words.length - 1 ? safeDuration : currentTime + wordDur;
    currentTime += wordDur;
    wordTimings.push({ word: w, start, end });
  });

  let dialogues = '';

  if (mode === 'single-word') {
    // Punchy 1-word pop-up (MrBeast style)
    wordTimings.forEach(({ word, start, end }) => {
      const s = formatAssTime(start);
      const e = formatAssTime(end);
      dialogues += `Dialogue: 0,${s},${e},HormoziStyle,,0,0,0,,{\\c${highlightColor}\\fscx124\\fscy124\\b1}${word.toUpperCase()}\\N\n`;
    });
  } else if (mode === 'classic') {
    // Static clean subtitle across duration
    const s = formatAssTime(0);
    const e = formatAssTime(safeDuration);
    dialogues += `Dialogue: 0,${s},${e},HormoziStyle,,0,0,0,,{\\c&H00FFFFFF&\\b1}${words.join(' ').toUpperCase()}\\N\n`;
  } else {
    // Default: 'word-by-word' active word enlargement and vibrant highlight (Hormozi style)
    const chunkSize = 4;
    for (let c = 0; c < words.length; c += chunkSize) {
      const chunkWords = words.slice(c, c + chunkSize);
      const chunkIndices = chunkWords.map((_, idx) => c + idx);

      chunkIndices.forEach((activeIdx) => {
        const timing = wordTimings[activeIdx];
        const s = formatAssTime(timing.start);
        const e = formatAssTime(timing.end);

        const lineFormatted = chunkWords
          .map((w, idx) => {
            const globalIdx = c + idx;
            if (globalIdx === activeIdx) {
              return `{\\c${highlightColor}\\fscx118\\fscy118\\b1}${w.toUpperCase()}{\\r\\c&H00FFFFFF&\\b1}`;
            }
            return `{\\c&H00FFFFFF&\\b1}${w.toUpperCase()}`;
          })
          .join(' ');

        dialogues += `Dialogue: 0,${s},${e},HormoziStyle,,0,0,0,,${lineFormatted}\\N\n`;
      });
    }
  }

  return `[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: HormoziStyle,Montserrat,${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,${outlineWidth},2,${alignment},24,24,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${dialogues}`;
}

// Escape string for FFmpeg drawtext filter
function escapeDrawText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\\\''")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%');
}

// Spawn FFmpeg process with real-time progress parsing via -progress pipe:1
function runFfmpegWithProgress(
  args: string[],
  jobId: string,
  startProgress: number,
  endProgress: number,
  expectedDurationSec: number = 5
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Inject progress pipe flag
    const fullArgs = ['-progress', 'pipe:1', ...args];
    console.log(`[FFmpeg Spawn] ffmpeg ${fullArgs.join(' ')}`);

    const child = spawn('ffmpeg', fullArgs);
    let buffer = '';

    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let frame: number | undefined;
      let fps: number | undefined;
      let timeUs: number | undefined;
      let timeStr: string | undefined;
      let speed: string | undefined;

      for (const line of lines) {
        const parts = line.split('=');
        if (parts.length === 2) {
          const key = parts[0].trim();
          const val = parts[1].trim();

          if (key === 'frame') frame = parseInt(val, 10);
          if (key === 'fps') fps = parseFloat(val);
          if (key === 'out_time') timeStr = val;
          if (key === 'out_time_us') timeUs = Math.round(parseInt(val, 10) / 1000);
          if (key === 'speed') speed = val;
        }
      }

      let currentPercent = startProgress;
      if (expectedDurationSec > 0 && timeUs) {
        const elapsedSec = timeUs / 1000;
        const ratio = Math.min(1, Math.max(0, elapsedSec / expectedDurationSec));
        currentPercent = Math.round(startProgress + ratio * (endProgress - startProgress));
      }

      updateJobProgress(jobId, {
        progress: currentPercent,
        frame,
        fps,
        time: timeStr,
        speed
      });
    });

    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      // Capture key lines for terminal logs UI
      const trimmed = text.trim();
      if (trimmed.includes('Stream #') || trimmed.includes('Output #') || trimmed.includes('video:') || trimmed.includes('error')) {
        const line = trimmed.split('\n')[0];
        if (line) {
          updateJobProgress(jobId, {}, line.substring(0, 120));
        }
      }
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        updateJobProgress(jobId, { progress: endProgress });
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-300)}`));
      }
    });
  });
}

// Async Video Scene Combiner Pipeline with granular step-by-step progress
async function processCombineScenesJob(jobId: string, payload: CombineScenesPayload, baseUrl: string) {
  const job = jobsStore.get(jobId);
  if (!job) return;

  const jobTempDir = path.join(TEMP_DIR, jobId);
  fs.mkdirSync(jobTempDir, { recursive: true });

  try {
    updateJobProgress(
      jobId,
      { status: 'processing', step: 'Sprawdzanie środowiska i czcionki Montserrat', progress: 5 },
      'Rozpoczęto zadanie renderowania scen wideo FFmpeg'
    );

    await ensureMontserratFont();

    // Resolution setup (defaults to 720p vertical 720x1280 for fast processing)
    let rawRes = payload.outputResolution || (payload as any).resolution || '720x1280';
    if (typeof rawRes === 'string') {
      const lower = rawRes.trim().toLowerCase();
      if (lower === '720p' || lower === '720') rawRes = '720x1280';
      else if (lower === '1080p' || lower === '1080') rawRes = '1080x1920';
      else if (lower === '480p' || lower === '480') rawRes = '480x854';
    }
    const resolutionStr = rawRes || '720x1280';
    const parts = resolutionStr.split('x').map((n: string) => parseInt(n, 10));
    const targetWidth = parts[0] || 720;
    const targetHeight = parts[1] || 1280;
    const targetFps = payload.fps || 30;

    const scenes = payload.scenes || [];
    if (!Array.isArray(scenes) || scenes.length === 0) {
      throw new Error('Payload must contain at least one valid scene in "scenes" array.');
    }

    updateJobProgress(
      jobId,
      { step: `Pobieranie ${scenes.length} klipów wideo`, progress: 10 },
      `Rozpoczynanie pobierania ${scenes.length} plików wideo/obrazów...`
    );

    const processedScenePaths: string[] = [];
    let totalEstimatedDuration = 0;
    const ttsEnabled = payload.tts !== false;
    const ttsLanguage = normalizeLanguageCode(payload.ttsLanguage || (payload as any).language || 'pl');
    const ttsVoice = payload.ttsVoice || (payload as any).tts_voice || (payload as any).voice || (payload as any).lektor || (payload as any).glos || resolveNeuralVoice(undefined, ttsLanguage);
    const ttsSpeed = typeof payload.ttsSpeed === 'number' && payload.ttsSpeed > 0 ? payload.ttsSpeed : (typeof (payload as any).tts_speed === 'number' ? (payload as any).tts_speed : 1.15);
    const defaultCaptionAnim = payload.captionAnimation || 'word-by-word';
    const defaultHighlightCol = payload.highlightColor || 'yellow';

    // Process each scene
    for (let index = 0; index < scenes.length; index++) {
      const scene = scenes[index];
      const sceneNum = index + 1;
      const sceneStartProgress = Math.round(15 + (index / scenes.length) * 50);
      const sceneEndProgress = Math.round(15 + ((index + 1) / scenes.length) * 50);

      updateJobProgress(
        jobId,
        {
          step: `Przetwarzanie Sceny ${sceneNum}/${scenes.length} (Lektor TTS + animowane napisy)`,
          progress: sceneStartProgress
        },
        `Przygotowywanie lektora TTS i napisów word-by-word dla sceny ${sceneNum}...`
      );

      const rawAssetUrl = (scene as any).video_url || scene.videoUrl || (scene as any).url || scene.imageUrl;
      if (!rawAssetUrl) {
        throw new Error(`Scene ${sceneNum} is missing "video_url", "videoUrl" or "url".`);
      }

      const ext = rawAssetUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'mp4';
      const isImage = ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext) || !!scene.imageUrl;
      const downloadedAssetPath = path.join(jobTempDir, `raw_scene_${sceneNum}.${isImage ? 'jpg' : 'mp4'}`);

      // Download asset
      console.log(`Downloading scene ${sceneNum}: ${rawAssetUrl}`);
      await downloadFile(rawAssetUrl, downloadedAssetPath, jobId);
      updateJobProgress(jobId, {}, `Zapisano plik źródłowy: raw_scene_${sceneNum}.${isImage ? 'jpg' : 'mp4'}`);

      // Extract speech text for TTS and captions
      const speechText = (
        scene.voiceover_text ||
        scene.subtitles ||
        scene.caption ||
        scene.text ||
        (scene as any).tekst_głosowy ||
        (scene as any).voiceover ||
        ''
      ).trim();

      // Initial Scene duration
      let sceneDuration = scene.duration || scene.scene_duration || 5;
      if (typeof scene.trimStart === 'number' && typeof scene.trimEnd === 'number' && scene.trimEnd > scene.trimStart) {
        sceneDuration = scene.trimEnd - scene.trimStart;
      }

      // 1. Text-to-Speech Generation
      let hasTtsAudio = false;
      const sceneTtsPath = path.join(jobTempDir, `scene_tts_${sceneNum}.mp3`);
      const sceneVoice = scene.ttsVoice || (scene as any).tts_voice || (scene as any).voice || (scene as any).lektor || ttsVoice;
      const sceneSpeed = typeof scene.ttsSpeed === 'number' && scene.ttsSpeed > 0 ? scene.ttsSpeed : ttsSpeed;

      if (ttsEnabled && speechText.length > 0) {
        try {
          updateJobProgress(
            jobId,
            {},
            `Generowanie głosu lektora TTS (${sceneVoice.split('-')[2] || sceneVoice} @ ${sceneSpeed}x): "${speechText.slice(0, 40)}..."`
          );
          const ttsDuration = await generateTtsAudio(speechText, ttsLanguage, sceneTtsPath, jobTempDir, sceneVoice, sceneSpeed);
          if (ttsDuration > 0 && fs.existsSync(sceneTtsPath)) {
            hasTtsAudio = true;
            // Synchronize scene duration with voice narration length (+0.35s natural trailing pause)
            if (payload.syncDurationWithVoice !== false) {
              const syncedDuration = Math.round((ttsDuration + 0.35) * 10) / 10;
              sceneDuration = Math.max(syncedDuration, sceneDuration);
              console.log(`✓ Scene ${sceneNum} synchronized with TTS voice duration: ${sceneDuration}s (TTS: ${ttsDuration}s)`);
            }
          }
        } catch (ttsErr) {
          console.warn(`⚠️ TTS warning for scene ${sceneNum}:`, (ttsErr as Error).message);
          updateJobProgress(jobId, {}, `Lektor TTS dla sceny ${sceneNum} niedostępny, używanie domyślnego audio.`);
        }
      }

      totalEstimatedDuration += sceneDuration;

      // 2. Word-by-Word Animated Subtitles (ASS Format)
      const capStyle = scene.captionStyle || {};
      const animMode = capStyle.animation || defaultCaptionAnim;
      const highlightCol = capStyle.highlightColor || defaultHighlightCol;
      const position = capStyle.position || 'bottom';
      const fontSize = capStyle.fontSize || (targetWidth > 1000 ? 54 : 44);
      const outlineWidth = capStyle.outlineWidth ?? 6;

      let assSubtitleFilter = '';
      const sceneAssPath = path.join(jobTempDir, `scene_sub_${sceneNum}.ass`);

      if (speechText.length > 0) {
        try {
          const assContent = generateWordByWordAss(speechText, sceneDuration, {
            animation: animMode,
            highlightColor: highlightCol,
            position,
            fontSize,
            outlineWidth
          });
          fs.writeFileSync(sceneAssPath, assContent, 'utf8');
          // Escape single quotes and backslashes for FFmpeg filter
          const cleanAssPath = sceneAssPath.replace(/\\/g, '/').replace(/'/g, "'\\\\''");
          const cleanFontsDir = FONTS_DIR.replace(/\\/g, '/').replace(/'/g, "'\\\\''");
          assSubtitleFilter = `,ass='${cleanAssPath}':fontsdir='${cleanFontsDir}'`;
        } catch (assErr) {
          console.warn(`⚠️ ASS subtitle error for scene ${sceneNum}:`, assErr);
        }
      }

      // Render & Normalize Scene with FFmpeg
      const normalizedScenePath = path.join(jobTempDir, `norm_scene_${sceneNum}.mp4`);
      const scaleFilter = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-ih)/2:(oh-ih)/2:black,setsar=1,fps=${targetFps}`;
      const videoFilterWithAss = `${scaleFilter}${assSubtitleFilter}`;

      let ffmpegArgs: string[] = [];

      if (isImage) {
        if (hasTtsAudio) {
          ffmpegArgs = [
            '-y',
            '-loop', '1',
            '-i', downloadedAssetPath,
            '-i', sceneTtsPath,
            '-vf', videoFilterWithAss,
            '-t', sceneDuration.toString(),
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            '-shortest',
            normalizedScenePath
          ];
        } else {
          ffmpegArgs = [
            '-y',
            '-loop', '1',
            '-i', downloadedAssetPath,
            '-f', 'lavfi',
            '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
            '-vf', videoFilterWithAss,
            '-t', sceneDuration.toString(),
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-movflags', '+faststart',
            '-shortest',
            normalizedScenePath
          ];
        }
      } else {
        let trimOpts: string[] = [];
        if (typeof scene.trimStart === 'number' && scene.trimStart >= 0) {
          trimOpts.push('-ss', scene.trimStart.toString());
        }
        if (typeof scene.trimEnd === 'number' && scene.trimEnd > (scene.trimStart || 0)) {
          trimOpts.push('-to', scene.trimEnd.toString());
        } else if (sceneDuration > 0) {
          trimOpts.push('-t', sceneDuration.toString());
        }

        if (hasTtsAudio) {
          // Use synthesized TTS voice narration as audio track with seamless video loop
          ffmpegArgs = [
            '-y',
            '-stream_loop', '-1',
            ...trimOpts,
            '-i', downloadedAssetPath,
            '-i', sceneTtsPath,
            '-filter_complex', `[0:v]${videoFilterWithAss}[v];[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a]`,
            '-map', '[v]',
            '-map', '[a]',
            '-t', sceneDuration.toString(),
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            normalizedScenePath
          ];
        } else {
          // Use original video audio with seamless video loop
          ffmpegArgs = [
            '-y',
            '-stream_loop', '-1',
            ...trimOpts,
            '-i', downloadedAssetPath,
            '-filter_complex', `[0:v]${videoFilterWithAss}[v];[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a]`,
            '-map', '[v]',
            '-map', '[a]',
            '-t', sceneDuration.toString(),
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-movflags', '+faststart',
            normalizedScenePath
          ];
        }
      }

      updateJobProgress(
        jobId,
        { step: `Renderowanie Sceny ${sceneNum}/${scenes.length} (${animMode})` },
        `FFmpeg nakłada napisy ${animMode} (${highlightCol}) i synchronizuje audio lektora...`
      );

      try {
        await runFfmpegWithProgress(ffmpegArgs, jobId, sceneStartProgress, sceneEndProgress, sceneDuration);
      } catch (err) {
        console.warn(`Scene ${sceneNum} primary render failed, using robust fallback...`, (err as Error).message);
        updateJobProgress(jobId, {}, `Pierwotny filtr sceny ${sceneNum} zawiódł, używanie bezpiecznego renderera...`);

        let trimOptsFallback: string[] = [];
        if (typeof scene.trimStart === 'number' && scene.trimStart >= 0) {
          trimOptsFallback.push('-ss', scene.trimStart.toString());
        }
        if (typeof scene.trimEnd === 'number' && scene.trimEnd > (scene.trimStart || 0)) {
          trimOptsFallback.push('-to', scene.trimEnd.toString());
        }

        const fallbackArgs = [
          '-y',
          ...trimOptsFallback,
          '-i', downloadedAssetPath,
          ...(hasTtsAudio ? ['-i', sceneTtsPath] : ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100']),
          '-filter_complex', `[0:v]${scaleFilter}[v];[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a]`,
          '-map', '[v]',
          '-map', '[a]',
          '-t', sceneDuration.toString(),
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-movflags', '+faststart',
          '-shortest',
          normalizedScenePath
        ];
        await runFfmpegWithProgress(fallbackArgs, jobId, sceneStartProgress, sceneEndProgress, sceneDuration);
      }

      processedScenePaths.push(normalizedScenePath);
    }

    // Step: Concatenate Scenes
    updateJobProgress(
      jobId,
      { step: 'Łączenie wszystkich wyrenderowanych scen w jeden plik wideo', progress: 70 },
      'Generowanie listy concat_list.txt i scalanie strumieni wideo...'
    );

    const concatListPath = path.join(jobTempDir, 'concat_list.txt');
    const concatContent = processedScenePaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
    fs.writeFileSync(concatListPath, concatContent);

    const mergedVideoPath = path.join(jobTempDir, 'merged_scenes.mp4');
    const concatArgs = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      mergedVideoPath
    ];

    await runFfmpegWithProgress(concatArgs, jobId, 70, 85, totalEstimatedDuration || 10);

    // Step: Audio Mixing (Background Music)
    updateJobProgress(
      jobId,
      { step: 'Miksowanie ścieżki dźwiękowej i muzyki w tle', progress: 85 },
      'Przetwarzanie finalnego audio wideo...'
    );

    let bgAudioPath = '';
    const bgAudioUrl = payload.audioUrl || payload.backgroundMusicUrl;
    const audioVol = payload.audioVolume ?? 0.3;
    let audioDownloadedSuccessfully = false;

    if (bgAudioUrl) {
      bgAudioPath = path.join(jobTempDir, 'bg_music.mp3');
      try {
        updateJobProgress(jobId, {}, `Pobieranie muzyki w tle z URL...`);
        audioDownloadedSuccessfully = await downloadAudioFile(bgAudioUrl, bgAudioPath, 5000);
        if (!audioDownloadedSuccessfully) {
          updateJobProgress(jobId, {}, 'Brak dostępu do podanego URL muzyki tła. Kontynuacja z oryginalnym audio.');
        }
      } catch (err) {
        updateJobProgress(jobId, {}, `Nie można pobrać muzyki tła: ${(err as Error).message}. Kontynuacja z oryginalnym audio.`);
      }
    }

    const outputFilename = `combined_video_${jobId}.mp4`;
    const finalOutputPath = path.join(EXPORTS_DIR, outputFilename);

    if (audioDownloadedSuccessfully && fs.existsSync(bgAudioPath)) {
      const mixArgs = [
        '-y',
        '-i', mergedVideoPath,
        '-i', bgAudioPath,
        '-filter_complex', `[0:a]volume=1.0[a1];[1:a]volume=${audioVol}[a2];[a1][a2]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-movflags', '+faststart',
        finalOutputPath
      ];
      try {
        await runFfmpegWithProgress(mixArgs, jobId, 85, 95, totalEstimatedDuration || 10);
      } catch {
        try {
          // Alternative if merged video has no audio track
          const replaceAudioArgs = [
            '-y',
            '-i', mergedVideoPath,
            '-i', bgAudioPath,
            '-map', '0:v',
            '-map', '1:a',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-shortest',
            '-movflags', '+faststart',
            finalOutputPath
          ];
          await runFfmpegWithProgress(replaceAudioArgs, jobId, 85, 95, totalEstimatedDuration || 10);
        } catch {
          fs.copyFileSync(mergedVideoPath, finalOutputPath);
        }
      }
    } else {
      fs.copyFileSync(mergedVideoPath, finalOutputPath);
    }

    // Measure Output
    const stats = fs.statSync(finalOutputPath);
    const outputUrl = `${baseUrl}/exports/${outputFilename}`;

    // Extract crisp thumbnail frame with FFmpeg
    const thumbnailFilename = `thumb_${path.parse(outputFilename).name}.jpg`;
    const thumbnailPath = path.join(EXPORTS_DIR, thumbnailFilename);
    let thumbnailUrl: string | undefined = undefined;
    try {
      await execPromise(`ffmpeg -y -ss 00:00:01.200 -i "${finalOutputPath}" -vframes 1 -q:v 2 "${thumbnailPath}"`);
      if (fs.existsSync(thumbnailPath)) {
        thumbnailUrl = `${baseUrl}/exports/${thumbnailFilename}`;
      }
    } catch (thumbErr) {
      console.warn(`[Thumbnail Warning] Nie udało się wygenerować miniatury dla zadania ${jobId}:`, (thumbErr as Error).message);
    }

    updateJobProgress(
      jobId,
      {
        status: 'completed',
        step: 'Renderowanie zakończone pomyślnie!',
        progress: 100,
        outputUrl,
        outputFilename,
        thumbnailUrl,
        thumbnailFilename,
        fileSize: stats.size,
        duration: totalEstimatedDuration
      },
      `✓ Plik wyjściowy MP4 utworzony pomyślnie: ${outputUrl} (${stats.size} bajtów)`
    );

    console.log(`✓ Job ${jobId} completed successfully: ${outputUrl}`);

    // Handle webhook callback if provided in payload
    if (payload.webhookUrl) {
      try {
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
        const webhookPayload = JSON.stringify({
          event: 'video.completed',
          jobId,
          status: 'completed',
          outputUrl,
          thumbnailUrl,
          fileSize: stats.size,
          fileSizeFormatted: `${sizeMb} MB`,
          duration: totalEstimatedDuration,
          scenesCount: payload.scenes.length,
          outputResolution: resolutionStr,
          completedAt: new Date().toISOString()
        });

        console.log(`📡 Sending completion webhook to Make.com: ${payload.webhookUrl}`);
        const urlObj = new URL(payload.webhookUrl);
        const reqClient = urlObj.protocol === 'https:' ? https : http;
        const req = reqClient.request(payload.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(webhookPayload)
          }
        });
        req.on('error', (e) => console.warn('Webhook dispatch network error:', e.message));
        req.write(webhookPayload);
        req.end();
      } catch (webhookErr) {
        console.warn('Webhook callback error:', (webhookErr as Error).message);
      }
    }
  } catch (error) {
    const errorMsg = (error as Error).message || 'Unknown video processing error';
    console.error(`❌ Error processing job ${jobId}:`, error);
    updateJobProgress(
      jobId,
      {
        status: 'failed',
        error: errorMsg,
        step: 'Błąd podczas wykonywania komendy FFmpeg'
      },
      `❌ Błąd renderowania: ${errorMsg}`
    );

    // Send failure webhook callback if webhookUrl was specified
    if (payload.webhookUrl) {
      try {
        const failPayload = JSON.stringify({
          event: 'video.failed',
          jobId,
          status: 'failed',
          error: errorMsg,
          completedAt: new Date().toISOString()
        });
        const urlObj = new URL(payload.webhookUrl);
        const reqClient = urlObj.protocol === 'https:' ? https : http;
        const req = reqClient.request(payload.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(failPayload)
          }
        });
        req.on('error', (e) => console.warn('Error webhook dispatch network error:', e.message));
        req.write(failPayload);
        req.end();
      } catch (e) {
        console.warn('Failed to send error webhook:', (e as Error).message);
      }
    }
  } finally {
    setTimeout(() => {
      if (fs.existsSync(jobTempDir)) {
        fs.rm(jobTempDir, { recursive: true, force: true }, () => {});
      }
    }, 120000);
  }
}

// REST API ROUTER
const router = express.Router();

// Health Check Endpoint
router.get('/health', async (req, res) => {
  let ffmpegVersion = 'Unknown';
  try {
    const { stdout } = await execPromise('ffmpeg -version');
    ffmpegVersion = stdout.split('\n')[0];
  } catch {
    ffmpegVersion = 'Not installed or error running ffmpeg';
  }

  const fontReady = fs.existsSync(MONTSERRAT_FONT_PATH);

  res.json({
    status: 'online',
    service: 'Make.com HTTP Video Scene Combiner Connector',
    ffmpeg: ffmpegVersion,
    fontStatus: {
      name: 'Montserrat-Bold.ttf',
      ready: fontReady,
      path: MONTSERRAT_FONT_PATH
    },
    activeJobsCount: jobsStore.size,
    timestamp: new Date().toISOString()
  });
});

// Universal helper to extract scenes from multiple payload variations (Polish and English)
function extractScenesFromPayload(body: any): any[] | null {
  if (!body) return null;
  if (Array.isArray(body) && body.length > 0) return body;
  if (typeof body !== 'object') return null;

  const candidates = [
    body.scenes,
    body.sceny,
    body.Sceny,
    body.Scenes,
    body.items,
    body.elements,
    body.data,
    body.lista_scen,
    body.listaScen
  ];

  for (const item of candidates) {
    if (Array.isArray(item) && item.length > 0) {
      return item;
    }
  }

  if (body.payload && typeof body.payload === 'object') {
    const nested = extractScenesFromPayload(body.payload);
    if (nested) return nested;
  }
  if (body.body && typeof body.body === 'object') {
    const nested = extractScenesFromPayload(body.body);
    if (nested) return nested;
  }

  return null;
}

// Universal normalizer for individual scene items (handles Polish and English keys)
function normalizeSceneItem(sc: any, idx: number, totalCount: number): SceneInput {
  if (!sc || typeof sc !== 'object') {
    return {
      subtitles: `SCENA ${idx + 1}`,
      voiceover_text: `SCENA ${idx + 1}`,
      videoUrl: getStockVideoUrl('nature', idx),
      duration: 6
    };
  }

  const videoUrl =
    sc.video_url ||
    sc.videoUrl ||
    sc['adres URL_filmu'] ||
    sc['adres_URL_filmu'] ||
    sc['adres URL'] ||
    sc['adres_url'] ||
    sc.adres_url ||
    sc.adresUrl ||
    sc.url ||
    sc.video ||
    sc.imageUrl ||
    sc.fileUrl ||
    sc.uri ||
    getStockVideoUrl('nature', idx);

  const rawText =
    sc.voiceover_text ??
    sc.subtitles ??
    sc.text ??
    sc.caption ??
    sc['tekst_głosowy'] ??
    sc['tekst_glosowy'] ??
    sc.tekst ??
    sc.napis ??
    sc.tresc ??
    `SCENA ${idx + 1}`;

  const defaultDuration = totalCount === 3 ? 6.0 : Math.max(3.0, Number((18 / (totalCount || 1)).toFixed(1)));
  const duration = Number(
    sc.duration ||
    sc.scene_duration ||
    sc['czas_sceny'] ||
    sc.czas ||
    sc.dlugosc ||
    defaultDuration
  ) || defaultDuration;

  const capStyle = sc.captionStyle || {};

  return {
    subtitles: rawText.toString().trim(),
    voiceover_text: (sc.voiceover_text || sc['tekst_głosowy'] || sc['tekst_glosowy'] || rawText).toString().trim(),
    videoUrl,
    duration,
    captionStyle: {
      position: capStyle.position || sc.position || 'bottom',
      animation: capStyle.animation || sc.animation || 'word-by-word',
      highlightColor: capStyle.highlightColor || sc.highlightColor || 'yellow',
      fontSize: capStyle.fontSize || sc.fontSize || 54,
      outlineWidth: capStyle.outlineWidth || sc.outlineWidth || 6,
      outlineColor: 'black',
      boxColor: 'black@0.6'
    },
    ttsVoice: sc.ttsVoice || sc.tts_voice || sc.voice || sc.lektor || sc.glos,
    ttsSpeed: typeof sc.ttsSpeed === 'number' ? sc.ttsSpeed : (typeof sc.tts_speed === 'number' ? sc.tts_speed : (typeof sc.speed === 'number' ? sc.speed : undefined))
  };
}

// RaportFinansowy24 CTA Generator Helper
function ensureRaportFinansowyCta(text: string, topic?: string): string {
  if (!text) return 'Sprawdź pełną analizę na raport-finansowy24.pl.';
  if (text.includes('raport-finansowy24.pl') || text.includes('raportfinansowy24.pl') || text.includes('raport-finansowy24')) {
    return text;
  }

  const clean = text.trim().replace(/[.,!?;:]*$/, '');
  const tLower = (topic || '').toLowerCase();
  let cta = 'Sprawdź na raport-finansowy24.pl.';

  if (tLower.includes('wskaźnik') || tLower.includes('finans') || tLower.includes('wynik') || tLower.includes('ebitda') || tLower.includes('bilans')) {
    cta = 'Pełną analizę wskaźników znajdziesz na raport-finansowy24.pl.';
  } else if (tLower.includes('kredyt') || tLower.includes('hipotek') || tLower.includes('stop') || tLower.includes('nbp') || tLower.includes('rpp') || tLower.includes('rata')) {
    cta = 'Więcej danych i kalkulator rat znajdziesz na raport-finansowy24.pl.';
  } else if (tLower.includes('spółk') || tLower.includes('firm') || tLower.includes('nip') || tLower.includes('krs') || tLower.includes('regon') || tLower.includes('b2b')) {
    cta = 'Sprawdź raport finansowy spółki po NIP na raport-finansowy24.pl.';
  } else if (tLower.includes('giełd') || tLower.includes('gpw') || tLower.includes('akcj') || tLower.includes('inwestycj') || tLower.includes('rynk')) {
    cta = 'Szczegółowe dane rynkowe znajdziesz na raport-finansowy24.pl.';
  } else if (tLower.includes('ai') || tLower.includes('technol') || tLower.includes('automatyzacj')) {
    cta = 'Raporty analityczne i trendy sprawdzisz na raport-finansowy24.pl.';
  } else {
    cta = 'Więcej rzetelnych analiz znajdziesz na raport-finansowy24.pl.';
  }

  return `${clean}. ${cta}`;
}

// Built-in smart viral script engine fallback (activated when Gemini is unavailable or access is restricted)
function buildSmartFallbackScript(
  topic: string,
  niche: string,
  language: string,
  count: number = 2,
  articleContext?: string,
  bankierArticle?: any
) {
  const isPl = !language || language.toLowerCase().includes('pol');
  const fullContext = `${topic || ''} ${bankierArticle?.title || ''} ${bankierArticle?.description || ''} ${articleContext || ''}`.toLowerCase();
  const titleToUse = bankierArticle?.title || topic || 'Analiza Rynkowa';

  // Determine thematic motion graphics and keywords
  let theme = 'stock market candlestick chart';
  let videoIndex = 0;

  if (fullContext.includes('pieniądz') || fullContext.includes('biznes') || fullContext.includes('finans') || fullContext.includes('gospodark') || fullContext.includes('bankier') || fullContext.includes('giełd') || fullContext.includes('inwestycj') || fullContext.includes('money')) {
    theme = 'stock market candlestick chart';
    videoIndex = 0;
  } else if (fullContext.includes('miasto') || fullContext.includes('sukces') || fullContext.includes('wieżowce') || fullContext.includes('drapacz') || fullContext.includes('metropoli') || fullContext.includes('nieruchomośc')) {
    theme = 'city skyscrapers night';
    videoIndex = 1;
  } else if (fullContext.includes('ai') || fullContext.includes('sztuczna') || fullContext.includes('technol') || fullContext.includes('komputer') || fullContext.includes('kod') || fullContext.includes('matrix') || fullContext.includes('cyfr')) {
    theme = 'digital code neural network';
    videoIndex = 2;
  } else if (fullContext.includes('walut') || fullContext.includes('dolar') || fullContext.includes('euro') || fullContext.includes('złot') || fullContext.includes('gotówk') || fullContext.includes('cash')) {
    theme = 'cash money counting';
    videoIndex = 3;
  } else if (fullContext.includes('mózg') || fullContext.includes('psycholog') || fullContext.includes('decyzj') || fullContext.includes('nawyk') || fullContext.includes('spokój') || fullContext.includes('stres')) {
    theme = 'ocean waves cliff landscape';
    videoIndex = 6;
  } else if (fullContext.includes('auto') || fullContext.includes('samochód') || fullContext.includes('prędkoś') || fullContext.includes('speed') || fullContext.includes('adrenalin')) {
    theme = 'luxury hypercar speed';
    videoIndex = 5;
  } else if (fullContext.includes('kosmos') || fullContext.includes('gwiazd') || fullContext.includes('wszechświat') || fullContext.includes('filozof') || fullContext.includes('space')) {
    theme = 'deep space galaxy stars';
    videoIndex = 7;
  }

  // 2-scene 18-second architecture (2 x 9s from Pexels: dynamic cut to avoid monotony + mandatory CTA)
  if (count === 2 || count <= 0) {
    let s1Voiceover = '';
    let s2Voiceover = '';
    let kw1 = 'stock exchange screen numbers flashing';
    let kw2 = 'dynamic financial stock market display animation';

    if (isPl) {
      if (fullContext.includes('rpp') || fullContext.includes('stóp') || fullContext.includes('stopy') || fullContext.includes('nbp') || fullContext.includes('rada polityki') || fullContext.includes('kredyt')) {
        s1Voiceover = 'Banki nie chcą, żebyś o tym wiedział, ale najnowsze decyzje dotyczące stóp procentowych natychmiast uderzą w koszty kredytów i oszczędności. Dane z Bankier.pl potwierdzają gwałtowną zmianę kosztu pieniądza.';
        s2Voiceover = 'Zrozumienie mechanizmu stóp procentowych pozwala zabezpieczyć płynność i uniknąć niepotrzebnego drenażu domowego budżetu.';
        kw1 = 'stock exchange screen numbers flashing';
        kw2 = 'central bank gold vault bullion';
      } else if (fullContext.includes('podatek') || fullContext.includes('belk') || fullContext.includes('fiskus') || fullContext.includes('błąd') || fullContext.includes('kar') || fullContext.includes('strat') || fullContext.includes('prowizj')) {
        s1Voiceover = 'Stop! Ten jeden błąd na Twoim koncie może kosztować Cię tysiące złotych rocznie. Najnowsze dane z Bankier.pl ujawniają, gdzie Polacy tracą najwięcej na podatkach i ukrytych prowizjach.';
        s2Voiceover = 'Świadoma weryfikacja opłat i optymalizacja kapitałowa to fundament długoterminowej ochrony majątku przed inflacją.';
        kw1 = 'stock exchange screen numbers flashing';
        kw2 = 'counting cash money bills dynamic';
      } else if (fullContext.includes('akcj') || fullContext.includes('gpw') || fullContext.includes('wig') || fullContext.includes('orlen') || fullContext.includes('spółk') || fullContext.includes('giełd')) {
        s1Voiceover = 'Wstrząs na warszawskiej giełdzie przyciąga uwagę największych graczy instytucjonalnych. Opublikowane na Bankier.pl odczyty rynkowe diametralnie zmieniają wyceny kluczowych spółek.';
        s2Voiceover = 'Chłodna kalkulacja wskaźników fundamentalnych decyduje o zyskach w momentach podwyższonej zmienności rynkowej.';
        kw1 = 'stock exchange screen numbers flashing';
        kw2 = 'fast stock market trading chart timelapse';
      } else if (fullContext.includes('inflacj') || fullContext.includes('drożyzn') || fullContext.includes('cen')) {
        s1Voiceover = 'Stop! Nowe odczyty inflacji to alarm dla każdego, kto trzyma niepracujące oszczędności w gotówce. Realna siła nabywcza pieniądza topnieje w tempie, którego nie zrekompensują standardowe lokaty.';
        s2Voiceover = 'Strategiczna dywersyfikacja i inwestycje w twarde aktywa to jedyna skuteczna tarcza kapitałowa.';
        kw1 = 'counting cash money bills dynamic';
        kw2 = 'fast stock market trading chart timelapse';
      } else if (videoIndex === 2) {
        s1Voiceover = 'Rewolucja sztucznej inteligencji nie zastępuje ludzi, lecz bezwzględnie weryfikuje ich tempo adaptacji. Automatyzacja powtarzalnych procesów uwalnia setki godzin na myślenie strategiczne.';
        s2Voiceover = 'Prawdziwą przewagę zdobywają specjaliści, którzy potrafią efektywnie dyrygować autonomicznymi modelami cyfrowymi.';
        kw1 = 'cyber digital network glowing';
        kw2 = 'vibrant digital data stream animation';
      } else {
        s1Voiceover = 'Rynki finansowe nie nagradzają emocji, lecz żelazną dyscyplinę i twarde fakty z Bankier.pl. Podczas gdy większość goni za szumem medialnym, zyski buduje się na chłodnej analizie danych.';
        s2Voiceover = 'Zrozumienie psychologii tłumu i precyzyjne zarządzanie ryzykiem to jedyna trwała przewaga w biznesie.';
        kw1 = 'city traffic night hyperlapse';
        kw2 = 'aerial night view vibrant city skyline';
      }
    } else {
      s1Voiceover = 'Financial markets never reward emotional impatience, but strict rational discipline. While average participants buy into hype, sustainable wealth is quietly accumulated during peak market fear.';
      s2Voiceover = 'Mastering risk management, cash flows and crowd psychology remains the ultimate competitive advantage in business.';
      kw1 = 'stock exchange screen numbers flashing';
      kw2 = 'dynamic financial stock market display animation';
    }

    const s2WithCta = ensureRaportFinansowyCta(s2Voiceover, titleToUse);

    const scenes = [
      {
        subtitles: s1Voiceover,
        voiceover_text: s1Voiceover,
        duration: 9.0,
        searchKeyword: kw1,
        videoUrl: CURATED_MOTION_CLIPS_POOL[videoIndex].url,
        thumbnailUrl: CURATED_MOTION_CLIPS_POOL[videoIndex].thumbnailUrl,
        source: 'curated' as const,
        captionStyle: {
          position: 'bottom' as const,
          animation: 'word-by-word' as const,
          highlightColor: 'yellow' as const,
          fontColor: 'yellow',
          outlineColor: 'black',
          outlineWidth: 5,
          boxColor: 'black@0.6'
        }
      },
      {
        subtitles: s2WithCta,
        voiceover_text: s2WithCta,
        duration: 9.0,
        searchKeyword: kw2,
        videoUrl: CURATED_MOTION_CLIPS_POOL[(videoIndex + 1) % CURATED_MOTION_CLIPS_POOL.length].url,
        thumbnailUrl: CURATED_MOTION_CLIPS_POOL[(videoIndex + 1) % CURATED_MOTION_CLIPS_POOL.length].thumbnailUrl,
        source: 'curated' as const,
        captionStyle: {
          position: 'bottom' as const,
          animation: 'word-by-word' as const,
          highlightColor: 'yellow' as const,
          fontColor: 'white',
          outlineColor: 'black',
          outlineWidth: 5,
          boxColor: 'black@0.6'
        }
      }
    ];

    return {
      title: titleToUse,
      description: `#shorts #analiza #${niche.toLowerCase().replace(/\s+/g, '')} #wiedza | Sprawdź pełny raport: https://raport-finansowy24.pl`,
      hook: s1Voiceover.split('.')[0] + '.',
      language,
      scenes,
      backgroundMusicUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      audioVolume: 0.25,
      generator: 'smart-analytical-engine-18s-2scenes'
    };
  }

  // Single 18-second scene architecture (if user explicitly forces 1 scene)
  if (count === 1) {
    let rawVoiceover = '';
    if (isPl) {
      if (videoIndex === 0 || videoIndex === 3) {
        rawVoiceover = 'Rynki kapitałowe nie nagradzają emocjonalnego pośpiechu, lecz żelazną dyscyplinę. Podczas gdy większość inwestorów kupuje euforię na lokalnych szczytach, największe zyski buduje się w ciszy podczas rynkowych panik. Zrozumienie psychologii tłumu i chłodna kalkulacja ryzyka to jedyna trwała przewaga konkurencyjna.';
      } else if (videoIndex === 2) {
        rawVoiceover = 'Rewolucja sztucznej inteligencji nie zastępuje ludzi, lecz bezwzględnie weryfikuje ich tempo adaptacji. Automatyzacja powtarzalnych procesów uwalnia setki godzin na myślenie strategiczne i innowacje. Prawdziwą przewagę zdobywają specjaliści, którzy potrafią efektywnie dyrygować autonomicznymi modelami cyfrowymi.';
      } else if (videoIndex === 6) {
        rawVoiceover = 'Mózg człowieka zużywa aż dwadzieścia procent energii organizmu, choć stanowi zaledwie ułamek jego masy. Każda podejmowana decyzja i rozproszenie cyfrowe drenuje zasoby kory przedczołowej. Świadoma selekcja bodźców to klucz do utrzymania głębokiego skupienia i wybitnej produktywności.';
      } else {
        rawVoiceover = 'Współczesny świat nagradza rzetelną wiedzę i precyzyjne decyzje, a nie powierzchowny szum informacyjny. Kiedy większość goni za chwilowymi trendami, strategiczni liderzy analizują twarde fakty i budują długoterminową odporność. Spokój i analityczne myślenie to fundament każdego sukcesu.';
      }
    } else {
      rawVoiceover = 'Financial markets never reward emotional impatience, but strict rational discipline. While average participants buy into hype at cycle peaks, sustainable wealth is quietly accumulated during peak market fear. Mastering risk management and crowd psychology remains the ultimate competitive edge.';
    }

    const smartVoiceover = ensureRaportFinansowyCta(rawVoiceover, topic);

    const singleScene = {
      subtitles: smartVoiceover,
      voiceover_text: smartVoiceover,
      duration: 18.0,
      searchKeyword: theme,
      videoUrl: CURATED_MOTION_CLIPS_POOL[videoIndex].url,
      captionStyle: {
        position: 'bottom' as const,
        animation: 'word-by-word' as const,
        highlightColor: 'yellow' as const,
        fontColor: 'white',
        outlineColor: 'black',
        outlineWidth: 5,
        boxColor: 'black@0.6'
      }
    };

    return {
      title: topic,
      description: `#shorts #analiza #${niche.toLowerCase().replace(/\s+/g, '')} #wiedza | Sprawdź pełny raport: https://raport-finansowy24.pl`,
      hook: smartVoiceover.split('.')[0] + '.',
      language,
      scenes: [singleScene as any],
      backgroundMusicUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      audioVolume: 0.25,
      generator: 'smart-analytical-engine-18s-1scene'
    };
  }

  // Multi-scene fallback if explicitly requested (> 1)
  const dur = Number((18 / count).toFixed(1));
  const scenes = Array.from({ length: count }).map((_, idx) => {
    const isLast = idx === count - 1;
    let text = isPl
      ? `Punkt numer ${idx + 1}. Kluczowy wskaźnik rynkowy potwierdza, że strategiczne podejście do ${topic} decyduje o ostatecznym wyniku.`
      : `Key insight number ${idx + 1}. Fundamental metrics indicate that a disciplined approach is essential.`;

    if (isLast && isPl) {
      text = ensureRaportFinansowyCta(text, topic);
    }

    return {
      subtitles: text,
      voiceover_text: text,
      duration: dur,
      searchKeyword: theme,
      videoUrl: CURATED_MOTION_CLIPS_POOL[(videoIndex + idx) % CURATED_MOTION_CLIPS_POOL.length].url,
      captionStyle: {
        position: 'bottom' as const,
        animation: 'word-by-word' as const,
        highlightColor: 'yellow' as const,
        fontColor: idx === 0 ? 'yellow' : 'white',
        outlineColor: 'black',
        outlineWidth: 5,
        boxColor: 'black@0.6'
      }
    };
  });

  return {
    title: topic,
    description: `#shorts #viral #${niche.toLowerCase().replace(/\s+/g, '')} #fyp | Sprawdź na https://raport-finansowy24.pl`,
    hook: topic,
    language,
    scenes,
    backgroundMusicUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    audioVolume: 0.25,
    generator: 'smart-template-engine'
  };
}

// Resilient Gemini Model Cascade: Prioritizes fast, modern, reliable models and auto-switches if 503/429 occurs
const GEMINI_MODEL_CASCADE = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
];

async function callGeminiWithCascade(params: {
  contents: string;
  config?: any;
}): Promise<{ text: string; modelUsed: string } | null> {
  let lastError: Error | null = null;
  for (const model of GEMINI_MODEL_CASCADE) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config
      });
      if (response && response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.log(`[Gemini Cascade] Model ${model} returned: ${errMsg.slice(0, 90)}... Auto-switching to next model in cascade.`);
    }
  }
  if (lastError) {
    console.warn(`[Gemini Cascade Fallback] All Gemini models exhausted (${lastError.message}). Using optimized heuristic generator.`);
  }
  return null;
}

// Resilient Script Generator: Automatically transforms Bankier.pl news content into viral hook scripts using Gemini
async function generateSmartOrGeminiViralScript({
  topic = 'Rynki kapitałowe a dyscyplina inwestycyjna',
  niche = 'Finanse & Biznes',
  language = 'Polski',
  sceneCount = 2,
  articleContext,
  bankierArticle
}: {
  topic?: string;
  niche?: string;
  language?: string;
  sceneCount?: number;
  articleContext?: string;
  bankierArticle?: any;
  viralHookFormula?: string;
}) {
  const cleanTopic = (topic || 'Analiza rynkowa').trim();
  const count = Math.min(Math.max(Number(sceneCount) || 2, 1), 6);

  // Construct structured Bankier.pl news context
  let bankierNewsSection = '';
  if (bankierArticle && typeof bankierArticle === 'object') {
    bankierNewsSection = `
=== DANE NEWSA ŹRÓDŁOWEGO Z BANKIER.PL ===
Tytuł artykułu: "${bankierArticle.title || cleanTopic}"
Kategoria rynkowa: ${bankierArticle.category || niche}
Podsumowanie / Fakty: "${bankierArticle.description || bankierArticle.summary || ''}"
${bankierArticle.keyTakeaway ? `Kluczowy wniosek analityczny: "${bankierArticle.keyTakeaway}"` : ''}
${bankierArticle.suggestedHook ? `Sugerowany kierunek hooka: "${bankierArticle.suggestedHook}"` : ''}
${Array.isArray(bankierArticle.suggestedSearchKeywords) && bankierArticle.suggestedSearchKeywords.length > 0 ? `Sugerowane ujęcia wizualne: ${bankierArticle.suggestedSearchKeywords.join(', ')}` : ''}
==========================================`;
  } else if (articleContext && articleContext.trim()) {
    bankierNewsSection = `
=== KONTEKST ARTYKUŁU / NEWSA Z BANKIER.PL ===
${articleContext.trim()}
==============================================`;
  }

  const autonomousPromptInstructions = `
AUTONOMICZNA SYNTEZA VIRALOWA NA PODSTAWIE NEWSA Z BANKIER.PL (GEMINI AI):
Zero kompromisów. Działasz jako światowej klasy scenarzysta wiralowy i analityk finansowy (standard: Hormozi, Bloomberg Quicktake, Morning Brew, Vox), tworząc ultra-angażujące wideo w formacie pionowym 9:16 (YouTube Shorts, Instagram Reels, TikTok) dla portalu raport-finansowy24.pl.

TWOJE NAJWAŻNIEJSZE ZADANIE: MAKSYMALIZACJA RETENCJI W PIERWSZYCH 3 SEKUNDACH (3-SECOND RETENTION RULE)
Współczesny algorytm social media podejmuje decyzję o wiralowości w ułamku sekundy. Widz podejmuje decyzję o przesunięciu palcem (swipe) w ciągu pierwszych 2-3 sekund. 
Dlatego pierwsze 3 sekundy (pierwsze 8-12 słów sceny 1) MUSZĄ natychmiast wybić widza ze stanu hipnozy przewijania ekranu (Pattern Interrupt) i uruchomić silną pętlę ciekawości (Curiosity Loop).

TECHNIKI STORYTELLINGU O WYSOKIEJ RETENCJI DLA PIERWSZYCH 3 SEKUND (WYBIERZ NAJLEPSZĄ W ZALEŻNOŚCI OD TREŚCI):
1. PATTERN INTERRUPT + DIRECT STAKES (Bezpośrednie ryzyko dla portfela widza):
   Użyj natychmiastowego uderzenia w status quo lub błąd, o którym widz nie ma pojęcia.
   Przykłady hooka na pierwsze 3 sekundy:
   - "Ten jeden błąd w Twoim banku kosztuje Cię właśnie fortunę."
   - "Przestań natychmiast ignorować ten komunikat, jeśli masz kredyt lub oszczędności."
   - "Właśnie zapadła decyzja, która po cichu uszczupli Twoje oszczędności."

2. CONTRARIAN TRUTH BOMB / PARADOKS POZORNY (Złamanie powszechnego przekonania):
   Postaw tezę, która wydaje się nielogiczna, wywołując natychmiastowy Dysonans Poznawczy (Cognitive Dissonance), który zmusza mózg do obejrzenia do końca.
   Przykłady hooka na pierwsze 3 sekundy:
   - "Większość ludzi myśli, że te akcje to okazja. W rzeczywistości to pułapka."
   - "Trzymanie pieniędzy na lokacie wcale Cię nie chroni – oto dlaczego."
   - "To nie inflacja zabiera Ci najwięcej – to ten ukryty mechanizm bankowy."

3. THE TICKING CLOCK / NOWE ZASADY GRY (Natychmiastowa pilność):
   Powołaj się na świeży odczyt, zmianę przepisów lub zwrot na rynku z Bankier.pl z precyzyjną liczbą.
   Przykłady hooka na pierwsze 3 sekundy:
   - "Te nowe dane z giełdy wywołały panikę wśród zarządzających funduszami."
   - "Od dziś zasady się zmieniły: ten wskaźnik wzrósł o konkretne wartości."
   - "Oficjalny komunikat: rynki właśnie zareagowały na tę jedną liczbę."

4. THE "INSIDER SECRET" (Asymetria informacji):
   Postaw widza w pozycji uprzywilejowanego obserwatora, który dowiaduje się czegoś przed tłumem.
   Przykłady hooka na pierwsze 3 sekundy:
   - "Instytucje finansowe od miesięcy przygotowywały się na ten scenariusz."
   - "Oto co najwięksi gracze na GPW robią tuż przed publikacją tego raportu."

ŻELAZNE ZASADY NARRACJI HIGH-RETENTION DLA FORMACJI SHORTÓW (2 SCENY PO 9s = 18.0s ŁĄCZNIE):
- ZAKAZ WYPEŁNIACZY: Całkowity zakaz "Cześć!", "Witajcie", "Czy wiedziałeś że?", "W dzisiejszym odcinku", sztucznych powitań i banałów. Pierwsze słowo musi być częścią uderzeniowego hooka.
- CURIOSITY GAP (OTWARTA PĘTLA): Hook w pierwszych 3 sekundach otwiera pętlę ("dlaczego?", "co to oznacza?"), a Scena 2 dostarcza satysfakcjonującej odpowiedzi i rozwiązania.
- TWARDE DANE: Wpleć konkretną liczbę, procent, datę lub nazwisko/instytucję wyciągniętą wprost z newsa Bankier.pl. Liczby budują autorytet i zatrzymują uwagę.
- DYNAMIKA RYTMU: Pisz krótkimi, dobitnymi zdaniami (staccato), które lektor wypowie z pewnością siebie i energią.
- STRUKTURA 2 SCEN:
  * SCENA 1 (9.0s, ok. 20-23 słowa):
    - Sekundy 0-3 (8-12 słów): Agresywny Hook o wysokiej retencji (Pattern Interrupt / Contrarian Hook / Ticking Clock).
    - Sekundy 4-9 (12-14 słów): Rozwinięcie tła i twardy fakt / liczba z artykułu Bankier.pl, który uzasadnia wagę hooka.
    - searchKeyword: Angielskie słowo kluczowe dla ultra-dynamicznego wideo Pexels w tle (np. "stock exchange screen numbers flashing", "city traffic night hyperlapse", "counting cash money bills dynamic", "fast stock market trading chart timelapse", "crypto trading chart dynamic").
  * SCENA 2 (9.0s, ok. 20-23 słowa):
    - Sekundy 9-15 (14-16 słów): Rozwiązanie pętli, logiczna konsekwencja dla portfela widza i strategiczny wniosek.
    - Sekundy 16-18 (5-7 słów): Płynne, obligatoryjne Call-To-Action (CTA):
      "Sprawdź pełną analizę na raport-finansowy24.pl." lub "Więcej raportów i danych na raport-finansowy24.pl."
    - searchKeyword: Drugie, odmienne angielskie słowo kluczowe dla Pexels (np. "dynamic financial stock market display animation", "aerial night view vibrant city skyline", "corporate boardroom financial discussion glass office", "vibrant digital data stream animation").

WYMAGANY FORMAT JSON:
{
  "title": "Chwytliwy, zwięzły tytuł YouTube Shorts (maks 45 znaków)",
  "description": "#shorts #finanse #analiza #inwestowanie | Sprawdź na https://raport-finansowy24.pl",
  "hook": "Dokładne pierwsze zdanie ze sceny 1 (zoptymalizowany 3-sekundowy hook)",
  "scenes": [
    {
      "subtitles": "Pełny tekst sceny 1 zaczynający się od 3-sekundowego hooka...",
      "voiceover_text": "Dokładnie taki sam tekst jak w subtitles dla sceny 1",
      "duration": 9.0,
      "searchKeyword": "dynamic pexels search query in english"
    },
    {
      "subtitles": "Tekst sceny 2 z wnioskiem i końcowym CTA: Sprawdź na raport-finansowy24.pl.",
      "voiceover_text": "Dokładnie taki sam tekst jak w subtitles dla sceny 2 kończący się CTA",
      "duration": 9.0,
      "searchKeyword": "second distinct dynamic pexels search query in english"
    }
  ],
  "backgroundMusicUrl": "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3",
  "audioVolume": 0.25
}`;

  try {
    const prompt = count === 2
      ? `Jesteś elitarnym twórcą viralowych formatów wideo dla portalu raport-finansowy24.pl (w stylu CNBC, Bloomberg, Hormozi).
Stwórz wysoce merytoryczny, porywający scenariusz na 18-sekundowy film (DOKŁADNIE 2 uzupełniające się sceny po 9 sekund każda, duration = 9.0s na scenę, łącznie 18 sekund filmu) w języku: ${language} na temat: "${cleanTopic}" (Kategoria: ${niche}).
${bankierNewsSection}
${autonomousPromptInstructions}`
      : count === 1
      ? `Jesteś elitarnym twórcą viralowych formatów wideo i analitykiem finansowym (standard: Hormozi, Vox, Bloomberg Quicktake).
Stwórz wysoce merytoryczny, gotowy scenariusz na 1 spójną, 18-sekundową scenę (DOKŁADNIE 1 scena, czas duration = 18.0) w języku: ${language} na temat: "${cleanTopic}" (Kategoria: ${niche}).
${bankierNewsSection}
ZASADY HIGH-RETENTION W PIERWSZYCH 3 SEKUNDACH (3-SECOND RETENTION HOOK):
- Sekundy 0-3 (pierwsze 8-12 słów): Bezwzględny zakaz powitań i banałów. Natychmiastowy Pattern Interrupt / Contrarian Truth / Direct Risk dla portfela widza, zatrzymujący scrollowanie.
- Sekundy 4-12: Twardy fakt lub szokująca liczba z newsa Bankier.pl + mechanizm przyczynowo-skutkowy.
- Sekundy 13-16: Strategiczny wniosek dla widza.
- Sekundy 17-18: Końcowe CTA: "Sprawdź na raport-finansowy24.pl." lub "Więcej danych na raport-finansowy24.pl."
- Wymagane pola JSON:
  1. "title": Poważny, chwytliwy tytuł analityczny w języku (${language})
  2. "description": Krótki opis z hashtagami (#shorts #analiza #${niche.toLowerCase().replace(/\s+/g, '')} #wiedza | Sprawdź na https://raport-finansowy24.pl)
  3. "hook": Dokładne pierwsze zdanie (zoptymalizowany 3-sekundowy hook)
  4. "scenes": Tablica z DOKŁADNIE 1 obiektem:
     - "subtitles": Dokładnie ta sama treść co "voiceover_text" (zostanie zsynchronizowana z lektorem i animowana słowo po słowie)
     - "voiceover_text": Kompletna wypowiedź lektora (DOKŁADNIE 40 do 46 słów w języku ${language}, zakończona CTA do raport-finansowy24.pl).
     - "duration": 18.0
     - "searchKeyword": Precyzyjne, ultra-dynamiczne angielskie zapytanie dla wideo Pexels do pobrania ruchomej grafiki w tle (np. "stock exchange screen numbers flashing", "city traffic night hyperlapse", "cyber digital network glowing", "counting cash money bills dynamic")
  5. "backgroundMusicUrl": "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3"
  6. "audioVolume": 0.25`
      : `Jesteś ekspertem analitycznych filmów YouTube Shorts / TikTok. Stwórz porywający, merytoryczny scenariusz na krótki wideo-short (9:16) w języku: ${language} na temat: "${cleanTopic}" (Kategoria: ${niche}).
${bankierNewsSection}
${autonomousPromptInstructions}`;

    const geminiResult = await callGeminiWithCascade({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            hook: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subtitles: { type: Type.STRING },
                  voiceover_text: { type: Type.STRING },
                  duration: { type: Type.NUMBER },
                  searchKeyword: { type: Type.STRING },
                  captionStyle: {
                    type: Type.OBJECT,
                    properties: {
                      position: { type: Type.STRING },
                      fontColor: { type: Type.STRING },
                      outlineColor: { type: Type.STRING },
                      boxColor: { type: Type.STRING }
                    }
                  }
                },
                required: ['subtitles', 'duration', 'searchKeyword']
              }
            },
            backgroundMusicUrl: { type: Type.STRING },
            audioVolume: { type: Type.NUMBER }
          },
          required: ['title', 'description', 'scenes']
        }
      }
    });

    if (geminiResult && geminiResult.text) {
      const parsed = JSON.parse(geminiResult.text);
      if (parsed && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
        const usedPexelsIds: number[] = [];
        const scenesWithVideo = [];

        for (let idx = 0; idx < parsed.scenes.length; idx++) {
          const sc = parsed.scenes[idx];
          const resolved = await resolveStockOrPexelsVideoDetailed(sc.searchKeyword, idx, usedPexelsIds);
          if (resolved.pexelsId) {
            usedPexelsIds.push(resolved.pexelsId);
          }

          let textContent = sc.voiceover_text || sc.subtitles || '';
          const isLast = idx === parsed.scenes.length - 1;
          if (isLast) {
            textContent = ensureRaportFinansowyCta(textContent, cleanTopic);
          }

          scenesWithVideo.push({
            ...sc,
            subtitles: textContent,
            voiceover_text: textContent,
            duration: sc.duration || (count === 1 ? 18.0 : 9.0),
            videoUrl: resolved.videoUrl,
            thumbnailUrl: resolved.thumbnailUrl,
            source: resolved.source,
            photographer: resolved.photographer,
            photographerUrl: resolved.photographerUrl,
            pexelsId: resolved.pexelsId,
            searchKeyword: sc.searchKeyword || resolved.searchKeyword || 'stock exchange screen numbers flashing',
            captionStyle: sc.captionStyle || {
              position: 'bottom',
              animation: 'word-by-word',
              highlightColor: 'yellow',
              fontColor: idx === 0 ? 'yellow' : 'white',
              outlineColor: 'black',
              outlineWidth: 5,
              boxColor: 'black@0.6'
            }
          });
        }

        let finalDescription = parsed.description || `#shorts #${niche.toLowerCase()} #analiza`;
        if (!finalDescription.includes('raport-finansowy24.pl')) {
          finalDescription += ' | Sprawdź na https://raport-finansowy24.pl';
        }

        return {
          title: parsed.title || cleanTopic,
          description: finalDescription,
          hook: parsed.hook || parsed.scenes?.[0]?.subtitles || cleanTopic,
          language,
          scenes: scenesWithVideo,
          backgroundMusicUrl: parsed.backgroundMusicUrl || 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
          audioVolume: parsed.audioVolume || 0.25,
          generator: geminiResult.modelUsed
        };
      }
    }
  } catch (err) {
    console.warn('⚠️ [Gemini Script Catch] Processing error (' + (err as Error).message + '). Generating optimized heuristic viral script.');
  }

  const fallbackScript = buildSmartFallbackScript(cleanTopic, niche, language, count, articleContext, bankierArticle);
  const usedPexelsIds: number[] = [];
  const fallbackScenesWithVideo = [];

  for (let idx = 0; idx < fallbackScript.scenes.length; idx++) {
    const sc = fallbackScript.scenes[idx];
    const resolved = await resolveStockOrPexelsVideoDetailed(sc.searchKeyword, idx, usedPexelsIds);
    if (resolved.pexelsId) {
      usedPexelsIds.push(resolved.pexelsId);
    }

    fallbackScenesWithVideo.push({
      ...sc,
      videoUrl: resolved.videoUrl,
      thumbnailUrl: resolved.thumbnailUrl,
      source: resolved.source,
      photographer: resolved.photographer,
      photographerUrl: resolved.photographerUrl,
      pexelsId: resolved.pexelsId,
      searchKeyword: resolved.searchKeyword || sc.searchKeyword
    });
  }

  return {
    ...fallbackScript,
    scenes: fallbackScenesWithVideo
  };
}

// Resilient Translation Generator (Tries Gemini Model Cascade, gracefully falls back on API error)
async function translateSmartOrGeminiScript({
  scriptText,
  targetLanguage = 'Polski',
  sceneCount = 1
}: {
  scriptText: string;
  targetLanguage?: string;
  sceneCount?: number;
}) {
  const count = Math.min(Math.max(Number(sceneCount) || 1, 1), 6);

  try {
    const prompt = count === 1
      ? `Jesteś ekspertem automatycznego tłumaczenia i adaptacji scenariuszy wideo (Shorts / TikTok).
Przetłumacz i zaadaptuj poniższy tekst na język: "${targetLanguage}" jako 1 spójną, 18-sekundową scenę (dokładnie 1 scena, duration = 18.0s).
Zadbaj o inteligentny, elegancki styl wypowiedzi lektora (ok. 40-45 słów).
Tekst do przetłumaczenia:
"${scriptText}"

Wymagania JSON:
1. "title": Przetłumaczony tytuł
2. "description": Opis i hashtagi w języku ${targetLanguage}
3. "hook": Przetłumaczony otwierający nagłówek
4. "scenes": Tablica z DOKŁADNIE 1 sceną:
   - "subtitles": Pełny przetłumaczony tekst
   - "voiceover_text": Pełny przetłumaczony tekst do przeczytania przez lektora
   - "duration": 18.0
   - "searchKeyword": Angielskie słowo kluczowe tła wideo dla Pexels`
      : `Jesteś ekspertem automatycznego tłumaczenia i tworzenia wiralowych napisów do filmów wideo (Shorts / TikTok / Reels).
Przetłumacz i podziel poniższy tekst / transkrypcję z nagrania wideo na język: "${targetLanguage}".
Podziel go na ${count} scen z uderzającymi napisami oraz dobierz angielskie słowa kluczowe tła wideo Pexels dla każdej sceny.

Tekst do przetłumaczenia:
"${scriptText}"

Wymagania JSON:
1. "title": Chwytliwy przetłumaczony tytuł filmu
2. "description": Opis i hashtagi w języku ${targetLanguage}
3. "hook": Przetłumaczony otwierający nagłówek
4. "scenes": Tablica zawierająca ${count} scen z:
   - "subtitles": Przetłumaczony tekst sceny
   - "voiceover_text": Tekst do przeczytania przez lektora
   - "duration": Czas trwania w sekundach
   - "searchKeyword": Angielskie słowa kluczowe pasujące do sensu wypowiedzi`;

    const geminiResult = await callGeminiWithCascade({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            hook: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subtitles: { type: Type.STRING },
                  voiceover_text: { type: Type.STRING },
                  duration: { type: Type.NUMBER },
                  searchKeyword: { type: Type.STRING }
                },
                required: ['subtitles', 'duration', 'searchKeyword']
              }
            }
          },
          required: ['title', 'scenes']
        }
      }
    });

    if (geminiResult && geminiResult.text) {
      const parsed = JSON.parse(geminiResult.text);
      if (parsed && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
        const usedPexelsIds: number[] = [];
        const scenesWithVideo = [];

        for (let idx = 0; idx < parsed.scenes.length; idx++) {
          const sc = parsed.scenes[idx];
          const resolved = await resolveStockOrPexelsVideoDetailed(sc.searchKeyword, idx, usedPexelsIds);
          if (resolved.pexelsId) {
            usedPexelsIds.push(resolved.pexelsId);
          }

          let textContent = sc.voiceover_text || sc.subtitles || '';
          const isLast = idx === parsed.scenes.length - 1;
          if (isLast && targetLanguage.toLowerCase().includes('pol')) {
            textContent = ensureRaportFinansowyCta(textContent, parsed.title || scriptText);
          }

          scenesWithVideo.push({
            subtitles: textContent,
            voiceover_text: textContent,
            duration: sc.duration || (count === 1 ? 18.0 : 9.0),
            searchKeyword: sc.searchKeyword || resolved.searchKeyword || 'stock exchange screen numbers flashing',
            videoUrl: resolved.videoUrl,
            thumbnailUrl: resolved.thumbnailUrl,
            source: resolved.source,
            photographer: resolved.photographer,
            photographerUrl: resolved.photographerUrl,
            pexelsId: resolved.pexelsId,
            captionStyle: {
              position: 'bottom' as const,
              animation: 'word-by-word' as const,
              highlightColor: 'yellow' as const,
              fontColor: idx === 0 ? 'yellow' : 'white',
              outlineColor: 'black',
              outlineWidth: 5,
              boxColor: 'black@0.6'
            }
          });
        }

        let finalDescription = parsed.description || `#shorts #translation #${targetLanguage.toLowerCase()}`;
        if (!finalDescription.includes('raport-finansowy24.pl')) {
          finalDescription += ' | Sprawdź na https://raport-finansowy24.pl';
        }

        return {
          success: true,
          targetLanguage,
          title: parsed.title || 'Przetłumaczone Wideo Short',
          description: finalDescription,
          hook: parsed.hook || parsed.scenes?.[0]?.subtitles || '',
          scenes: scenesWithVideo,
          backgroundMusicUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
          audioVolume: 0.25,
          generator: geminiResult.modelUsed
        };
      }
    }
  } catch (err) {
    console.warn('⚠️ [Gemini Translation Fallback] Gemini translation error (' + (err as Error).message + '). Splitting script text intelligently.');
  }

  const cleaned = scriptText.replace(/\r?\n/g, ' ').trim();

  if (count <= 1) {
    return {
      success: true,
      targetLanguage,
      title: cleaned.slice(0, 35) || 'Przetłumaczone Wideo Short',
      description: `#shorts #translation #${targetLanguage.toLowerCase()}`,
      hook: cleaned.slice(0, 50) + '...',
      scenes: [{
        subtitles: cleaned,
        voiceover_text: cleaned,
        duration: 18.0,
        searchKeyword: 'stock market charts graph',
        videoUrl: CURATED_MOTION_CLIPS_POOL[0].url,
        captionStyle: {
          position: 'bottom' as const,
          animation: 'word-by-word' as const,
          highlightColor: 'yellow' as const,
          fontColor: 'white',
          outlineColor: 'black',
          outlineWidth: 5,
          boxColor: 'black@0.6'
        }
      }],
      backgroundMusicUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      audioVolume: 0.25,
      generator: 'smart-template-engine-18s'
    };
  }

  const sentences = cleaned.split(/(?<=[.?!])\s+/).filter(Boolean);
  const dur = Number((18 / count).toFixed(1));

  let parts: string[] = [];
  if (sentences.length >= count) {
    parts = sentences.slice(0, count);
  } else {
    const words = cleaned.split(/\s+/);
    const wordsPerChunk = Math.ceil(words.length / count);
    for (let i = 0; i < count; i++) {
      const chunk = words.slice(i * wordsPerChunk, (i + 1) * wordsPerChunk).join(' ');
      if (chunk) parts.push(chunk);
    }
  }

  while (parts.length < count) {
    parts.push(`SCENA ${parts.length + 1}`);
  }

  const scenesWithVideo = parts.map((chunk, idx) => ({
    subtitles: chunk,
    voiceover_text: chunk,
    duration: dur,
    searchKeyword: 'tech cyber nature',
    videoUrl: CURATED_MOTION_CLIPS_POOL[idx % CURATED_MOTION_CLIPS_POOL.length].url,
    captionStyle: {
      position: 'bottom' as const,
      animation: 'word-by-word' as const,
      highlightColor: 'yellow' as const,
      fontColor: idx === 0 ? 'yellow' : 'white',
      outlineColor: 'black',
      outlineWidth: 5,
      boxColor: 'black@0.6'
    }
  }));

  return {
    success: true,
    targetLanguage,
    title: parts[0]?.slice(0, 30) || 'Short Video',
    description: `#shorts #translation #${targetLanguage.toLowerCase()}`,
    hook: parts[0] || '',
    scenes: scenesWithVideo,
    backgroundMusicUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    audioVolume: 0.25,
    generator: 'smart-template-engine'
  };
}

// Endpoint: AI Script & Shorts Generator (/api/generate-viral-script)
router.post('/generate-viral-script', async (req, res) => {
  try {
    const {
      topic = 'Rynki kapitałowe i dyscyplina inwestycyjna',
      niche = 'Finanse & Biznes',
      sceneCount = 2,
      language = 'Polski',
      articleContext,
      bankierArticle
    } = req.body;
    const script = await generateSmartOrGeminiViralScript({
      topic,
      niche,
      sceneCount,
      language,
      articleContext,
      bankierArticle
    });
    return res.json(script);
  } catch (error) {
    console.error('Error generating viral script:', error);
    return res.status(500).json({
      error: 'Błąd generowania skryptu:',
      details: (error as Error).message
    });
  }
});

// Endpoint: Video Script Translation & Localized Short Generator (/api/translate-video-script)
router.post('/translate-video-script', async (req, res) => {
  try {
    const { scriptText, targetLanguage = 'Polski', sceneCount = 1 } = req.body;

    if (!scriptText || typeof scriptText !== 'string') {
      return res.status(400).json({ error: 'Brak tekstu skryptu do przetłumaczenia.' });
    }

    const translated = await translateSmartOrGeminiScript({ scriptText, targetLanguage, sceneCount });
    return res.json(translated);
  } catch (error) {
    console.error('Error translating video script:', error);
    return res.status(500).json({
      error: 'Błąd tłumaczenia skryptu wideo:',
      details: (error as Error).message
    });
  }
});

// Endpoint: Zero-Touch Auto-Pilot Shorts Generator (/api/auto-pilot-shorts)
router.post('/auto-pilot-shorts', async (req, res) => {
  try {
    const body = req.body;
    console.log('[POST /api/auto-pilot-shorts] Otrzymane dane payload:', JSON.stringify(body, null, 2));

    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        error: 'Nieprawidłowe żądanie HTTP. Oczekiwany poprawny obiekt JSON.',
        example: {
          filename: 'moj_short.mp4',
          transition: 'fade',
          scenes: [
            { text: 'PIERWSZY NIESAMOWITY FAKT', video_url: 'https://example.com/video1.mp4' },
            { text: 'DRUGI FAKT O ŚWIECIE', video_url: 'https://example.com/video2.mp4' },
            { text: 'SUBSKRYBUJ PO WIĘCEJ', video_url: 'https://example.com/video3.mp4' }
          ]
        }
      });
    }

    const { filename, transition, topic, niche = 'Viral Shorts', language = 'Polski', outputResolution = '720x1280' } = body;
    const webhookUrl = body.webhookUrl || (req.query.webhookUrl as string) || (req.headers['x-webhook-url'] as string);
    let scenesToRender: SceneInput[] = [];
    let title = filename || 'Make.com Short Video';
    let description = `#shorts #viral #${niche.toLowerCase().replace(/\s+/g, '')}`;
    let scriptData: any = null;

    // 1. Sprawdź, czy przekazano gotową tablicę scen (wspiera: scenes, sceny, Sceny, items itp.)
    const rawScenesList = extractScenesFromPayload(body);

    if (rawScenesList && rawScenesList.length > 0) {
      scenesToRender = rawScenesList.map((sc: any, idx: number) =>
        normalizeSceneItem(sc, idx, rawScenesList.length)
      );

      console.log(`✓ Przyjęto ${scenesToRender.length} scen z Make.com (łączny czas: ${scenesToRender.reduce((a, b) => a + (b.duration || 6), 0)}s)`);
    } else {
      // 2. Jeśli Make przesłało temat (lub brak scen), wygeneruj scenariusz (odporny silnik AI + Smart Fallback)
      const topicToUse = topic || '5 Niesamowitych faktów o świecie';
      scriptData = await generateSmartOrGeminiViralScript({
        topic: topicToUse,
        niche,
        language,
        sceneCount: body.sceneCount || 2,
        articleContext: body.articleContext,
        bankierArticle: body.bankierArticle
      });

      title = scriptData.title || topicToUse;
      description = scriptData.description || description;
      scenesToRender = scriptData.scenes;
    }

    const payload: CombineScenesPayload = {
      scenes: scenesToRender,
      backgroundMusicUrl: body.backgroundMusicUrl || 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
      audioVolume: body.audioVolume ?? 0.2,
      outputResolution,
      fps: 30,
      async: body.async === true || req.query.async === 'true',
      webhookUrl,
      tts: body.tts !== false,
      ttsLanguage: body.ttsLanguage || language || 'pl',
      ttsVoice: body.ttsVoice || body.tts_voice || body.voice || body.lektor || body.glos,
      ttsSpeed: typeof body.ttsSpeed === 'number' ? body.ttsSpeed : (typeof body.tts_speed === 'number' ? body.tts_speed : (typeof body.speed === 'number' ? body.speed : 1.15)),
      syncDurationWithVoice: body.syncDurationWithVoice !== false,
      captionAnimation: body.captionAnimation || body.animation || 'word-by-word',
      highlightColor: body.highlightColor || 'yellow'
    };

    const jobId = `job_make_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const baseUrl = getPublicBaseUrl(req);

    const newJob: Job = {
      id: jobId,
      status: 'queued',
      progress: 0,
      step: 'Przetwarzanie żądania z Make.com: weryfikacja scen i renderowanie FFmpeg',
      logs: [`[${new Date().toLocaleTimeString()}] Odebrano zadanie z Make.com (${scenesToRender.length} scen)`],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    jobsStore.set(jobId, newJob);
    saveJobsToDisk();

    // Jeśli włączony tryb asynchroniczny (async=true), zwróć status 202
    if (payload.async) {
      processCombineScenesJob(jobId, payload, baseUrl);
      return res.status(202).json({
        success: true,
        message: 'Zadanie Make.com zostało zakolejkowane.',
        jobId,
        script: scriptData,
        statusUrl: `${baseUrl}/api/jobs/${jobId}`,
        streamUrl: `${baseUrl}/api/jobs/${jobId}/stream`
      });
    } else {
      // Domyślnie dla Make.com: przetwarzaj synchronicznie i zwróć bezpośredni URL do gotowego pliku MP4!
      await processCombineScenesJob(jobId, payload, baseUrl);
      const completedJob = jobsStore.get(jobId);

      if (completedJob?.status === 'completed') {
        return res.json({
          success: true,
          title,
          description,
          jobId,
          script: scriptData,
          filename: filename || completedJob.outputFilename,
          outputUrl: completedJob.outputUrl,
          fileSize: completedJob.fileSize,
          duration: completedJob.duration || 18,
          scenesCount: scenesToRender.length,
          timestamp: completedJob.updatedAt
        });
      } else {
        return res.status(500).json({
          error: 'Renderowanie wideo FFmpeg zakończyło się błędem.',
          jobId,
          details: completedJob?.error || 'Nieznany błąd podczas montowania filmu MP4'
        });
      }
    }
  } catch (err) {
    console.error('❌ Endpoint /api/auto-pilot-shorts error:', err);
    return res.status(500).json({
      error: 'Błąd serwera podczas przetwarzania żądania Make.com:',
      details: (err as Error).message
    });
  }
});

// Main Endpoint: Combine Scenes (/api/combine-scenes)
router.post('/combine-scenes', async (req, res) => {
  const body = req.body || {};
  let scenesList = extractScenesFromPayload(body);

  if (!scenesList || scenesList.length === 0) {
    return res.status(400).json({
      error: 'Invalid payload. "scenes" array is required with at least 1 scene object.',
      example: {
        scenes: [
          {
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            subtitles: 'NATURE SCENE 1',
            duration: 4,
            captionStyle: { fontSize: 32, fontColor: 'white', position: 'bottom' }
          }
        ],
        outputResolution: '720x1280',
        audioVolume: 0.3
      }
    });
  }

  const normalizedScenes = scenesList.map((sc: any, idx: number) =>
    normalizeSceneItem(sc, idx, scenesList!.length)
  );

  const payload: CombineScenesPayload = {
    scenes: normalizedScenes,
    backgroundMusicUrl: body.backgroundMusicUrl || '',
    audioVolume: body.audioVolume ?? (body.tts !== false ? 0.2 : 0.3),
    outputResolution: body.outputResolution || body.resolution || '720x1280',
    fps: body.fps || 30,
    async: body.async === true || req.query.async === 'true',
    webhookUrl: body.webhookUrl || (req.query.webhookUrl as string) || (req.headers['x-webhook-url'] as string),
    tts: body.tts !== false,
    ttsLanguage: body.ttsLanguage || body.language || 'pl',
    ttsVoice: body.ttsVoice || body.tts_voice || body.voice || body.lektor || body.glos,
    ttsSpeed: typeof body.ttsSpeed === 'number' ? body.ttsSpeed : (typeof body.tts_speed === 'number' ? body.tts_speed : (typeof body.speed === 'number' ? body.speed : 1.15)),
    syncDurationWithVoice: body.syncDurationWithVoice !== false,
    captionAnimation: body.captionAnimation || body.animation || 'word-by-word',
    highlightColor: body.highlightColor || 'yellow'
  };

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const baseUrl = getPublicBaseUrl(req);

  const newJob: Job = {
    id: jobId,
    status: 'queued',
    progress: 0,
    step: 'Zadanie odebrane i zakolejkowane',
    logs: [`[${new Date().toLocaleTimeString()}] Utworzono nowe zadanie renderowania ${jobId}`],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  jobsStore.set(jobId, newJob);
  saveJobsToDisk();

  const isAsync = payload.async === true || Boolean(payload.webhookUrl);

  if (isAsync) {
    processCombineScenesJob(jobId, payload, baseUrl);
    return res.status(202).json({
      message: 'Video combination job created successfully.',
      jobId,
      statusUrl: `${baseUrl}/api/jobs/${jobId}`,
      streamUrl: `${baseUrl}/api/jobs/${jobId}/stream`,
      status: 'queued'
    });
  } else {
    await processCombineScenesJob(jobId, payload, baseUrl);
    const completedJob = jobsStore.get(jobId);

    if (completedJob?.status === 'completed') {
      return res.json({
        success: true,
        jobId,
        outputUrl: completedJob.outputUrl,
        filename: completedJob.outputFilename,
        fileSize: completedJob.fileSize,
        step: completedJob.step,
        timestamp: completedJob.updatedAt
      });
    } else {
      return res.status(500).json({
        success: false,
        jobId,
        error: completedJob?.error || 'Video rendering failed',
        step: completedJob?.step
      });
    }
  }
});

// Explicit Download Endpoint for generated MP4 files
router.get('/jobs/:jobId/download', (req, res) => {
  const { jobId } = req.params;
  const job = jobsStore.get(jobId);

  if (!job || !job.outputFilename) {
    return res.status(404).json({ error: `Nie znaleziono pliku wideo dla zadania ${jobId}` });
  }

  const filePath = path.join(EXPORTS_DIR, job.outputFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Plik fizyczny wideo wygasł lub został usunięty z serwera.' });
  }

  res.download(filePath, job.outputFilename);
});

router.get('/exports/:filename/download', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(EXPORTS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Plik nie istnieje na serwerze.' });
  }

  res.download(filePath, filename);
});

// Real-time Event Stream Endpoint (Server-Sent Events) (/api/jobs/:jobId/stream)
router.get('/jobs/:jobId/stream', (req, res) => {
  const { jobId } = req.params;
  const job = jobsStore.get(jobId);

  if (!job) {
    return res.status(404).json({ error: `Job with ID ${jobId} not found.` });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  // Send initial snapshot
  res.write(`data: ${JSON.stringify(job)}\n\n`);

  if (!sseSubscribers.has(jobId)) {
    sseSubscribers.set(jobId, new Set());
  }
  sseSubscribers.get(jobId)!.add(res);

  req.on('close', () => {
    const subs = sseSubscribers.get(jobId);
    if (subs) {
      subs.delete(res);
      if (subs.size === 0) sseSubscribers.delete(jobId);
    }
  });
});

// Webhook memory store for incoming Make.com / API webhooks
interface WebhookLog {
  id: string;
  endpoint: string;
  method: string;
  headers: Record<string, any>;
  body: any;
  jobId?: string;
  status: 'received' | 'processed' | 'error';
  errorMessage?: string;
  timestamp: string;
}

const webhookLogsStore: WebhookLog[] = [];

// Helper to record webhooks
function recordWebhookLog(endpoint: string, method: string, headers: any, body: any, jobId?: string, status: 'received' | 'processed' | 'error' = 'received', errorMessage?: string): WebhookLog {
  const log: WebhookLog = {
    id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    endpoint,
    method,
    headers: { 'content-type': headers['content-type'], 'user-agent': headers['user-agent'] },
    body,
    jobId,
    status,
    errorMessage,
    timestamp: new Date().toISOString()
  };
  webhookLogsStore.unshift(log);
  if (webhookLogsStore.length > 50) webhookLogsStore.pop(); // Keep last 50
  return log;
}

// Inbound Universal Webhook Handler (/api/webhook & /api/webhook/make)
const handleInboundWebhook = async (req: express.Request, res: express.Response) => {
  const endpoint = req.originalUrl || req.path;
  const body = req.body || {};
  console.log(`[Webhook Inbound ${req.method} ${endpoint}] Payload:`, JSON.stringify(body, null, 2));

  let jobId: string | undefined;

  try {
    const rawScenes = extractScenesFromPayload(body);
    const hasScenes = Array.isArray(rawScenes) && rawScenes.length > 0;
    const hasSingleVideo = body.video_url || body.videoUrl;
    const hasTopic = Boolean(body.topic || body.prompt || body.text);

    if (hasScenes || hasSingleVideo || hasTopic) {
      // Auto-construct scenes
      let scenesToRender: SceneInput[] = [];
      if (hasScenes && rawScenes) {
        scenesToRender = rawScenes.map((sc: any, idx: number) =>
          normalizeSceneItem(sc, idx, rawScenes.length)
        );
      } else if (hasSingleVideo) {
        scenesToRender = [normalizeSceneItem({
          text: body.text || body.subtitles || body.caption || 'NOWY SHORT',
          video_url: body.video_url || body.videoUrl,
          duration: body.duration || 10
        }, 0, 1)];
      } else if (hasTopic) {
        // Smart fallback script for topic
        const topicName = body.topic || body.prompt || 'Fascynujący świat AI';
        const smartScript = buildSmartFallbackScript(topicName, 'Viral Shorts', 'Polski', 3);
        scenesToRender = smartScript.scenes as any;
      }

      const baseUrl = getPublicBaseUrl(req);
      jobId = `job_wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const payload: CombineScenesPayload = {
        scenes: scenesToRender,
        backgroundMusicUrl: body.backgroundMusicUrl || 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
        audioVolume: body.audioVolume ?? (body.tts !== false ? 0.2 : 0.3),
        outputResolution: body.outputResolution || body.resolution || '720x1280',
        fps: 30,
        async: true,
        webhookUrl: body.webhookUrl || (req.query.webhookUrl as string) || (req.headers['x-webhook-url'] as string),
        tts: body.tts !== false,
        ttsLanguage: body.ttsLanguage || body.language || 'pl',
        ttsSpeed: body.ttsSpeed || 1.0,
        syncDurationWithVoice: body.syncDurationWithVoice !== false,
        captionAnimation: body.captionAnimation || body.animation || 'word-by-word',
        highlightColor: body.highlightColor || 'yellow'
      };

      const newJob: Job = {
        id: jobId,
        status: 'queued',
        progress: 0,
        step: 'Webhook odebrany: uruchamianie renderowania MP4',
        logs: [`[${new Date().toLocaleTimeString()}] Odebrano wywołanie Webhook z Make.com (${scenesToRender.length} scen)`],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      jobsStore.set(jobId, newJob);
      saveJobsToDisk();

      // Start asynchronous job
      processCombineScenesJob(jobId, payload, baseUrl);

      const log = recordWebhookLog(endpoint, req.method, req.headers, body, jobId, 'processed');

      return res.status(200).json({
        success: true,
        message: 'Webhook został przyjęty i przetworzony pomyślnie!',
        webhookId: log.id,
        jobId,
        scenesCount: scenesToRender.length,
        statusUrl: `${baseUrl}/api/jobs/${jobId}`,
        streamUrl: `${baseUrl}/api/jobs/${jobId}/stream`,
        timestamp: log.timestamp
      });
    } else {
      // Just record raw payload (e.g. test ping)
      const log = recordWebhookLog(endpoint, req.method, req.headers, body, undefined, 'received');

      return res.status(200).json({
        success: true,
        message: 'Webhook odebrany pomyślnie (brak zdefiniowanych scen/tematu do renderowania).',
        webhookId: log.id,
        receivedBody: body,
        timestamp: log.timestamp
      });
    }
  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error(`❌ Webhook handler error on ${endpoint}:`, err);
    const log = recordWebhookLog(endpoint, req.method, req.headers, body, jobId, 'error', errorMsg);

    return res.status(500).json({
      error: 'Błąd podczas przetwarzania Webhooka:',
      details: errorMsg,
      webhookId: log.id
    });
  }
};

router.post('/webhook', handleInboundWebhook);
router.post('/webhook/make', handleInboundWebhook);

// Generic Webhook Callback / Target endpoint (e.g., for test notifications)
router.post('/webhook/callback', (req, res) => {
  const log = recordWebhookLog('/api/webhook/callback', req.method, req.headers, req.body, undefined, 'received');
  res.json({
    success: true,
    message: 'Odebrano callback webhooka!',
    webhookId: log.id,
    timestamp: log.timestamp
  });
});

// GET /api/webhook/logs - Fetch all recorded webhooks
router.get('/webhook/logs', (req, res) => {
  res.json({
    count: webhookLogsStore.length,
    logs: webhookLogsStore
  });
});

// DELETE /api/webhook/logs - Clear logs
router.delete('/webhook/logs', (req, res) => {
  webhookLogsStore.length = 0;
  res.json({ success: true, message: 'Historia logów webhooków została wyczyszczona.' });
});

// GET /api/tts/voices - List all available high-quality neural voices
router.get('/tts/voices', (req, res) => {
  res.json({
    success: true,
    hasElevenLabsKey: false,
    voices: NEURAL_VOICES_CATALOG,
    defaultVoicePl: 'pl-PL-MarekNeural',
    defaultVoiceEn: 'en-US-ChristopherNeural'
  });
});

// GET /api/tts/stream - Stream synthesized voice speech directly for preview
router.get('/tts/stream', async (req, res) => {
  try {
    const rawText = ((req.query.text as string) || 'Cześć! To jest podgląd ultra-realistycznego lektora sztucznej inteligencji.').trim();
    const lang = normalizeLanguageCode((req.query.lang as string) || 'pl');
    const requestedVoice = (req.query.voice as string) || resolveNeuralVoice(undefined, lang);
    const speed = parseFloat(req.query.speed as string) || 1.15;

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');

    const tempAudio = path.join(TEMP_DIR, `stream_preview_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.mp3`);
    const dur = await generateTtsAudio(rawText.slice(0, 300), lang, tempAudio, TEMP_DIR, requestedVoice, speed);

    if (fs.existsSync(tempAudio)) {
      const readStream = fs.createReadStream(tempAudio);
      readStream.pipe(res);
      readStream.on('close', () => {
        try { if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio); } catch {}
      });
    } else {
      // Direct Google TTS fallback stream
      const safeText = encodeURIComponent(rawText.slice(0, 200));
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${safeText}&tl=${lang}&client=tw-ob`;
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (ttsRes) => {
        ttsRes.pipe(res);
      }).on('error', () => {
        res.status(500).end();
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Błąd streamingu TTS', details: (err as Error).message });
  }
});

// POST /api/tts/preview - Generate sample audio file and return preview metrics
router.post('/tts/preview', async (req, res) => {
  try {
    const { text, language = 'pl', voice, speed = 1.15 } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Pole "text" jest wymagane do wygenerowania próbki lektora.' });
    }

    const cleanLang = normalizeLanguageCode(language);
    const selectedVoice = voice || resolveNeuralVoice(voice, cleanLang);
    const speedMultiplier = typeof speed === 'number' && speed > 0.5 ? speed : 1.15;

    const previewFilename = `tts_preview_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.mp3`;
    const destPath = path.join(EXPORTS_DIR, previewFilename);

    const duration = await generateTtsAudio(text.trim(), cleanLang, destPath, TEMP_DIR, selectedVoice, speedMultiplier);
    const baseUrl = getPublicBaseUrl(req);

    res.json({
      success: true,
      text: text.trim(),
      language: cleanLang,
      voice: selectedVoice,
      speed: speedMultiplier,
      duration: Math.round(duration * 100) / 100,
      audioUrl: `${baseUrl}/exports/${previewFilename}`,
      streamUrl: `${baseUrl}/api/tts/stream?text=${encodeURIComponent(text.trim().slice(0, 200))}&lang=${cleanLang}&voice=${encodeURIComponent(selectedVoice)}&speed=${speedMultiplier}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Błąd generowania próbki lektora TTS', details: (err as Error).message });
  }
});

// Helper to format bytes into readable string
function formatBytesHelper(bytes: number | string | undefined): string {
  if (typeof bytes === 'string' && (bytes.includes('KB') || bytes.includes('MB') || bytes === 'N/A')) return bytes;
  const num = typeof bytes === 'number' ? bytes : parseInt(String(bytes || 0), 10);
  if (isNaN(num) || num <= 0) return 'N/A';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

// Endpoint: Get Last 5 Successful (Completed) Rendering Jobs with Download Link (/api/jobs/recent-completed)
router.get('/jobs/recent-completed', (req, res) => {
  const baseUrl = getPublicBaseUrl(req);
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 5, 1), 20);

  const completedJobs = Array.from(jobsStore.values())
    .filter((job) => {
      if (job.status !== 'completed' || !job.outputFilename) return false;
      const filePath = path.join(EXPORTS_DIR, job.outputFilename);
      return fs.existsSync(filePath);
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, limit)
    .map((job) => {
      const filePath = path.join(EXPORTS_DIR, job.outputFilename!);
      let actualSize = job.fileSize;
      try {
        if (fs.existsSync(filePath)) {
          actualSize = fs.statSync(filePath).size;
        }
      } catch {}

      const thumbFilename = `thumb_${path.parse(job.outputFilename!).name}.jpg`;
      const thumbExists = fs.existsSync(path.join(EXPORTS_DIR, thumbFilename));

      return {
        id: job.id,
        status: job.status,
        step: job.step,
        filename: job.outputFilename,
        fileSize: formatBytesHelper(actualSize),
        downloadUrl: `${baseUrl}/api/jobs/${job.id}/download`,
        outputUrl: `${baseUrl}/exports/${job.outputFilename}`,
        thumbnailUrl: job.thumbnailUrl || (thumbExists ? `${baseUrl}/exports/${thumbFilename}` : undefined),
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        timestampFormatted: new Date(job.updatedAt || job.createdAt).toLocaleString('pl-PL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      };
    });

  res.json({
    success: true,
    count: completedJobs.length,
    jobs: completedJobs
  });
});

// Endpoint: Dedicated Video Thumbnail Generator & Retriever (/api/jobs/:jobId/thumbnail)
router.get('/jobs/:jobId/thumbnail', async (req, res) => {
  const { jobId } = req.params;
  const job = jobsStore.get(jobId);
  if (!job || !job.outputFilename) {
    return res.status(404).json({ error: 'Nie znaleziono wideo lub zadania dla wygenerowania miniatury' });
  }

  const thumbFilename = `thumb_${path.parse(job.outputFilename).name}.jpg`;
  const thumbPath = path.join(EXPORTS_DIR, thumbFilename);

  if (fs.existsSync(thumbPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(thumbPath);
  }

  // Generate on demand if video exists
  const videoPath = path.join(EXPORTS_DIR, job.outputFilename);
  if (fs.existsSync(videoPath)) {
    try {
      await execPromise(`ffmpeg -y -ss 00:00:01.200 -i "${videoPath}" -vframes 1 -q:v 2 "${thumbPath}"`);
      if (fs.existsSync(thumbPath)) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(thumbPath);
      }
    } catch (err) {
      console.warn('Error generating thumbnail on demand:', (err as Error).message);
    }
  }

  res.status(404).json({ error: 'Nie udało się pobrać ani wygenerować miniatury wideo' });
});

// Endpoint: Stock & Pexels Configuration Status (/api/stock/status)
router.get('/stock/status', (req, res) => {
  res.json({
    success: true,
    hasPexelsKey: !!(process.env.PEXELS_API_KEY && process.env.PEXELS_API_KEY.trim()),
    curatedClipsCount: CURATED_MOTION_CLIPS_POOL.length,
    defaultDuration: 18.0,
    recommendedScenes: 2
  });
});

// Endpoint: Search Pexels Vertical Stock Videos (/api/stock/search-pexels)
router.get('/stock/search-pexels', async (req, res) => {
  try {
    const query = (req.query.query as string) || 'stock market chart';
    const perPage = Math.min(24, Math.max(1, Number(req.query.per_page) || 8));
    const videos = await searchPexelsMultiple(query, perPage);

    // If Pexels returned nothing or key is absent, provide relevant curated fallback with thumbnails
    if (videos.length === 0) {
      const lower = query.toLowerCase();
      const matched = CURATED_MOTION_CLIPS_POOL.filter((item) =>
        item.keywords.some((k) => lower.includes(k))
      );
      const fallbackList = (matched.length > 0 ? matched : CURATED_MOTION_CLIPS_POOL).map((item, idx) => ({
        videoUrl: item.url,
        thumbnailUrl: item.thumbnailUrl,
        pexelsId: 900000 + idx,
        width: 720,
        height: 1280,
        duration: 18,
        photographer: 'Mixkit / Studio',
        searchKeyword: query,
        source: 'curated' as const
      }));
      return res.json({
        success: true,
        query,
        count: fallbackList.length,
        source: 'curated',
        videos: fallbackList
      });
    }

    return res.json({
      success: true,
      query,
      count: videos.length,
      source: 'pexels',
      videos
    });
  } catch (error) {
    console.error('Error searching Pexels footage:', error);
    return res.status(500).json({
      error: 'Błąd wyszukiwania materiałów Pexels',
      details: (error as Error).message
    });
  }
});

// Endpoint: Get All Curated Vertical Motion Clips (/api/stock/curated)
router.get('/stock/curated', (req, res) => {
  res.json({
    success: true,
    count: CURATED_MOTION_CLIPS_POOL.length,
    clips: CURATED_MOTION_CLIPS_POOL
  });
});

// Endpoint: Fetch Fresh Stock Footage for Multiple Scenes (/api/stock/fetch-scene-footage)
router.post('/stock/fetch-scene-footage', async (req, res) => {
  try {
    const { keywords = [], topic = '', avoidIds = [] } = req.body;
    const queries: string[] = Array.isArray(keywords) && keywords.length > 0
      ? keywords
      : [topic || 'finance stock market', 'business corporate data'];

    const usedPexelsIds: number[] = Array.isArray(avoidIds) ? [...avoidIds] : [];
    const resolved = [];

    for (let idx = 0; idx < queries.length; idx++) {
      const query = queries[idx];
      const item = await resolveStockOrPexelsVideoDetailed(query, idx, usedPexelsIds);
      if (item.pexelsId) {
        usedPexelsIds.push(item.pexelsId);
      }
      resolved.push({
        sceneIndex: idx,
        searchKeyword: item.searchKeyword || query,
        videoUrl: item.videoUrl,
        thumbnailUrl: item.thumbnailUrl,
        source: item.source,
        photographer: item.photographer,
        photographerUrl: item.photographerUrl,
        pexelsId: item.pexelsId,
        duration: item.duration || 9.0
      });
    }

    return res.json({
      success: true,
      footage: resolved
    });
  } catch (error) {
    console.error('Error fetching scene footage:', error);
    return res.status(500).json({
      error: 'Błąd pobierania materiałów wideo dla scen',
      details: (error as Error).message
    });
  }
});

// Get All Recent and Active Jobs (/api/jobs)
router.get('/jobs', (req, res) => {
  const baseUrl = getPublicBaseUrl(req);
  const jobs = Array.from(jobsStore.values()).map((job) => {
    if (job.outputFilename) {
      return {
        ...job,
        outputUrl: `${baseUrl}/exports/${job.outputFilename}`
      };
    }
    return job;
  }).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(jobs);
});

// Job Status Check Endpoint (/api/jobs/:jobId)
router.get('/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const baseUrl = getPublicBaseUrl(req);
  const job = jobsStore.get(jobId);

  if (!job) {
    return res.status(404).json({ error: `Job with ID ${jobId} not found.` });
  }

  const normalizedJob = job.outputFilename ? {
    ...job,
    outputUrl: `${baseUrl}/exports/${job.outputFilename}`
  } : job;

  res.json(normalizedJob);
});

// Delete Single Job (/api/jobs/:jobId)
router.delete('/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobsStore.get(jobId);

  if (!job) {
    return res.status(404).json({ error: `Nie znaleziono zadania ${jobId}` });
  }

  if (job.outputFilename) {
    const filePath = path.join(EXPORTS_DIR, job.outputFilename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn(`Nie można usunąć pliku MP4 ${filePath}:`, (e as Error).message);
      }
    }
  }

  jobsStore.delete(jobId);
  saveJobsToDisk();

  res.json({ success: true, message: `Zadanie ${jobId} zostało usunięte z historii.` });
});

// Clear Jobs History (/api/jobs)
router.delete('/jobs', (req, res) => {
  const mode = req.query.mode;
  if (mode === 'all') {
    jobsStore.clear();
  } else {
    for (const [id, job] of jobsStore.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        jobsStore.delete(id);
      }
    }
  }
  saveJobsToDisk();
  res.json({ success: true, message: 'Historia renderowania została pomyślnie wyczyszczona.' });
});

// Bankier.pl News Cache
interface BankierCacheEntry {
  timestamp: number;
  articles: Array<{
    id: string;
    title: string;
    link: string;
    description: string;
    imageUrl?: string | null;
    pubDate: string;
    formattedDate: string;
    category: string;
  }>;
}
const bankierCache = new Map<string, BankierCacheEntry>();
const BANKIER_CACHE_TTL = 3 * 60 * 1000; // 3 minuty

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function formatPolishRelativeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');

    if (isToday) return `Dziś, ${hours}:${minutes}`;
    if (isYesterday) return `Wczoraj, ${hours}:${minutes}`;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}, ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

// Bankier.pl Latest News Endpoint (/api/news/bankier)
router.get('/news/bankier', async (req, res) => {
  const category = (req.query.category as string) || 'wiadomosci';
  const forceRefresh = req.query.refresh === 'true';

  const validCategories: Record<string, string> = {
    wiadomosci: 'https://www.bankier.pl/rss/wiadomosci.xml',
    gielda: 'https://www.bankier.pl/rss/gielda.xml',
    waluty: 'https://www.bankier.pl/rss/waluty.xml'
  };

  const feedUrl = validCategories[category] || validCategories.wiadomosci;
  const now = Date.now();
  const cached = bankierCache.get(category);

  if (!forceRefresh && cached && (now - cached.timestamp < BANKIER_CACHE_TTL)) {
    return res.json({
      success: true,
      category,
      cached: true,
      count: cached.articles.length,
      lastUpdated: new Date(cached.timestamp).toISOString(),
      articles: cached.articles
    });
  }

  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`Bankier.pl zwrócił status HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];

    const articles = itemMatches.map((itemXml, index) => {
      const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/s);
      const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/link>/s);
      const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/description>/s);
      const pubDateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/pubDate>/s);

      let rawTitle = (titleMatch ? (titleMatch[1] || titleMatch[2]) : '').trim();
      let link = (linkMatch ? (linkMatch[1] || linkMatch[2]) : '').trim();
      let rawDesc = (descMatch ? (descMatch[1] || descMatch[2]) : '').trim();
      let pubDate = (pubDateMatch ? (pubDateMatch[1] || pubDateMatch[2]) : '').trim();

      // Extract high quality thumbnail image from CDATA if present
      const imgMatch = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i);
      const imageUrl = imgMatch ? imgMatch[1] : null;

      // Clean HTML tags and entities
      const title = decodeHtmlEntities(rawTitle.replace(/<[^>]*>?/gm, ''));
      const description = decodeHtmlEntities(rawDesc.replace(/<[^>]*>?/gm, '')).trim();

      // Clean tracking parameters from link
      const cleanLink = link.split('?')[0];

      return {
        id: `bankier-${category}-${index}-${Date.now()}`,
        title,
        link: cleanLink || link,
        description,
        imageUrl,
        pubDate,
        formattedDate: formatPolishRelativeDate(pubDate),
        category: category === 'gielda' ? 'Giełda' : category === 'waluty' ? 'Waluty' : 'Wiadomości'
      };
    });

    if (articles.length > 0) {
      bankierCache.set(category, {
        timestamp: now,
        articles
      });
    }

    res.json({
      success: true,
      category,
      cached: false,
      count: articles.length,
      lastUpdated: new Date(now).toISOString(),
      articles
    });
  } catch (err) {
    console.warn('[Bankier RSS] Ostrzeżenie pobierania kanału RSS:', (err as Error).message);

    // If cache exists even if expired, return it
    if (cached && cached.articles.length > 0) {
      return res.json({
        success: true,
        category,
        cached: true,
        stale: true,
        count: cached.articles.length,
        lastUpdated: new Date(cached.timestamp).toISOString(),
        articles: cached.articles
      });
    }

    // Fallback static finance topics from Bankier
    const fallbackArticles = [
      {
        id: 'bankier-fb-1',
        title: 'Decyzje banków centralnych i stopy procentowe: Co czeka kredytobiorców?',
        link: 'https://www.bankier.pl',
        description: 'Eksperci analizują najnowsze posiedzenia RPP oraz Fed i ich bezpośredni wpływ na raty kredytów hipotecznych i inflację.',
        imageUrl: 'https://galeria.bankier.pl/p/4/c/1bedddea43a158-948-568-0-180-4000-2399.jpg',
        pubDate: new Date().toISOString(),
        formattedDate: 'Dziś, najnowsze',
        category: 'Gospodarka'
      },
      {
        id: 'bankier-fb-2',
        title: 'Szef BlackRock o megatrendzie sztucznej inteligencji: Największy boom inwestycyjny w historii',
        link: 'https://www.bankier.pl',
        description: 'Rozwój infrastruktury AI, centrów danych i zielonej energii przyciąga bezprecedensowe kapitały na światowych giełdach.',
        imageUrl: 'https://galeria.bankier.pl/p/3/3/aa9e75265055d0-948-568-0-8-3500-2099.jpg',
        pubDate: new Date().toISOString(),
        formattedDate: 'Dziś, gorące',
        category: 'Inwestycje'
      },
      {
        id: 'bankier-fb-3',
        title: 'Kurs złotego, dolara i euro: Co decyduje o sile polskiej waluty w tym kwartale?',
        link: 'https://www.bankier.pl',
        description: 'Notowania walut reagują na odczyty PMI oraz globalny sentyment do rynków wschodzących.',
        imageUrl: null,
        pubDate: new Date().toISOString(),
        formattedDate: 'Dziś, waluty',
        category: 'Rynki'
      }
    ];

    res.json({
      success: true,
      category,
      cached: false,
      fallback: true,
      count: fallbackArticles.length,
      lastUpdated: new Date().toISOString(),
      articles: fallbackArticles
    });
  }
});

// Grounded Bankier Cache
interface GroundedCacheEntry {
  timestamp: number;
  data: {
    success: boolean;
    model: string;
    queryTime: string;
    headlines: any[];
    groundingSources: any[];
    searchQueries: string[];
    cached?: boolean;
    fallback?: boolean;
    quotaCooldown?: boolean;
    notice?: string;
  };
}

let groundedBankierCache: GroundedCacheEntry | null = null;
const GROUNDED_CACHE_TTL = 3 * 60 * 1000; // 3 minuty
let geminiSearchQuotaExhaustedUntil = 0; // Cooldown timestamp when 429 is hit

// Helper to pull live articles from Bankier.pl RSS when Gemini Search quota is exceeded
async function getLiveBankierGroundedFallbacks(topicQuery?: string): Promise<{
  headlines: any[];
  sources: { title: string; url: string }[];
}> {
  try {
    const rssRes = await fetch('https://www.bankier.pl/rss/wiadomosci.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (rssRes.ok) {
      const xml = await rssRes.text();
      const rawMatches = xml.match(/<item>[\s\S]*?<\/item>/g);
      const itemMatches: string[] = rawMatches ? Array.from(rawMatches) : [];

      if (itemMatches.length > 0) {
        let selectedItems: string[] = itemMatches;
        if (topicQuery && topicQuery.trim()) {
          const tq = topicQuery.toLowerCase().trim();
          const filtered = itemMatches.filter(item => item.toLowerCase().includes(tq));
          if (filtered.length > 0) selectedItems = filtered;
        }

        const headlines = selectedItems.slice(0, 3).map((itemXml, idx) => {
          const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/s);
          const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/link>/s);
          const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/description>/s);
          const pubDateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/pubDate>/s);

          const rawTitle = (titleMatch ? (titleMatch[1] || titleMatch[2]) : '').trim();
          const link = (linkMatch ? (linkMatch[1] || linkMatch[2]) : '').trim().split('?')[0];
          const rawDesc = (descMatch ? (descMatch[1] || descMatch[2]) : '').trim();
          const pubDate = (pubDateMatch ? (pubDateMatch[1] || pubDateMatch[2]) : '').trim();

          const title = decodeHtmlEntities(rawTitle.replace(/<[^>]*>?/gm, '')) || 'Wiadomości rynkowe z portalu Bankier.pl';
          const description = decodeHtmlEntities(rawDesc.replace(/<[^>]*>?/gm, '')).trim();

          // Select topic-tailored tags & hook
          const isGielda = title.toLowerCase().includes('akcj') || title.toLowerCase().includes('wig') || title.toLowerCase().includes('gpw') || title.toLowerCase().includes('spółk');
          const isWaluty = title.toLowerCase().includes('złot') || title.toLowerCase().includes('dolar') || title.toLowerCase().includes('euro') || title.toLowerCase().includes('kurs');

          const category = isGielda ? 'Giełda & GPW' : isWaluty ? 'Waluty & Forex' : 'Makroekonomia & Rynki';
          const keywords = isGielda
            ? ['stock exchange warsaw gpw trading', 'financial charts candlestick']
            : isWaluty
            ? ['currency exchange dollars euro banknotes', 'forex trading terminal']
            : ['stock market economy finance', 'business central bank trading'];

          return {
            id: `bankier-live-rss-${idx + 1}-${Date.now()}`,
            title,
            summary: description.slice(0, 240) || 'Najświeższe dane z gospodarki i rynków finansowych na bieżąco analizowane przez redakcję.',
            category,
            sourceUrl: link || 'https://www.bankier.pl',
            pubDate: formatPolishRelativeDate(pubDate) || 'Dziś, na żywo',
            keyTakeaway: 'Dane publikowane przez Bankier.pl wyznaczają nastroje inwestorów i kierunek handlu na GPW.',
            suggestedSearchKeywords: keywords,
            suggestedHook: title,
            isGrounded: true
          };
        });

        const sources = headlines.map(h => ({
          title: h.title,
          url: h.sourceUrl
        }));

        return { headlines, sources };
      }
    }
  } catch (err) {
    console.warn('[Bankier Grounding] Kanał RSS niedostępny w danej chwili, użycie zweryfikowanej bazy nagłówków:', (err as Error).message);
  }

  // Curated high quality baseline
  return {
    headlines: [
      {
        id: `bankier-live-curated-1`,
        title: 'Decyzje Rady Polityki Pieniężnej i stóp procentowych: Scenariusze dla kredytobiorców i złotego',
        summary: 'Analitycy Bankier.pl oceniają wpływ najnowszych odczytów inflacji bazowej i perspektyw cięć stóp procentowych na rynek finansowy.',
        category: 'Makroekonomia & RPP',
        sourceUrl: 'https://www.bankier.pl/gospodarka/wskazniki-makroekonomiczne/stopy-procentowe-rpp',
        pubDate: 'Dziś, na żywo',
        keyTakeaway: 'Utrzymanie stóp bez zmian stabilizuje raty, lecz przedłuża wysoki koszt kapitału dla przedsiębiorstw.',
        suggestedSearchKeywords: ['central bank gold interest rate', 'stock market economy'],
        suggestedHook: 'Decyzja RPP może bezpośrednio zmienić koszt Twojego kredytu w tym kwartale.',
        isGrounded: true
      },
      {
        id: `bankier-live-curated-2`,
        title: 'Giełda Papierów Wartościowych: WIG20 reaguje na wyniki spółek technologicznych i energetycznych',
        summary: 'Inwestorzy instytucjonalni na GPW dokonują rebalansingu portfeli w odpowiedzi na globalne trendy na Wall Street.',
        category: 'Giełda & GPW',
        sourceUrl: 'https://www.bankier.pl/gielda',
        pubDate: 'Dziś, na żywo',
        keyTakeaway: 'Największe spółki z udziałem Skarbu Państwa oraz banki wyznaczają kierunek indeksu szerokiego rynku.',
        suggestedSearchKeywords: ['stock exchange warsaw gpw trading', 'financial charts candlestick'],
        suggestedHook: 'Zagraniczny kapitał wraca na warszawski parkiet – zobacz co napędza indeks WIG20.',
        isGrounded: true
      },
      {
        id: `bankier-live-curated-3`,
        title: 'Rynek walutowy: Kurs euro, dolara i franka w obliczu globalnego sentymentu do rynków wschodzących',
        summary: 'Notowania złotego podlegają wahaniom w relacji do rentowności obligacji skarbowych USA i eurodolara.',
        category: 'Waluty & Forex',
        sourceUrl: 'https://www.bankier.pl/waluty',
        pubDate: 'Dziś, na żywo',
        keyTakeaway: 'Kluczowe poziomy wsparcia dla EUR/PLN i USD/PLN decydują o kosztach importu surowców.',
        suggestedSearchKeywords: ['currency exchange dollars euro banknotes', 'forex trading terminal'],
        suggestedHook: 'Polska waluta testuje kluczowe poziomy oporu – oto co decyduje o sile złotego.',
        isGrounded: true
      }
    ],
    sources: [
      { title: 'Bankier.pl - Wiadomości Finansowe', url: 'https://www.bankier.pl' },
      { title: 'Bankier.pl - Notowania Giełdowe', url: 'https://www.bankier.pl/gielda' }
    ]
  };
}

// Handler for Grounded Bankier news (supports GET & POST)
async function handleGroundedBankierRequest(req: any, res: any) {
  const forceRefresh = req.query.refresh === 'true' || req.body?.refresh === true;
  const queryTopic = (req.query.topic as string) || req.body?.topic || '';
  const now = Date.now();

  // Return active cache if valid
  if (!forceRefresh && !queryTopic && groundedBankierCache && (now - groundedBankierCache.timestamp < GROUNDED_CACHE_TTL)) {
    return res.json({
      ...groundedBankierCache.data,
      cached: true
    });
  }

  // If Gemini API quota (429) was hit recently, use fast live Bankier RSS to avoid repeated 429 failures
  if (now < geminiSearchQuotaExhaustedUntil && !forceRefresh) {
    console.warn('[Bankier Grounding] Aktywny limit zapytań AI (429 cooldown). Serwowanie bezpośrednich danych z kanału Bankier.pl.');
    const liveRssData = await getLiveBankierGroundedFallbacks(queryTopic);
    const payload = {
      success: true,
      model: 'bankier-live-rss',
      queryTime: new Date().toISOString(),
      headlines: liveRssData.headlines,
      groundingSources: liveRssData.sources,
      searchQueries: [queryTopic ? `Bankier.pl ${queryTopic}` : 'Bankier.pl najnowsze wiadomości gospodarka giełda'],
      cached: false,
      fallback: true,
      quotaCooldown: true,
      notice: 'Wiadomości z portalu Bankier.pl załadowane w czasie rzeczywistym przez bezpośredni kanał informacyjny.'
    };
    if (!queryTopic) {
      groundedBankierCache = { timestamp: now, data: payload };
    }
    return res.json(payload);
  }

  try {
    const searchPrompt = queryTopic
      ? `Użyj narzędzia Google Search, aby przeszukać portal Bankier.pl (https://www.bankier.pl) pod kątem najnowszych wiadomości na temat: "${queryTopic}". Znajdź 3 najbardziej aktualne i najważniejsze nagłówki/artykuły finansowo-gospodarcze z Bankier.pl.`
      : `Użyj narzędzia Google Search, aby przeszukać portal Bankier.pl (https://www.bankier.pl) i znaleźć 3 najświeższe, najważniejsze artykuły i nagłówki z ostatnich godzin/dni dotyczące rynków finansowych, giełdy GPW, gospodarki Polski, inflacji, stóp procentowych, wyników spółek lub walut.`;

    const fullPrompt = `${searchPrompt}

Zwróć DOKŁADNIE 3 najnowsze artykuły w czystym formacie JSON bez zbędnych dopisków. Każdy artykuł musi odnosić się do rzeczywistego materiału z Bankier.pl.

Schemat JSON:
{
  "headlines": [
    {
      "id": "bankier-grounded-1",
      "title": "Dokładny tytuł artykułu z Bankier.pl",
      "summary": "2-3 konkretne, zwięzłe zdania podsumowujące kluczowe fakty, liczby i kontekst.",
      "category": "Giełda & Spółki / Makroekonomia / Waluty / Gospodarka / Biznes",
      "sourceUrl": "Link do artykułu lub strony na Bankier.pl",
      "pubDate": "Dzisiaj / Ostatnie godziny / Data publikacji",
      "keyTakeaway": "Główny analityczny wniosek przydatny do narracji wideo lektora",
      "suggestedSearchKeywords": ["angielskie hasło do Pexels 1", "angielskie hasło do Pexels 2"],
      "suggestedHook": "Mocne, merytoryczne zdanie otwierające (hook) do filmu krótkometrażowego"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: fullPrompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const responseText = response.text || '';
    
    // Extract search grounding metadata
    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const webSearchQueries = groundingMetadata?.webSearchQueries || [];
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const groundingSources: { title: string; url: string }[] = [];
    
    if (Array.isArray(groundingChunks)) {
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) {
          groundingSources.push({
            title: chunk.web.title || 'Bankier.pl',
            url: chunk.web.uri
          });
        }
      }
    }

    // Parse JSON from response
    let parsedHeadlines: any[] = [];
    try {
      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed.headlines)) {
        parsedHeadlines = parsed.headlines;
      } else if (Array.isArray(parsed)) {
        parsedHeadlines = parsed;
      }
    } catch (parseErr) {
      const jsonMatch = responseText.match(/\{[\s\S]*"headlines"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.headlines)) parsedHeadlines = parsed.headlines;
        } catch (_) {}
      }
    }

    // Ensure we have 3 formatted headlines
    let finalHeadlines = (parsedHeadlines.length > 0 ? parsedHeadlines.slice(0, 3) : []).map((h, idx) => {
      const matchedSource = groundingSources[idx] || groundingSources[0];
      return {
        id: h.id || `bankier-grounded-${idx + 1}-${Date.now()}`,
        title: h.title || 'Najnowsza analiza rynkowa z portalu Bankier.pl',
        summary: h.summary || 'Kluczowe dane makroekonomiczne i rynkowe zebrane w najnowszej publikacji.',
        category: h.category || 'Finanse & Biznes',
        sourceUrl: h.sourceUrl && h.sourceUrl.startsWith('http') ? h.sourceUrl : (matchedSource?.url || 'https://www.bankier.pl'),
        pubDate: h.pubDate || 'Dziś, na żywo',
        keyTakeaway: h.keyTakeaway || 'Wahania rynkowe i reakcje inwestorów na nowe dane.',
        suggestedSearchKeywords: Array.isArray(h.suggestedSearchKeywords) ? h.suggestedSearchKeywords : ['finance trading chart', 'stock market business'],
        suggestedHook: h.suggestedHook || h.title || 'Oto co wydarzyło się na rynkach.',
        isGrounded: true
      };
    });

    // If search returned fewer than 3, supplement with live RSS
    if (finalHeadlines.length < 3) {
      const liveSupplement = await getLiveBankierGroundedFallbacks(queryTopic);
      for (const sup of liveSupplement.headlines) {
        if (finalHeadlines.length >= 3) break;
        finalHeadlines.push(sup);
      }
    }

    const payload = {
      success: true,
      model: 'gemini-3.8-flash',
      queryTime: new Date().toISOString(),
      headlines: finalHeadlines,
      groundingSources: groundingSources.slice(0, 6),
      searchQueries: webSearchQueries.length > 0 ? webSearchQueries : [queryTopic ? `Bankier.pl ${queryTopic}` : 'Bankier.pl aktualności rynkowe'],
      cached: false
    };

    if (!queryTopic) {
      groundedBankierCache = {
        timestamp: now,
        data: payload
      };
    }

    return res.json(payload);
  } catch (err: any) {
    const errMsg = String(err?.message || '');
    const errStatus = err?.status;
    const isQuotaExhausted =
      errStatus === 429 ||
      errStatus === 'RESOURCE_EXHAUSTED' ||
      errMsg.includes('429') ||
      errMsg.includes('quota') ||
      errMsg.includes('RESOURCE_EXHAUSTED') ||
      errMsg.includes('rate-limit');

    if (isQuotaExhausted) {
      geminiSearchQuotaExhaustedUntil = Date.now() + 5 * 60 * 1000; // 5 min cooldown
      console.warn('[Bankier Grounding] Limit zapytań Google Search (429 RESOURCE_EXHAUSTED). Płynne przełączenie na bezpośrednie dane Bankier.pl RSS.');
    } else {
      console.warn('[Bankier Grounding] Informacja o zapytaniu Search Grounding:', errMsg.slice(0, 100));
    }

    // Gracefully fetch real live articles directly from Bankier.pl RSS
    const liveData = await getLiveBankierGroundedFallbacks(queryTopic);
    const fallbackResponse = {
      success: true,
      model: 'bankier-live-rss',
      queryTime: new Date().toISOString(),
      fallback: true,
      quotaCooldown: isQuotaExhausted,
      notice: isQuotaExhausted
        ? 'Przełączono na bezpośredni kanał wiadomości Bankier.pl w czasie rzeczywistym.'
        : 'Wyszukiwanie AI chwilowo niedostępne. Załadowano najświeższe wiadomości z Bankier.pl.',
      headlines: liveData.headlines,
      groundingSources: liveData.sources,
      searchQueries: [queryTopic ? `Bankier.pl ${queryTopic}` : 'Bankier.pl najnowsze wiadomości gospodarka giełda']
    };

    if (!queryTopic) {
      groundedBankierCache = {
        timestamp: now,
        data: fallbackResponse
      };
    }

    return res.json(fallbackResponse);
  }
}

// Google Search Grounded Bankier.pl Endpoint (/api/news/grounded-bankier)
router.get('/news/grounded-bankier', handleGroundedBankierRequest);
router.post('/news/grounded-bankier', handleGroundedBankierRequest);


// Mount API router
app.use('/api', router);

// Start Express + Vite Server
async function startServer() {
  loadJobsFromDisk();
  ensureMontserratFont().catch(console.error);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Video Combiner Express Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
