import assert from 'node:assert/strict';
import {
  isTrustedPexelsPreviewUrl,
  isTrustedStockPreviewUrl,
  selectVisuallyVerifiedPexelsCandidate
} from '../src/server/pexelsCandidateVisualQa';

assert.equal(isTrustedPexelsPreviewUrl('https://images.pexels.com/videos/123/preview.jpg'), true);
assert.equal(isTrustedPexelsPreviewUrl('https://pexels.com/photo/123'), true);
assert.equal(isTrustedPexelsPreviewUrl('https://cdn.pexels.com/path/frame.jpg'), true);
assert.equal(isTrustedPexelsPreviewUrl('http://images.pexels.com/frame.jpg'), false);
assert.equal(isTrustedPexelsPreviewUrl('https://evilpexels.com/frame.jpg'), false);
assert.equal(isTrustedPexelsPreviewUrl('https://pexels.com.evil.example/frame.jpg'), false);
assert.equal(isTrustedPexelsPreviewUrl('https://example.com/pexels.com/frame.jpg'), false);
assert.equal(isTrustedPexelsPreviewUrl('not a url'), false);
assert.equal(isTrustedStockPreviewUrl('https://cdn.pixabay.com/video/preview.jpg'), true);
assert.equal(isTrustedStockPreviewUrl('https://pixabay.com.evil.example/preview.jpg'), false);

const verified = selectVisuallyVerifiedPexelsCandidate([
  { pexelsId: 101, selectionScore: 220, visual: { scene: 1, match: false, confidence: 0.99, reason: 'Pokazuje kryptowaluty zamiast działki.' } },
  { pexelsId: 102, selectionScore: 180, visual: { scene: 2, match: true, confidence: 0.86, reason: 'Widoczny teren i działka budowlana.' } },
  { pexelsId: 103, selectionScore: 250, visual: { scene: 3, match: true, confidence: 0.51, reason: 'Zgodność niepewna.' } }
]);
assert.equal(verified?.pexelsId, 102, 'wybierz trafny wizualnie kandydat, nie najwyższy wynik tekstowy');
assert.equal(verified?.confidence, 0.86);

assert.equal(selectVisuallyVerifiedPexelsCandidate([
  { pexelsId: 201, selectionScore: 999, visual: { scene: 1, match: false, confidence: 0.99, reason: 'Nie pasuje.' } },
  { pexelsId: 202, selectionScore: 800, visual: { scene: 2, match: true, confidence: 0.67, reason: 'Poniżej progu.' } }
]), null, 'blokuj wybór, jeśli żaden kandydat nie przechodzi bramki wizualnej');

assert.equal(selectVisuallyVerifiedPexelsCandidate([
  { pexelsId: 0, selectionScore: 999, visual: { scene: 1, match: true, confidence: 1, reason: 'id nieprawidłowe' } },
  { pexelsId: 203, selectionScore: 800 }
]), null, 'nie przyjmuj ID niewłaściwego ani kandydata bez wyniku vision QA');

const ranking = selectVisuallyVerifiedPexelsCandidate([
  { pexelsId: 301, selectionScore: 100, visual: { scene: 1, match: true, confidence: 0.90, reason: 'Dobrze pasuje.' } },
  { pexelsId: 302, selectionScore: 300, visual: { scene: 2, match: true, confidence: 0.80, reason: 'Pasuje.' } }
]);
assert.equal(ranking?.pexelsId, 301, 'wyższa pewność dopasowania obrazu musi przeważyć nad przewagą tekstowego rankingu');
console.log('Pexels candidate visual QA tests passed');
