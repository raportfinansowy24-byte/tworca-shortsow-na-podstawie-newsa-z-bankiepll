import assert from 'node:assert/strict';
import { generateKaraokeCaptionAss } from '../src/server/karaokeCaptions';

const text = 'Swoich rodziców chroni bank';
const timings = text.split(' ').map((word, index) => ({
  word, start: index * 0.5, end: index * 0.5 + 0.45,
}));
const ass = generateKaraokeCaptionAss(text, 4, timings);
assert.match(ass, /Style: Glow,Montserrat Black,86/);
assert.match(ass, /Style: Caption,Montserrat Black,86/);
assert.match(ass, /PlayResX: 720/);
assert.match(ass, /\\blur18/);
assert.match(ass, /\\bord14/);
assert.match(ass, /\\c&H000000FF&/);
assert.match(ass, /Dialogue: 0,/);
assert.match(ass, /Dialogue: 1,/);
assert.equal((ass.match(/Dialogue: 0,/g) || []).length, 4);
assert.equal((ass.match(/Dialogue: 1,/g) || []).length, 4);
assert.equal(generateKaraokeCaptionAss(text, 4, []), '');
assert.equal(generateKaraokeCaptionAss(text, 4, timings.map((item, index) =>
  index === 1 ? { ...item, word: 'niezgodne' } : item
)), '');
console.log('Karaoke caption tests passed');
