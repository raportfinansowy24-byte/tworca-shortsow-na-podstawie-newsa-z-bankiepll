import crypto from 'node:crypto';
import { motionSoundSpecForBeat, type MotionSoundSpec } from './motionSoundRenderer';
import { selectFinanceCta } from './financeCtaStrategy';

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
  ctaType: string;
  ctaDestination: string;
  ctaUrl: string;
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
  const indexPattern = /\b(mWIG40|sWIG80|WIG-Banki|WIG20|WIG30|WIG)\b/gi;
  for (const match of text.matchAll(indexPattern)) {
    const entity = match[0];
    const start = (match.index || 0) + entity.length;
    const remaining = text.slice(start, start + 220);
    const nextEntity = remaining.search(/\b(?:mWIG40|sWIG80|WIG-Banki|WIG20|WIG30|WIG)\b/i);
    const candidate = remaining.slice(0, nextEntity >= 0 ? nextEntity : remaining.length);
    const sentenceEnd = /[!?]|\.(?!\d)/.exec(candidate)?.index;
    const sourceText = candidate.slice(0, sentenceEnd ?? candidate.length).trim();
    const metric = sourceText.match(/([+-]?\d+(?:[,.]\d+)?)\s*(?:%|proc(?:ent(?:a|u|y|ów)?)?)/i);
    if (!metric || facts.some((fact) => fact.entity?.toLocaleLowerCase('pl-PL') === entity.toLocaleLowerCase('pl-PL'))) continue;

    const normalizedSource = sourceText.toLocaleLowerCase('pl-PL');
    const hasNegativeDirection = /spad|zniż|strac|minus|przecen|obniż/i.test(normalizedSource);
    const hasPositiveDirection = /wzr|ur[oó]s|rosn|zysk|zwyż|plus|wzrost/i.test(normalizedSource);
    const rawValue = metric[1].replace(',', '.');
    const absoluteValue = Math.abs(Number(rawValue));
    const hasExplicitSign = /^[+-]/.test(metric[1]);
    if (!Number.isFinite(absoluteValue) || (!hasExplicitSign && !hasNegativeDirection && !hasPositiveDirection)) continue;

    const value = hasExplicitSign
      ? Number(rawValue)
      : hasNegativeDirection ? -absoluteValue : absoluteValue;
    const normalizedEntity = entity.toLocaleLowerCase('pl-PL');
    const label = normalizedEntity === 'mwig40' ? 'mWIG40'
      : normalizedEntity === 'swig80' ? 'sWIG80'
        : normalizedEntity === 'wig-banki' ? 'WIG-Banki'
          : entity.toUpperCase();
    facts.push({
      label,
      entity: label,
      value,
      displayValue: `${value >= 0 ? '+' : ''}${value.toFixed(2).replace('.', ',')}%`,
      direction: value > 0 ? 'up' : value < 0 ? 'down' : 'neutral',
      sourceText: `${entity} ${sourceText}`.trim()
    });
  }

  const companyPatterns: Array<{ regex: RegExp; label: string; entity: string }> = [
    { regex: /Cyfrowy Polsat[^.!?]{0,100}?(?:spad(?:ł|ła)|stracił)[^\d-]{0,12}(-?\d+(?:[,.]\d+)?)\s*(?:proc|%)/i, label: 'Cyfrowy Polsat', entity: 'Cyfrowy Polsat' },
    { regex: /Eurocash[^.!?]{0,100}?(?:spad(?:ł|ła)|stracił)[^\d-]{0,12}(-?\d+(?:[,.]\d+)?)\s*(?:proc|%)/i, label: 'Eurocash', entity: 'Eurocash' }
  ];
  for (const pattern of companyPatterns) {
    const match = text.match(pattern.regex);
    if (!match) continue;
    const raw = match[1].replace(',', '.');
    const value = pattern.label === 'Cyfrowy Polsat' || pattern.label === 'Eurocash'
      ? -Math.abs(Number(raw))
      : Number(raw);
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

function makeBarsSvg(title: string, subtitle: string, facts: FinanceFact[], accent = '#b7f34a', sourceLabel = 'ARTYKUŁU BANKIER.PL'): string {
  const safeFacts = facts.slice(0, 4);
  const maxAbs = Math.max(1, ...safeFacts.map((fact) => Math.abs(fact.value)));
  const bars = safeFacts.map((fact, index) => {
    const width = Math.max(12, Math.round((Math.abs(fact.value) / maxAbs) * 250));
    const y = 196 + index * 76;
    const color = fact.direction === 'down' ? '#ff5d73' : fact.direction === 'up' ? accent : '#d5d9e4';
    const x = fact.value < 0 ? 392 - width : 392;
    return `<text x="64" y="${y + 24}" fill="#f8fafc" font-size="24" font-family="TikTok Sans" font-weight="700">${escapeXml(fact.label)}</text><rect x="${x}" y="${y}" width="${width}" height="34" rx="17" fill="${color}"/><text x="${fact.value < 0 ? 392 - width - 18 : 410 + width}" y="${y + 25}" text-anchor="${fact.value < 0 ? 'end' : 'start'}" fill="${color}" font-size="24" font-family="TikTok Sans" font-weight="800">${escapeXml(fact.displayValue)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07111f"/><stop offset="1" stop-color="#172a45"/></linearGradient></defs><rect width="720" height="1280" fill="url(#bg)"/><path d="M0 940 L720 760 L720 1280 L0 1280 Z" fill="#0b1728" opacity=".75"/><text x="64" y="86" fill="${accent}" font-size="22" font-family="TikTok Sans" font-weight="800" letter-spacing="3">RAPORTFINANSOWY24 / GPW</text><text x="64" y="146" fill="#fff" font-size="42" font-family="TikTok Sans" font-weight="900">${escapeXml(title)}</text><text x="64" y="184" fill="#cbd5e1" font-size="22" font-family="TikTok Sans">${escapeXml(subtitle)}</text><line x1="392" y1="170" x2="392" y2="520" stroke="#64748b" stroke-width="2" opacity=".55"/>${bars}<rect x="48" y="1060" width="624" height="112" rx="28" fill="#0f1f34" stroke="#29415e" stroke-width="2"/><text x="82" y="1110" fill="#f8fafc" font-size="22" font-family="TikTok Sans" font-weight="700">FAKT Z ${escapeXml(sourceLabel)}</text><text x="82" y="1146" fill="#94a3b8" font-size="18" font-family="TikTok Sans">Dane redakcyjne — nie jest to rekomendacja inwestycyjna</text></svg>`;
}

function makeTitleSvg(title: string, kicker: string, accent = '#b7f34a'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#06101d"/><stop offset="1" stop-color="#203c5f"/></linearGradient></defs><rect width="720" height="1280" fill="url(#g)"/><circle cx="590" cy="260" r="250" fill="#b7f34a" opacity=".1"/><circle cx="120" cy="1050" r="340" fill="#ff5d73" opacity=".08"/><text x="60" y="150" fill="${accent}" font-size="24" font-family="TikTok Sans" font-weight="900" letter-spacing="4">${escapeXml(kicker)}</text><text x="60" y="420" fill="#fff" font-size="62" font-family="TikTok Sans" font-weight="900">${escapeXml(title)}</text><rect x="60" y="500" width="140" height="8" rx="4" fill="${accent}"/><text x="60" y="1120" fill="#cbd5e1" font-size="22" font-family="TikTok Sans">RaportFinansowy24</text></svg>`;
}

export function buildFinanceSceneDataVisual(
  article: FinanceArticleInput,
  narration: string,
  caption = ''
): Pick<PipelineScene, 'visualMode' | 'visualTitle' | 'visualSubtitle' | 'facts' | 'visualSvg'> | null {
  const sourceText = [article.title, article.description, article.summary].map(clean).filter(Boolean).join('. ');
  const sourceFacts = parsePercentFacts(sourceText);
  if (!sourceFacts.length) return null;

  const sceneText = clean(`${narration} ${caption}`).toLocaleLowerCase('pl-PL');
  const hasNumericClaim = /\d+(?:[,.]\d+)?\s*(?:%|proc(?:ent(?:a|u|y|ów)?)?)/i.test(sceneText);
  const matchedFacts = sourceFacts.filter((fact) => {
    const sourceLabels = [fact.label, fact.entity].filter(Boolean).map((label) => String(label).toLocaleLowerCase('pl-PL'));
    const localizedNumber = Math.abs(fact.value).toFixed(2).replace('.', ',');
    const decimalNumber = Math.abs(fact.value).toFixed(2);
    const matchesNumber = [localizedNumber, decimalNumber].some((number) => {
      const escapedNumber = number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(?:^|[^\\d,.])${escapedNumber}(?:$|[^\\d])`).test(sceneText);
    });
    const matchesEntity = sourceLabels.some((label) => sceneText.includes(label));
    return matchesNumber || (!hasNumericClaim && matchesEntity);
  });
  const mentionsGpWIndex = /\b(?:gpw|wig(?:20|30)|mwig40|swig80|wig-banki|indeks\w*|giełd\w*|sesj\w*)\b/i.test(sceneText);
  const singleSourceFactIsIndex = sourceFacts.length === 1 && /^(?:mWIG40|sWIG80|WIG(?:20|30)?|WIG-Banki)$/i.test(sourceFacts[0].label);
  const selectedFacts = matchedFacts.length
    ? matchedFacts.slice(0, 4)
    : !hasNumericClaim && mentionsGpWIndex && singleSourceFactIsIndex ? sourceFacts : [];
  if (!selectedFacts.length) return null;

  const visualTitle = selectedFacts.length === 1 ? selectedFacts[0].label : 'DANE Z ARTYKUŁU';
  const visualSubtitle = selectedFacts.length === 1 ? 'Zmiana podana w źródle' : 'Potwierdzone dane rynkowe';
  return {
    visualMode: 'data_visual',
    visualTitle,
    visualSubtitle,
    facts: selectedFacts,
    visualSvg: makeBarsSvg(visualTitle, visualSubtitle, selectedFacts, '#b7f34a', 'ARTYKUŁU ŹRÓDŁOWEGO')
  };
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
  const ctaPlan = selectFinanceCta(article);
  const cta = ctaPlan.spokenText;
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
    { index: 7, beat: 'cta', duration: DURATIONS[7], voiceover_text: ctaPlan.spokenText, caption: ctaPlan.spokenText, visualMode: 'data_visual', visualTitle: ctaPlan.displayTitle, visualSubtitle: 'RaportFinansowy24.pl', facts: [], camera: 'hero hold', transition: 'end-card', assetRequired: false }
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
  return { planId, title: article.title, hook, hookFormula: 'contrarian_claim', hookVariants, viralStrategy, cta, ctaType: ctaPlan.type, ctaDestination: ctaPlan.destinationPath, ctaUrl: ctaPlan.destinationUrl, sourceUrl: article.link, article, facts, scenes, riskFlags: ['Zweryfikuj liczby i znak zmian względem źródła przed publikacją.'], qualityGate, architecture: ['fact-checker', 'hook-retention', 'viral-short-strategy-2026', 'visual-storyboard', 'financial-data-visualizer', 'asset-curator', 'tts-performance', 'motion-renderer', 'quality-gate', 'supabase-feedback-loop'] };
}

export interface HookPerformanceSignal {
  hookText: string;
  sampleSize: number;
  averageCompletionRate: number;
}

export interface HookVariantSelection {
  index: number;
  formula: HookFormula;
  sampleSize: number;
  averageCompletionRate?: number;
}

function hookFamily(text: string): HookFormula {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pl-PL');
  if (/\b(top\s*3|top\s*trzy|ranking|trzy najwazniejsze|lista)\b/.test(normalized)) return 'list_tease_ranking';
  if (/\b(stop|uwaga|blad|pomylka|nie rob|unikaj|sprawdz zanim)\b/.test(normalized)) return 'mistake_warning';
  return 'contrarian_claim';
}

/** Select a hook family only when platform-matched historical data has enough observations. */
export function selectHookVariantFromLearningSignals(
  plan: FinanceShortPlan,
  signals: HookPerformanceSignal[],
  minimumSamples = 5
): HookVariantSelection {
  const candidateFormulas: HookFormula[] = ['contrarian_claim', 'mistake_warning', 'list_tease_ranking'];
  const scores = new Map<HookFormula, { weightedCompletion: number; sampleSize: number }>();
  for (const signal of signals) {
    const sampleSize = Math.max(0, Math.floor(Number(signal.sampleSize) || 0));
    const completion = Number(signal.averageCompletionRate);
    if (sampleSize === 0 || !Number.isFinite(completion) || completion < 0 || completion > 1) continue;
    const formula = hookFamily(signal.hookText);
    const current = scores.get(formula) || { weightedCompletion: 0, sampleSize: 0 };
    current.weightedCompletion += completion * sampleSize;
    current.sampleSize += sampleSize;
    scores.set(formula, current);
  }

  const eligible = candidateFormulas
    .map((formula, index) => ({ formula, index, ...scores.get(formula) }))
    .filter((score) => (score.sampleSize || 0) >= minimumSamples)
    .sort((a, b) => ((b.weightedCompletion || 0) / (b.sampleSize || 1)) - ((a.weightedCompletion || 0) / (a.sampleSize || 1)));
  const best = eligible[0];
  if (!best) return { index: 0, formula: 'contrarian_claim', sampleSize: 0 };

  const matchedIndex = plan.hookVariants.findIndex((hook) => hookFamily(hook) === best.formula);
  const selectedIndex = matchedIndex >= 0 ? matchedIndex : 0;
  const selectedFormula = matchedIndex >= 0 ? best.formula : 'contrarian_claim';
  return {
    index: selectedIndex,
    formula: selectedFormula,
    sampleSize: best.sampleSize || 0,
    averageCompletionRate: (best.weightedCompletion || 0) / (best.sampleSize || 1)
  };
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
