import assert from 'node:assert/strict';
import { buildBrandedCtaSvg } from '../src/server/brandEndCard';
import { isSafeFinanceDataVisualSvg } from '../src/server/sceneContract';

const svg = buildBrandedCtaSvg('SPRAWDŹ SPÓŁKĘ');
assert.equal(isSafeFinanceDataVisualSvg(svg), true);
assert.match(svg, /RAPORT FINANSOWY 24/);
assert.match(svg, /RAPORT-FINANSOWY24\.PL/);
assert.match(svg, /SPRAWDŹ SPÓŁKĘ/);
assert.doesNotMatch(svg, /<script|href\s*=|onload\s*=/i);
assert.match(buildBrandedCtaSvg('<script>alert(1)</script>'), /&lt;script&gt;/);
console.log('Brand CTA end-card tests passed');
