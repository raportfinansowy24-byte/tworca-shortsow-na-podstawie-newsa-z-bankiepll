export const DEFAULT_SECONDS_PER_SPEECH_UNIT = 0.4;
export const MAX_NARRATION_CALIBRATION_SAMPLES = 80;

export type NarrationCalibrationStore = {
  version: 1;
  profiles: Record<string, number[]>;
};

export type NarrationCalibrationSample = {
  text: string;
  durationSeconds: number;
  speed: number;
};

export type NarrationFitRevisionInput = {
  sceneTexts: string[];
  estimatedSceneDurations: number[];
  totalEstimatedDurationSeconds: number;
  targetDurationSeconds: number;
  maxTotalDurationSeconds: number;
  attemptNumber: number;
};

export type NarrationFitResult = {
  sceneTexts: string[];
  estimatedNarrationDurations: number[];
  estimatedSceneDurations: number[];
  totalEstimatedDurationSeconds: number;
  revisionAttempts: number;
  reachedTargetDuration: boolean;
};

export function countNarrationSpeechUnits(text: string): number {
  const normalized = String(text || '').trim();
  if (!normalized) return 0;
  const words = normalized.split(/\s+/u).filter(Boolean).length;
  const pauses = (normalized.match(/[,;:]/gu) || []).length * 0.18;
  const sentenceEnds = (normalized.match(/[.!?…]+(?=\s|$)/gu) || []).length * 0.32;
  return words + pauses + sentenceEnds;
}

export function getNarrationCalibrationProfileKey(input: {
  language: string;
  voiceId: string;
  modelId: string;
}): string {
  return [input.language, input.voiceId, input.modelId]
    .map((value) => String(value || '').trim().toLowerCase())
    .join('|');
}

export function emptyNarrationCalibrationStore(): NarrationCalibrationStore {
  return { version: 1, profiles: {} };
}

