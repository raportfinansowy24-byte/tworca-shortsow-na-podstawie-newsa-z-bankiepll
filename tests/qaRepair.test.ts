import assert from 'node:assert/strict';
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
    { scene: 3, match: false, confidence: 0.92, reason: 'Kryptowaluty.' },
    { scene: 4, match: false, confidence: 0.6, reason: 'Niepewne.' },
    { scene: 5, match: false, confidence: 0.95, reason: 'missing.' }
  ] }
};
const candidates = selectQaRepairCandidates(scenes, report, article);
assert.equal(candidates.length, 1, 'naprawiana jest tylko scena z blockerem i wysoką pewnością');
assert.equal(candidates[0].sceneIndex, 2);
assert.equal(candidates[0].narration, 'Narracja sceny 3');
assert.match(candidates[0].repairQuery, /National Bank of Poland/i);
assert.notEqual(candidates[0].repairQuery, candidates[0].originalQuery);
assert.deepEqual(validatedPexelsRepairMetadata({ source: 'pexels', pexelsId: 102 }), { source: 'pexels', pexelsId: 102 });
assert.deepEqual(validatedPexelsRepairMetadata({ source: 'pexels', pexelsId: '102' }), {}, 'nie zachowuj ID w niekanonicznym formacie');
assert.deepEqual(validatedPexelsRepairMetadata({ source: 'other', pexelsId: 102 }), {});
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
