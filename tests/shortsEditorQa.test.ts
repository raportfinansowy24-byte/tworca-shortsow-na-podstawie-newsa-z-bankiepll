import assert from 'node:assert/strict';
import { buildShortsEditorQaRevisionInstruction, evaluateRenderedShort, evaluateShortStoryboard, getSceneNarrationText, hasNarrationWithinWordRanges, shouldBlockQa } from '../src/server/shortsEditorQa';
import { buildBrandedCtaSvg } from '../src/server/brandEndCard';
import { buildVisualAnalysisUnavailableReport, buildVisualSemanticReport, parseVisualSemanticResponse } from '../src/server/shortsVisualSemanticQa';
import { selectFinanceCta } from '../src/server/financeCtaStrategy';

assert.equal(shouldBlockQa('blocked'), true);
assert.equal(shouldBlockQa('review', true), true, 'status review nie może przepuścić automatycznego renderu newsa');
assert.equal(shouldBlockQa('review', false), false);
assert.equal(shouldBlockQa('pass', true), false);

const scenes = Array.from({ length: 8 }, (_, index) => {
  const narration = index === 0 ? 'Co się zmieniło?' : index === 7 ? 'Policz ratę kredytu.' : `Fakt numer ${index + 1}.`;
  return {
    duration: 23 / 8,
    voiceover_text: narration,
    subtitles: narration,
    searchKeyword: `specific financial news shot ${index + 1}`,
    pexelsId: 1000 + index
  };
});

const validStoryboard = evaluateShortStoryboard(scenes, {
  expectedSceneCount: 8,
  expectedDurationSeconds: 23,
  maxDurationSeconds: 25,
  requireCta: true,
  requireVisualQueries: true,
  requireUniquePexelsIds: true,
  requireCaptionAlignment: true,
  maxWordsPerScene: (index) => index < 4 ? 3 : 4
});
assert.equal(validStoryboard.status, 'pass');

assert.equal(validStoryboard.score, 100);

const brandedCtaScenes = scenes.map((scene, index) => index === 7
  ? { ...scene, visualMode: 'data_visual', visualSvg: buildBrandedCtaSvg('SPRAWDŹ SZCZEGÓŁY') }
  : scene);
assert.equal(evaluateShortStoryboard(brandedCtaScenes, { requireCta: true, requireBrandedCta: true }).status, 'pass');
assert.equal(evaluateShortStoryboard(scenes.map((scene, index) => index === 7 ? { ...scene, visualMode: 'matched_clip' } : scene), {
  requireCta: true,
  requireBrandedCta: true
}).status, 'blocked', 'stockowy klip nie może być planszą końcową CTA');

const generatedNarrationAt32Words = [
  'Hook ma cztery słowa',
  'Bank zmienia ważne zasady',
  'Klienci sprawdzają nowe warunki banku',
  'Decyzja dotyczy wielu klientów',
  'Opłaty mogą teraz wzrosnąć znacznie',
  'Warto porównać dostępne oferty bankowe',
  'Sprawdź szczegóły przed ważną decyzją',
  'Działaj teraz'
].map((voiceover_text) => ({ voiceover_text }));
const generatedNarrationRanges = [
  ...Array.from({ length: 4 }, () => ({ min: 4, max: 5 })),
  ...Array.from({ length: 3 }, () => ({ min: 5, max: 6 })),
  { min: 1, max: 4 }
];
assert.equal(hasNarrationWithinWordRanges(generatedNarrationAt32Words, generatedNarrationRanges, { min: 30, max: 36 }), true);
assert.equal(hasNarrationWithinWordRanges(generatedNarrationAt32Words, Array.from({ length: 8 }, (_, index) => ({ min: 1, max: index < 4 ? 3 : 4 })), { min: 30, max: 36 }), false, 'nowy target ma być akceptowany zamiast starego limitu 28 słów');
assert.equal(hasNarrationWithinWordRanges(generatedNarrationAt32Words, generatedNarrationRanges, { min: 35, max: 36 }), false, 'łączny limit narracji ma być egzekwowany');

