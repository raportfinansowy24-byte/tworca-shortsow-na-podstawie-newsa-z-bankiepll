export type BoardWordTiming = { word: string; start: number; end: number };
export interface HighlightBoardOptions {
  enabled?: boolean;
  position?: 'bottom' | 'center' | 'top';
  fontSize?: number;
  fontColor?: string;
  highlightColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
  shadow?: number;
  maxLines?: number;
  minWords?: number;
  maxWords?: number;
}
const FINANCE_TERMS = /\b(mln|mld|zł|procent|proc\.?|wzrost|spadek|zysk|strata|rekord|obniż|podwyż|wynik|rata|inflac|stopy|dywidend|przychod|kurs|akcji|bank|rpp|wig\d*)/iu;
const norm = (s: string) => s.toLocaleLowerCase('pl-PL').replace(/[^\p{L}\p{N}%.,+-]/gu, '');
const assColor = (hex: string, fallback: string) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!match) return fallback;
  const rgb = match[1];
  return `&H00${rgb.slice(4, 6)}${rgb.slice(2, 4)}${rgb.slice(0, 2)}&`;
};
const fmt = (s: number) => {
  const t = Math.max(0, s); const h = Math.floor(t / 3600); const m = Math.floor((t % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}.${String(Math.floor(t * 100) % 100).padStart(2, '0')}`;
};
function pickPhrase(words: string[], minWords: number, maxWords: number): { start: number; end: number } | null {
  if (words.length < minWords) return null;
  let best: { start: number; end: number; score: number } | null = null;
  for (let start = 0; start < words.length; start++) for (let count = minWords; count <= maxWords && start + count <= words.length; count++) {
    const end = start + count;
    const phrase = words.slice(start, end).join(' ');
    let score = 0;
    if (/\d/.test(phrase)) score += 5;
    if (FINANCE_TERMS.test(phrase)) score += 3;
    if (/[?!]/.test(phrase)) score += 1;
    if (count >= 3 && count <= 5) score += 1;
    // Avoid arbitrary consecutive transcript when it contains no salient fact.
    if (score > 0 && (!best || score > best.score || (score === best.score && count < best.end - best.start))) best = { start, end, score };
  }
  return best ? { start: best.start, end: best.end } : null;
}
export function generateHighlightBoardAss(text: string, duration: number, timings: BoardWordTiming[], options: HighlightBoardOptions = {}): string {
  if (options.enabled === false) return '';
  const words = text.trim().replace(/[\r\n]+/g, ' ').split(/\s+/u).filter(Boolean);
  const minWords = Math.max(3, Math.min(6, options.minWords ?? 3));
  const maxWords = Math.max(minWords, Math.min(6, options.maxWords ?? 6));
  // Boards must have real alignment: no character-count or duration-proportional fallback.
  if (!words.length || timings.length !== words.length || !timings.every((t, i) => norm(t.word) === norm(words[i]) && Number.isFinite(t.start) && Number.isFinite(t.end) && t.end > t.start)) return '';
  const phrase = pickPhrase(words, minWords, maxWords);
  if (!phrase) return '';
  const selected = words.slice(phrase.start, phrase.end);
  const start = Math.max(0, timings[phrase.start].start);
  const end = Math.min(duration, timings[phrase.end - 1].end);
  if (end <= start) return '';
  const position = options.position || 'bottom';
  const alignment = position === 'top' ? 8 : position === 'center' ? 5 : 2;
  // Platform-safe bottom region: keep clear of bottom UI and leave side margins.
  const marginV = position === 'top' ? 190 : position === 'center' ? 0 : 300;
  const fontSize = Math.max(28, Math.min(90, Math.round(options.fontSize ?? 62)));
  const outline = Math.max(1, Math.min(12, Math.round(options.outlineWidth ?? 5)));
  const shadow = Math.max(0, Math.min(8, Math.round(options.shadow ?? 2)));
  const normalColor = assColor(options.fontColor || '#ffffff', '&H00FFFFFF&');
  const redColor = assColor(options.highlightColor || '#ff3030', '&H003030FF&');
  const outlineColor = assColor(options.outlineColor || '#000000', '&H00000000&');
  const safeToken = (w: string) => w.replace(/[{}\\]/g, '').toLocaleUpperCase('pl-PL');
  const maxLines = Math.max(1, Math.min(2, Math.round(options.maxLines ?? 2)));
  const perLine = Math.ceil(selected.length / maxLines);
  const highlighted = selected.map((w, i) => /\d|%|zł|proc/i.test(w) ? i : -1).filter((i) => i >= 0).slice(0, 2);
  if (!highlighted.length) {
    const termIndex = selected.findIndex((w) => FINANCE_TERMS.test(w));
    if (termIndex >= 0) highlighted.push(termIndex);
  }
  const displayTokens = selected.map((w, i) => `${highlighted.includes(i) ? `{\\c${redColor}}` : `{\\c${normalColor}}`}${safeToken(w)}`);
  const lines: string[] = [];
  for (let i = 0; i < displayTokens.length; i += perLine) lines.push(displayTokens.slice(i, i + perLine).join(' '));
  const wrapped = lines.join('\\N');
  const eventEnd = Math.max(start + 0.12, end);
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: 720\nPlayResY: 1280\nScaledBorderAndShadow: yes\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: FactBoard,Anton,${fontSize},${normalColor},${normalColor},${outlineColor},&H80000000&,-1,0,0,0,100,100,0,0,1,${outline},${shadow},${alignment},60,60,${marginV},1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,${fmt(start)},${fmt(eventEnd)},FactBoard,,0,0,0,,${wrapped}\n`;
}
