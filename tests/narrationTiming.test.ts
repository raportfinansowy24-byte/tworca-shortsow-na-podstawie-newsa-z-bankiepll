import assert from 'node:assert/strict';
import {
  DEFAULT_SECONDS_PER_SPEECH_UNIT,
  ELEVENLABS_MAX_SINGLE_REQUEST_CHARACTERS,
  getElevenLabsNarrationLimitError,
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
assert.equal(ELEVENLABS_MAX_SINGLE_REQUEST_CHARACTERS, 4500);
assert.equal(getElevenLabsNarrationLimitError('x'.repeat(4500)), null, 'the provider character ceiling is inclusive');
assert.equal(getElevenLabsNarrationLimitError('x'.repeat(4501))?.includes('4500'), true, 'over-limit narration is rejected before the single TTS request');
assert.equal(getElevenLabsNarrationLimitError(' x\ny '), null, 'line breaks are normalized before character counting');
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

const base = Array(8).fill(2.25);
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
  targetDurationSeconds: 15,
  revise: async () => { throw new Error('nie powinno wywołać redakcji'); }
});
assert.equal(noEdit.revisionAttempts, 0);
assert.equal(noEdit.reachedTargetDuration, true);
assert.ok(noEdit.minimumEstimatedDurationSeconds >= 15, 'minimum duration is met before TTS');

const tooShortTexts = [
  'Krótki fakt.',
  'Krótki fakt.',
  'Krótki fakt.',
  'Krótki fakt.',
  'Krótki fakt.',
  'Krótki fakt.',
  'Krótki fakt.',
  'Sprawdź szczegóły na stronie raportu.'
];
let observedExpansionDirection = '';
const expandedNarration = await fitNarrationBeforeTts({
  sceneTexts: tooShortTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 15,
  maxRevisionAttempts: 1,
  revise: async ({ sceneTexts, direction }) => {
    observedExpansionDirection = direction;
    return sceneTexts.map((text, index) => index === sceneTexts.length - 1
      ? text
      : text + ' Dodatkowy kontekst pomaga zrozumieć skutki decyzji.');
  }
});
assert.equal(observedExpansionDirection, 'expand', 'short narration requests source-grounded expansion');
assert.ok(expandedNarration.minimumEstimatedDurationSeconds >= 15, 'expanded narration reaches the 15-second minimum');
assert.equal(expandedNarration.sceneTexts[7], tooShortTexts[7], 'expansion never changes the final CTA');

await assert.rejects(() => fitNarrationBeforeTts({
  sceneTexts: tooShortTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 15,
  maxRevisionAttempts: 1,
  revise: async () => null
}), /TTS nie został uruchomiony/, 'an unexpandable source is rejected before TTS');

const veryLongTexts = [
  Array.from({ length: 180 }, () => 'konkret').join(' ') + '.',
  ...shortTexts.slice(1)
];
const longNarration = await fitNarrationBeforeTts({
  sceneTexts: veryLongTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 15
});
assert.equal(longNarration.revisionAttempts, 0, 'long narration is not shortened to fit an upper limit');
assert.equal(longNarration.reachedTargetDuration, true);
assert.ok(longNarration.totalEstimatedDurationSeconds > 28, 'a naturally long narration may exceed the former 28-second cap');
assert.equal(longNarration.sceneTexts[0], veryLongTexts[0]);

let fourStepCalls = 0;
const fourStepFit = await fitNarrationBeforeTts({
  sceneTexts: tooShortTexts,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.43,
  speed: 1,
  targetDurationSeconds: 15,
  maxRevisionAttempts: 4,
  revise: async ({ sceneTexts }) => {
    fourStepCalls++;
    const candidate = [...sceneTexts];
    const expansion = ' Dodatkowy kontekst pomaga zrozumieć skutki decyzji.';
    for (let index = 0; index < candidate.length - 1; index++) {
      candidate[index] += expansion;
    }
    return candidate;
  }
});
assert.ok(fourStepCalls <= 4, 'source-grounded expansion remains bounded by the request budget');
assert.equal(fourStepFit.revisionAttempts, fourStepCalls);
assert.equal(fourStepFit.reachedTargetDuration, true);
assert.ok(fourStepFit.minimumEstimatedDurationSeconds >= 15);

