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

/** Resolve candidates sequentially while reserving every original and newly selected Pexels ID. */
export async function resolveUniqueQaRepairAssets<Candidate, Asset extends { pexelsId?: number }>(
  candidates: Candidate[],
  existingIds: number[],
  resolve: (candidate: Candidate, usedIds: number[]) => Promise<Asset>
): Promise<Asset[]> {
  const usedIds = new Set(existingIds.filter((id) => Number.isSafeInteger(id) && id > 0));
  const resolvedAssets: Asset[] = [];
  for (const candidate of candidates) {
    const asset = await resolve(candidate, [...usedIds]);
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
  rerenderAndValidate: (assets: Asset[]) => Promise<void>
): Promise<{ status: 'skipped' | 'stock_search_failed' | 'render_failed' | 'completed'; error?: string }> {
  if (!canAttemptQaRepair(attempt) || candidates.length === 0) return { status: 'skipped' };
  let assets: Asset[];
  try {
    assets = await resolveAssets(candidates);
  } catch (error) {
    return { status: 'stock_search_failed', error: error instanceof Error ? error.message : String(error) };
  }
  try {
    await rerenderAndValidate(assets);
    return { status: 'completed' };
  } catch (error) {
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
    if (!scene || scene.source !== 'pexels' || scene.visualMode === 'data_visual' || !scene.videoUrl || !qaResult || qaResult.match || qaResult.confidence < 0.8) continue;
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
