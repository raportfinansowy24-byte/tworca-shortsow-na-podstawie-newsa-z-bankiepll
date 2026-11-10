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

function numericTokens(value: string): string[] {
  return [...value.matchAll(/(?<![\p{L}\p{N}])\d+(?:(?:[.,]\d+)|(?:\s+\d{3}))*(?:\s*(?:%|proc(?:ent(?:a|u|y|ów)?)?))?/giu)]
    .map((match) => (match[0] || '')
      .replace(/\s*(?:%|proc(?:ent(?:a|u|y|ów)?)?)$/iu, '')
      .replace(/\s+/g, '')
      .replace(',', '.'))
    .filter(Boolean);
}

function direction(value: string): 'up' | 'down' | 'mixed' | 'none' {
  const normalized = normalizeEvidence(value);
  const up = /\b(wzr\w*|ros\w*|zwyz\w*|zysk\w*|podwyz\w*|zwieksz\w*|rekord\w*|plus\w*)/u.test(normalized);
  const down = /\b(spad\w*|zni\w*|strac\w*|przecen\w*|obniz\w*|zmniejsz\w*|minus\w*|nizs\w*)/u.test(normalized);
  if (up && down) return 'mixed';
  if (up) return 'up';
  if (down) return 'down';
  return 'none';
}

function namedEntities(value: string): string[] {
  const candidates = new Set<string>();
  for (const match of value.matchAll(/\b[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż0-9-]+\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż0-9-]+\b/gu)) {
    candidates.add(match[0]);
  }
  for (const match of value.matchAll(/\b(?:m?WIG\d+|sWIG\d+|WIG-Banki|GPW|NBP|RPP|EBC|ECB)\b/giu)) {
    candidates.add(match[0]);
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
  const ctaSceneIndex = options.ctaSceneIndex ?? scenes.length - 1;
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
    const unsupportedNumber = claimNumbers.find((number) => !evidenceNumbers.has(number));
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
      .find((entity) => !normalizedEvidenceText.includes(normalizeEvidence(entity)));
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