async function assertNumericRewriteIsRejected(originalText: string, revisedText: string, label: string): Promise<void> {
  const sceneTexts = [...tooShortTexts];
  sceneTexts[0] = originalText;
  let calls = 0;
  const result = await fitNarrationBeforeTts({
    sceneTexts,
    baseSceneDurations: base,
    secondsPerSpeechUnit: 0.4,
    speed: 1,
    targetDurationSeconds: 15,
    maxRevisionAttempts: 2,
    revise: async ({ sceneTexts: current, attemptNumber }) => {
      calls++;
      const candidate = [...current];
      const expansion = 'Dodatkowy kontekst pomaga zrozumieć skutki decyzji.';
      candidate[0] = (attemptNumber === 1 ? revisedText : originalText) + ' ' + expansion;
      for (let index = 1; index < candidate.length - 1; index++) {
        candidate[index] += ' ' + expansion;
      }
      return candidate;
    }
  });
  assert.equal(calls, 2, `${label}: an unsafe numeric rewrite is rejected before the safe expansion`);
  assert.equal(result.rejectedNumericRevisionAttempts, 1, `${label}: unsafe candidate was counted as rejected`);
  assert.ok(result.sceneTexts[0].includes(originalText), `${label}: original numeric claim remains intact`);
  assert.ok(result.minimumEstimatedDurationSeconds >= 15, `${label}: safe expansion reaches the minimum runtime`);
}

await assertNumericRewriteIsRejected('Wartość wyniosła 5,2%.', 'Wartość wyniosła 7,2%.', 'zmiana liczby');
await assertNumericRewriteIsRejected('Wartość wyniosła pięć procent.', 'Wartość wyniosła siedem procent.', 'zmiana liczby zapisanej słownie');
await assertNumericRewriteIsRejected('Wynik: 5% wzrostu, 2% spadku.', 'Wynik: 2% wzrostu, 5% spadku.', 'zamiana kolejności liczb');
await assertNumericRewriteIsRejected('Wynik: 5% wzrostu.', 'Wynik: 5% wzrostu w 2027 roku.', 'dodanie liczby');
await assertNumericRewriteIsRejected('Zmiana wyniosła -5%.', 'Zmiana wyniosła 5%.', 'zmiana znaku wartości');
await assertNumericRewriteIsRejected('Zmiana wyniosła 5%.', 'Zmiana wyniosła 5 zł.', 'zmiana jednostki');
await assertNumericRewriteIsRejected(
  'Zmiana nastąpiła w dwa tysiące dwudziestym siódmym roku.',
  'Zmiana nastąpiła w dwa tysiące dwudziestym ósmym roku.',
  'zmiana roku zapisanego słownie'
);

const inflectedWordNumber = await fitNarrationBeforeTts({
  sceneTexts: [...tooShortTexts.slice(0, 0), 'Wartość wyniosła pięć procent.', ...tooShortTexts.slice(1)],
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 15,
  revise: async ({ sceneTexts }) => sceneTexts.map((text, index) => index === 0
    ? 'Wartość wyniosła pięciu procent. Dodatkowy kontekst pomaga zrozumieć skutki decyzji.'
    : index === sceneTexts.length - 1 ? text : text + ' Dodatkowy kontekst pomaga zrozumieć skutki decyzji.')
});
assert.match(inflectedWordNumber.sceneTexts[0], /pięciu procent/, 'odmiana gramatyczna tej samej liczby pozostaje dozwolona');
assert.equal(inflectedWordNumber.rejectedNumericRevisionAttempts, 0);

const finalCtaMutation = [...tooShortTexts];
await assert.rejects(() => fitNarrationBeforeTts({
  sceneTexts: finalCtaMutation,
  baseSceneDurations: base,
  secondsPerSpeechUnit: 0.4,
  speed: 1,
  targetDurationSeconds: 15,
  maxRevisionAttempts: 1,
  revise: async ({ sceneTexts }) => sceneTexts.map((text, index) => index === sceneTexts.length - 1 ? 'Zmienione CTA.' : text + ' Dodatkowy kontekst pomaga zrozumieć skutki decyzji.')
}), /nie może zmieniać końcowego CTA/);

console.log('Narration timing tests passed');
