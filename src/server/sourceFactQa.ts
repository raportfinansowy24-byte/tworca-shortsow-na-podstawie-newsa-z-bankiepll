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
    .replace(/[Łł]/g, 'l')
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
  'wedlug', 'czesc', 'wiekszosc', 'prognoza', 'decyzja', 'informacja', 'komunikat',
  // Sentence openers must not be mistaken for part of a two-word proper name.
  'czy'
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

const SOURCE_ACTION_FAMILIES: Record<string, string[]> = {
  reported_results: ['odnotow', 'raportow', 'poinformow', 'opublikow', 'przedstawil', 'podal', 'wykazal', 'zaraportow', 'reported', 'announced', 'published'],
  acquisition_completed: ['przejal', 'przejela', 'przejeli', 'kupil', 'kupila', 'kupili', 'nabyl', 'nabyla', 'nabyli', 'sfinalizowal', 'sfinalizowala', 'sfinalizowali', 'acquired', 'bought', 'purchased'],
  financing_debt_issued: ['wyemit', 'emisj', 'issued', 'issuance'],
  financing_debt_borrowed: ['zaciagn', 'borrowed', 'borrow'],
  financing_capital_raised: ['pozyskal', 'pozysk', 'raised', 'raise'],
  financing_credit_granted: ['udzielil', 'udziel', 'granted', 'grant'],
  financing_funded: ['sfinans', 'finansow', 'funded', 'fund'],
  approval_granted: ['zatwierdz', 'zaakceptow', 'approved', 'approve'],
  approval_rejected: ['odrzuc', 'rejected', 'reject'],
  decision_adopted: ['zdecydow', 'uchwal', 'decided', 'adopted'],
  launch_started: ['uruchom', 'wdroz', 'wprowadz', 'launch', 'introduced'],
  launch_changed: ['zmien', 'changed'],
  launch_discontinued: ['zlikwid', 'discontinued'],
  employment_hired: ['zatrudn', 'hired', 'hire'],
  employment_fired: ['zwoln', 'fired', 'dismissed', 'laid']
};

function actionFamilies(value: string): Set<string> {
  const normalized = normalizeEvidence(value);
  const words = normalized.split(/\s+/u);
  const families = new Set<string>();

  for (const [family, stems] of Object.entries(SOURCE_ACTION_FAMILIES)) {
    if (words.some((word) => stems.some((stem) => word.startsWith(stem)))) {
      families.add(family);
    }
  }

  // Keep acquisition intent, ongoing activity and completed transactions distinct.
  const acquisitionTopic = words.some((word) =>
    ['przejec', 'przejm', 'przeja', 'kupn', 'kupow', 'kupuj', 'nabyc', 'acquir', 'purchase'].some((stem) => word.startsWith(stem))
  );
  if (acquisitionTopic) {
    const completed = families.has('acquisition_completed');
    const intent = words.some((word) =>
      ['rozwaz', 'planuj', 'zamierz', 'chc', 'negocjuj', 'moz', 'rozmaw'].some((stem) => word.startsWith(stem))
    );
    const inProgress = words.some((word) => word.startsWith('przejm') || word.startsWith('kupuj'));
    families.add(completed ? 'acquisition_completed' : intent ? 'acquisition_intent' : inProgress ? 'acquisition_in_progress' : 'acquisition_unspecified');
  }

  return families;
}


const NON_FACTUAL_ENTITY_PREDICATES = new Set([
  'jest', 'sa', 'byl', 'byla', 'bylo', 'byli', 'ma', 'maja', 'mial', 'miala',
  'mieli', 'moze', 'moga', 'powinien', 'powinna', 'powinno', 'oraz', 'takze'
]);
const DIRECTION_PREDICATES = new Set([
  'wzrosl', 'wzrosla', 'wzroslo', 'wzrosly', 'rosnie', 'rosna',
  'spadl', 'spadla', 'spadlo', 'spadly', 'spada', 'spadaja',
  'zwiekszyl', 'zwiekszyla', 'zmniejszyl', 'zmniejszyla'
]);

/**
 * Fail closed when a named entity is followed by a factual predicate that is
 * not covered by the curated action taxonomy. Unknown predicates must occur
 * verbatim in the exact source excerpt attached to the scene.
 */
function unsupportedUnclassifiedEntityPredicate(claim: string, evidence: string): string | undefined {
  const normalizedClaim = normalizeEvidence(claim);
  const normalizedEvidenceWords = new Set(normalizeEvidence(evidence).split(/\s+/u));
  const words = normalizedClaim.split(/\s+/u);
  const entities = namedEntities(claim).map(normalizeEvidence);
  const verbLike = /(?:al|ala|alo|ali|aly|il|ila|ilo|ili|yl|yla|ylo|yli|nal|nela|neli|owal|owala|owali|uje|uja|aja|aje|ia|ie|isz|ysz|amy|emy|acie|nie|ci|owac|ac|ic|yc)$/u;
  const knownActionStems = Object.values(SOURCE_ACTION_FAMILIES).flat();

  for (const entity of entities) {
    const entityWords = entity.split(/\s+/u);
    const start = words.findIndex((_, index) => entityWords.every((part, offset) => words[index + offset] === part));
    if (start < 0) continue;

    const following = words.slice(start + entityWords.length, start + entityWords.length + 6);
    for (const word of following) {
      if (word.length < 4 || !verbLike.test(word)) continue;
      if (NON_FACTUAL_ENTITY_PREDICATES.has(word) || DIRECTION_PREDICATES.has(word)) continue;
      if (knownActionStems.some((stem) => word.startsWith(stem))) continue;
      if (!normalizedEvidenceWords.has(word)) return word;
    }
  }
  return undefined;
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

    const claimActions = actionFamilies(`${narration} ${caption}`);
    const evidenceActions = actionFamilies(evidence);
    const unsupportedAction = [...claimActions].find((family) => !evidenceActions.has(family));
    const unsupportedUnknownAction = unsupportedUnclassifiedEntityPredicate(`${narration} ${caption}`, evidence);
    if (unsupportedAction) {
      findings.push({
        code: 'unsupported_claim_action',
        severity: 'blocker',
        message: `Czynność opisana w scenie ${sceneNumber} nie jest potwierdzona przypisanym fragmentem źródła.`,
        scene: sceneNumber
      });
      return;
    }
    if (unsupportedUnknownAction) {
      findings.push({
        code: 'unsupported_claim_action',
        severity: 'blocker',
        message: `Nieznana czynność „${unsupportedUnknownAction}” przypisana podmiotowi w scenie ${sceneNumber} nie występuje w dowodzie źródłowym.`,
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
