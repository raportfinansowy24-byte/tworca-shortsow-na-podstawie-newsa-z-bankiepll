import assert from 'node:assert/strict';
import { buildEmotionallyDirectedNarration } from '../src/server/emotionalDirection';

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

console.log('emotional direction tests passed');
