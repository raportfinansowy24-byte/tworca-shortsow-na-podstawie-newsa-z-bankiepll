import assert from 'node:assert/strict';
import { applyQaRepairResultBatch, normalizeQaRepairAssetResult, validateQaRepairAssetBatch } from '../src/server/qaRepairResult';
import { toQaRepairTelemetryRow } from '../src/server/pipelineTelemetry';
import { applyQaRepairAssets, buildQaRepairFailureReport, canAttemptQaRepair, executeQaRepairOnce, QaRepairCancelledError, resolveUniqueQaRepairAssets, selectQaRepairCandidates, validatedPexelsRepairMetadata, type QaRepairReport, type QaRepairScene } from '../src/server/qaRepair';

const article = { title: 'NBP pozostaje w centrum sporu o decyzję RPP', description: 'Narodowy Bank Polski i Rada Polityki Pieniężnej.' };
const scenes: QaRepairScene[] = Array.from({ length: 8 }, (_, index) => ({
  source: 'pexels', visualQuery: `generic query ${index + 1}`, videoUrl: `https://video/${index + 1}.mp4`, pexelsId: 100 + index,
  voiceover_text: `Narracja sceny ${index + 1}`, subtitles: `NAPIS ${index + 1}`, duration: 2.25
}));
const report: QaRepairReport = {
  findings: [
    { code: 'visual_narration_mismatch', severity: 'blocker', scene: 3, message: 'Scena 3 pokazuje kryptowaluty zamiast instytucji.' },
    { code: 'visual_narration_mismatch', severity: 'warning', scene: 4, message: 'Niska pewność.' },
    { code: 'visual_analysis_missing_scene', severity: 'warning', scene: 5, message: 'Brak wyniku.' }
  ],
  visualAnalysis: { results: [
    { scene: 3, match: false, confidence: 0.25, reason: 'Niska pewność, ale widoczny temat jest sprzeczny z lektorem.' },
    { scene: 4, match: false, confidence: 0.6, reason: 'Niepewne.' },
    { scene: 5, match: false, confidence: 0.95, reason: 'missing.' }
  ] }
};
const candidates = selectQaRepairCandidates(scenes, report, article);
assert.equal(candidates.length, 1, 'naprawa obejmuje jawne match=false także przy niskiej pewności modelu');
assert.equal(candidates[0].sceneIndex, 2);
assert.equal(candidates[0].narration, 'Narracja sceny 3');
assert.match(candidates[0].reason, /widoczny temat jest sprzeczny z lektorem/i, 'naprawa zachowuje konkretny powód wizualny z QA');
assert.match(candidates[0].repairQuery, /National Bank of Poland/i);
assert.notEqual(candidates[0].repairQuery, candidates[0].originalQuery);
assert.deepEqual(validatedPexelsRepairMetadata({ source: 'pexels', pexelsId: 102 }), { source: 'pexels', pexelsId: 102 });
assert.deepEqual(validatedPexelsRepairMetadata({ source: 'pexels', pexelsId: '102' }), {}, 'nie zachowuj ID w niekanonicznym formacie');
assert.deepEqual(validatedPexelsRepairMetadata({ source: 'other', pexelsId: 102 }), {});
const validPixabayMetadata = { source: 'pixabay', pexelsId: 1_000_000_000_123, pixabayId: 123, stockId: 'pixabay:123', sourcePageUrl: 'https://pixabay.com/videos/id-123/' };
assert.deepEqual(validatedPexelsRepairMetadata(validPixabayMetadata), validPixabayMetadata, 'zachowaj poprawne ID, provider i stronę źródłową Pixabay');
assert.deepEqual(validatedPexelsRepairMetadata({ ...validPixabayMetadata, stockId: 'pixabay:999' }), {}, 'odrzuć niespójny identyfikator stock');
assert.deepEqual(validatedPexelsRepairMetadata({ ...validPixabayMetadata, sourcePageUrl: 'https://evil.example/pixabay.com/video' }), {}, 'odrzuć obcy host źródła');

const apiNormalizedScenes = scenes.map((scene) => ({
  ...scene,
  source: undefined,
  pexelsId: undefined,
  ...validatedPexelsRepairMetadata({ source: 'pexels', pexelsId: scene.pexelsId })
}));
assert.equal(selectQaRepairCandidates(apiNormalizedScenes, report, article).length, 1, 'zwalidowane Pexels source i ID zachowane przez normalizację umożliwiają one-shot repair');

