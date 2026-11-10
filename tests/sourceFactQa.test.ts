import assert from 'node:assert/strict';
import { evaluateSourceEvidence } from '../src/server/sourceFactQa';
import { evaluateShortStoryboard } from '../src/server/shortsEditorQa';

const sourceText = 'WIG20 wzrósł o 0,86 proc. Cyfrowy Polsat spadł o 17,67 proc.';
const validScenes = [
  { voiceover_text: 'WIG20 wzrósł o 0,86 procent.', subtitles: 'WIG20 wzrósł o 0,86 procent.', sourceEvidence: 'WIG20 wzrósł o 0,86 proc.' },
  { voiceover_text: 'Cyfrowy Polsat spadł o 17,67 procent.', subtitles: 'Cyfrowy Polsat spadł o 17,67 procent.', sourceEvidence: 'Cyfrowy Polsat spadł o 17,67 proc.' },
  { voiceover_text: 'Ta sesja przyniosła dwa różne kierunki.', subtitles: 'Ta sesja przyniosła dwa różne kierunki.', sourceEvidence: 'WIG20 wzrósł o 0,86 proc. Cyfrowy Polsat spadł o 17,67 proc.' },
  { voiceover_text: 'W indeksie i spółce ruch był różny.', subtitles: 'W indeksie i spółce ruch był różny.', sourceEvidence: 'WIG20 wzrósł o 0,86 proc. Cyfrowy Polsat spadł o 17,67 proc.' },
  { voiceover_text: 'Zestawienie pokazuje tę rozbieżność.', subtitles: 'Zestawienie pokazuje tę rozbieżność.', sourceEvidence: 'WIG20 wzrósł o 0,86 proc. Cyfrowy Polsat spadł o 17,67 proc.' },
  { voiceover_text: 'Warto oddzielić indeks od spółki.', subtitles: 'Warto oddzielić indeks od spółki.', sourceEvidence: 'WIG20 wzrósł o 0,86 proc. Cyfrowy Polsat spadł o 17,67 proc.' },
  { voiceover_text: 'Liczby trzeba czytać w kontekście.', subtitles: 'Liczby trzeba czytać w kontekście.', sourceEvidence: 'WIG20 wzrósł o 0,86 proc. Cyfrowy Polsat spadł o 17,67 proc.' },
  { voiceover_text: 'Wejdź na raport-finansowy24.pl i sprawdź spółkę.', subtitles: 'Wejdź na raport-finansowy24.pl i sprawdź spółkę.' }
];

assert.equal(evaluateSourceEvidence(validScenes, { sourceText }).status, 'pass');
assert.equal(evaluateSourceEvidence(validScenes, { sourceText: '' }).status, 'blocked');

const missingEvidence = validScenes.map((scene, index) => index === 1 ? { ...scene, sourceEvidence: '' } : scene);
assert.ok(evaluateSourceEvidence(missingEvidence, { sourceText }).findings.some((finding) => finding.code === 'missing_source_evidence'));

const inventedNumber = validScenes.map((scene, index) => index === 0
  ? { ...scene, voiceover_text: 'WIG20 wzrósł o 1,86 procent.', subtitles: 'WIG20 wzrósł o 1,86 procent.' }
  : scene);
assert.ok(evaluateSourceEvidence(inventedNumber, { sourceText }).findings.some((finding) => finding.code === 'unsupported_numeric_claim'));

const invertedDirection = validScenes.map((scene, index) => index === 0
  ? { ...scene, voiceover_text: 'WIG20 spadł o 0,86 procent.', subtitles: 'WIG20 spadł o 0,86 procent.' }
  : scene);
assert.ok(evaluateSourceEvidence(invertedDirection, { sourceText }).findings.some((finding) => finding.code === 'contradictory_numeric_direction'));

const wrongEntity = validScenes.map((scene, index) => index === 1
  ? { ...scene, voiceover_text: 'WIG20 spadł o 17,67 procent.', subtitles: 'WIG20 spadł o 17,67 procent.' }
  : scene);
assert.ok(evaluateSourceEvidence(wrongEntity, { sourceText }).findings.some((finding) => finding.code === 'unsupported_entity_claim'));

const groupedThousands = evaluateSourceEvidence([
  { voiceover_text: 'Przychody wyniosły 1234 mln zł.', subtitles: 'Przychody wyniosły 1234 mln zł.', sourceEvidence: 'Przychody wyniosły 1 234 mln zł.' },
  ...validScenes.slice(1)
], { sourceText: 'Przychody wyniosły 1 234 mln zł. ' + sourceText });
assert.equal(groupedThousands.status, 'pass');

const quoteNotInSource = validScenes.map((scene, index) => index === 0
  ? { ...scene, sourceEvidence: 'WIG20 wzrósł o 0,86 proc. i pobił rekord.' }
  : scene);
assert.ok(evaluateSourceEvidence(quoteNotInSource, { sourceText }).findings.some((finding) => finding.code === 'source_evidence_not_in_article'));

const storyboard = evaluateShortStoryboard(validScenes, {
  expectedSceneCount: 8,
  requireSourceEvidence: true,
  sourceText
});
assert.equal(storyboard.status, 'pass');
assert.equal(evaluateShortStoryboard(validScenes.map((scene, index) => index === 1 ? { ...scene, sourceEvidence: '' } : scene), {
  expectedSceneCount: 8,
  requireSourceEvidence: true,
  sourceText
}).status, 'blocked');

console.log('Source fact QA tests passed');
