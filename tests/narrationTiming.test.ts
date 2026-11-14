import assert from 'node:assert/strict';
import {
  DEFAULT_SECONDS_PER_SPEECH_UNIT,
  NARRATION_ESTIMATE_SAFETY_FACTOR,
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
assert.ok(Math.abs(
  getCalibratedSecondsPerSpeechUnit(calibration, profileKey) - 0.6 * NARRATION_ESTIMATE_SAFETY_FACTOR
) < 0.001, 'kalibracja wybiera konserwatywny 85. percentyl i dodaje 30% marginesu');
assert.equal(parseNarrationCalibrationStore({ version: 9, profiles: { bad: [0.4] } }).version, 1);
const oneSampleCalibration = recordNarrationCalibrationSamples(emptyNarrationCalibrationStore(), profileKey, [
  { text: 'Raz dwa trzy cztery', durationSeconds: 2.4, speed: 1 }
]);
assert.ok(Math.abs(
  getCalibratedSecondsPerSpeechUnit(oneSampleCalibration, profileKey) - 0.6 * NARRATION_ESTIMATE_SAFETY_FACTOR
) < 0.001, 'już pierwszy pomiar rzeczywistego TTS jest używany bez rozcieńczania medianą defaultu');
const slowSampleCalibration = recordNarrationCalibrationSamples(emptyNarrationCalibrationStore(), profileKey, [
  { text: 'Raz dwa trzy cztery', durationSeconds: 3.2, speed: 1 }
]);
assert.ok(getCalibratedSecondsPerSpeechUnit(slowSampleCalibration, profileKey) > 0.9, 'wolniejsza próbka natychmiast zwiększa estymację');

assert.ok(Math.abs(
  getCalibratedSecondsPerSpeechUnit(emptyNarrationCalibrationStore(), 'missing') -
  DEFAULT_SECONDS_PER_SPEECH_UNIT * NARRATION_ESTIMATE_SAFETY_FACTOR
) < 0.001, 'estymacja bez historii również ma 30% bezpiecznego marginesu');

const base = [2, 2, 2, 2, 2.5, 2.5, 2.5, 2.5];
const shortTexts = ['Raz dwa.', 'Trzy cztery.', 'Pięć sześć.', 'Siedem osiem.', 'Dziewięć.', 'Dziesięć.', 'Jedenaście.', 'Sprawdź raport-finansowy24.pl.'];
const noEdit = await fitNarrationBeforeTts({
  sceneTexts: shortTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 18,
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
  targetDurationSeconds: 18,
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

const longSceneSevenTexts = [...shortTexts];
longSceneSevenTexts[6] = Array.from({ length: 30 }, () => 'konkret').join(' ') + '.';
let sceneSevenRevisionCalls = 0;
const sceneSevenFit = await fitNarrationBeforeTts({
  sceneTexts: longSceneSevenTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 18,
  maxTotalDurationSeconds: 25,
  maxRevisionAttempts: 2,
  revise: async ({ sceneTexts, attemptNumber }) => {
    sceneSevenRevisionCalls++;
    const candidate = [...sceneTexts];
    candidate[6] = Array.from({ length: attemptNumber === 1 ? 32 : 10 }, () => 'konkret').join(' ') + '.';
    return candidate;
  }
});
assert.equal(sceneSevenRevisionCalls, 2, 'a longer rewrite of scene 7 rejects only that attempt and allows the next repair');
assert.equal(sceneSevenFit.revisionAttempts, 2);
assert.equal(sceneSevenFit.rejectedLongerRevisionAttempts, 1);
assert.equal(countNarrationSpeechUnits(sceneSevenFit.sceneTexts[6]) < countNarrationSpeechUnits(longSceneSevenTexts[6]), true);
assert.ok(sceneSevenFit.totalEstimatedDurationSeconds <= 25, 'the safe hard limit still applies after a later valid rewrite');

async function assertNumericRewriteIsRejected(originalText: string, revisedText: string, label: string): Promise<void> {
  let calls = 0;
  const sceneTexts = [originalText, ...shortTexts.slice(1)];
  const result = await fitNarrationBeforeTts({
    sceneTexts,
    baseSceneDurations: base,
    secondsPerSpeechUnit: 0.4,
    speed: 1,
    targetDurationSeconds: 18,
    maxTotalDurationSeconds: 25,
    maxRevisionAttempts: 1,
    revise: async ({ sceneTexts: current }) => {
      calls++;
      const candidate = [...current];
      candidate[0] = revisedText;
      return candidate;
    }
  });
  assert.equal(calls, 1, `${label}: numeric rewrite was checked`);
  assert.equal(result.rejectedNumericRevisionAttempts, 1, `${label}: unsafe candidate was counted as rejected`);
  assert.equal(result.sceneTexts[0], originalText, `${label}: last verified narration was preserved`);
  assert.ok(result.totalEstimatedDurationSeconds <= 25, `${label}: the existing narration remains below the hard limit`);
}

const longNumericOriginal = Array.from({ length: 18 }, () => 'konkret').join(' ') + ' Wartość wyniosła 5,2%.';
let numericRetryCalls = 0;
const numericRetryFit = await fitNarrationBeforeTts({
  sceneTexts: [longNumericOriginal, ...shortTexts.slice(1)],
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 18,
  maxTotalDurationSeconds: 25,
  maxRevisionAttempts: 2,
  revise: async ({ sceneTexts, attemptNumber }) => {
    numericRetryCalls++;
    const candidate = [...sceneTexts];
    candidate[0] = attemptNumber === 1 ? 'Wartość wyniosła 7,2%.' : 'Wartość wyniosła 5,2%.';
    return candidate;
  }
});
assert.equal(numericRetryCalls, 2, 'after a fact-changing edit is rejected, the remaining correction attempt is used');
assert.equal(numericRetryFit.revisionAttempts, 2);
assert.equal(numericRetryFit.rejectedNumericRevisionAttempts, 1);
assert.equal(numericRetryFit.sceneTexts[0], 'Wartość wyniosła 5,2%.', 'the valid shorter rewrite keeps the original numeric fact');
assert.ok(numericRetryFit.totalEstimatedDurationSeconds <= 25);

const longNumericOverLimit = Array.from({ length: 30 }, () => 'konkret').join(' ') + ' Wartość wyniosła 5,2%.';
let invalidNumericHardCapCalls = 0;
await assert.rejects(() => fitNarrationBeforeTts({
  sceneTexts: [longNumericOverLimit, ...shortTexts.slice(1)],
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 18,
  maxTotalDurationSeconds: 25,
  maxRevisionAttempts: 2,
  revise: async ({ sceneTexts }) => {
    invalidNumericHardCapCalls++;
    const candidate = [...sceneTexts];
    candidate[0] = Array.from({ length: 12 }, () => 'konkret').join(' ') + ' Wartość wyniosła 7,2%.';
    return candidate;
  }
}), /TTS nie został uruchomiony/);
assert.equal(invalidNumericHardCapCalls, 2, 'fact-changing rewrites are rejected, but an overlong verified original still hits the 25-second hard cap');

let revisionAttemptsForHardFail = 0;
await assert.rejects(() => fitNarrationBeforeTts({
  sceneTexts: longTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.6,
  speed: 1,
  targetDurationSeconds: 18,
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
  targetDurationSeconds: 18,
  maxTotalDurationSeconds: 25,
  revise: async ({ sceneTexts }) => {
    const candidate = [...sceneTexts];
    candidate[candidate.length - 1] = 'Zmienione CTA.';
    return candidate;
  }
}), /nie może zmieniać końcowego CTA/);

const modestNumberText = (claim: string) => Array.from({ length: 12 }, () => 'konkret').join(' ') + ' ' + claim;
await assertNumericRewriteIsRejected(modestNumberText('Wartość wyniosła 5,2%.'), 'Konkretna zmiana bez liczby.', 'usunięcie liczby');

const wordNumberLongTexts = [
  modestNumberText('Wartość wyniosła pięć procent.'),
  ...shortTexts.slice(1)
];
await assertNumericRewriteIsRejected(wordNumberLongTexts[0], Array.from({ length: 8 }, () => 'konkret').join(' ') + ' Wartość wyniosła siedem procent.', 'zmiana liczby zapisanej słownie');
const inflectedWordNumber = await fitNarrationBeforeTts({
  sceneTexts: wordNumberLongTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 18,
  maxTotalDurationSeconds: 25,
  revise: async ({ sceneTexts }) => {
    const candidate = [...sceneTexts];
    candidate[0] = Array.from({ length: 8 }, () => 'konkret').join(' ') + ' Wartość wyniosła pięciu procent.';
    return candidate;
  }
});
assert.match(inflectedWordNumber.sceneTexts[0], /pięciu procent/, 'odmiana gramatyczna tej samej liczby pozostaje dozwolona');
assert.equal(inflectedWordNumber.rejectedNumericRevisionAttempts, 0);

const digitFactsLongText = modestNumberText('Wynik: 5% wzrostu, 2% spadku.');
await assertNumericRewriteIsRejected(digitFactsLongText, Array.from({ length: 8 }, () => 'konkret').join(' ') + ' Wynik: 2% wzrostu, 5% spadku.', 'zamiana kolejności liczb');
await assertNumericRewriteIsRejected(digitFactsLongText, Array.from({ length: 8 }, () => 'konkret').join(' ') + ' Wynik: 5% wzrostu, 2% spadku w 2027 roku.', 'dodanie liczby');

const signedUnitLongText = modestNumberText('Zmiana wyniosła -5%.');
await assertNumericRewriteIsRejected(signedUnitLongText, Array.from({ length: 8 }, () => 'konkret').join(' ') + ' Zmiana wyniosła 5%.', 'zmiana znaku wartości');

const changedUnitLongText = modestNumberText('Zmiana wyniosła 5%.');
await assertNumericRewriteIsRejected(changedUnitLongText, Array.from({ length: 8 }, () => 'konkret').join(' ') + ' Zmiana wyniosła 5 zł.', 'zmiana jednostki');

const ordinalYearLongText = modestNumberText('Zmiana nastąpiła w dwa tysiące dwudziestym siódmym roku.');
await assertNumericRewriteIsRejected(ordinalYearLongText, Array.from({ length: 8 }, () => 'konkret').join(' ') + ' Zmiana nastąpiła w dwa tysiące dwudziestym ósmym roku.', 'zmiana roku zapisanego słownie');

console.log('Narration timing tests passed');
