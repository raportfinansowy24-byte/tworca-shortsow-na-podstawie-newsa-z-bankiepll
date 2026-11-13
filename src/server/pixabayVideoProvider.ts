import { scorePexelsCandidate } from '../utils/financeSceneMatching';

export const PIXABAY_INTERNAL_ID_OFFSET = 1_000_000_000_000;

export interface PixabayVideoSearchOptions {
  query: string;
  context?: string;
  sceneIndex?: number;
  avoidVideoIds?: number[];
  requireTopicMatch?: boolean;
  /** Permit a scene-term match when category tags are absent; image QA remains mandatory. */
  allowBroadSceneMatch?: boolean;
  targetDurationSeconds?: number;
}

export interface PixabayStockCandidate {
  id: number;
  videoUrl: string;
  thumbnailUrl: string;
  searchKeyword: string;
  selectionScore: number;
  source: 'pixabay';
  pexelsId: number;
  pixabayId: number;
  stockId: string;
  sourcePageUrl: string;
  width: number;
  height: number;
  duration: number;
  photographer?: string;
  photographerUrl?: string;
  previewImageUrls: string[];
}

export function pixabayIdToInternalStockId(value: unknown): number | null {
  const id = Number(value);
  const namespaced = PIXABAY_INTERNAL_ID_OFFSET + id;
  return Number.isSafeInteger(id) && id > 0 && Number.isSafeInteger(namespaced)
    ? namespaced
    : null;
}

export function isTrustedPixabayMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      (url.hostname === 'pixabay.com' || url.hostname.endsWith('.pixabay.com'));
  } catch {
    return false;
  }
}

export function mapPixabayVideoCandidates(
  payload: unknown,
  options: PixabayVideoSearchOptions
): PixabayStockCandidate[] {
  const hits = (payload as { hits?: unknown } | null)?.hits;
  if (!Array.isArray(hits)) return [];

  const query = String(options.query || '').trim().slice(0, 100);
  const context = String(options.context || '').trim();
  const sceneIndex = options.sceneIndex ?? 0;
  const targetDuration = options.targetDurationSeconds ?? 10;
  const avoidIds = new Set(options.avoidVideoIds || []);
  const candidates: PixabayStockCandidate[] = [];

  for (const raw of hits) {
    if (!raw || typeof raw !== 'object') continue;
    const hit = raw as Record<string, any>;
    const internalId = pixabayIdToInternalStockId(hit.id);
    const pixabayId = Number(hit.id);
    if (!internalId || avoidIds.has(internalId)) continue;

    const pageUrl = String(hit.pageURL || '');
    if (!isTrustedPixabayMediaUrl(pageUrl)) continue;

    const tags = String(hit.tags || '');
    const slug = `${tags} ${pageUrl}`.toLowerCase();
    const relevance = scorePexelsCandidate(context || query, query, slug);
    const broadSceneMatches = query.toLowerCase().split(/\s+/).filter((token) => token.length >= 3 && slug.toLowerCase().includes(token));
    const broadSceneMatch = options.allowBroadSceneMatch === true && broadSceneMatches.length > 0 && relevance.forbiddenMatches.length === 0;
    if ((options.requireTopicMatch || context) && !relevance.relevant && !broadSceneMatch) continue;

    const hasNegative = /\b(?:eraser|writing notes|taking notes|gymnast|workout|unrelated crypto)\b/i.test(slug);
    if (hasNegative) continue;

    const renditions = hit.videos && typeof hit.videos === 'object'
      ? Object.values(hit.videos as Record<string, any>)
      : [];
    const verticalFiles = renditions
      .filter((file: any) =>
        file && typeof file.url === 'string' && isTrustedPixabayMediaUrl(file.url) &&
        Number.isFinite(Number(file.width)) && Number.isFinite(Number(file.height)) &&
        ((Number(file.height) > Number(file.width) && Number(file.width) >= 540 && Number(file.height) >= 960) ||
          (Number(file.width) > Number(file.height) && Number(file.width) >= 1280 && Number(file.height) >= 720))
      )
      .sort((a: any, b: any) => {
        const aResolution = Number(a.width) * Number(a.height);
        const bResolution = Number(b.width) * Number(b.height);
        return bResolution - aResolution;
      });
    const file = verticalFiles[0];
    const duration = Number(hit.duration);
    if (!file || !Number.isFinite(duration) || duration < 3 || duration > 120) continue;

    const thumbnailUrls = [...new Set(
      renditions.map((item: any) => String(item?.thumbnail || '')).filter((url: string) => isTrustedPixabayMediaUrl(url))
    )].slice(0, 2);
    if (thumbnailUrls.length === 0) continue;

    let selectionScore = 50 + (relevance.relevant ? relevance.score : Math.min(3, broadSceneMatches.length) * 30);
    // Prefer native portrait clips. Landscape clips remain a last-resort fallback
    // and must pass visual QA for the renderer's center-cropped 9:16 frame.
    if (Number(file.height) > Number(file.width)) selectionScore += 35;
    else selectionScore -= 25;
    if (duration >= 6 && duration <= 35) selectionScore += 18;
    selectionScore += Math.max(0, 12 - Math.min(12, Math.abs(duration - targetDuration)));
    if (Number(file.height) >= 1920) selectionScore += 16;
    for (const term of ['timelapse', 'hyperlapse', 'dynamic', 'trading', 'charts', 'aerial', 'drone', 'cash', 'traffic', 'animation']) {
      if (slug.includes(term)) selectionScore += 2;
    }

    const username = String(hit.user || '').trim();
    const userId = Number(hit.user_id);
    const photographerUrl = username && Number.isSafeInteger(userId) && userId > 0
      ? `https://pixabay.com/users/${encodeURIComponent(username)}-${userId}/`
      : undefined;

    candidates.push({
      id: internalId,
      videoUrl: String(file.url),
      thumbnailUrl: thumbnailUrls[0],
      searchKeyword: query,
      selectionScore,
      source: 'pixabay',
      pexelsId: internalId,
      pixabayId,
      stockId: `pixabay:${pixabayId}`,
      sourcePageUrl: pageUrl,
      width: Number(file.width),
      height: Number(file.height),
      duration,
      photographer: username || undefined,
      photographerUrl,
      previewImageUrls: thumbnailUrls
    });
  }

  return candidates.sort((a, b) => b.selectionScore - a.selectionScore);
}
