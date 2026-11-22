import assert from 'node:assert/strict';
import { buildStockClipSamplingFilter, stockClipSamplingFrameCountIsSufficient } from '../src/server/stockClipSampling';

const wholeClip = buildStockClipSamplingFilter(18);
const shortScene = buildStockClipSamplingFilter(18, 2.4);
const fullScene = buildStockClipSamplingFilter(18, 18);
assert.match(wholeClip, /8\.1818/);
assert.match(shortScene, /1\.0909/, 'sample frames in the rendered 2.4s scene window, not the full source clip');
assert.equal(shortScene, buildStockClipSamplingFilter(18, 2.4), 'sampling window is deterministic');
assert.equal(fullScene, wholeClip, 'sampling the full rendered clip retains previous spacing');
assert.match(buildStockClipSamplingFilter(4, 1.5), /0\.6818/, 'short render window is sampled at three points near the start');
assert.throws(() => buildStockClipSamplingFilter(2), /Nieprawidłowa długość/);
assert.throws(() => buildStockClipSamplingFilter(12, 0), /Nieprawidłowy zakres/);
assert.equal(stockClipSamplingFrameCountIsSufficient(3), true);
assert.equal(stockClipSamplingFrameCountIsSufficient(2), false);
console.log('Stock clip sampling window tests passed');