// OpenAI may return equivalent narration fields while leaving canonical keys blank.
// Normalize all supported aliases before rendering so validation and renderer see the same speech.
assert.equal(getSceneNarrationText({
  voiceover_text: '',
  subtitles: '',
  voiceover: 'GPW ma szanse rosnąć.',
  text: 'Nie używaj tego pola, jeśli voiceover już istnieje.'
}), 'GPW ma szanse rosnąć.');
assert.equal(getSceneNarrationText({
  voiceover_text: '',
  subtitles: '',
  text: 'Tekst lektora zwrócony w polu text.'
}), 'Tekst lektora zwrócony w polu text.');
const aliasedNarrationScenes = generatedNarrationAt32Words.map((scene) => ({
  voiceover_text: '',
  subtitles: '',
  voiceover: scene.voiceover_text
}));
assert.equal(
  hasNarrationWithinWordRanges(aliasedNarrationScenes, generatedNarrationRanges, { min: 30, max: 36 }),
  true,
  'walidacja ma używać tego samego aliasu narracji, który później normalizuje renderer'
);
assert.equal(aliasedNarrationScenes[0].voiceover_text, generatedNarrationAt32Words[0].voiceover_text);
assert.equal(aliasedNarrationScenes[0].subtitles, generatedNarrationAt32Words[0].voiceover_text);
assert.equal(aliasedNarrationScenes[0].voiceover, generatedNarrationAt32Words[0].voiceover_text);


const draftWithPlaceholderCta = [
  ...Array.from({ length: 4 }, (_, index) => ({ voiceover_text: `Hook numer ${index + 1} dziś` })),
  ...Array.from({ length: 3 }, (_, index) => ({ voiceover_text: `Ważny fakt numer ${index + 1} teraz` })),
  { voiceover_text: 'Sprawdź pełny CTA teraz' }
];
const substitutedCta = 'Wejdź na raport-finansowy24.pl i sprawdź ofertę.';
assert.equal(hasNarrationWithinWordRanges(draftWithPlaceholderCta, generatedNarrationRanges, { min: 30, max: 36 }), true, 'szkic z 35 słowami wraz z placeholderem mieści się w zakresie');
assert.equal(hasNarrationWithinWordRanges(draftWithPlaceholderCta, generatedNarrationRanges, { min: 37, max: 38 }, substitutedCta), true, '31 słów scen 1–7 plus docelowe 6-wyrazowe CTA powinny przejść zakres 37–38');
const draftAtRendererCap = draftWithPlaceholderCta.map((scene) => ({ ...scene }));
draftAtRendererCap[6].voiceover_text += ' dodatkowo';
assert.equal(hasNarrationWithinWordRanges(draftAtRendererCap, generatedNarrationRanges, { min: 37, max: 38 }, substitutedCta), true, '32 słowa scen 1–7 plus 6-wyrazowe CTA powinny przejść na górnej granicy');
assert.equal(hasNarrationWithinWordRanges(draftAtRendererCap, generatedNarrationRanges, { min: 37, max: 38 }, `${substitutedCta} dodatkowo`), false, '33 słowa scen 1–7 plus CTA nie mogą przekroczyć limitu renderera 32+CTA');
const sevenWordCta = 'Wejdź na raport-finansowy24.pl i porównaj konta bankowe.';
assert.equal(hasNarrationWithinWordRanges(draftWithPlaceholderCta, generatedNarrationRanges, { min: 38, max: 39 }, sevenWordCta), true, 'ten sam szkic z 7-wyrazowym CTA powinien przejść zakres 38–39');
assert.equal(hasNarrationWithinWordRanges(draftWithPlaceholderCta, generatedNarrationRanges, { min: 39, max: 39 }, sevenWordCta), false, 'całość poniżej minimum wynikającego z minimów scen i CTA powinna zostać odrzucona');

