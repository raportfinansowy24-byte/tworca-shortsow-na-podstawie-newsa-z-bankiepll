import assert from 'node:assert/strict';
import { splitNarrationAlignmentByScenes } from '../src/server/singleNarration';

const scenes = ['Ziemia w Suwałkach.', 'Dla młodych rodzin.'];
const words = [
  { word: 'Ziemia', start: 0.2, end: 0.8 },
  { word: 'w', start: 0.82, end: 0.95 },
  { word: 'Suwałkach.', start: 1.0, end: 1.9 },
  { word: 'Dla', start: 2.2, end: 2.5 },
  { word: 'młodych', start: 2.55, end: 3.1 },
  { word: 'rodzin.', start: 3.15, end: 3.8 }
];
const result = splitNarrationAlignmentByScenes(scenes, words, 4.2);
assert.equal(result.length, 2);
assert.equal(result[0].start, 0);
assert.equal(result[1].end, 4.2);
assert.ok(result[0].end > words[2].end && result[0].end < words[3].start, 'granica sceny zachowuje naturalną pauzę między zdaniami');
assert.equal(result[0].wordTimings[2].word, 'Suwałkach.');
assert.ok(Math.abs(result[1].wordTimings[0].start - (words[3].start - result[1].start)) < 0.0001);
assert.ok(Math.abs(result.reduce((sum, segment) => sum + segment.duration, 0) - 4.2) < 0.0001, 'segmenty pokrywają jedną pełną narrację bez przerw i nakładania');
assert.throws(() => splitNarrationAlignmentByScenes(['Inny tekst'], words, 4.2), /Niezgodna liczba słów/);
assert.throws(() => splitNarrationAlignmentByScenes(['Ziemia w Suwałkach.'], words, 4.2), /Niezgodna liczba słów/);
console.log('Single narration tests passed');
