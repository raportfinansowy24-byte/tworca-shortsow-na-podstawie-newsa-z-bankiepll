import { buildArticleVisualQuery, type CreativeDirectorArticle } from './creativeDirector';

export interface QaRepairScene {
  source?: string;
  visualMode?: string;
  visualQuery?: string;
  videoUrl?: string;
  pexelsId?: number;
  voiceover_text?: string;
  subtitles?: string;
  caption?: string;
  [key: string]: unknown;
}

/** Preserve only canonical Pexels metadata that passed the route's ID validation. */
export function validatedPexelsRepairMetadata(scene: unknown): Partial<Pick<QaRepairScene, 'source' | 'pexelsId'>> {
  if (!scene || typeof scene !== 'object') return {};
  const candidate = scene as Record<string, unknown>;
  const pexelsId = candidate.pexelsId;
  if (candidate.source !== 'pexels' || !Number.isSafeInteger(pexelsId) || (pexelsId as number) <= 0) return {};
  return { source: 'pexels', pexelsId: pexelsId as number };
}

export interface QaRepairReport {
  findings: Array<{ code?: string; severity?: string; scene?: number; message?: string }>;
  visualAnalysis?: { results?: Array<{ scene: number; match: boolean; confidence: number; reason: string }> };
}

export interface QaRepairCandidate {
  sceneIndex: number;
  narration: string;
  originalQuery: string;
  reason: string;
  repairQuery: string;
}

export class QaRepairCancelledError extends Error {
  constructor() {
    super('Zadanie nie jest już aktywne; przerwano naprawę QA.');
    this.name = 'QaRepairCancelledError';
  }
}

/** Resolve candidates sequentially while reserving every original and newly selected Pexels ID. */
export async function resolveUniqueQaRepairAssets<Candidate, Asset extends { pexelsId?: number }>(
  candidates: Candidate[],
  existingIds: number[],
  resolve: (candidate: Candidate, usedIds: number[]) => Promise<Asset>,
  shouldContinue: () => boolean = () => true
): Promise<Asset[]> {
  const usedIds = new Set(existingIds.filter((id) => Number.isSafeInteger(id) && id > 0));
  const resolvedAssets: Asset[] = [];
  for (const candidate of candidates) {
    if (!shouldContinue()) throw new QaRepairCancelledError();
    const asset = await resolve(candidate, [...usedIds]);
    if (!shouldContinue()) throw new QaRepairCancelledError();
    if (!Number.isSafeInteger(asset.pexelsId) || !asset.pexelsId || usedIds.has(asset.pexelsId)) {
      throw new Error(`Pexels zwrócił nieprawidłowy lub powielony identyfikator klipu: ${String(asset.pexelsId)}.`);
    }
    usedIds.add(asset.pexelsId);
    resolvedAssets.push(asset);
  }
  return resolvedAssets;
}

export function canAttemptQaRepair(attempt: number): boolean {
  return attempt === 0;
}

export async function executeQaRepairOnce<Candidate, Asset>(
  attempt: number,
  candidates: Candidate[],
  resolveAssets: (candidates: Candidate[]) => Promise<Asset[]>,
  rerenderAndValidate: (assets: Asset[]) => Promise<void>,
  shouldContinue: () => boolean = () => true
): Promise<{ status: 'skipped' | 'cancelled' | 'stock_search_failed' | 'render_failed' | 'completed'; error?: string }> {
  if (!canAttemptQaRepair(attempt) || candidates.length === 0) return { status: 'skipped' };
  if (!shouldContinue()) return { status: 'cancelled' };
  let assets: Asset[];
  try {
    assets = await resolveAssets(candidates);
  } catch (error) {
    if (error instanceof QaRepairCancelledError) return { status: 'cancelled' };
    return { status: 'stock_search_failed', error: error instanceof Error ? error.message : String(error) };
  }
  if (!shouldContinue()) return { status: 'cancelled' };
  try {
    await rerenderAndValidate(assets);
    return { status: 'completed' };
  } catch (error) {
    if (error instanceof QaRepairCancelledError) return { status: 'cancelled' };
    return { status: 'render_failed', error: error instanceof Error ? error.message : String(error) };
  }
}