const sevenFiveWordScenes = Array.from({ length: 7 }, (_, index) => ({
  duration: 2.5,
  voiceover_text: `Rynek ${index + 1} spadł dziś mocno`,
  subtitles: `Rynek ${index + 1} spadł dziś mocno`
}));
const longCta = 'Wejdź na raport-finansowy24.pl i sprawdź ofertę teraz, aby poznać wszystkie szczegóły i dodatkowe informacje';
const storyboardWith35Words = [...sevenFiveWordScenes, { duration: 2.5, voiceover_text: longCta, subtitles: longCta }];
const narrationOptions = { requireCta: true, requireCaptionAlignment: true, maxNarrationWordsExcludingLast: 32, maxWordsPerScene: (index: number) => index < 7 ? 5 : 9 };
const overLimitReport = evaluateShortStoryboard(storyboardWith35Words, narrationOptions);
assert.ok(overLimitReport.findings.some((finding) => finding.code === 'total_words_over_limit' && finding.severity === 'blocker' && finding.message === 'Lektor scen 1–7 ma 35 słów; limit to 32.'));
assert.ok(!overLimitReport.findings.some((finding) => finding.scene === 8 && ['scene_copy_too_long', 'narration_too_dense'].includes(finding.code)));
const storyboardWith32Words = [...sevenFiveWordScenes.slice(0, 6), { duration: 2.5, voiceover_text: 'Rynek rośnie', subtitles: 'Rynek rośnie' }, storyboardWith35Words[7]];
const withinLimitReport = evaluateShortStoryboard(storyboardWith32Words, narrationOptions);
assert.ok(!withinLimitReport.findings.some((finding) => finding.code === 'total_words_over_limit'));
const sixWordScenes = [
  'Hook ma cztery słowa',
  'Bank zmienia ważne zasady',
  'Klienci poznają warunki banku',
  'Decyzja dotyczy wielu klientów',
  'Opłaty mogą teraz wzrosnąć',
  'Warto dziś porównać dostępne oferty bankowe',
  'Sprawdź szczegóły przed decyzją',
  'Policz ratę kredytu.'
].map((voiceover_text, index) => ({
  duration: 23 / 8,
  voiceover_text,
  subtitles: voiceover_text,
  searchKeyword: `unique topic shot ${index + 1}`
}));
const autonomousQaOptions = {
  expectedSceneCount: 8,
  expectedDurationSeconds: 23,
  maxDurationSeconds: 25,
  requireCta: true,
  requireCaptionAlignment: true,
  maxNarrationWordsExcludingLast: 32,
  maxWordsPerScene: (index: number) => index < 4 ? 5 : index < 7 ? 6 : 9
};
const sixWordSceneReport = evaluateShortStoryboard(sixWordScenes, autonomousQaOptions);
assert.equal(sixWordSceneReport.status, 'pass', 'sceny 5–7 mogą mieć po 6 słów, jeśli sceny 1–7 nie przekraczają 32 łącznie');
assert.ok(!sixWordSceneReport.findings.some((finding) => finding.code === 'scene_copy_too_long' && (finding.scene === 5 || finding.scene === 6 || finding.scene === 7)));

const mismatchedFinalCaption = storyboardWith35Words.map((scene, index) => index === 7 ? { ...scene, voiceover_text: 'Wejdź na raport-finansowy24.pl, sprawdź, co to zmienia.', subtitles: longCta } : scene);
const finalCaptionMismatchReport = evaluateShortStoryboard(mismatchedFinalCaption, narrationOptions);
assert.ok(finalCaptionMismatchReport.findings.some((finding) => finding.code === 'caption_voiceover_mismatch' && finding.severity === 'blocker' && finding.scene === 8));

const ctaCases = [
  [{ title: 'Kredyt i rata kredytu' }, 'Wejdź na raport-finansowy24.pl, policz ratę kredytu.'],
  [{ title: 'Konta bankowe i opłaty za konto' }, 'Wejdź na raport-finansowy24.pl i porównaj konta bankowe.'],
  [{ title: 'Analiza spółki po NIP' }, 'Wejdź na raport-finansowy24.pl, sprawdź spółkę po NIP.'],
  [{ title: 'Oszczędności i lokata' }, 'Wejdź na raport-finansowy24.pl, policz zysk z lokaty.'],
  [{ title: 'Promocja lokaty' }, 'Wejdź na raport-finansowy24.pl i sprawdź ofertę.', { promotionalCtaAllowed: true, catalogStatus: 'fresh', observedOfferCount: 1, candidateOfferNamesAllowed: true }],
  [{ title: 'Wiadomość gospodarcza' }, 'Wejdź na raport-finansowy24.pl, sprawdź, co to zmienia.']
] as const;
for (const [article, expected, offer] of ctaCases) {
  const cta = selectFinanceCta(article, offer);
  assert.equal(cta.spokenText, expected);
  assert.equal(cta.caption, expected);
  assert.ok(cta.spokenText.includes('raport-finansowy24.pl'));
  assert.ok(cta.displayTitle.length <= 16);
  assert.notEqual(cta.displayTitle, cta.spokenText);
}
const unverifiedPartnerCta = selectFinanceCta({ title: 'Promocja bonusowa banku' });
assert.notEqual(unverifiedPartnerCta.type, 'verified_partner_offer');
assert.equal(selectFinanceCta({ title: 'Promocja bonusowa banku' }, { promotionalCtaAllowed: true, catalogStatus: 'stale', observedOfferCount: 1, candidateOfferNamesAllowed: true }).type === 'verified_partner_offer', false);

