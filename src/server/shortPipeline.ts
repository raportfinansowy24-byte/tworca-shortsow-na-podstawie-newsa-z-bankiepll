import crypto from 'node:crypto';
import { motionSoundSpecForBeat, type MotionSoundSpec } from './motionSoundRenderer';

export type VisualMode = 'data_visual' | 'matched_clip';
export type StoryBeat = 'hook' | 'market_snapshot' | 'leader' | 'loser' | 'contrast' | 'meaning' | 'takeaway' | 'cta';
export type HookFormula = 'contrarian_claim' | 'mistake_warning' | 'list_tease_ranking';

export interface FinanceFact {
  label: string;
  value: number;
  displayValue: string;
  direction: 'up' | 'down' | 'neutral';
  sourceText: string;
  entity?: string;
}

export interface FinanceArticleInput {
  title: string;
  description?: string;
  summary?: string;
  category?: string;
  link?: string;
}

export interface PipelineScene {
  index: number;
  beat: StoryBeat;
  duration: number;
  voiceover_text: string;
  caption: string;
  visualMode: VisualMode;
  visualTitle: string;
  visualSubtitle: string;
  facts: FinanceFact[];
  visualSvg?: string;
  visualQuery?: string;
  camera?: string;
  transition?: string;
  motionSound?: MotionSoundSpec;
  assetRequired: boolean;
}

export interface FinanceShortPlan {
  planId: string;
  title: string;
  hook: string;
  hookFormula: HookFormula;
  hookVariants: string[];
  viralStrategy: ViralStrategyProfile;
  cta: string;
  sourceUrl?: string;
  article: FinanceArticleInput;
  facts: FinanceFact[];
  scenes: PipelineScene[];
  riskFlags: string[];
  qualityGate: QualityGateResult;
  architecture: string[];
}

export interface ViralStrategyProfile {
  source: 'STRATEGIA_VIRAL_SHORTS.pdf';
  targetDurationSeconds: 18;
  hookWindowSeconds: 2;
  mutedFirst: true;
  proofWindow: [number, number];
  payoffWindow: [number, number];
  platforms: Array<'tiktok' | 'youtube-shorts' | 'instagram-reels'>;
  retentionTargets: { retention3s: 0.6; commentsPerThousand: 5 };
}

export interface QualityGateResult {
  publishable: boolean;
  visualScore: number;
  dataClarity: number;
  hookScore: number;
  captionReadability: number;
  failures: string[];
  warnings: string[];
}

const DURATIONS = [2, 2, 2, 2, 2.5, 2.5, 2.5, 2.5];

