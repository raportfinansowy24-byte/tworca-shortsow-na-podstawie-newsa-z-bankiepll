import assert from 'node:assert/strict';
import { buildShortsEditorQaRevisionInstruction, evaluateRenderedShort, evaluateShortStoryboard } from '../src/server/shortsEditorQa';

const scenes = Array.from({ length: 8 }, (_, index) => {
  const narration = index === 0 ? 'Co się zmieniło?' : index === 7 ? 'Policz ratę kredytu.' : `Fakt numer ${index + 1}.`;
  return {
    duration: index < 4 ? 2 : 2.5,
    voiceover_text: narration,
    subtitles: narration,
    searchKeyword: `specific financial news shot ${index + 1}`,
    pexelsId: 1000 + index
  };
});

const validStoryboard = evaluateShortStoryboard(scenes, {
  expectedSceneCount: 8,
  expectedDurationSeconds: 18,
  maxDurationSeconds: 23,
  requireCta: true,
  requireVisualQueries: true,
  requireUniquePexelsIds: true,
  requireCaptionAlignment: true,
  maxWordsPerScene: (index) => index < 4 ? 3 : 4
});
assert.equal(validStoryboard.status, 'pass');
assert.equal(validStoryboard.score, 100);

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
  durationSeconds: 18.1,
  sizeBytes: 1_200_000,
  requireAudio: true,
  expectedDurationSeconds: 18
});
assert.equal(validMedia.status, 'pass');

const brokenMedia = evaluateRenderedShort({
  hasVideo: true,
  hasAudio: false,
  width: 1920,
  height: 1080,
  durationSeconds: 24,
  sizeBytes: 0,
  requireAudio: true
});
assert.equal(brokenMedia.status, 'blocked');
assert.ok(brokenMedia.findings.some((finding) => finding.code === 'missing_audio_stream'));
assert.ok(brokenMedia.findings.some((finding) => finding.code === 'wrong_aspect_ratio'));
assert.ok(brokenMedia.findings.some((finding) => finding.code === 'output_over_duration_limit'));
assert.ok(brokenMedia.findings.some((finding) => finding.code === 'empty_output_file'));

console.log('Shorts Editor QA tests passed');
