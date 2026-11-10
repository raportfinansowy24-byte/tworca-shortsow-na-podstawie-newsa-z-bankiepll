export interface SourceFactFinding {
  code: string;
  severity: 'blocker';
  message: string;
  scene?: number;
}

export interface SourceFactReport {
  status: 'pass' | 'blocked';
  findings: SourceFactFinding[];
  checkedAt: string;
}

export interface SourceFactQaOptions {
  sourceText: string;
  ctaSceneIndex?: number;
  requireEvidence?: boolean;
  maxEvidenceLength?: number;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function textValue(scene: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = scene[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function normalizeEvidence(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pl-PL')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const KNOWN_FINANCIAL_ENTITIES = [
  'orlen', 'kghm', 'dino', 'lpp', 'allegro', 'pekao', 'pko', 'santander', 'alior',
  'tauron', 'pge', 'enea', 'inpost', 'zabka', 'żabka', 'ccc', 'asseco', 'budimex',
  'mbank', 'millennium', 'kruk', 'jsw', 'xtb', 'benefit', 'pepco', 'pzu', 'text',
  'cyfrowy polsat', 'cd projekt', 'grupa azoty', 'biedronka', 'gus', 'knf', 'fed',
  'nbp', 'rpp', 'gpw', 'ebc', 'ecb', 'mf'
];

const COMMON_NON_ENTITY_STARTERS = new Set([
  'zysk', 'akcje', 'wyniki', 'kurs', 'spolka', 'spolki', 'prezes', 'zarzad',
  'wzrost', 'spadek', 'raport', 'dane', 'ceny', 'inflacja', 'stopa', 'stopy', 'raty',
  'koszty', 'marza', 'sprzedaz', 'wolumen', 'obroty', 'notowania',
  'wycena', 'analitycy', 'eksperci', 'inwestorzy', 'klienci', 'bank', 'grupa', 'firma',
  'rzad', 'minister', 'nowy', 'nowa', 'nowe', 'kolejny', 'kolejna', 'kolejne',
  'pierwszy', 'pierwsza', 'pierwsze', 'drugi', 'druga', 'drugie', 'polski', 'polska', 'polskie',
  'wedlug', 'czesc', 'wiekszosc', 'prognoza', 'decyzja', 'informacja', 'komunikat'
]);

function canonicalNumericTokens(raw: string): string[] {
  const cleaned = raw.replace(/\s+/g, '').replace(',', '.');
  const tokens = new Set<string>();
  tokens.add(cleaned);
  const parsed = parseFloat(cleaned);
  if (Number.isFinite(parsed)) {
    tokens.add(parsed.toString());
    // Also support thousand-based equivalents: 10000 -> 10, 1500000 -> 1.5
    if (parsed >= 1000 && parsed % 1000 === 0) {
      tokens.add((parsed / 1000).toString());
    }
    if (parsed >= 1000000 && parsed % 1000000 === 0) {
      tokens.add((parsed / 1000000).toString());
    }
  }
  return [...tokens];
}

function numericTokens(value: string): string[] {
  const tokens = new Set<string>();
  const matches = value.matchAll(/(?<![\p{L}\p{N}])(\d+(?:(?:[.,]\d+)|(?:\s+\d{3}))*)(?:\s*(?:%|proc(?:ent(?:a|u|y|ów)?)?|(tys(?:\.|i[eę]cy?|i[aą]c[a-z]*)?|mln|mld)))?/giu);
  for (const match of matches) {
    const rawNum = match[1] || '';
    const multiplier = (match[2] || '').toLowerCase();
    for (const token of canonicalNumericTokens(rawNum)) {
      tokens.add(token);
    }
    const parsed = parseFloat(rawNum.replace(/\s+/g, '').replace(',', '.'));
    if (Number.isFinite(parsed)) {
      if (multiplier.startsWith('tys')) {
        tokens.add((parsed * 1000).toString());
        tokens.add(parsed.toString());
      } else if (multiplier === 'mln') {
        tokens.add((parsed * 1000000).toString());
        tokens.add(parsed.toString());
      } else if (multiplier === 'mld') {
        tokens.add((parsed * 1000000000).toString());
        tokens.add(parsed.toString());
      }
    }
  }
  return [...tokens];
}

function direction(value: string): 'up' | 'down' | 'mixed' | 'none' {
  const normalized = normalizeEvidence(value);
  // Detect negated words (e.g. "nie spada", "nie obniz", "zamiast spadku")
  const negatedDown = /\b(nie\s+(?:ma\s+)?(?:spad\w*|zni\w*|strac\w*|przecen\w*|obniz\w*|zmniejsz\w*|minus\w*|nizs\w*)|zamiast\s+(?:spad\w*|obniz\w*))/u.test(normalized);
  const negatedUp = /\b(nie\s+(?:ma\s+)?(?:wzr\w*|ros\w*|zwyz\w*|zysk\w*|podwyz\w*|zwieksz\w*|rekord\w*|plus\w*)|zamiast\s+(?:wzr\w*|zysk\w*))/u.test(normalized);

  const rawUp = /\b(wzr\w*|ros\w*|zwyz\w*|zysk\w*|podwyz\w*|zwieksz\w*|rekord\w*|plus\w*)/u.test(normalized);
  const rawDown = /\b(spad\w*|zni\w*|strac\w*|przecen\w*|obniz\w*|zmniejsz\w*|minus\w*|nizs\w*)/u.test(normalized);

  const up = (rawUp && !negatedUp) || negatedDown;
  const down = (rawDown && !negatedDown) || negatedUp;

  if (up && down) return 'mixed';
  if (up) return 'up';
  if (down) return 'down';
  return 'none';
}

function namedEntities(value: string): string[] {
  const candidates = new Set<string>();
  // Two-word capitalized phrases (e.g. Cyfrowy Polsat, CD Projekt, PKO BP)
  for (const match of value.matchAll(/\b([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż0-9-]+)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż0-9-]+)\b/gu)) {
    const firstWord = normalizeEvidence(match[1]);
    if (!COMMON_NON_ENTITY_STARTERS.has(firstWord)) {
      candidates.add(match[0]);
    }
  }
  // Market indices and acronyms
  for (const match of value.matchAll(/\b(?:m?WIG\d+|sWIG\d+|WIG-Banki|GPW|NBP|RPP|EBC|ECB|KNF|GUS|FED|PZU|JSW|XTB|CCC|LPP)\b/giu)) {
    candidates.add(match[0]);
  }
  // Single-word known financial companies and institutions (with Polish inflection)
  for (const entity of KNOWN_FINANCIAL_ENTITIES) {
    const escaped = entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}(?:[uayóeięą]|em|ie|owi|ego|ym)?\\b`, 'iu');
    if (regex.test(value)) {
      candidates.add(entity);
    }
  }
  return [...candidates];
}

/**
 * Anchors each non-CTA scene to an exact excerpt from the supplied article text.
 * This deterministic check validates quote membership and numeric/directional
 * consistency; it is not a substitute for semantic entailment or editorial review.
 */
export function evaluateSourceEvidence(rawScenes: unknown, options: SourceFactQaOptions): SourceFactReport {
  const scenes = Array.isArray(rawScenes) ? rawScenes.map(objectValue) : [];
  const findings: SourceFactFinding[] = [];
  const sourceText = options.sourceText.trim();
  const normalizedSource = normalizeEvidence(sourceText);
  const ctaSceneIndex = options.ctaSceneIndex !== undefined
    ? options.ctaSceneIndex
    : (scenes.length > 1 ? scenes.length - 1 : -1);
  const maxEvidenceLength = options.maxEvidenceLength ?? 600;

  if (options.requireEvidence !== false && !sourceText) {
    findings.push({
      code: 'missing_source_material',
      severity: 'blocker',
      message: 'Brakuje tekstu źródłowego; nie można zatwierdzić faktograficznego Shorta.'
    });
  }

  scenes.forEach((scene, index) => {
    if (index === ctaSceneIndex) return;
    const sceneNumber = index + 1;
    const evidence = textValue(scene, ['sourceEvidence', 'source_evidence']);
    const narration = textValue(scene, ['voiceover_text', 'voiceoverText', 'voiceover', 'narration', 'speech']);
    const caption = textValue(scene, ['subtitles', 'caption', 'text']);
    if (options.requireEvidence === false && !evidence) return;
    if (!evidence) {
      findings.push({
        code: 'missing_source_evidence',
        severity: 'blocker',
        message: `Scena ${sceneNumber} nie wskazuje cytatu ani fragmentu źródłowego.`,
        scene: sceneNumber
      });
      return;
    }
    if (evidence.length > maxEvidenceLength) {
      findings.push({
        code: 'source_evidence_too_long',
        severity: 'blocker',
        message: `Dowód źródłowy sceny ${sceneNumber} przekracza ${maxEvidenceLength} znaków.`,
        scene: sceneNumber
      });
      return;
    }
    const normalizedEvidence = normalizeEvidence(evidence);
    if (!normalizedSource || !normalizedSource.includes(normalizedEvidence)) {
      findings.push({
        code: 'source_evidence_not_in_article',
        severity: 'blocker',
        message: `Dowód źródłowy sceny ${sceneNumber} nie jest dosłownym fragmentem dostarczonego artykułu.`,
        scene: sceneNumber
      });
      return;
    }

    const evidenceNumbers = new Set(numericTokens(evidence));
    const claimNumbers = [...numericTokens(narration), ...numericTokens(caption)];
    const unsupportedNumber = claimNumbers.find((number) => {
      if (evidenceNumbers.has(number)) return false;
      const parsed = parseFloat(number);
      if (Number.isFinite(parsed) && evidenceNumbers.has(parsed.toString())) return false;
      return true;
    });
    if (unsupportedNumber) {
      findings.push({
        code: 'unsupported_numeric_claim',
        severity: 'blocker',
        message: `Scena ${sceneNumber} zawiera liczbę „${unsupportedNumber}”, której nie ma w przypisanym fragmencie źródła.`,
        scene: sceneNumber
      });
      return;
    }

    const normalizedEvidenceText = normalizeEvidence(evidence);
    const unsupportedEntity = namedEntities(`${narration} ${caption}`)
      .find((entity) => {
        const normEntity = normalizeEvidence(entity);
        if (normalizedEvidenceText.includes(normEntity)) return false;
        const escaped = normEntity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const entityRegex = new RegExp(`\\b${escaped}(?:[uayóeięą]|em|ie|owi|ego|ym)?\\b`, 'iu');
        return !entityRegex.test(evidence);
      });
    if (unsupportedEntity) {
      findings.push({
        code: 'unsupported_entity_claim',
        severity: 'blocker',
        message: `Podmiot „${unsupportedEntity}” w scenie ${sceneNumber} nie występuje w przypisanym fragmencie źródła.`,
        scene: sceneNumber
      });
      return;
    }

    const evidenceDirection = direction(evidence);
    const claimDirection = direction(`${narration} ${caption}`);
    if ((evidenceDirection === 'up' && claimDirection === 'down') ||
        (evidenceDirection === 'down' && claimDirection === 'up')) {
      findings.push({
        code: 'contradictory_numeric_direction',
        severity: 'blocker',
        message: `Kierunek zmiany w scenie ${sceneNumber} przeczy przypisanemu fragmentowi źródła.`,
        scene: sceneNumber
      });
    }
  });

  return {
    status: findings.length ? 'blocked' : 'pass',
    findings,
    checkedAt: new Date().toISOString()
  };
}
