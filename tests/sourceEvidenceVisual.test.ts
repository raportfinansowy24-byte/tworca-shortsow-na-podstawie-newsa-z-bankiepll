import assert from 'node:assert/strict';
import { buildSourceEvidenceVisual, resolveStockWithEvidenceFallback } from '../src/server/sourceEvidenceVisual';
import { hasCompleteFinanceSceneVisualAssets, isSafeFinanceDataVisualSvg } from '../src/server/sceneContract';

async function run() {
  const sourceText = 'Ceny żywności wzrosły o 4,3 proc. Firma A&B zapowiedziała dalszą analizę kosztów.';
  const sourceEvidence = 'Ceny żywności wzrosły o 4,3 proc.';
  const visual = buildSourceEvidenceVisual(sourceText, sourceEvidence);
  assert.ok(visual, 'a source-verifiable quote should produce a card');
  assert.equal(visual.visualMode, 'data_visual');
  assert.equal(isSafeFinanceDataVisualSvg(visual.visualSvg), true);
  const visibleText = visual.visualSvg.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ');
  assert.match(visibleText, /Ceny żywności wzrosły o 4,3 proc\./, 'line wrapping must not change the displayed source quote');
  assert.doesNotMatch(visual.visualSvg, /<script|onload=/i);
  assert.equal(buildSourceEvidenceVisual(sourceText, 'Ceny żywności wzrosły o 9,9 proc.'), null, 'a quote not present in the source must never be invented');
  assert.equal(buildSourceEvidenceVisual(sourceText, 'A&B'), null, 'a too-short source fragment is not a sufficient fallback');

  const escaped = buildSourceEvidenceVisual(sourceText, 'Firma A&B zapowiedziała dalszą analizę kosztów.');
  assert.ok(escaped);
  assert.match(escaped.visualSvg, /A&amp;B/, 'source text must be XML-escaped before it enters the SVG');

  const mixedScenes = [
    ...Array.from({ length: 7 }, (_, index) => ({ source: 'pexels', pexelsId: index + 1 })),
    { ...visual, source: 'data_visual' }
  ];
  assert.equal(hasCompleteFinanceSceneVisualAssets(mixedScenes), true, 'a verified SVG scene can safely coexist with unique stock scenes');

  const fallback = await resolveStockWithEvidenceFallback(
    async () => { throw new Error('no stock candidate passed visual QA'); },
    () => visual
  );
  assert.equal(fallback.kind, 'data_visual');
  if (fallback.kind === 'data_visual') {
    assert.equal(fallback.value.visualSvg, visual.visualSvg);
    assert.match(String((fallback.stockError as Error).message), /visual QA/);
  }

  let fallbackBuilt = false;
  const stockResult = await resolveStockWithEvidenceFallback(
    async () => ({ stockId: 'pexels:42' }),
    () => { fallbackBuilt = true; return visual; }
  );
  assert.deepEqual(stockResult, { kind: 'stock', value: { stockId: 'pexels:42' } });
  assert.equal(fallbackBuilt, false, 'successful stock remains preferred over a data card');

  await assert.rejects(
    () => resolveStockWithEvidenceFallback(
      async () => { throw new Error('no stock candidate'); },
      () => buildSourceEvidenceVisual(sourceText, 'This statement is not in the article.')
    ),
    /no stock candidate/
  );

  console.log('Source evidence visual fallback tests passed');
}

void run();
