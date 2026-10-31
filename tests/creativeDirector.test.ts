import assert from 'node:assert/strict';
import { buildCreativeDirectorFallback, loadBrandContext, mapCreativeDirectorPlanToRenderScenes, parseCreativeDirectorPlan } from '../src/server/creativeDirector';

const brand = loadBrandContext(process.cwd());
assert.deepEqual(brand.filesUsed.sort(), ['ICP.md', 'brand-identity.md', 'messaging.md'].sort());

const article = { title: 'RPP pozostawiła stopy procentowe bez zmian', description: 'Bank centralny opublikował decyzję dotyczącą stóp procentowych.', category: 'Kredyty & RPP' };
const fallback = buildCreativeDirectorFallback(article, {
  filesUsed: brand.filesUsed,
  ctaText: 'Policz ratę kredytu.',
  ctaDestination: '/loan',
  ctaUrl: 'https://raport-finansowy24.pl/loan'
});
assert.equal(fallback.scenes.length, 8);
assert.equal(fallback.voice, 'pl-PL-MarekNeural');
assert.equal(fallback.brandFilesUsed.length, 3);
assert.equal(fallback.sourceTitle, article.title);
assert.equal(fallback.ctaDestination, '/loan');

const renderScenes = mapCreativeDirectorPlanToRenderScenes(fallback, 'Policz ratę kredytu.', 'SPRAWDŹ WPŁYW NA RATĘ\nRAPORT-FINANSOWY24.PL');
assert.equal(renderScenes.length, 8);
assert.equal(renderScenes[0].voiceover_text, fallback.hook);
assert.equal(renderScenes[7].voiceover_text, 'Policz ratę kredytu.');
assert.match(renderScenes[7].subtitles, /RAPORT-FINANSOWY24\.PL/);
assert.equal(renderScenes[0].visualQuery, fallback.scenes[0].visualQuery);
assert.equal(renderScenes[0].motionSound.motion, 'hero-zoom');
assert.equal(renderScenes[7].motionSound.motion, 'end-card');
assert.ok(Math.abs(renderScenes.reduce((sum, scene) => sum + scene.duration, 0) - 18) < 0.001);
assert.throws(() => mapCreativeDirectorPlanToRenderScenes({ ...fallback, scenes: fallback.scenes.slice(0, 7) }), /dokładnie 8 scen/);
assert.throws(() => mapCreativeDirectorPlanToRenderScenes({
  ...fallback,
  scenes: fallback.scenes.map((scene, index) => index === 3 ? { ...scene, start: 5, end: 6 } : scene)
}), /nakładające się sceny/);

const parsed = parseCreativeDirectorPlan(JSON.stringify({
  title: 'Test planu',
  hook: 'Co to oznacza?',
  body: 'Krótka narracja.',
  cta: 'Czytaj więcej.',
  hashtags: ['#finanse'],
  scenes: [{ purpose: 'hook', voiceover: 'Co to oznacza?', caption: 'CO TO OZNACZA?', visualQuery: 'financial chart', camera: 'push-in' }]
}), { filesUsed: brand.filesUsed, modelUsed: 'test-model' });
assert.equal(parsed.title, 'Test planu');
assert.equal(parsed.scenes[0].visualQuery, 'financial chart');
assert.equal(parsed.modelUsed, 'test-model');
assert.equal(parsed.sourceTitle, undefined);
console.log('Creative Director tests passed');