/** Only high-confidence semantic blockers on Pexels clips qualify; approved scenes remain untouched. */
export function selectQaRepairCandidates(
  scenes: QaRepairScene[],
  report: QaRepairReport,
  article: CreativeDirectorArticle
): QaRepairCandidate[] {
  const findings = new Map<number, string>();
  for (const finding of report.findings || []) {
    if (finding.code === 'visual_narration_mismatch' && finding.severity === 'blocker' && Number.isInteger(finding.scene)) {
      findings.set(finding.scene as number, finding.message || 'Obraz nie pasuje do narracji.');
    }
  }
  const resultByScene = new Map((report.visualAnalysis?.results || []).map((result) => [result.scene, result]));
  const candidates: QaRepairCandidate[] = [];
  for (const [oneBasedScene, reason] of findings) {
    const sceneIndex = oneBasedScene - 1;
    const scene = scenes[sceneIndex];
    const qaResult = resultByScene.get(oneBasedScene);
    if (!scene || scene.source !== 'pexels' || scene.visualMode === 'data_visual' || !scene.videoUrl || !qaResult || qaResult.match) continue;
    const narration = String(scene.voiceover_text || scene.subtitles || scene.caption || '').trim();
    if (!narration) continue;
    const repairQuery = buildArticleVisualQuery(article, narration, (sceneIndex + 1) % 8);
    if (!repairQuery || repairQuery.toLowerCase() === String(scene.visualQuery || '').trim().toLowerCase()) continue;
    candidates.push({ sceneIndex, narration, originalQuery: String(scene.visualQuery || ''), reason, repairQuery });
  }
  return candidates;
}

/** Replace only failed scenes' asset metadata/query; never mutate narration or timing or approved scenes. */
export function applyQaRepairAssets<T extends QaRepairScene>(
  scenes: T[],
  replacements: Array<{ sceneIndex: number; visualQuery: string; videoUrl: string; thumbnailUrl?: string; pexelsId: number; searchKeyword?: string; photographer?: string; photographerUrl?: string }>
): T[] {
  const updated = scenes.slice();
  for (const replacement of replacements) {
    const current = updated[replacement.sceneIndex];
    if (!current) throw new Error(`Nieprawidłowy numer sceny naprawy: ${replacement.sceneIndex + 1}.`);
    updated[replacement.sceneIndex] = {
      ...current,
      visualQuery: replacement.visualQuery,
      videoUrl: replacement.videoUrl,
      thumbnailUrl: replacement.thumbnailUrl,
      pexelsId: replacement.pexelsId,
      searchKeyword: replacement.searchKeyword,
      photographer: replacement.photographer,
      photographerUrl: replacement.photographerUrl
    } as T;
  }
  return updated;
}

export function buildQaRepairFailureReport(scenes: QaRepairScene[], candidates: QaRepairCandidate[], secondQa: QaRepairReport): string {
  const remaining = new Set((secondQa.findings || []).filter((finding) => finding.code === 'visual_narration_mismatch' && finding.severity === 'blocker').map((finding) => finding.scene));
  const lines = candidates.map((candidate) => {
    const sceneNumber = candidate.sceneIndex + 1;
    const result = (secondQa.visualAnalysis?.results || []).find((item) => item.scene === sceneNumber);
    return `Scena ${sceneNumber}: narracja="${candidate.narration}"; pierwotne zapytanie="${candidate.originalQuery}"; powód odrzucenia="${candidate.reason}"; zapytanie naprawcze="${candidate.repairQuery}"; ponowne QA=${result ? `${result.match ? 'pass' : 'blocked'} (${Math.round(result.confidence * 100)}%): ${result.reason}` : 'brak wyniku'}${remaining.has(sceneNumber) ? ' — nadal blocker' : ''}.`;
  });
  return `Shorts Editor QA nadal blokuje render po jednej próbie naprawy.\n${lines.join('\n')}`;
}
