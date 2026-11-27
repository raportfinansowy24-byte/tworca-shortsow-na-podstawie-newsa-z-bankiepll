import type { CaptionStyle, Scene } from '../types';

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function asText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function safeMediaUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) return '';
  const candidate = value.trim();
  if (!candidate) return '';
  if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate;
  try {
    const url = new URL(candidate);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
      ? candidate
      : '';
  } catch {
    return '';
  }
}

function isSafePreviewSvg(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 80_000 || !/<svg[\s>]/i.test(value)) return false;
  return !/<script\b|<foreignObject\b|\son[a-z]+\s*=|(?:href|xlink:href)\s*=\s*["']\s*(?:javascript:|data:)/i.test(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeCaptionStyle(value: unknown): CaptionStyle {
  const style = asObject(value);
  const colors = ['yellow', 'green', 'lime', 'cyan', 'red', 'white'];
  const validColor = (candidate: unknown): string | undefined => {
    if (typeof candidate !== 'string') return undefined;
    const color = candidate.trim();
    return color.length <= 48 && /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\))$/i.test(color) ? color : undefined;
  };
  const position = ['top', 'center', 'bottom'].includes(String(style.position))
    ? style.position as CaptionStyle['position']
    : 'bottom';
  const alignment = ['left', 'center', 'right'].includes(String(style.alignment))
    ? style.alignment as CaptionStyle['alignment']
    : 'center';
  const animation = ['word-by-word', 'single-word', 'karaoke', 'classic'].includes(String(style.animation))
    ? style.animation as CaptionStyle['animation']
    : 'classic';
  const highlightColor = colors.includes(String(style.highlightColor))
    ? style.highlightColor as CaptionStyle['highlightColor']
    : 'red';
  const boxColor = typeof style.boxColor === 'string' && /^[a-z]{3,20}@(0|1|0?\.\d{1,2})$/i.test(style.boxColor)
    ? style.boxColor
    : validColor(style.boxColor);
  return {
    fontSize: Math.max(14, Math.min(110, finiteNumber(style.fontSize) ?? 68)),
    fontColor: validColor(style.fontColor) || 'white',
    outlineColor: validColor(style.outlineColor) || 'black',
    outlineWidth: Math.max(0, Math.min(24, finiteNumber(style.outlineWidth) ?? 5)),
    boxColor,
    position,
    alignment,
    animation,
    highlightColor
  };
}

export function normalizeStoryboardScenes(rawScenes: unknown[], jobId = 'draft'): Scene[] {
  return rawScenes.slice(0, 50).flatMap((rawScene, index) => {
    const raw = asObject(rawScene);
    const videoUrl = safeMediaUrl(raw.videoUrl ?? raw.video_url ?? raw.url);
    const thumbnailUrl = safeMediaUrl(raw.thumbnailUrl ?? raw.thumbnail_url);
    const imageUrl = safeMediaUrl(raw.imageUrl ?? raw.image_url);
    const rawSvg = raw.visualSvg;
    const visualSvg = isSafePreviewSvg(rawSvg) ? rawSvg : undefined;
    const trimStart = Math.max(0, finiteNumber(raw.trimStart ?? raw.trim_start) ?? 0);
    const trimEndValue = finiteNumber(raw.trimEnd ?? raw.trim_end);
    const trimEnd = trimEndValue !== undefined && trimEndValue > trimStart ? trimEndValue : undefined;
    const declaredDuration = finiteNumber(raw.duration);
    const duration = declaredDuration && declaredDuration > 0 && declaredDuration <= 120
      ? declaredDuration
      : trimEnd !== undefined
        ? Math.max(0.25, trimEnd - trimStart)
        : 2.25;
    const subtitles = asText(raw.subtitles, raw.title, raw.caption, raw.text, raw.voiceoverText, raw.voiceover_text)
      .slice(0, 700);
    const voiceoverText = asText(raw.voiceoverText, raw.voiceover_text, raw.voiceover, subtitles).slice(0, 1200);
    const visualMode = raw.visualMode === 'data_visual' || raw.visualMode === 'matched_clip'
      ? raw.visualMode
      : visualSvg
        ? 'data_visual'
        : videoUrl
          ? 'matched_clip'
          : undefined;
    if (!subtitles && !videoUrl && !thumbnailUrl && !imageUrl && !visualSvg) return [];
    return [{
      id: asText(raw.id) || `${jobId}-scene-${index + 1}`,
      videoUrl,
      thumbnailUrl: thumbnailUrl || undefined,
      imageUrl: imageUrl || undefined,
      duration,
      subtitles: subtitles || `SCENA ${index + 1}`,
      voiceover_text: voiceoverText || undefined,
      voiceoverText: voiceoverText || undefined,
      captionStyle: normalizeCaptionStyle(raw.captionStyle ?? raw.caption_style),
      trimStart,
      trimEnd,
      searchKeyword: asText(raw.searchKeyword, raw.search_keyword) || undefined,
      visualMode,
      visualSvg
    } satisfies Scene];
  });
}
