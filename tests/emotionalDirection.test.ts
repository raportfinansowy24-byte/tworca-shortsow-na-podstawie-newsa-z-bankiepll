import assert from 'node:assert/strict';
import { buildEmotionallyDirectedNarration, getEmotionallyDirectedNarrationLimitError } from '../src/server/emotionalDirection';

const scenes = [
  { beat: 'hook', voiceover_text: 'Czy wiesz, co się zmieniło?' },
  { beat: 'market_snapshot', voiceover_text: 'Indeks wzrósł o pięć procent.' },
  { beat: 'loser', voiceover_text: 'Jedna spółka zanotowała spadek.' },
  { beat: 'takeaway', voiceover_text: 'Najważniejszy jest pełny kontekst.' },
  { beat: 'cta', voiceover_text: 'Sprawdź szczegóły na stronie.' }
];

const v2 = buildEmotionallyDirectedNarration(scenes, 'eleven_multilingual_v2');
assert.equal(v2, scenes.map((scene) => scene.voiceover_text).join(' '));
assert.ok(!/\[[^\]]+\]/u.test(v2), 'v2 must not receive unsupported audio tags');

const v3 = buildEmotionallyDirectedNarration(scenes, 'eleven_v3');
assert.match(v3, /^\[curious\] Czy wiesz/u);
assert.match(v3, /\[serious\] Jedna spółka/u);
assert.match(v3, /\[thoughtful\] Najważniejszy/u);
assert.match(v3, /\[confident\] Sprawdź/u);
assert.match(buildEmotionallyDirectedNarration(scenes, 'eleven_v4'), /^\[curious\]/u);
assert.equal(buildEmotionallyDirectedNarration([], 'eleven_v4'), '');


const providerLimitBoundaryScenes = [
  { beat: 'hook', voiceover_text: 'a'.repeat(4490) },
  { beat: 'cta', voiceover_text: 'CTA 12345' }
];
assert.equal(
  getEmotionallyDirectedNarrationLimitError(providerLimitBoundaryScenes, 'eleven_multilingual_v2'),
  null,
  'the complete single TTS track, including the final CTA, may use exactly 4500 characters'
);
const overProviderLimitScenes = [
  { beat: 'hook', voiceover_text: 'a'.repeat(4490) },
  { beat: 'cta', voiceover_text: 'CTA 123456' }
];
assert.match(
  getEmotionallyDirectedNarrationLimitError(overProviderLimitScenes, 'eleven_multilingual_v2') || '',
  /4500/u,
  'the full track is rejected when the final CTA takes it over the provider ceiling'
);
const audioTagOverheadScenes = [
  { beat: 'hook', voiceover_text: 'a'.repeat(560) },
  ...Array.from({ length: 6 }, () => ({ beat: 'context', voiceover_text: 'b'.repeat(560) })),
  { beat: 'cta', voiceover_text: 'c'.repeat(560) }
];
assert.match(
  getEmotionallyDirectedNarrationLimitError(audioTagOverheadScenes, 'eleven_v3') || '',
  /4500/u,
  'model-specific audio tags are included in the provider character count'
);

console.log('emotional direction tests passed');
