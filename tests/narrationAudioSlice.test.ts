import assert from 'node:assert/strict';
import { buildNarrationAudioSliceFilter, isNarrationAudioSliceValid } from '../src/server/narrationAudioSlice';

const filter = buildNarrationAudioSliceFilter({
  startSeconds: 4.125,
  audioDurationSeconds: 1.875,
  outputDurationSeconds: 2
});
assert.match(filter, /^atrim=start=4\.1250:duration=1\.8750,asetpts=PTS-STARTPTS/);
assert.match(filter, /apad=pad_dur=0\.1250/);
assert.match(filter, /atrim=duration=2\.0000$/);
assert.doesNotMatch(filter, /-ss|\-t /, 'cięcie wykonywane jest w jednej osi czasu filtra, a nie przez output-side seeking');

const noPadding = buildNarrationAudioSliceFilter({
  startSeconds: 0,
  audioDurationSeconds: 2,
  outputDurationSeconds: 2
});
assert.doesNotMatch(noPadding, /apad=/, 'nie dodaje ciszy, gdy nie ma zapasu');

assert.equal(isNarrationAudioSliceValid({
  exists: true,
  sizeBytes: 180_000,
  measuredDurationSeconds: 2,
  expectedDurationSeconds: 2
}), true);
assert.equal(isNarrationAudioSliceValid({
  exists: true,
  sizeBytes: 180_000,
  measuredDurationSeconds: 2.03,
  expectedDurationSeconds: 2
}), true);
assert.equal(isNarrationAudioSliceValid({
  exists: true,
  sizeBytes: 180_000,
  measuredDurationSeconds: 1.2,
  expectedDurationSeconds: 2
}), false, 'odrzuca WAV krótszy od zadanego fragmentu');
assert.equal(isNarrationAudioSliceValid({
  exists: true,
  sizeBytes: 500,
  measuredDurationSeconds: 2,
  expectedDurationSeconds: 2
}), false, 'odrzuca pusty lub ucięty plik');
assert.equal(isNarrationAudioSliceValid({
  exists: false,
  sizeBytes: 0,
  measuredDurationSeconds: 0,
  expectedDurationSeconds: 2
}), false);

assert.throws(() => buildNarrationAudioSliceFilter({
  startSeconds: -0.1,
  audioDurationSeconds: 2,
  outputDurationSeconds: 2.1
}), /Nieprawidłowe parametry/);
assert.throws(() => buildNarrationAudioSliceFilter({
  startSeconds: 1,
  audioDurationSeconds: 2.1,
  outputDurationSeconds: 2
}), /Nieprawidłowe parametry/);

console.log('Narration audio slicing tests passed');
