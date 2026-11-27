export type KaraokeWordTiming = { word: string; start: number; end: number };

export interface KaraokeCaptionOptions {
  fontName?: string;
  fontSize?: number;
  activeColor?: string;
  inactiveColor?: string;
  outlineWidth?: number;
  glowOutlineWidth?: number;
  shadow?: number;
  marginV?: number;
}

export function generateKaraokeCaptionAss(
  text: string,
  duration: number,
  timings: KaraokeWordTiming[],
  options: KaraokeCaptionOptions = {},
): string {
  const words = text.trim().replace(/[\r\n]+/g, ' ').split(/\s+/u).filter(Boolean);
  if (!words.length || !Number.isFinite(duration) || duration <= 0 || timings.length !== words.length) return '';
  const normalize = (value: string) => value.toLocaleLowerCase('pl-PL').replace(/[^\p{L}\p{N}%.,+-]/gu, '');
  if (!timings.every((timing, index) =>
    normalize(timing.word) === normalize(words[index]) &&
    Number.isFinite(timing.start) && Number.isFinite(timing.end) &&
    timing.start >= 0 && timing.end > timing.start && timing.start < duration
  )) return '';

  const assTime = (seconds: number) => {
    const value = Math.max(0, seconds);
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const wholeSeconds = Math.floor(value % 60);
    const centiseconds = Math.floor((value * 100) % 100);
    return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(wholeSeconds).padStart(2, '0') + '.' + String(centiseconds).padStart(2, '0');
  };

  const safe = (word: string) => word.replace(/[{}\\]/g, '').toLocaleUpperCase('pl-PL');
  const font = (options.fontName || 'Montserrat Black').replace(/[,\r\n]/g, '');
  const size = Math.max(28, Math.min(110, Math.round(options.fontSize ?? 86)));
  const outline = Math.max(1, Math.min(24, Math.round(options.outlineWidth ?? 5)));
  const glowOutline = Math.max(1, Math.min(30, Math.round(options.glowOutlineWidth ?? 14)));
  const shadow = Math.max(0, Math.min(12, Math.round(options.shadow ?? 5)));
  const marginV = Math.max(0, Math.min(600, Math.round(options.marginV ?? 250)));
  const active = options.activeColor || '&H000000FF&';
  const inactive = options.inactiveColor || '&H00FFFFFF&';
  const line = words.map(safe);
  const events: string[] = [];

  timings.forEach((timing, index) => {
    const start = Math.max(0, timing.start);
    const end = Math.min(duration, timing.end);
    if (end <= start) return;
    const glow = line.map((word, wordIndex) => wordIndex === index
      ? '{\\c' + active + '\\3c' + active + '\\blur18\\bord' + glowOutline + '}' + word
      : '{\\alpha&HFF&}' + word + '{\\alpha&H00&}'
    ).join(' ');
    const caption = line.map((word, wordIndex) =>
      wordIndex === index ? '{\\c' + active + '}' + word + '{\\c' + inactive + '}' : word
    ).join(' ');
    events.push('Dialogue: 0,' + assTime(start) + ',' + assTime(end) + ',Glow,,0,0,0,,' + glow);
    events.push('Dialogue: 1,' + assTime(start) + ',' + assTime(end) + ',Caption,,0,0,0,,' + caption);
  });

  return '[Script Info]\nScriptType: v4.00+\nPlayResX: 720\nPlayResY: 1280\nScaledBorderAndShadow: yes\n\n' +
    '[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n' +
    'Style: Glow,' + font + ',' + size + ',' + active + ',' + active + ',&H00000000&,&H80000000&,-1,0,0,0,100,100,0,0,1,' + glowOutline + ',0,5,36,36,' + marginV + ',1\n' +
    'Style: Caption,' + font + ',' + size + ',' + inactive + ',' + active + ',&H00000000&,&H80000000&,-1,0,0,0,100,100,0,0,1,' + outline + ',' + shadow + ',5,36,36,' + marginV + ',1\n\n' +
    '[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n' + events.join('\n') + '\n';
}