const missingPexelsId = scenes.map((scene, index) => {
  if (index !== 4) return scene;
  const { pexelsId: _pexelsId, ...sceneWithoutId } = scene;
  return sceneWithoutId;
});
const missingPexelsReport = evaluateShortStoryboard(missingPexelsId, { requireUniquePexelsIds: true });
assert.equal(missingPexelsReport.status, 'blocked');
assert.ok(missingPexelsReport.findings.some((finding) => finding.code === 'missing_visual_asset_id'));

const duplicatePexelsId = scenes.map((scene, index) => index === 4 ? { ...scene, pexelsId: scenes[0].pexelsId } : scene);
const duplicatePexelsReport = evaluateShortStoryboard(duplicatePexelsId, { requireUniquePexelsIds: true });
assert.equal(duplicatePexelsReport.status, 'blocked');
assert.ok(duplicatePexelsReport.findings.some((finding) => finding.code === 'repeated_visual_asset'));

const flawedStoryboard = scenes.map((scene, index) => index === 3
  ? { ...scene, subtitles: 'INNE NAPISY NIŻ LEKTOR', searchKeyword: '' }
  : scene);
const flawedReport = evaluateShortStoryboard(flawedStoryboard, {
  expectedSceneCount: 8,
  requireCta: true,
  requireVisualQueries: true,
  requireCaptionAlignment: true
});
assert.equal(flawedReport.status, 'blocked');
assert.ok(flawedReport.findings.some((finding) => finding.code === 'caption_voiceover_mismatch'));
assert.ok(flawedReport.findings.some((finding) => finding.code === 'missing_visual_query'));
const repairInstruction = buildShortsEditorQaRevisionInstruction(flawedReport);
assert.match(repairInstruction, /Nie uruchamiaj dodatkowych renderów/);
assert.match(repairInstruction, /scena 4/i);

const repeatedNarration = scenes.map((scene, index) => index === 2 || index === 4
  ? { ...scene, voiceover_text: 'Fakt numer 2.', subtitles: 'Fakt numer 2.' }
  : scene);
const repetitionReport = evaluateShortStoryboard(repeatedNarration, { expectedSceneCount: 8 });
assert.ok(repetitionReport.findings.some((finding) => finding.code === 'repeated_narration'));
assert.notEqual(repetitionReport.status, 'blocked');

const tooLong = scenes.map((scene, index) => index === 7 ? { ...scene, voiceover_text: 'Więcej informacji tutaj.', subtitles: 'Więcej informacji tutaj.', duration: 10 } : scene);
const durationReport = evaluateShortStoryboard(tooLong, { maxDurationSeconds: 23 });
assert.equal(durationReport.status, 'blocked');
assert.ok(durationReport.findings.some((finding) => finding.code === 'duration_over_limit'));

const validMedia = evaluateRenderedShort({
  hasVideo: true,
  hasAudio: true,
  width: 720,
  height: 1280,
  durationSeconds: 23.1,
  sizeBytes: 1_200_000,
  requireAudio: true,
  expectedDurationSeconds: 23
});
assert.equal(validMedia.status, 'pass');

const brokenMedia = evaluateRenderedShort({
  hasVideo: true,
  hasAudio: false,
  width: 1920,
  height: 1080,
  durationSeconds: 26,
  sizeBytes: 0,
  requireAudio: true
});
assert.equal(brokenMedia.status, 'blocked');
assert.ok(brokenMedia.findings.some((finding) => finding.code === 'missing_audio_stream'));
assert.ok(brokenMedia.findings.some((finding) => finding.code === 'wrong_aspect_ratio'));
assert.ok(brokenMedia.findings.some((finding) => finding.code === 'output_over_duration_limit'));
assert.ok(brokenMedia.findings.some((finding) => finding.code === 'empty_output_file'));

const semanticResults = parseVisualSemanticResponse(JSON.stringify({ results: [
  { scene: 1, match: true, confidence: 0.95, reason: 'Widoczny wykres pasuje do omówienia notowań.' },
  { scene: 2, match: false, confidence: 0.91, reason: 'Widać plażę, a lektor mówi o stopach procentowych.' },
  { scene: 3, match: false, confidence: 0.62, reason: 'Klatka jest zbyt ogólna, by potwierdzić temat.' }
] }), 3);
const semanticReport = buildVisualSemanticReport(3, semanticResults, 'gemini-3.8-flash');
assert.equal(semanticReport.status, 'blocked');
assert.equal(semanticReport.analyzedScenes, 3);
assert.equal(semanticReport.findings.filter((finding) => finding.code === 'visual_narration_mismatch').length, 2);
assert.equal(semanticReport.findings.find((finding) => finding.scene === 2)?.severity, 'blocker');
assert.equal(semanticReport.findings.find((finding) => finding.scene === 3)?.severity, 'blocker');
const thresholdReport = buildVisualSemanticReport(2, [
  { scene: 1, match: false, confidence: 0.62, reason: 'Brak dopasowania.' },
  { scene: 2, match: false, confidence: 0.59, reason: 'Słabe dopasowanie.' }
], 'gemini-3.8-flash');
assert.equal(thresholdReport.findings.find((finding) => finding.scene === 1)?.severity, 'blocker');
assert.equal(thresholdReport.findings.find((finding) => finding.scene === 2)?.severity, 'blocker', 'jawne match=false blokuje niezależnie od niskiej pewności');