const repaired = applyQaRepairAssets(scenes, [{ sceneIndex: 2, visualQuery: candidates[0].repairQuery, videoUrl: 'https://new-video/3.mp4', pexelsId: 999 }]);
assert.equal(repaired[2].voiceover_text, scenes[2].voiceover_text, 'naprawa nie zmienia narracji');
assert.equal(repaired[2].subtitles, scenes[2].subtitles, 'naprawa nie zmienia napisów');
assert.equal(repaired[2].duration, scenes[2].duration, 'naprawa nie zmienia czasu');
assert.equal(repaired[2].videoUrl, 'https://new-video/3.mp4');
assert.equal(repaired[2].pexelsId, 999);
assert.equal(repaired[0], scenes[0], 'zaakceptowane sceny są zachowane bez zmian');
assert.equal(repaired[7], scenes[7], 'zaakceptowane sceny nie są ponownie pobierane');
const pixabayRepaired = applyQaRepairAssets(scenes, [{ sceneIndex: 2, visualQuery: candidates[0].repairQuery, videoUrl: 'https://cdn.pixabay.com/video/new.mp4', pexelsId: 1_000_000_000_123, source: 'pixabay', pixabayId: 123, stockId: 'pixabay:123', sourcePageUrl: 'https://pixabay.com/videos/id-123/', width: 1080, height: 1920 }]);
assert.equal(pixabayRepaired[2].source, 'pixabay');
assert.equal(pixabayRepaired[2].pixabayId, 123);
assert.equal(pixabayRepaired[2].stockId, 'pixabay:123');
assert.equal(pixabayRepaired[2].width, 1080);
assert.equal(pixabayRepaired[2].height, 1920);


const dataVisualScenes = scenes.map((scene, index) => index === 2 ? { ...scene, visualMode: 'data_visual' } : scene);
assert.equal(selectQaRepairCandidates(dataVisualScenes, report, article).length, 0, 'nie zastępujemy wykresów/visualizacji danymi stockiem');
assert.equal(selectQaRepairCandidates(scenes, { findings: [], visualAnalysis: { results: [] } }, article).length, 0, 'poprawny render nie uruchamia naprawy');
assert.equal(canAttemptQaRepair(0), true);
assert.equal(canAttemptQaRepair(1), false, 'po jednej naprawie nie ma dalszego retry');

const usedIdSnapshots: number[][] = [];
const uniqueAssets = await resolveUniqueQaRepairAssets(['scene-a', 'scene-b'], [100, 200], async (candidate, usedIds) => {
  usedIdSnapshots.push(usedIds);
  const pexelsId = candidate === 'scene-a' ? 301 : 302;
  return { candidate, pexelsId };
});
assert.deepEqual(usedIdSnapshots[0], [100, 200]);
assert.deepEqual(usedIdSnapshots[1], [100, 200, 301], 'drugie wyszukiwanie wyklucza ID wybrane dla pierwszej naprawy');
assert.deepEqual(uniqueAssets.map((asset) => asset.pexelsId), [301, 302]);
await assert.rejects(
  () => resolveUniqueQaRepairAssets(['scene-a', 'scene-b'], [100], async () => ({ pexelsId: 401 })),
  /powielony identyfikator/
);
let repairJobActive = true;
let postCancelPexelsCalls = 0;
await assert.rejects(
  () => resolveUniqueQaRepairAssets(['scene-a', 'scene-b'], [], async () => {
    postCancelPexelsCalls++;
    repairJobActive = false;
    return { pexelsId: 501 };
  }, () => repairJobActive),
  QaRepairCancelledError
);
assert.equal(postCancelPexelsCalls, 1, 'po anulowaniu nie rozpoczyna kolejnego wyszukiwania Pexels');

const failedSecondQa: QaRepairReport = {
  findings: [{ code: 'visual_narration_mismatch', severity: 'blocker', scene: 3, message: 'Nadal niedopasowane.' }],
  visualAnalysis: { results: [{ scene: 3, match: false, confidence: 0.9, reason: 'Nadal kryptowaluty.' }] }
};
const failure = buildQaRepairFailureReport(scenes, candidates, failedSecondQa);
assert.match(failure, /Scena 3/);
assert.match(failure, /Narracja sceny 3/);
assert.match(failure, /generic query 3/);
assert.match(failure, /zapytanie naprawcze=/);
assert.match(failure, /Nadal kryptowaluty/);

const failedResolve = new Error('Pexels timeout');
let resolveCalls = 0;
let rerenderCalls = 0;
const stockFailure = await executeQaRepairOnce(0, candidates, async () => {
  resolveCalls++;
  throw failedResolve;
}, async () => { rerenderCalls++; });
assert.equal(stockFailure.status, 'stock_search_failed');
assert.match(stockFailure.error || '', /Pexels timeout/);
assert.equal(resolveCalls, 1);
assert.equal(rerenderCalls, 0, 'błąd wyszukania stocku nie uruchamia kolejnego renderu');

