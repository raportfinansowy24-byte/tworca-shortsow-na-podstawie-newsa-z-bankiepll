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
const shortTexts = [
  'To ważna zmiana dla klientów banków.',
  'To ważna zmiana dla klientów banków.',
  'To ważna zmiana dla klientów banków.',
  'To ważna zmiana dla klientów banków.',
  'To ważna zmiana dla klientów banków.',
  'To ważna zmiana dla klientów banków.',
  'To ważna zmiana dla klientów banków.',
  'Sprawdź szczegóły na stronie raportu.'
];
const noEdit = await fitNarrationBeforeTts({
  sceneTexts: shortTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 17,
  maxTotalDurationSeconds: 28,
  revise: async () => { throw new Error('nie powinno wywołać redakcji'); }
});
assert.equal(noEdit.revisionAttempts, 0);
assert.equal(noEdit.reachedTargetDuration, true);

const longTexts = [
  Array.from({ length: 30 }, () => 'konkret').join(' ') + '.',
  ...shortTexts.slice(1)
];

const tooShortTexts = [
  'Krótki fakt.',
  'Krótki fakt.',
  'Krótki fakt.',
  'Krótki fakt.',
  'Krótki fakt.',
  'Krótki fakt.',
  'Krótki fakt.',
  shortTexts[7]
];
let observedExpansionDirection = '';
const expandedNarration = await fitNarrationBeforeTts({
  sceneTexts: tooShortTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 17,
  maxTotalDurationSeconds: 28,
  maxRevisionAttempts: 1,
  revise: async ({ sceneTexts, direction }) => {
    observedExpansionDirection = direction;
    const candidate = [...sceneTexts];
    for (let index = 0; index < candidate.length - 1; index++) {
      candidate[index] += ' Ważny kontekst dla klientów.';
    }
    return candidate;
  }
});
assert.equal(observedExpansionDirection, 'expand', 'short narration requests source-grounded expansion, not shortening');
assert.ok(expandedNarration.minimumEstimatedDurationSeconds >= 17, 'expanded narration reaches the 17-second minimum using the lower duration estimate');
assert.ok(expandedNarration.totalEstimatedDurationSeconds <= 28, 'expanded narration stays below the hard cap using the conservative estimate');
assert.equal(expandedNarration.sceneTexts[7], tooShortTexts[7], 'expansion never changes the final CTA');

await assert.rejects(() => fitNarrationBeforeTts({
  sceneTexts: tooShortTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 17,
  maxTotalDurationSeconds: 28,
  maxRevisionAttempts: 1,
  revise: async () => null
}), /TTS nie został uruchomiony/, 'an unexpandable source is rejected before TTS');
let revisionAttemptsForHardFail = 0;
await assert.rejects(() => fitNarrationBeforeTts({
  sceneTexts: longTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.6,
  speed: 1,
  targetDurationSeconds: 17,
  maxTotalDurationSeconds: 28,
  revise: async () => {
    revisionAttemptsForHardFail++;
    return longTexts;
  }
}), /scenariusz odrzucono/);
assert.equal(revisionAttemptsForHardFail, 0, 'over-limit original is rejected before any editorial revision or TTS call');

const modestNumberText = (claim: string) => Array.from({ length: 22 }, () => 'konkret').join(' ') + ' ' + claim;
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
  targetDurationSeconds: 17,
  maxTotalDurationSeconds: 28,
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