function clean(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function parsePercentFacts(text: string): FinanceFact[] {
  const facts: FinanceFact[] = [];
  const patterns: Array<{ regex: RegExp; label: string; entity: string }> = [
    { regex: /WIG20[^.]{0,80}?wzr[oó]s(?:ł|ła|ła)\s+o\s+([+-]?\d+(?:[,.]\d+)?)\s*proc/i, label: 'WIG20', entity: 'WIG20' },
    { regex: /WIG-Banki[^.]{0,80}?ur[oó]s(?:ł|ła|la)\s+o\s+([+-]?\d+(?:[,.]\d+)?)\s*proc/i, label: 'WIG-Banki', entity: 'WIG-Banki' },
    { regex: /Cyfrowy Polsat[^.]{0,80}?(?:spad(?:ł|ła)|stracił)[^\d-]{0,12}(-?\d+(?:[,.]\d+)?)\s*proc/i, label: 'Cyfrowy Polsat', entity: 'Cyfrowy Polsat' },
    { regex: /Eurocash[^.]{0,80}?(?:spad(?:ł|ła)|stracił)[^\d-]{0,12}(-?\d+(?:[,.]\d+)?)\s*proc/i, label: 'Eurocash', entity: 'Eurocash' }
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (!match) continue;
    const raw = match[1].replace(',', '.');
    const value = Number(raw) * (pattern.label === 'Cyfrowy Polsat' || pattern.label === 'Eurocash' ? -1 : 1);
    if (!Number.isFinite(value)) continue;
    facts.push({
      label: pattern.label,
      entity: pattern.entity,
      value,
      displayValue: `${value >= 0 ? '+' : ''}${value.toFixed(2).replace('.', ',')}%`,
      direction: value > 0 ? 'up' : value < 0 ? 'down' : 'neutral',
      sourceText: match[0]
    });
  }
  return facts;
}

function formatFact(fact?: FinanceFact): string {
  return fact ? `${fact.label} ${fact.displayValue}` : 'DANE RYNKOWE';
}

function makeBarsSvg(title: string, subtitle: string, facts: FinanceFact[], accent = '#b7f34a'): string {
  const safeFacts = facts.slice(0, 4);
  const maxAbs = Math.max(1, ...safeFacts.map((fact) => Math.abs(fact.value)));
  const bars = safeFacts.map((fact, index) => {
    const width = Math.max(12, Math.round((Math.abs(fact.value) / maxAbs) * 250));
    const y = 196 + index * 76;
    const color = fact.direction === 'down' ? '#ff5d73' : fact.direction === 'up' ? accent : '#d5d9e4';
    const x = fact.value < 0 ? 392 - width : 392;
    return `<text x="64" y="${y + 24}" fill="#f8fafc" font-size="24" font-family="Arial" font-weight="700">${escapeXml(fact.label)}</text><rect x="392" y="${y}" width="${width}" height="34" rx="17" fill="${color}"/><text x="${fact.value < 0 ? 392 - width - 18 : 410 + width}" y="${y + 25}" text-anchor="${fact.value < 0 ? 'end' : 'start'}" fill="${color}" font-size="24" font-family="Arial" font-weight="800">${escapeXml(fact.displayValue)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07111f"/><stop offset="1" stop-color="#172a45"/></linearGradient></defs><rect width="720" height="1280" fill="url(#bg)"/><path d="M0 940 L720 760 L720 1280 L0 1280 Z" fill="#0b1728" opacity=".75"/><text x="64" y="86" fill="${accent}" font-size="22" font-family="Arial" font-weight="800" letter-spacing="3">RAPORTFINANSOWY24 / GPW</text><text x="64" y="146" fill="#fff" font-size="42" font-family="Arial" font-weight="900">${escapeXml(title)}</text><text x="64" y="184" fill="#cbd5e1" font-size="22" font-family="Arial">${escapeXml(subtitle)}</text><line x1="392" y1="170" x2="392" y2="520" stroke="#64748b" stroke-width="2" opacity=".55"/>${bars}<rect x="48" y="1060" width="624" height="112" rx="28" fill="#0f1f34" stroke="#29415e" stroke-width="2"/><text x="82" y="1110" fill="#f8fafc" font-size="22" font-family="Arial" font-weight="700">FAKT Z ARTYKUŁU BANKIER.PL</text><text x="82" y="1146" fill="#94a3b8" font-size="18" font-family="Arial">Dane redakcyjne — nie jest to rekomendacja inwestycyjna</text></svg>`;
}

function makeTitleSvg(title: string, kicker: string, accent = '#b7f34a'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#06101d"/><stop offset="1" stop-color="#203c5f"/></linearGradient></defs><rect width="720" height="1280" fill="url(#g)"/><circle cx="590" cy="260" r="250" fill="#b7f34a" opacity=".1"/><circle cx="120" cy="1050" r="340" fill="#ff5d73" opacity=".08"/><text x="60" y="150" fill="${accent}" font-size="24" font-family="Arial" font-weight="900" letter-spacing="4">${escapeXml(kicker)}</text><text x="60" y="420" fill="#fff" font-size="62" font-family="Arial" font-weight="900">${escapeXml(title)}</text><rect x="60" y="500" width="140" height="8" rx="4" fill="${accent}"/><text x="60" y="1120" fill="#cbd5e1" font-size="22" font-family="Arial">RaportFinansowy24</text></svg>`;
}

export function buildFinanceShortPlan(articleInput: FinanceArticleInput): FinanceShortPlan {
  const article: FinanceArticleInput = {
    title: clean(articleInput.title),
    description: clean(articleInput.description),
    summary: clean(articleInput.summary),
    category: clean(articleInput.category || 'Finanse'),
    link: clean(articleInput.link)
  };
  const sourceText = `${article.title}. ${article.description}. ${article.summary}`;
  const facts = parsePercentFacts(sourceText);
  const positive = facts.filter((fact) => fact.value > 0).sort((a, b) => b.value - a.value);
  const negative = facts.filter((fact) => fact.value < 0).sort((a, b) => a.value - b.value);
  const leader = positive[0] || facts[0];
  const loser = negative[0] || facts.find((fact) => fact.value < 0);
  const hook = loser && leader
    ? `Indeks rośnie, ale ${loser.label} traci ${Math.abs(loser.value).toFixed(2).replace('.', ',')}%.`
    : `Co naprawdę wydarzyło się dziś na rynku?`;
  const cta = 'Sprawdź pełną analizę na RaportFinansowy24.';
  const hookVariants = [
    hook,
    loser ? `Stop: ${loser.label} traci ${Math.abs(loser.value).toFixed(2).replace('.', ',')}% — sprawdź dlaczego.` : hook,
    loser ? `Top 3 ruchy GPW: ${loser.label} traci ${Math.abs(loser.value).toFixed(2).replace('.', ',')}%.` : hook
  ].filter((value, index, list) => value && list.indexOf(value) === index);
  const viralStrategy: ViralStrategyProfile = {
    source: 'STRATEGIA_VIRAL_SHORTS.pdf',
    targetDurationSeconds: 18,
    hookWindowSeconds: 2,
    mutedFirst: true,
    proofWindow: [2, 14],
    payoffWindow: [14, 18],
    platforms: ['tiktok', 'youtube-shorts', 'instagram-reels'],
    retentionTargets: { retention3s: 0.6, commentsPerThousand: 5 }
  };
  const scenes: PipelineScene[] = [
    { index: 0, beat: 'hook', duration: DURATIONS[0], voiceover_text: hook, caption: hook.toUpperCase(), visualMode: 'data_visual', visualTitle: 'REKORDY I TĄPNIĘCIE', visualSubtitle: 'Jeden rynek. Dwa skrajne wyniki.', facts: [leader, loser].filter(Boolean) as FinanceFact[], camera: 'fast push-in', transition: 'hard-cut', assetRequired: false },
    { index: 1, beat: 'market_snapshot', duration: DURATIONS[1], voiceover_text: leader ? `${formatFact(leader)}. To on ciągnął rynek.` : 'Główne indeksy zakończyły sesję na plusie.', caption: leader ? formatFact(leader) : 'RYNEK NA PLUSIE', visualMode: 'data_visual', visualTitle: 'NAJWAŻNIEJSZY RUCH', visualSubtitle: 'Liderzy dzisiejszej sesji', facts: [leader].filter(Boolean) as FinanceFact[], camera: 'data zoom', transition: 'whip-pan', assetRequired: false },
    { index: 2, beat: 'leader', duration: DURATIONS[2], voiceover_text: leader ? `${leader.label} wzrósł o ${leader.value.toFixed(2).replace('.', ',')} procent.` : 'Banki wsparły dzisiejsze wzrosty.', caption: leader ? `${leader.label.toUpperCase()} ${leader.displayValue}` : 'SEKTOR BANKOWY', visualMode: 'data_visual', visualTitle: leader?.label || 'LIDER SESJI', visualSubtitle: 'Najmocniejszy potwierdzony fakt', facts: [leader].filter(Boolean) as FinanceFact[], camera: 'bar grow', transition: 'match-cut', assetRequired: false },
    { index: 3, beat: 'loser', duration: DURATIONS[3], voiceover_text: loser ? `${loser.label} spadł o ${Math.abs(loser.value).toFixed(2).replace('.', ',')} procent.` : 'Nie wszystkie spółki rosły.', caption: loser ? `${loser.label.toUpperCase()} ${loser.displayValue}` : 'NIE WSZYSTKIE AKCJE ROSŁY', visualMode: 'data_visual', visualTitle: loser?.label || 'NAJSŁABSZY WYNIK', visualSubtitle: 'Największa przecena w materiale', facts: [loser].filter(Boolean) as FinanceFact[], camera: 'impact zoom', transition: 'smash-cut', assetRequired: false },
    { index: 4, beat: 'contrast', duration: DURATIONS[4], voiceover_text: 'To nie był jednolity ruch całego rynku. Sektory rozjechały się w przeciwnych kierunkach.', caption: 'JEDEN RYNEK. DWA KIERUNKI.', visualMode: 'data_visual', visualTitle: 'SILNE ROZWARSTWIENIE', visualSubtitle: 'Wzrosty kontra spadki', facts: [...positive.slice(0, 2), ...negative.slice(0, 2)], camera: 'split-screen reveal', transition: 'split', assetRequired: false },
    { index: 5, beat: 'meaning', duration: DURATIONS[5], voiceover_text: 'Dlatego sam rekord indeksu nie mówi jeszcze, jak zachowały się konkretne akcje.', caption: 'REKORD INDEKSU TO NIE WSZYSTKO', visualMode: 'data_visual', visualTitle: 'CZYTAJ SZERZEJ NIŻ NAGŁÓWEK', visualSubtitle: 'Sprawdzaj sektory i spółki', facts: facts.slice(0, 4), camera: 'slow parallax', transition: 'soft-cut', assetRequired: false },
    { index: 6, beat: 'takeaway', duration: DURATIONS[6], voiceover_text: 'Najważniejszy wniosek? Patrz na liczby, ale zawsze sprawdzaj, co dzieje się pod powierzchnią indeksu.', caption: 'PATRZ POD POWIERZCHNIĘ', visualMode: 'data_visual', visualTitle: 'WNIOSEK DLA CIEBIE', visualSubtitle: 'Dane przed emocjami', facts: facts.slice(0, 4), camera: 'slow push-in', transition: 'fade-through', assetRequired: false },
    { index: 7, beat: 'cta', duration: DURATIONS[7], voiceover_text: cta, caption: cta.toUpperCase(), visualMode: 'data_visual', visualTitle: 'PEŁNA ANALIZA', visualSubtitle: 'RaportFinansowy24', facts: [], camera: 'hero hold', transition: 'end-card', assetRequired: false }
  ];
  scenes.forEach((scene) => {
    scene.visualSvg = scene.beat === 'cta' ? makeTitleSvg(scene.visualTitle, scene.visualSubtitle) : makeBarsSvg(scene.visualTitle, scene.visualSubtitle, scene.facts);
    scene.motionSound = motionSoundSpecForBeat(scene.beat);
  });
  const failures: string[] = [];
  const warnings: string[] = [];
  if (!facts.length) failures.push('Nie znaleziono potwierdzonych danych liczbowych do wizualizacji.');
  if (hook.length > 90) warnings.push('Hook jest długi; sprawdź czy mieści się czytelnie w pierwszych 2 sekundach.');
  const qualityGate: QualityGateResult = {
    publishable: failures.length === 0,
    visualScore: facts.length >= 3 ? 8.8 : facts.length ? 7.2 : 2.0,
    dataClarity: facts.length >= 3 ? 9.0 : facts.length ? 7.0 : 1.0,
    hookScore: loser && leader ? 8.7 : 6.0,
    captionReadability: 8.5,
    failures,
    warnings
  };
  const planId = `fsp_${crypto.createHash('sha1').update(`${article.title}|${article.link || ''}`).digest('hex').slice(0, 12)}`;
  return { planId, title: article.title, hook, hookFormula: 'contrarian_claim', hookVariants, viralStrategy, cta, sourceUrl: article.link, article, facts, scenes, riskFlags: ['Zweryfikuj liczby i znak zmian względem źródła przed publikacją.'], qualityGate, architecture: ['fact-checker', 'hook-retention', 'viral-short-strategy-2026', 'visual-storyboard', 'financial-data-visualizer', 'asset-curator', 'tts-performance', 'motion-renderer', 'quality-gate', 'supabase-feedback-loop'] };
}

export function validateFinanceShortPlan(plan: FinanceShortPlan): QualityGateResult {
  const failures = [...plan.qualityGate.failures];
  if (plan.scenes.length !== 8) failures.push('Plan musi zawierać dokładnie 8 scen.');
  if (plan.scenes.some((scene) => !scene.visualSvg && scene.visualMode === 'data_visual')) failures.push('Każda scena data_visual musi mieć wygenerowaną grafikę SVG.');
  if (plan.scenes.some((scene) => !scene.voiceover_text.trim())) failures.push('Każda scena musi mieć tekst lektora.');
  if (plan.scenes.some((scene) => scene.duration <= 0)) failures.push('Każda scena musi mieć dodatni czas trwania.');
  const hookWordCount = plan.hook.trim().split(/\s+/).filter(Boolean).length;
  if (hookWordCount > 14) failures.push('Hook nie może przekraczać 14 słów.');
  if (!/(\d+[,.]?\d*\s*%|\d+[,.]?\d*)/.test(plan.hook)) failures.push('Hook musi zawierać konkretną liczbę lub procent z artykułu.');
  if (plan.scenes[0]?.duration > 2.1) failures.push('Pierwsza scena musi mieścić się w oknie hooka 0–2 sekundy.');
  if (plan.scenes.at(-1)?.beat !== 'cta') failures.push('Ostatnia scena musi zawierać pojedyncze CTA.');
  return { ...plan.qualityGate, publishable: failures.length === 0, failures };
}