let activeAfterPexelsSearch = true;
let cancelledRerenderCalls = 0;
const cancelledAttempt = await executeQaRepairOnce(0, candidates, async () => {
  activeAfterPexelsSearch = false;
  return [{ replacement: true }];
}, async () => { cancelledRerenderCalls++; }, () => activeAfterPexelsSearch);
assert.equal(cancelledAttempt.status, 'cancelled', 'utrata aktywności po wyszukiwaniu oznacza anulowanie naprawy');
assert.equal(cancelledRerenderCalls, 0, 'po anulowaniu podczas wyszukiwania nie startuje recursive rerender');

const successfulAttempt = await executeQaRepairOnce(0, candidates, async () => [{ replacement: true }], async () => { rerenderCalls++; });
assert.equal(successfulAttempt.status, 'completed');
assert.equal(rerenderCalls, 1, 'wykonuje dokładnie jeden rerender po udanym resolve');
const noSecondAttempt = await executeQaRepairOnce(1, candidates, async () => [{ replacement: true }], async () => { rerenderCalls++; });
assert.equal(noSecondAttempt.status, 'skipped');
assert.equal(rerenderCalls, 1, 'po nieudanej naprawie nie ma nieograniczonej pętli');
console.log('QA repair tests passed');


const commonPexelsResult = normalizeQaRepairAssetResult({
  sceneIndex: 0, provider: 'pexels', providerAssetId: 7001, pexelsId: 7001,
  stockId: 'pexels:7001', videoUrl: 'https://videos.pexels.com/video-files/7001/7001-hd_1080_1920_25fps.mp4',
  sourcePageUrl: 'https://www.pexels.com/video/example-7001/', thumbnailUrl: 'https://images.pexels.com/photos/7001/pexels-photo-7001.jpeg',
  width: 1080, height: 1920, searchKeyword: 'bank office'
});
assert.equal(commonPexelsResult.canonicalAssetId, 'pexels:7001');
const commonPixabayResult = normalizeQaRepairAssetResult({
  sceneIndex: 1, provider: 'pixabay', providerAssetId: 123, pexelsId: 1_000_000_000_123,
  pixabayId: 123, stockId: 'pixabay:123', videoUrl: 'https://cdn.pixabay.com/video/2024/01/01/123-123456_large.mp4',
  sourcePageUrl: 'https://pixabay.com/videos/example-123/', thumbnailUrl: 'https://cdn.pixabay.com/video/2024/01/01/123-123456_small.jpg',
  width: 1080, height: 1920, searchKeyword: 'bank office'
});
assert.equal(commonPixabayResult.canonicalAssetId, 'pixabay:123');
assert.deepEqual(validateQaRepairAssetBatch([commonPexelsResult, commonPixabayResult]).map((item) => item.canonicalAssetId), ['pexels:7001', 'pixabay:123']);
assert.throws(() => normalizeQaRepairAssetResult({ ...commonPixabayResult, providerAssetId: 999 }), /Identyfikator dostawcy/);
assert.throws(() => normalizeQaRepairAssetResult({ ...commonPixabayResult, canonicalAssetId: 'pexels:123' }), /Niespójna kanoniczna/);
assert.throws(() => normalizeQaRepairAssetResult({ ...commonPexelsResult, sourcePageUrl: 'https://evil.example/asset' }), /niezaufany URL/);
assert.throws(() => validateQaRepairAssetBatch([commonPexelsResult, { ...commonPexelsResult, sceneIndex: 2 }]), /powielony materiał/);
assert.throws(() => validateQaRepairAssetBatch([commonPexelsResult, { ...commonPixabayResult, sceneIndex: 0 }]), /tej samej sceny/);

const sharedApply = applyQaRepairResultBatch(
  ([{ voiceover_text: 'Nie zmieniaj narracji', duration: 2.25 }, { voiceover_text: 'Zachowaj lektora', duration: 2.25 }] as Array<Record<string, unknown>>),
  [commonPixabayResult, commonPexelsResult]
);
assert.equal(sharedApply[0].source, 'pexels', 'wynik trafia do sceny wskazanej przez sceneIndex, niezależnie od kolejności batcha');
assert.equal(sharedApply[0].stockId, 'pexels:7001');
assert.equal(sharedApply[0].voiceover_text, 'Nie zmieniaj narracji');
assert.equal(sharedApply[0].duration, 2.25);
assert.equal(sharedApply[1].source, 'pixabay');
assert.equal(sharedApply[1].stockId, 'pixabay:123');
assert.equal(sharedApply[1].voiceover_text, 'Zachowaj lektora');

