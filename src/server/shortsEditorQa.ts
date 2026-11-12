import { evaluateSourceEvidence } from './sourceFactQa';
import { isSafeFinanceDataVisualSvg, MAX_SHORT_DURATION_SECONDS, TARGET_SHORT_DURATION_SECONDS } from './sceneContract';

export type ShortsEditorQaSeverity = 'blocker' | 'warning';
export type ShortsEditorQaStatus = 'pass' | 'review' | 'blocked';

export interface ShortsEditorQaFinding {
  code: string;
  severity: ShortsEditorQaSeverity;
  message: string;
  scene?: number;
}

export interface ShortsEditorQaReport {
  status: ShortsEditorQaStatus;
  score: number;
  findings: ShortsEditorQaFinding[];
  checkedAt: string;
}

export function shouldBlockQa(status: ShortsEditorQaStatus, requirePass = false): boolean {
  return status === 'blocked' || (requirePass && status !== 'pass');
}

export interface NarrationWordRange {
  min: number;
  max: number;
}

export function hasNarrationWithinWordRanges(
  rawScenes: unknown,
  sceneRanges: NarrationWordRange[],
  totalRange?: NarrationWordRange,
  totalFinalSceneText?: string
): boolean {
  if (!Array.isArray(rawScenes) || rawScenes.length !== sceneRanges.length) return false;
  const counts = rawScenes.map((value) => {
    const narration = getSceneNarrationText(value);
    return countWords(narration);
  });
  if (counts.some((count, index) => count < sceneRanges[index].min || count > sceneRanges[index].max)) return false;
  if (totalRange) {
    const total = totalFinalSceneText === undefined
      ? counts.reduce((sum, count) => sum + count, 0)
      : counts.slice(0, -1).reduce((sum, count) => sum + count, 0) + countWords(totalFinalSceneText);
    if (total < totalRange.min || total > totalRange.max) return false;
  }
  return true;
}

export interface ShortsEditorQaOptions {
  expectedSceneCount?: number;
  maxDurationSeconds?: number;
  expectedDurationSeconds?: number;
  requireCta?: boolean;
  requireVisualQueries?: boolean;
  requireUniquePexelsIds?: boolean;
  requireCaptionAlignment?: boolean;
  maxWordsPerScene?: (sceneIndex: number) => number;
  maxNarrationWordsExcludingLast?: number;
  sourceText?: string;
  requireSourceEvidence?: boolean;
  requireBrandedCta?: boolean;
  skipCaptionAlignment?: boolean;
  skipNarrationLengthChecks?: boolean;
}

export interface RenderedShortMetrics {
  hasVideo: boolean;
  hasAudio: boolean;
  width?: number;
  height?: number;
  durationSeconds?: number;
  sizeBytes?: number;
  requireAudio?: boolean;
  maxDurationSeconds?: number;
  expectedDurationSeconds?: number;
  expectedAspectRatio?: number;
}

function sceneObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function firstText(scene: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = scene[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

const SCENE_NARRATION_KEYS = [
  'voiceover_text',
  'voiceoverText',
  'voiceover',
  'narration',
  'speech',
  'subtitles',
  'caption',
  'text',
  'tekst_głosowy'
];

export function getSceneNarrationText(value: unknown): string {
  const scene = sceneObject(value);
  const narration = firstText(scene, SCENE_NARRATION_KEYS);
  if (narration) {
    // Normalize model aliases before downstream code reads canonical renderer fields.
    if (typeof scene.voiceover_text !== 'string' || !scene.voiceover_text.trim()) {
      scene.voiceover_text = narration;
    }
    if (typeof scene.subtitles !== 'string' || !scene.subtitles.trim()) {
      scene.subtitles = narration;
    }
  }
  return narration;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pl-PL')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function looksLikeCallToAction(value: string): boolean {
  const normalized = normalizeText(value);
  return /\b(sprawdz|zobacz|policz|porownaj|czytaj|poznaj|wejdz|skorzystaj|pobierz|pelny kontekst|raport finansowy 24)\b/.test(normalized);
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function evaluateShortStoryboard(rawScenes: unknown, options: ShortsEditorQaOptions = {}): ShortsEditorQaReport {
  const scenes = Array.isArray(rawScenes) ? rawScenes.map(sceneObject) : [];
  const expectedSceneCount = options.expectedSceneCount;
  const maxDurationSeconds = options.maxDurationSeconds ?? MAX_SHORT_DURATION_SECONDS;
  const findings: ShortsEditorQaFinding[] = [];
  let score = 100;

  const addFinding = (finding: ShortsEditorQaFinding) => {
    findings.push(finding);
    score -= finding.severity === 'blocker' ? 30 : 8;
  };

  if (scenes.length === 0) {
    addFinding({ code: 'no_scenes', severity: 'blocker', message: 'Plan nie zawiera żadnej scen.' });
  }
  if (Number.isInteger(expectedSceneCount) && scenes.length !== expectedSceneCount) {
    addFinding({ code: 'scene_count', severity: 'blocker', message: `Oczekiwano ${expectedSceneCount} scen, otrzymano ${scenes.length}.` });
  }

  const narrations: string[] = [];
  const visualQueries: string[] = [];
  const visualIds: number[] = [];
  let totalDuration = 0;
  let narrationWordsExcludingLast = 0;

  scenes.forEach((scene, index) => {
    const sceneNumber = index + 1;
    const narration = firstText(scene, ['voiceover_text', 'voiceoverText', 'voiceover', 'narration', 'speech', 'subtitles', 'caption', 'text']);
    const caption = firstText(scene, ['subtitles', 'caption', 'text', 'voiceover_text', 'voiceoverText']);
    const visualQuery = firstText(scene, ['searchKeyword', 'search_keyword', 'visualQuery', 'visual_query', 'pexelsQuery']);
    const rawDuration = Number(scene.duration ?? scene.scene_duration ?? scene.sceneDuration);
    const duration = Number.isFinite(rawDuration) && rawDuration > 0
      ? rawDuration
      : scenes.length > 0 ? TARGET_SHORT_DURATION_SECONDS / scenes.length : 0;

    totalDuration += duration;
    narrations.push(normalizeText(narration));
    visualQueries.push(normalizeText(visualQuery));

    if (!narration) {
      addFinding({ code: 'missing_narration', severity: 'blocker', message: `Scena ${sceneNumber} nie ma tekstu lektora.`, scene: sceneNumber });
    }
    if (rawDuration < 0 || (Number.isFinite(rawDuration) && rawDuration === 0)) {
      addFinding({ code: 'invalid_duration', severity: 'blocker', message: `Scena ${sceneNumber} ma nieprawidłowy czas.`, scene: sceneNumber });
    }
    if (!caption) {
      addFinding({ code: 'missing_caption', severity: 'warning', message: `Scena ${sceneNumber} nie ma tekstu napisów.`, scene: sceneNumber });
    } else if (!options.skipCaptionAlignment && narration && normalizeText(caption) !== normalizeText(narration)) {
      addFinding({
        code: 'caption_voiceover_mismatch',
        severity: options.requireCaptionAlignment ? 'blocker' : 'warning',
        message: `Napisy w scenie ${sceneNumber} różnią się od tekstu lektora.`,
        scene: sceneNumber
      });
    }
    if (options.requireVisualQueries && !visualQuery) {
      addFinding({ code: 'missing_visual_query', severity: 'blocker', message: `Scena ${sceneNumber} nie ma opisu ujęcia do dopasowania obrazu.`, scene: sceneNumber });
    }
    if (caption.length > 56) {
      addFinding({ code: 'caption_too_long', severity: 'warning', message: `Napis w scenie ${sceneNumber} jest długi i może być trudny do przeczytania.`, scene: sceneNumber });
    }

    const wordCount = countWords(narration);
    const isFinalCta = options.requireCta === true && index === scenes.length - 1;
    if (index < scenes.length - 1) narrationWordsExcludingLast += wordCount;
    const maxWords = options.maxWordsPerScene?.(index);
    if (!options.skipNarrationLengthChecks && !isFinalCta && typeof maxWords === 'number' && wordCount > maxWords) {
      addFinding({ code: 'scene_copy_too_long', severity: 'warning', message: `Scena ${sceneNumber} ma ${wordCount} słów; zalecane maksimum to ${maxWords}.`, scene: sceneNumber });
    }
    if (!options.skipNarrationLengthChecks && !isFinalCta && duration > 0 && wordCount / duration > 3.2) {
      addFinding({ code: 'narration_too_dense', severity: 'warning', message: `Tekst sceny ${sceneNumber} jest zbyt gęsty względem jej czasu.`, scene: sceneNumber });
    }
    if (index === 0 && duration > 3.2) {
      addFinding({ code: 'hook_too_slow', severity: 'warning', message: 'Pierwsze ujęcie trwa ponad 3,2 s; hook może pojawić się zbyt późno.', scene: sceneNumber });
    }

    const rawVisualId = Number(scene.pexelsId ?? scene.pexels_id);
    if (Number.isSafeInteger(rawVisualId) && rawVisualId > 0) {
      visualIds.push(rawVisualId);
    } else if (options.requireUniquePexelsIds && scene.visualMode !== 'data_visual') {
      addFinding({ code: 'missing_visual_asset_id', severity: 'blocker', message: `Scena ${sceneNumber} nie ma rozpoznanego ID klipu Pexels.`, scene: sceneNumber });
    }
  });

  if (!options.skipNarrationLengthChecks && typeof options.maxNarrationWordsExcludingLast === 'number' && narrationWordsExcludingLast > options.maxNarrationWordsExcludingLast) {
    addFinding({ code: 'total_words_over_limit', severity: 'blocker', message: `Lektor scen 1–${Math.max(1, scenes.length - 1)} ma ${narrationWordsExcludingLast} słów; limit to ${options.maxNarrationWordsExcludingLast}.` });
  }
  if (totalDuration > maxDurationSeconds + 0.001) {
    addFinding({ code: 'duration_over_limit', severity: 'blocker', message: `Plan ma ${totalDuration.toFixed(2)} s; limit wynosi ${maxDurationSeconds} s.` });
  }
  if (typeof options.expectedDurationSeconds === 'number' && Math.abs(totalDuration - options.expectedDurationSeconds) > 2) {
    addFinding({ code: 'duration_off_target', severity: 'warning', message: `Plan ma ${totalDuration.toFixed(2)} s zamiast około ${options.expectedDurationSeconds} s.` });
  }

  const seenNarrations = new Map<string, number>();
  narrations.forEach((text, index) => {
    if (!text) return;
    const firstIndex = seenNarrations.get(text);
    if (firstIndex !== undefined) {
      addFinding({ code: 'repeated_narration', severity: 'warning', message: `Tekst lektora w scenie ${index + 1} powtarza scenę ${firstIndex + 1}; usuń powtórkę lub dodaj nową informację.`, scene: index + 1 });
    } else {
      seenNarrations.set(text, index);
    }
  });

  const seenQueries = new Set<string>();
  visualQueries.forEach((query, index) => {
    if (!query) return;
    if (seenQueries.has(query)) {
      addFinding({ code: 'repeated_visual_query', severity: 'warning', message: `Zapytanie wizualne sceny ${index + 1} powtarza wcześniejsze ujęcie.`, scene: index + 1 });
    }
    seenQueries.add(query);
  });

  if (options.requireUniquePexelsIds && new Set(visualIds).size !== visualIds.length) {
    addFinding({ code: 'repeated_visual_asset', severity: 'blocker', message: 'Co najmniej dwie sceny używają tego samego klipu Pexels.' });
  }

  if (options.requireCta && scenes.length > 0) {
    const lastScene = scenes[scenes.length - 1];
    const finalCopy = firstText(lastScene, ['voiceover_text', 'voiceoverText', 'voiceover', 'narration', 'subtitles', 'caption', 'text']);
    if (!looksLikeCallToAction(finalCopy)) {
      addFinding({ code: 'missing_final_cta', severity: 'blocker', message: 'Ostatnia scena nie zawiera rozpoznawalnego, krótkiego wezwania do działania.' });
    }
    if (options.requireBrandedCta && (lastScene.visualMode !== 'data_visual' || !isSafeFinanceDataVisualSvg(lastScene.visualSvg))) {
      addFinding({ code: 'unbranded_final_cta', severity: 'blocker', message: 'Końcowa scena musi być bezpieczną, brandową planszą CTA renderowaną przez aplikację; klip stockowy jest niedozwolony.' });
    }
  }

  if (options.requireSourceEvidence) {
    const sourceReport = evaluateSourceEvidence(scenes, {
      sourceText: options.sourceText || '',
      ctaSceneIndex: (options.requireCta !== false && scenes.length > 1) ? scenes.length - 1 : -1,
      requireEvidence: true
    });
    sourceReport.findings.forEach((finding) => addFinding(finding));
  }

  if (score < 55 && !findings.some((finding) => finding.severity === 'blocker')) {
    addFinding({ code: 'low_storyboard_score', severity: 'blocker', message: 'Storyboard ma zbyt wiele problemów jakościowych, by bezpiecznie go renderować.' });
  }
  const finalScore = clampScore(score);
  const hasBlockers = findings.some((finding) => finding.severity === 'blocker');
  return {
    status: hasBlockers ? 'blocked' : findings.length > 0 ? 'review' : 'pass',
    score: finalScore,
    findings,
    checkedAt: new Date().toISOString()
  };
}

export function buildShortsEditorQaRevisionInstruction(report: ShortsEditorQaReport): string {
  const issues = report.findings.slice(0, 12).map((finding) => `- ${finding.message}`);
  return [
    'SHORTS EDITOR QA — JEDNA OGRANICZONA POPRAWKA PLANU PRZED RENDEREM',
    'Zachowaj ten sam artykuł i wyłącznie potwierdzone fakty. Nie twórz nowego tematu ani nie wymyślaj liczb.',
    'Zwróć dokładnie 8 scen na około 23 sekundy (maksymalnie 28 sekund). Pierwsze ujęcie ma zatrzymać uwagę od razu; ostatnie ma zawierać zatwierdzone CTA.',
    'Każda scena ma mieć krótką narrację, identyczną treść napisów i konkretne, unikalne zapytanie wizualne odnoszące się do tej kwestii.',
    'Każda scena faktograficzna musi zawierać sourceEvidence: krótki, dosłowny cytat z przekazanego artykułu. Cytat musi zawierać wykorzystane liczby i nie może być parafrazowany ani wymyślony.',
    'Usuń powtórzone zdania, ogólniki i niepotrzebne słowa. Nie czytaj URL-i lektorem. Nie zmieniaj polityki CTA.',
    'Popraw tylko wykazane problemy:',
    ...(issues.length ? issues : ['- Podnieś jakość hooka, różnorodność ujęć i czytelność narracji.']),
    'To ostatnia próba poprawienia scenariusza. Nie uruchamiaj dodatkowych renderów.'
  ].join('\n');
}

export function evaluateRenderedShort(metrics: RenderedShortMetrics): ShortsEditorQaReport {
  const findings: ShortsEditorQaFinding[] = [];
  let score = 100;
  const addFinding = (finding: ShortsEditorQaFinding) => {
    findings.push(finding);
    score -= finding.severity === 'blocker' ? 35 : 10;
  };
  const maxDurationSeconds = metrics.maxDurationSeconds ?? MAX_SHORT_DURATION_SECONDS;

  if (!metrics.hasVideo) {
    addFinding({ code: 'missing_video_stream', severity: 'blocker', message: 'Gotowy plik nie zawiera strumienia wideo.' });
  }
  if (metrics.requireAudio !== false && !metrics.hasAudio) {
    addFinding({ code: 'missing_audio_stream', severity: 'blocker', message: 'Gotowy plik nie zawiera wymaganego strumienia audio.' });
  }
  if (!Number.isFinite(metrics.width) || !Number.isFinite(metrics.height) || Number(metrics.width) <= 0 || Number(metrics.height) <= 0) {
    addFinding({ code: 'invalid_dimensions', severity: 'blocker', message: 'Nie udało się odczytać rozdzielczości gotowego pliku.' });
  } else {
    const actualRatio = Number(metrics.width) / Number(metrics.height);
    const expectedRatio = metrics.expectedAspectRatio ?? (9 / 16);
    if (Math.abs(actualRatio - expectedRatio) > 0.02) {
      addFinding({ code: 'wrong_aspect_ratio', severity: 'blocker', message: `Wideo nie ma pionowych proporcji 9:16 (${metrics.width}×${metrics.height}).` });
    }
  }
  if (!Number.isFinite(metrics.durationSeconds) || Number(metrics.durationSeconds) <= 0) {
    addFinding({ code: 'invalid_output_duration', severity: 'blocker', message: 'Nie udało się odczytać długości gotowego pliku.' });
  } else {
    if (Number(metrics.durationSeconds) > maxDurationSeconds + 0.25) {
      addFinding({ code: 'output_over_duration_limit', severity: 'blocker', message: `Gotowy film trwa ${Number(metrics.durationSeconds).toFixed(2)} s; limit wynosi ${maxDurationSeconds} s.` });
    }
    if (Number(metrics.durationSeconds) < 6) {
      addFinding({ code: 'output_too_short', severity: 'warning', message: `Gotowy film trwa tylko ${Number(metrics.durationSeconds).toFixed(2)} s.` });
    }
    // Longer speech-led renders may use the explicitly allowed reserve up to maxDurationSeconds.
    // Do not warn merely because a valid narration expanded beyond the 23s editorial target.
    if (typeof metrics.expectedDurationSeconds === 'number' &&
        Number(metrics.durationSeconds) < metrics.expectedDurationSeconds - 3) {
      addFinding({
        code: 'output_duration_off_target',
        severity: 'warning',
        message: 'Gotowy film jest wyraźnie krótszy od planowanych ' + metrics.expectedDurationSeconds + ' s.'
      });
    }
  }
  if (!Number.isFinite(metrics.sizeBytes) || Number(metrics.sizeBytes) <= 0) {
    addFinding({ code: 'empty_output_file', severity: 'blocker', message: 'Gotowy plik jest pusty lub nieczytelny.' });
  }

  const finalScore = clampScore(score);
  const hasBlockers = findings.some((finding) => finding.severity === 'blocker');
  return {
    status: hasBlockers ? 'blocked' : findings.length > 0 ? 'review' : 'pass',
    score: finalScore,
    findings,
    checkedAt: new Date().toISOString()
  };
}
