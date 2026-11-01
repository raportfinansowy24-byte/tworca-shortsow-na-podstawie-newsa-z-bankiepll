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

export interface ShortsEditorQaOptions {
  expectedSceneCount?: number;
  maxDurationSeconds?: number;
  expectedDurationSeconds?: number;
  requireCta?: boolean;
  requireVisualQueries?: boolean;
  requireUniquePexelsIds?: boolean;
  requireCaptionAlignment?: boolean;
  maxWordsPerScene?: (sceneIndex: number) => number;
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
  const maxDurationSeconds = options.maxDurationSeconds ?? 23;
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

  scenes.forEach((scene, index) => {
    const sceneNumber = index + 1;
    const narration = firstText(scene, ['voiceover_text', 'voiceoverText', 'voiceover', 'narration', 'speech', 'subtitles', 'caption', 'text']);
    const caption = firstText(scene, ['subtitles', 'caption', 'text', 'voiceover_text', 'voiceoverText']);
    const visualQuery = firstText(scene, ['searchKeyword', 'search_keyword', 'visualQuery', 'visual_query', 'pexelsQuery']);
    const rawDuration = Number(scene.duration ?? scene.scene_duration ?? scene.sceneDuration);
    const duration = Number.isFinite(rawDuration) && rawDuration > 0
      ? rawDuration
      : scenes.length > 0 ? 18 / scenes.length : 0;

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
    } else if (narration && normalizeText(caption) !== normalizeText(narration)) {
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
    const maxWords = options.maxWordsPerScene?.(index);
    if (typeof maxWords === 'number' && wordCount > maxWords) {
      addFinding({ code: 'scene_copy_too_long', severity: 'warning', message: `Scena ${sceneNumber} ma ${wordCount} słów; zalecane maksimum to ${maxWords}.`, scene: sceneNumber });
    }
    if (duration > 0 && wordCount / duration > 3.2) {
      addFinding({ code: 'narration_too_dense', severity: 'warning', message: `Tekst sceny ${sceneNumber} jest zbyt gęsty względem jej czasu.`, scene: sceneNumber });
    }
    if (index === 0 && duration > 3.2) {
      addFinding({ code: 'hook_too_slow', severity: 'warning', message: 'Pierwsze ujęcie trwa ponad 3,2 s; hook może pojawić się zbyt późno.', scene: sceneNumber });
    }

    const rawVisualId = Number(scene.pexelsId ?? scene.pexels_id);
    if (Number.isSafeInteger(rawVisualId) && rawVisualId > 0) {
      visualIds.push(rawVisualId);
    } else if (options.requireUniquePexelsIds) {
      addFinding({ code: 'missing_visual_asset_id', severity: 'blocker', message: `Scena ${sceneNumber} nie ma rozpoznanego ID klipu Pexels.`, scene: sceneNumber });
    }
  });

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
    'Zwróć dokładnie 8 scen na około 18 sekund. Pierwsze ujęcie ma zatrzymać uwagę od razu; ostatnie ma zawierać zatwierdzone CTA.',
    'Każda scena ma mieć krótką narrację, identyczną treść napisów i konkretne, unikalne zapytanie wizualne odnoszące się do tej kwestii.',
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
  const maxDurationSeconds = metrics.maxDurationSeconds ?? 23;

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
    if (typeof metrics.expectedDurationSeconds === 'number' && Math.abs(Number(metrics.durationSeconds) - metrics.expectedDurationSeconds) > 3) {
      addFinding({ code: 'output_duration_off_target', severity: 'warning', message: `Gotowy film znacząco odbiega od planowanej długości ${metrics.expectedDurationSeconds} s.` });
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
