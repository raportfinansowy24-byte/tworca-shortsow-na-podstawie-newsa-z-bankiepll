import { isSafeFinanceDataVisualSvg } from './sceneContract';

type JsonObject = Record<string, unknown>;

function shortText(value: unknown, maxLength: number): string | undefined {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) || undefined : undefined;
}

function finiteNonNegative(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function safePreviewAssetUrl(value: unknown): string | undefined {
  const candidate = shortText(value, 2048);
  if (!candidate) return undefined;
  if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate;
  try {
    const url = new URL(candidate);
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) return undefined;
    return candidate;
  } catch {
    return undefined;
  }
}

function safeCaptionStyle(value: unknown): JsonObject | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const style = value as JsonObject;
  const result: JsonObject = {};
  const fontSize = style.fontSize;
  const outlineWidth = style.outlineWidth;
  if (typeof fontSize === 'number' && Number.isFinite(fontSize)) result.fontSize = Math.max(14, Math.min(110, fontSize));
  if (typeof outlineWidth === 'number' && Number.isFinite(outlineWidth)) result.outlineWidth = Math.max(0, Math.min(24, outlineWidth));
  const safeColor = (candidate: unknown, allowAlpha = false): string | undefined => {
    if (typeof candidate !== 'string') return undefined;
    const color = candidate.trim();
    const pattern = allowAlpha
      ? /^(#[0-9a-f]{3,8}|[a-z]{3,20}(?:@(?:0|1|0?\.\d{1,2}))?|rgba?\([\d\s.,%]+\))$/i
      : /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\))$/i;
    return color.length <= 48 && pattern.test(color) ? color : undefined;
  };
  const fontColor = safeColor(style.fontColor);
  const outlineColor = safeColor(style.outlineColor);
  const boxColor = safeColor(style.boxColor, true);
  if (fontColor) result.fontColor = fontColor;
  if (outlineColor) result.outlineColor = outlineColor;
  if (boxColor) result.boxColor = boxColor;
  if (['top', 'center', 'bottom'].includes(String(style.position))) result.position = style.position;
  if (['left', 'center', 'right'].includes(String(style.alignment))) result.alignment = style.alignment;
  if (['word-by-word', 'single-word', 'karaoke', 'classic'].includes(String(style.animation))) result.animation = style.animation;
  if (['yellow', 'green', 'lime', 'cyan', 'red', 'white'].includes(String(style.highlightColor))) result.highlightColor = style.highlightColor;
  return Object.keys(result).length ? result : undefined;
}

export function summarizeScenesForHistory(scenes: unknown[]): JsonObject[] {
  return scenes.slice(0, 50).map((rawScene, index) => {
    const scene = rawScene && typeof rawScene === 'object' && !Array.isArray(rawScene)
      ? rawScene as JsonObject
      : {};
    const rawPexelsId = scene.pexelsId ?? scene.pexels_id;
    const pexelsId = Number(rawPexelsId);
    const visualMode = scene.visualMode === 'data_visual' || scene.visualMode === 'matched_clip'
      ? scene.visualMode
      : undefined;
    const svg = typeof scene.visualSvg === 'string' ? scene.visualSvg.trim() : '';
    const safeSvg = svg.length <= 80_000 && isSafeFinanceDataVisualSvg(svg) ? svg : undefined;
    const trimStart = finiteNonNegative(scene.trimStart ?? scene.trim_start);
    const trimEnd = finiteNonNegative(scene.trimEnd ?? scene.trim_end);
    const duration = typeof scene.duration === 'number' && Number.isFinite(scene.duration) && scene.duration > 0
      ? Math.min(scene.duration, 120)
      : undefined;
    return {
      id: shortText(scene.id, 100) || `scene-${index + 1}`,
      index: index + 1,
      title: shortText(scene.title ?? scene.subtitles ?? scene.caption, 300),
      subtitles: shortText(scene.subtitles ?? scene.caption ?? scene.title, 300),
      voiceoverText: shortText(scene.voiceover_text ?? scene.voiceoverText, 700),
      searchKeyword: shortText(scene.searchKeyword ?? scene.search_keyword, 180),
      camera: shortText(scene.camera, 220),
      visualMood: shortText(scene.visualMood, 220),
      visualTitle: shortText(scene.visualTitle, 180),
      visualSubtitle: shortText(scene.visualSubtitle, 240),
      visualMode: visualMode || (safeSvg ? 'data_visual' : undefined),
      visualSvg: safeSvg,
      videoUrl: safePreviewAssetUrl(scene.videoUrl ?? scene.video_url),
      thumbnailUrl: safePreviewAssetUrl(scene.thumbnailUrl ?? scene.thumbnail_url),
      imageUrl: safePreviewAssetUrl(scene.imageUrl ?? scene.image_url),
      captionStyle: safeCaptionStyle(scene.captionStyle ?? scene.caption_style),
      trimStart,
      trimEnd,
      duration,
      source: shortText(scene.videoSource ?? scene.source, 80),
      pexelsId: Number.isFinite(pexelsId) && pexelsId > 0 ? pexelsId : undefined,
      pixabayId: Number.isSafeInteger(scene.pixabayId) && typeof scene.pixabayId === 'number' && scene.pixabayId > 0 ? scene.pixabayId : undefined,
      stockId: shortText(scene.stockId, 100),
      sourcePageUrl: safePreviewAssetUrl(scene.sourcePageUrl)
    };
  });
}