export function parseNarrationCalibrationStore(value: unknown): NarrationCalibrationStore {
  if (!value || typeof value !== 'object') return emptyNarrationCalibrationStore();
  const candidate = value as { version?: unknown; profiles?: unknown };
  if (candidate.version !== 1 || !candidate.profiles || typeof candidate.profiles !== 'object' || Array.isArray(candidate.profiles)) {
    return emptyNarrationCalibrationStore();
  }
  const profiles: Record<string, number[]> = {};
  for (const [key, rawSamples] of Object.entries(candidate.profiles as Record<string, unknown>)) {
    if (!Array.isArray(rawSamples)) continue;
    const samples = rawSamples.filter((sample): sample is number =>
      typeof sample === 'number' && Number.isFinite(sample) && sample >= 0.18 && sample <= 1.2
    ).slice(-MAX_NARRATION_CALIBRATION_SAMPLES);
    if (samples.length) profiles[key] = samples;
  }
  return { version: 1, profiles };
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function getCalibratedSecondsPerSpeechUnit(
  store: NarrationCalibrationStore,
  profileKey: string
): number {
  const samples = store.profiles[profileKey] || [];
  if (samples.length >= 3) return median(samples.slice(-MAX_NARRATION_CALIBRATION_SAMPLES));
  if (samples.length > 0) {
    const observed = median(samples);
    const confidence = samples.length / 5;
    return DEFAULT_SECONDS_PER_SPEECH_UNIT * (1 - confidence) + observed * confidence;
  }
  return DEFAULT_SECONDS_PER_SPEECH_UNIT;
}

export function recordNarrationCalibrationSamples(
  store: NarrationCalibrationStore,
  profileKey: string,
  samples: NarrationCalibrationSample[]
): NarrationCalibrationStore {
  const next = parseNarrationCalibrationStore(store);
  const profileSamples = [...(next.profiles[profileKey] || [])];
  for (const sample of samples) {
    const speechUnits = countNarrationSpeechUnits(sample.text);
    const speed = Number.isFinite(sample.speed) && sample.speed > 0 ? Math.min(1.2, Math.max(0.7, sample.speed)) : 1;
    if (!Number.isFinite(sample.durationSeconds) || sample.durationSeconds <= 0 || speechUnits <= 0) continue;
    const secondsPerUnit = sample.durationSeconds * speed / speechUnits;
    if (Number.isFinite(secondsPerUnit) && secondsPerUnit >= 0.18 && secondsPerUnit <= 1.2) {
      profileSamples.push(secondsPerUnit);
    }
  }
  next.profiles[profileKey] = profileSamples.slice(-MAX_NARRATION_CALIBRATION_SAMPLES);
  return next;
}

export function estimateNarrationDurationSeconds(
  text: string,
  secondsPerSpeechUnit = DEFAULT_SECONDS_PER_SPEECH_UNIT,
  speed = 1
): number {
  if (!Number.isFinite(secondsPerSpeechUnit) || secondsPerSpeechUnit <= 0) {
    throw new Error('Nieprawidłowa kalibracja tempa narracji.');
  }
  if (!Number.isFinite(speed) || speed <= 0) throw new Error('Nieprawidłowe tempo TTS.');
  const speechUnits = countNarrationSpeechUnits(text);
  if (speechUnits <= 0) return 0;
  return speechUnits * secondsPerSpeechUnit / Math.min(1.2, Math.max(0.7, speed));
}

function numericTokens(text: string): string[] {
  const source = String(text || '');
  const matches = [...source.matchAll(/\d+(?:[.,]\d+)?/gu)];
  return matches.map((match) => {
    const rawNumber = match[0];
    const index = match.index ?? 0;
    const previous = source[index - 1] || '';
    const beforePrevious = source[index - 2] || '';
    const sign = /[+\-−]/u.test(previous) &&
      (!beforePrevious || /[\s([{=:;,]/u.test(beforePrevious))
      ? (previous === '−' ? '-' : previous)
      : '';
    const prefixMatch = source.slice(0, index).match(/(?:^|[\s([{])([+\-−]?)\s*(€|£|\$|PLN|EUR|USD|GBP|CHF)\s*$/iu);
    const prefixCurrency = prefixMatch
      ? `${prefixMatch[1] || ''}${prefixMatch[2].toLowerCase()}`
      : '';
    const suffixMatch = source.slice(index + rawNumber.length).match(
      /^\s*(%|‰|zł(?:ot(?:y|ych|e|ego|emu|ym|ą|ej))?|PLN|EUR|USD|GBP|CHF|CAD|CZK|HUF|JPY|euro|dolar(?:ów|y|a|em|ze)?|funt(?:ów|y|a|em)?|frank(?:ów|i|a|iem)?|proc\.?|procent(?:u|y|ów|a|em|ach)?|pkt\.?\s*proc\.?|punkt(?:y|ów)?\s+procentow(?:y|e|ych|ego|ym|ymi)?|tys\.?|mln|mld|bln)(?![\p{L}])/iu
    );
    const suffixUnit = suffixMatch ? suffixMatch[1].toLowerCase().replace(/\s+/gu, ' ').replace(/\.$/u, '') : '';
    return `${prefixCurrency}${sign}${rawNumber.replace(',', '.')}|${suffixUnit}`;
  });
}

const POLISH_NUMBER_WORD_ALIASES: Record<string, string> = {
  zero: '0',
  jeden: '1', jedna: '1', jedno: '1', jedną: '1', jednej: '1', jednego: '1', jednemu: '1', jednym: '1', jedni: '1', jednych: '1', jednymi: '1',
  dwa: '2', dwie: '2', dwóch: '2', dwu: '2', dwoma: '2',
  trzy: '3', trzech: '3', trzema: '3',
  cztery: '4', czterech: '4', czterema: '4',
  pięć: '5', pięciu: '5', pięcioma: '5',
  sześć: '6', sześciu: '6', sześcioma: '6',
  siedem: '7', siedmiu: '7', siedmioma: '7',
  osiem: '8', ośmiu: '8', ośmioma: '8',
  dziewięć: '9', dziewięciu: '9', dziewięcioma: '9',
  dziesięć: '10', dziesięciu: '10', dziesięcioma: '10',
  jedenaście: '11', jedenastu: '11', jedenastoma: '11',
  dwanaście: '12', dwunastu: '12', dwunastoma: '12',
  trzynaście: '13', trzynastu: '13', trzynastoma: '13',
  czternaście: '14', czternastu: '14', czternastoma: '14',
  piętnaście: '15', piętnastu: '15', piętnastoma: '15',
  szesnaście: '16', szesnastu: '16', szesnastoma: '16',
  siedemnaście: '17', siedemnastu: '17', siedemnastoma: '17',
  osiemnaście: '18', osiemnastu: '18', osiemnastoma: '18',
  dziewiętnaście: '19', dziewiętnastu: '19', dziewiętnastoma: '19',
  dwadzieścia: '20', dwudziestu: '20',
  trzydzieści: '30', trzydziestu: '30',
  czterdzieści: '40', czterdziestu: '40',
  pięćdziesiąt: '50', pięćdziesięciu: '50',
  sześćdziesiąt: '60', sześćdziesięciu: '60',
  siedemdziesiąt: '70', siedemdziesięciu: '70',
  osiemdziesiąt: '80', osiemdziesięciu: '80',
  dziewięćdziesiąt: '90', dziewięćdziesięciu: '90',
  sto: '100', stu: '100',
  dwieście: '200', dwustu: '200',
  trzysta: '300', trzystu: '300',
  czterysta: '400', czterystu: '400',
  pięćset: '500', pięciuset: '500',
  sześćset: '600', sześciuset: '600',
  siedemset: '700', siedmiuset: '700',
  osiemset: '800', ośmiuset: '800',
  dziewięćset: '900', dziewięciuset: '900',
  tysiąc: '1000', tysiące: '1000', tysięcy: '1000',
  milion: '1000000', miliony: '1000000', milionów: '1000000',
  miliard: '1000000000', miliardy: '1000000000', miliardów: '1000000000',
  bilion: '1000000000000', biliony: '1000000000000', bilionów: '1000000000000',
  pół: '1/2', półtora: '3/2', półtorej: '3/2', ćwierć: '1/4',
  kilkanaście: 'approx-11-19', kilkadziesiąt: 'approx-20-90', kilkaset: 'approx-100-900',
  pierwszy: 'ordinal-1', pierwsza: 'ordinal-1', pierwsze: 'ordinal-1', pierwszą: 'ordinal-1', pierwszego: 'ordinal-1', pierwszej: 'ordinal-1', pierwszym: 'ordinal-1',
  drugi: 'ordinal-2', druga: 'ordinal-2', drugie: 'ordinal-2', drugą: 'ordinal-2', drugiego: 'ordinal-2', drugiej: 'ordinal-2', drugim: 'ordinal-2',
  trzeci: 'ordinal-3', trzecia: 'ordinal-3', trzecie: 'ordinal-3', trzecią: 'ordinal-3', trzeciego: 'ordinal-3', trzeciej: 'ordinal-3', trzecim: 'ordinal-3',
  czwarty: 'ordinal-4', czwarta: 'ordinal-4', czwarte: 'ordinal-4', czwartą: 'ordinal-4', czwartego: 'ordinal-4', czwartej: 'ordinal-4', czwartym: 'ordinal-4'
};

const POLISH_ORDINAL_PREFIXES: Array<[string, string]> = [
  ['pierwsz', 'ordinal-1'], ['drug', 'ordinal-2'], ['trzeci', 'ordinal-3'], ['czwart', 'ordinal-4'],
  ['piąt', 'ordinal-5'], ['szóst', 'ordinal-6'], ['siódm', 'ordinal-7'], ['ósm', 'ordinal-8'],
  ['dziewiąt', 'ordinal-9'], ['dziesiąt', 'ordinal-10'], ['jedenast', 'ordinal-11'],
  ['dwunast', 'ordinal-12'], ['trzynast', 'ordinal-13'], ['czternast', 'ordinal-14'],
  ['piętnast', 'ordinal-15'], ['szesnast', 'ordinal-16'], ['siedemnast', 'ordinal-17'],
  ['osiemnast', 'ordinal-18'], ['dziewiętnast', 'ordinal-19'], ['dwudziest', 'ordinal-20'],
  ['trzydziest', 'ordinal-30'], ['czterdziest', 'ordinal-40'], ['pięćdziesiąt', 'ordinal-50'],
  ['sześćdziesiąt', 'ordinal-60'], ['siedemdziesiąt', 'ordinal-70'],
  ['osiemdziesiąt', 'ordinal-80'], ['dziewięćdziesiąt', 'ordinal-90']
];

function wordNumberTokens(text: string): string[] {
  const words = String(text || '').toLowerCase().match(/[a-ząćęłńóśźż]+/gu) || [];
  return words.flatMap((word) => {
    const knownNumber = POLISH_NUMBER_WORD_ALIASES[word];
    if (knownNumber) return [knownNumber];
    // Keep inflected Polish ordinal forms (e.g. dwudziestym, siódmym) in the fact signature.
    const ordinal = POLISH_ORDINAL_PREFIXES.find(([prefix]) => word.startsWith(prefix));
    return ordinal ? [ordinal[1]] : [];
  });
}

function preservesNumericFacts(originalText: string, revisedText: string): boolean {
  // Every numeric fact must remain present, in the same order, with no added values.
  const originalDigits = numericTokens(originalText);
  const revisedDigits = numericTokens(revisedText);
  if (originalDigits.length !== revisedDigits.length ||
      originalDigits.some((token, index) => token !== revisedDigits[index])) {
    return false;
  }

  // Also protect financial figures, percentages, dates and quantities written out in Polish words.
  const originalWordNumbers = wordNumberTokens(originalText);
  const revisedWordNumbers = wordNumberTokens(revisedText);
  return originalWordNumbers.length === revisedWordNumbers.length &&
    originalWordNumbers.every((token, index) => token === revisedWordNumbers[index]);
}

export async function fitNarrationBeforeTts(input: {
  sceneTexts: string[];
  baseSceneDurations: number[];
  secondsPerSpeechUnit: number;
  speed: number;
  targetDurationSeconds: number;
  maxTotalDurationSeconds: number;
  narrationPaddingSeconds?: number;
  maxRevisionAttempts?: number;
  revise?: (revision: NarrationFitRevisionInput) => Promise<readonly string[] | null>;
}): Promise<NarrationFitResult> {
  const {
    sceneTexts,
    baseSceneDurations,
    secondsPerSpeechUnit,
    speed,
    targetDurationSeconds,
    maxTotalDurationSeconds,
    narrationPaddingSeconds = 0.12
  } = input;
  if (!Array.isArray(sceneTexts) || sceneTexts.length === 0 || sceneTexts.some((text) => typeof text !== 'string' || !text.trim())) {
    throw new Error('Każda scena musi zawierać tekst lektora przed estymacją TTS.');
  }
  if (!Array.isArray(baseSceneDurations) || baseSceneDurations.length !== sceneTexts.length ||
      baseSceneDurations.some((duration) => !Number.isFinite(duration) || duration <= 0)) {
    throw new Error('Budżety scen i teksty narracji muszą zawierać tyle samo poprawnych elementów.');
  }
  if (!Number.isFinite(targetDurationSeconds) || targetDurationSeconds <= 0 ||
      !Number.isFinite(maxTotalDurationSeconds) || maxTotalDurationSeconds < targetDurationSeconds ||
      !Number.isFinite(narrationPaddingSeconds) || narrationPaddingSeconds < 0) {
    throw new Error('Nieprawidłowa konfiguracja limitów estymacji narracji.');
  }

  const maxRevisionAttempts = Math.min(2, Math.max(0, Math.floor(input.maxRevisionAttempts ?? 2)));
  let currentTexts = [...sceneTexts];
  let revisionAttempts = 0;

  const calculate = () => {
    const estimatedNarrationDurations = currentTexts.map((text) =>
      estimateNarrationDurationSeconds(text, secondsPerSpeechUnit, speed)
    );
    const estimatedSceneDurations = estimatedNarrationDurations.map((duration, index) =>
      Math.max(baseSceneDurations[index], duration + narrationPaddingSeconds)
    );
    const totalEstimatedDurationSeconds = estimatedSceneDurations.reduce((sum, duration) => sum + duration, 0);
    return { estimatedNarrationDurations, estimatedSceneDurations, totalEstimatedDurationSeconds };
  };

  let estimate = calculate();
  while (estimate.totalEstimatedDurationSeconds > targetDurationSeconds + 0.001 &&
         revisionAttempts < maxRevisionAttempts && input.revise) {
    revisionAttempts++;
    const revised = await input.revise({
      sceneTexts: [...currentTexts],
      estimatedSceneDurations: [...estimate.estimatedSceneDurations],
      totalEstimatedDurationSeconds: estimate.totalEstimatedDurationSeconds,
      targetDurationSeconds,
      maxTotalDurationSeconds,
      attemptNumber: revisionAttempts
    });
    if (!revised) break;
    if (revised.length !== currentTexts.length) {
      throw new Error('Korekta narracji zwróciła nieprawidłową liczbę scen.');
    }
    const candidateTexts = revised.map((text, index) => {
      if (typeof text !== 'string' || !text.trim()) throw new Error(`Korekta narracji pozostawiła pustą scenę ${index + 1}.`);
      if (index === currentTexts.length - 1 && text.trim() !== currentTexts[index].trim()) {
        throw new Error('Korekta narracji nie może zmieniać końcowego CTA.');
      }
      if (!preservesNumericFacts(currentTexts[index], text)) {
        throw new Error(`Korekta narracji zmieniła lub usunęła wartość liczbową w scenie ${index + 1}; zmiana została odrzucona.`);
      }
      if (countNarrationSpeechUnits(text) > countNarrationSpeechUnits(currentTexts[index]) + 0.001) {
        throw new Error(`Korekta narracji zwiększyła długość sceny ${index + 1}; zmiana została odrzucona.`);
      }
      return text.trim();
    });
    if (candidateTexts.every((text, index) => text === currentTexts[index].trim())) break;
    currentTexts = candidateTexts;
    estimate = calculate();
  }

  if (estimate.totalEstimatedDurationSeconds > maxTotalDurationSeconds + 0.001) {
    throw new Error(
      `Szacowana narracja wymaga ${estimate.totalEstimatedDurationSeconds.toFixed(2)} s po ${revisionAttempts} próbach korekty. ` +
      `Twardy limit to ${maxTotalDurationSeconds.toFixed(0)} s. TTS nie został uruchomiony; skróć tekst i spróbuj ponownie.`
    );
  }

  return {
    sceneTexts: currentTexts,
    ...estimate,
    revisionAttempts,
    reachedTargetDuration: estimate.totalEstimatedDurationSeconds <= targetDurationSeconds + 0.001
  };
}
