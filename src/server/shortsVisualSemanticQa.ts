export interface VisualSemanticSample {
  scene: number;
  narration: string;
  timestampSeconds: number;
}

export interface VisualSemanticResult {
  scene: number;
  match: boolean;
  confidence: number;
  reason: string;
}

export interface VisualSemanticReport {
  status: 'pass' | 'review' | 'blocked';
  model: string;
  analyzedScenes: number;
  findings: Array<{
    code: string;
    severity: 'blocker' | 'warning';
    message: string;
    scene?: number;
  }>;
  results: VisualSemanticResult[];
  checkedAt: string;
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function clampConfidence(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
}

export function parseVisualSemanticResponse(text: string, expectedScenes: number): VisualSemanticResult[] {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Model nie zwrócił obiektu JSON dla analizy semantycznej.');

  const root = safeObject(JSON.parse(trimmed.slice(start, end + 1)));
  const rawResults = Array.isArray(root.results) ? root.results : [];
  const seen = new Set<number>();
  const results: VisualSemanticResult[] = [];

  for (const raw of rawResults) {
    const item = safeObject(raw);
    const scene = Number(item.scene);
    if (!Number.isInteger(scene) || scene < 1 || scene > expectedScenes || seen.has(scene)) continue;
    if (typeof item.match !== 'boolean') continue;
    seen.add(scene);
    results.push({
      scene,
      match: item.match,
      confidence: clampConfidence(item.confidence),
      reason: typeof item.reason === 'string' ? item.reason.trim().slice(0, 300) : ''
    });
  }
  return results.sort((a, b) => a.scene - b.scene);
}

export function buildVisualSemanticReport(
  expectedScenes: number,
  results: VisualSemanticResult[],
  model: string
): VisualSemanticReport {
  const findings: VisualSemanticReport['findings'] = [];
  const byScene = new Map(results.map((result) => [result.scene, result]));

  for (let scene = 1; scene <= expectedScenes; scene++) {
    const result = byScene.get(scene);
    if (!result) {
      findings.push({
        code: 'visual_analysis_missing_scene',
        severity: 'warning',
        message: `Nie otrzymano oceny dopasowania obrazu do lektora dla sceny ${scene}.`,
        scene
      });
      continue;
    }
    if (result.match) continue;

    const severity = result.confidence >= 0.8 ? 'blocker' : 'warning';
    findings.push({
      code: 'visual_narration_mismatch',
      severity,
      message: `Obraz może nie pasować do lektora w scenie ${scene} (pewność ${(result.confidence * 100).toFixed(0)}%).${result.reason ? ` ${result.reason}` : ''}`,
      scene
    });
  }

  const status = findings.some((finding) => finding.severity === 'blocker')
    ? 'blocked'
    : findings.length ? 'review' : 'pass';
  return {
    status,
    model,
    analyzedScenes: results.length,
    findings,
    results,
    checkedAt: new Date().toISOString()
  };
}

export function buildVisualAnalysisUnavailableReport(expectedScenes: number, reason: string, model = 'unavailable'): VisualSemanticReport {
  return {
    status: 'review',
    model,
    analyzedScenes: 0,
    findings: [{
      code: 'visual_analysis_unavailable',
      severity: 'warning',
      message: `Nie wykonano semantycznej analizy klatek (${expectedScenes} scen). ${reason.slice(0, 300)}`
    }],
    results: [],
    checkedAt: new Date().toISOString()
  };
}