assert.throws(() => normalizeQaRepairAssetResult({
  ...commonPexelsResult,
  videoUrl: 'https://cdn.pixabay.com/video/2024/01/01/123-123456_large.mp4'
}), /niezaufany URL/, 'Pexels nie może używać pliku wideo Pixabay');
assert.throws(() => normalizeQaRepairAssetResult({
  ...commonPexelsResult,
  thumbnailUrl: 'https://cdn.pixabay.com/video/2024/01/01/123-123456_small.jpg'
}), /niezaufany URL/, 'Pexels nie może używać miniatury Pixabay');
assert.throws(() => normalizeQaRepairAssetResult({
  ...commonPixabayResult,
  videoUrl: 'https://videos.pexels.com/video-files/7001/example.mp4'
}), /niezaufany URL/, 'Pixabay nie może używać pliku wideo Pexels');
assert.throws(() => normalizeQaRepairAssetResult({
  ...commonPexelsResult,
  sourcePageUrl: 'https://evil.example/pexels.com/video'
}), /niezaufany URL/, 'odrzuć host podszywający się pod Pexels');


const telemetryRow = toQaRepairTelemetryRow({
  repairId: '00000000-0000-4000-8000-000000000001',
  jobId: 'job-repair-123',
  attempt: 1,
  eventType: 'asset_selected',
  sceneIndex: 2,
  provider: 'pixabay',
  providerAssetId: 123,
  canonicalAssetId: 'pixabay:123',
  causeCode: 'visual_narration_mismatch',
  reason: 'Obraz nie odpowiada tematowi sceny.',
  action: 'replace_blocked_scene_asset',
  outcome: 'selected',
  qaBefore: {
    status: 'blocked',
    score: 55,
    findings: [{ code: 'visual_narration_mismatch', severity: 'blocker', scene: 3 }]
  },
  qaAfter: { status: 'pass', score: 96, findings: [] },
  details: {
    candidateCount: 1,
    originalQuery: 'bank office',
    repairQuery: 'Polish central bank building',
    width: 1080,
    height: 1920,
    durationSeconds: 4.5
  }
}, '2026-11-25T00:45:00.000Z');
assert.equal(telemetryRow.job_id, 'job-repair-123');
assert.equal(telemetryRow.event_type, 'asset_selected');
assert.equal(telemetryRow.provider, 'pixabay');
assert.equal(telemetryRow.provider_asset_id, '123');
assert.equal(telemetryRow.canonical_asset_id, 'pixabay:123');
assert.equal(telemetryRow.scene_index, 2);
assert.deepEqual(telemetryRow.qa_before, {
  status: 'blocked', score: 55,
  findings: [{ code: 'visual_narration_mismatch', severity: 'blocker', scene: 3 }]
});
assert.deepEqual(telemetryRow.metadata, {
  candidate_count: 1,
  original_query: 'bank office',
  repair_query: 'Polish central bank building',
  width: 1080,
  height: 1920,
  duration_seconds: 4.5
});
assert.equal('videoUrl' in (telemetryRow.metadata as Record<string, unknown>), false, 'nie zapisuj signed media URLs');
assert.equal('narration' in (telemetryRow.metadata as Record<string, unknown>), false, 'nie zapisuj tekstu lektora');
assert.equal(telemetryRow.occurred_at, '2026-11-25T00:45:00.000Z');
const boundedTelemetry = toQaRepairTelemetryRow({
  repairId: '00000000-0000-4000-8000-000000000001',
  jobId: 'job-repair-123',
  attempt: 0,
  eventType: 'repair_failed',
  reason: 'x'.repeat(1200),
  details: { originalQuery: 'q'.repeat(500) }
});
assert.equal(boundedTelemetry.attempt, 1);
assert.equal(String(boundedTelemetry.reason).length, 1000);
assert.equal(String((boundedTelemetry.metadata as Record<string, unknown>).original_query).length, 240);


const redactedTelemetry = toQaRepairTelemetryRow({
  repairId: '00000000-0000-4000-8000-000000000001',
  jobId: 'job-repair-123',
  attempt: 1,
  eventType: 'repair_failed',
  reason: 'Download failed https://cdn.example.test/private/file.mp4?signature=abc sb_secret_1234567890abcdef'
});
assert.equal(String(redactedTelemetry.reason).includes('https://'), false, 'signed URLs are redacted from failure reasons');
assert.equal(String(redactedTelemetry.reason).includes('sb_secret_'), false, 'secret-like tokens are redacted from failure reasons');
