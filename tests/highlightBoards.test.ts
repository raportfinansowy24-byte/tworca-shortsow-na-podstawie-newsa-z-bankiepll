import assert from 'node:assert/strict';
import { generateHighlightBoardAss, type BoardWordTiming } from '../src/server/highlightBoards';
const sample = 'Wynik banku wzrósł o 25 procent w tym kwartale';
const make = (text: string, gapAt = -1): BoardWordTiming[] => text.split(/\s+/).map((word, i) => ({ word, start: i * 0.55 + (i > gapAt ? 0.8 : 0), end: i * 0.55 + 0.42 + (i > gapAt ? 0.8 : 0) }));
const ass = generateHighlightBoardAss(sample, 9, make(sample));
assert.match(ass, /PlayResX: 720/); assert.match(ass, /PlayResY: 1280/); assert.match(ass, /Dialogue: 0,0:00:02\.45/);
assert.match(ass, /25/); assert.ok((ass.match(/\\c&H003030ff&/g) || []).length >= 1 && (ass.match(/\\c&H003030ff&/g) || []).length <= 2, 'wyróżnione 1–2 słowa'); assert.match(ass, /MarginV, Encoding[\s\S]*?,60,60,300,1/);
assert.equal(generateHighlightBoardAss('Krótka narracja', 4, make('Krótka narracja')), '', 'krótki tekst nie tworzy planszy');
assert.equal(generateHighlightBoardAss(sample, 9, []), '', 'brak alignment nie szacuje czasu z długości tekstu');
assert.equal(generateHighlightBoardAss(sample, 9, make(sample), { enabled: false }), '');
assert.equal(generateHighlightBoardAss(sample, 9, make(sample).map((t, i) => i === 3 ? { ...t, word: 'inne' } : t)), '');
const longer = 'Wartość aktywów banku przekroczyła 125 miliardów złotych po wzroście';
const longAss = generateHighlightBoardAss(longer, 12, make(longer), { maxWords: 6 });
assert.match(longAss, /\\N|Dialogue/); assert.match(longAss, /125/);
const referenceStyle = generateHighlightBoardAss(sample, 9, make(sample), {
  position: 'center', fontSize: 78, fontColor: '#FFFFFF', highlightColor: '#FF2020',
  outlineColor: '#000000', outlineWidth: 6, shadow: 4, maxLines: 2
});
assert.match(referenceStyle, /Style: FactBoard,Anton,78/);
assert.match(referenceStyle, /,5,60,60,0,1/);
assert.match(referenceStyle, /\\\\N/);
assert.match(referenceStyle, /\\\\c&H002020FF&/);
const paused = make(sample, 3); const pauseAss = generateHighlightBoardAss(sample, 10, paused);
assert.ok(pauseAss.includes('0:00:03.'));
const longWord = 'nadwyżkaoperacyjna';
assert.ok(generateHighlightBoardAss(`Wynik to 14 procent ${longWord}`, 6, make(`Wynik to 14 procent ${longWord}`)).length > 0);
console.log('Highlight board tests passed');
