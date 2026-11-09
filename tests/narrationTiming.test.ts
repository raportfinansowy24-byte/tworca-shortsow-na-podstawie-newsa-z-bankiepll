import assert from 'node:assert/strict';
import {
  DEFAULT_SECONDS_PER_SPEECH_UNIT,
  countNarrationSpeechUnits,
  emptyNarrationCalibrationStore,
  estimateNarrationDurationSeconds,
  fitNarrationBeforeTts,
  getCalibratedSecondsPerSpeechUnit,
  getNarrationCalibrationProfileKey,
  parseNarrationCalibrationStore,
  recordNarrationCalibrationSamples
} from '../src/server/narrationTiming';

assert.equal(countNarrationSpeechUnits(''), 0);
assert.ok(countNarrationSpeechUnits('RPP obniża stopy, a banki zmieniają raty.') > 6);
assert.ok(Math.abs(estimateNarrationDurationSeconds('Dzień dobry.', DEFAULT_SECONDS_PER_SPEECH_UNIT, 1) - 0.928) < 0.001);
assert.ok(estimateNarrationDurationSeconds('Dzień dobry.', 0.4, 1.2) < estimateNarrationDurationSeconds('Dzień dobry.', 0.4, 1));

const profileKey = getNarrationCalibrationProfileKey({ language: 'pl', voiceId: 'voice-1', modelId: 'eleven_multilingual_v2' });
assert.equal(profileKey, 'pl|voice-1|eleven_multilingual_v2');
let calibration = emptyNarrationCalibrationStore();
calibration = recordNarrationCalibrationSamples(calibration, profileKey, [
  { text: 'Raz dwa trzy cztery', durationSeconds: 2, speed: 1 },
  { text: 'Raz dwa trzy cztery', durationSeconds: 2.4, speed: 1 },
  { text: 'Raz dwa trzy cztery', durationSeconds: 2.2, speed: 1 }
]);
assert.ok(Math.abs(getCalibratedSecondsPerSpeechUnit(calibration, profileKey) - 0.55) < 0.001);
assert.equal(parseNarrationCalibrationStore({ version: 9, profiles: { bad: [0.4] } }).version, 1);
assert.equal(getCalibratedSecondsPerSpeechUnit(emptyNarrationCalibrationStore(), 'missing'), DEFAULT_SECONDS_PER_SPEECH_UNIT);

const base = [2, 2, 2, 2, 2.5, 2.5, 2.5, 2.5];
const shortTexts = ['Raz dwa.', 'Trzy cztery.', 'Pięć sześć.', 'Siedem osiem.', 'Dziewięć.', 'Dziesięć.', 'Jedenaście.', 'Sprawdź raport-finansowy24.pl.'];
const noEdit = await fitNarrationBeforeTts({
  sceneTexts: shortTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 23,
  maxTotalDurationSeconds: 25,
  revise: async () => { throw new Error('nie powinno wywołać redakcji'); }
});
assert.equal(noEdit.revisionAttempts, 0);
assert.equal(noEdit.reachedTargetDuration, true);

const longTexts = [
  Array.from({ length: 30 }, () => 'konkret').join(' ') + '.',
  ...shortTexts.slice(1)
];
let revisionCalls = 0;
const revised = await fitNarrationBeforeTts({
  sceneTexts: longTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 23,
  maxTotalDurationSeconds: 25,
  revise: async ({ sceneTexts, attemptNumber }) => {
    revisionCalls++;
    const candidate = [...sceneTexts];
    candidate[0] = attemptNumber === 1
      ? Array.from({ length: 24 }, () => 'konkret').join(' ') + '.'
      : Array.from({ length: 18 }, () => 'konkret').join(' ') + '.';
    return candidate;
  }
});
assert.equal(revisionCalls, 2);
assert.equal(revised.revisionAttempts, 2);
assert.ok(revised.totalEstimatedDurationSeconds <= 25);
assert.equal(revised.sceneTexts[revised.sceneTexts.length - 1], longTexts[longTexts.length - 1], 'CTA ostatniej sceny pozostaje bez zmian');

await assert.rejects(() => fitNarrationBeforeTts({
  sceneTexts: [
    Array.from({ length: 30 }, () => 'konkret').join(' ') + ' Wartość wyniosła 5,2%.',
    ...shortTexts.slice(1)
  ],
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 23,
  maxTotalDurationSeconds: 25,
  revise: async ({ sceneTexts }) => {
    const candidate = [...sceneTexts];
    candidate[0] = 'Konkretna zmiana bez liczby.';
    return candidate;
  }
}), /zmieniła lub usunęła wartość liczbową/);

let revisionAttemptsForHardFail = 0;
await assert.rejects(() => fitNarrationBeforeTts({
  sceneTexts: longTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.6,
  speed: 1,
  targetDurationSeconds: 23,
  maxTotalDurationSeconds: 25,
  revise: async () => {
    revisionAttemptsForHardFail++;
    return longTexts;
  }
}), /TTS nie został uruchomiony/);
assert.ok(revisionAttemptsForHardFail <= 2);

await assert.rejects(() => fitNarrationBeforeTts({
  sceneTexts: longTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 23,
  maxTotalDurationSeconds: 25,
  revise: async ({ sceneTexts }) => {
    const candidate = [...sceneTexts];
    candidate[candidate.length - 1] = 'Zmienione CTA.';
    return candidate;
  }
}), /nie może zmieniać końcowego CTA/);


const wordNumberLongTexts = [
  Array.from({ length: 30 }, () => 'konkret').join(' ') + ' Wartość wyniosła pięć procent.',
  ...shortTexts.slice(1)
];
await assert.rejects(() => fitNarrationBeforeTts({
  sceneTexts: wordNumberLongTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 23,
  maxTotalDurationSeconds: 25,
  revise: async ({ sceneTexts }) => {
    const candidate = [...sceneTexts];
    candidate[0] = Array.from({ length: 12 }, () => 'konkret').join(' ') + ' Wartość wyniosła siedem procent.';
    return candidate;
  }
}), /zmieniła lub usunęła wartość liczbową/);

const inflectedWordNumber = await fitNarrationBeforeTts({
  sceneTexts: wordNumberLongTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 23,
  maxTotalDurationSeconds: 25,
  revise: async ({ sceneTexts }) => {
    const candidate = [...sceneTexts];
    candidate[0] = Array.from({ length: 12 }, () => 'konkret').join(' ') + ' Wartość wyniosła pięciu procent.';
    return candidate;
  }
});
assert.match(inflectedWordNumber.sceneTexts[0], /pięciu procent/, 'odmiana gramatyczna tej samej liczby pozostaje dozwolona');

console.log('Narration timing tests passed');