const incompleteSemanticReport = buildVisualSemanticReport(2, [semanticResults[0]], 'gemini-3.8-flash');
assert.equal(incompleteSemanticReport.status, 'review');
assert.ok(incompleteSemanticReport.findings.some((finding) => finding.code === 'visual_analysis_missing_scene'));
const unavailableSemanticReport = buildVisualAnalysisUnavailableReport(8, 'brak klucza');
assert.equal(unavailableSemanticReport.status, 'review');
assert.equal(unavailableSemanticReport.analyzedScenes, 0);
assert.equal(unavailableSemanticReport.model, 'unavailable');
assert.ok(unavailableSemanticReport.findings.some((finding) => finding.code === 'visual_analysis_unavailable'));

// Regression tests for strict QA gates and source evidence
const sourceArticle = 'Zysk spółki Orlen wzrósł o 15% w pierwszym kwartale.';
const sceneWithOrlenClaim = [
  {
    duration: 2.0,
    voiceover_text: 'Zysk Orlenu wzrósł o 15%.',
    subtitles: 'Zysk Orlenu wzrósł o 15%.',
    sourceEvidence: 'Zysk spółki Orlen wzrósł o 15% w pierwszym kwartale.',
    pexelsId: 101,
    searchKeyword: 'orlen finanse'
  },
  {
    duration: 2.0,
    voiceover_text: 'Sprawdź raport.',
    subtitles: 'Sprawdź raport.',
    visualMode: 'data_visual',
    visualSvg: buildBrandedCtaSvg('SPRAWDŹ SZCZEGÓŁY'),
    pexelsId: 102,
    searchKeyword: 'cta raport'
  }
];

const passReport = evaluateShortStoryboard(sceneWithOrlenClaim, {
  sourceText: sourceArticle,
  requireSourceEvidence: true,
  requireCta: true,
  requireBrandedCta: true
});
assert.equal(passReport.status, 'pass', 'potwierdzony fakt ze źródła i poprawna plansza CTA dają pass');

const sceneWithFabricatedClaim = [
  {
    duration: 2.0,
    voiceover_text: 'Zysk Dino spadł o 30%.',
    subtitles: 'Zysk Dino spadł o 30%.',
    sourceEvidence: 'Zysk Dino spadł o 30%.',
    pexelsId: 101,
    searchKeyword: 'dino spadek'
  },
  {
    duration: 2.0,
    voiceover_text: 'Sprawdź raport.',
    subtitles: 'Sprawdź raport.',
    visualMode: 'data_visual',
    visualSvg: buildBrandedCtaSvg('SPRAWDŹ SZCZEGÓŁY'),
    pexelsId: 102,
    searchKeyword: 'cta raport'
  }
];

const blockedClaimReport = evaluateShortStoryboard(sceneWithFabricatedClaim, {
  sourceText: sourceArticle,
  requireSourceEvidence: true,
  requireCta: true,
  requireBrandedCta: true
});
assert.equal(blockedClaimReport.status, 'blocked', 'zmyślony claim nieobecny w artykule musi zablokować QA');
assert.equal(shouldBlockQa(blockedClaimReport.status, true), true, 'blocked w trybie strict blokuje render');

// Verify single-scene with no CTA still evaluates source evidence
const singleSceneWithoutCta = [
  {
    duration: 3.0,
    voiceover_text: 'Zysk Dino spadł o 30%.',
    subtitles: 'Zysk Dino spadł o 30%.',
    sourceEvidence: 'Zysk Dino spadł o 30%.',
    pexelsId: 101,
    searchKeyword: 'dino test'
  }
];
const singleSceneReport = evaluateShortStoryboard(singleSceneWithoutCta, {
  sourceText: sourceArticle,
  requireSourceEvidence: true,
  requireCta: false
});
assert.equal(singleSceneReport.status, 'blocked', 'pojedyncza scena bez CTA musi mieć zweryfikowane fakty względem źródła');

console.log('Shorts Editor QA tests passed');

