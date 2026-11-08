import assert from 'node:assert/strict';
import { buildArticleVisualQuery, buildCreativeDirectorFallback, buildCreativeDirectorPrompt, loadBrandContext, mapCreativeDirectorPlanToRenderScenes, parseCreativeDirectorPlan } from '../src/server/creativeDirector';

const brand = loadBrandContext(process.cwd());
assert.deepEqual(brand.filesUsed.sort(), ['ICP.md', 'brand-identity.md', 'messaging.md'].sort());

const article = { title: 'RPP pozostawiła stopy procentowe bez zmian', description: 'Bank centralny opublikował decyzję dotyczącą stóp procentowych.', category: 'Kredyty & RPP' };
const directorPrompt = buildCreativeDirectorPrompt({ article, brandContext: brand.context });
assert.match(directorPrompt, /visualQuery jest zapytaniem do wyszukiwarki Pexels/);
assert.match(directorPrompt, /jeden spójny ruch kamery/);
assert.match(directorPrompt, /nie gwarantuje, że pobrany stock zawiera dokładnie taki ruch/);
const fallback = buildCreativeDirectorFallback(article, {
  filesUsed: brand.filesUsed,
  ctaText: 'Wejdź na raport-finansowy24.pl i policz ratę kredytu.',
  ctaDestination: '/loan',
  ctaUrl: 'https://raport-finansowy24.pl/loan'
});
assert.equal(fallback.scenes.length, 8);
assert.equal(fallback.voice, 'pl-PL-MarekNeural');
assert.equal(fallback.brandFilesUsed.length, 3);
assert.equal(fallback.sourceTitle, article.title);
assert.equal(fallback.ctaDestination, '/loan');
const fallbackVoiceovers = fallback.scenes.map((scene) => scene.voiceover);
assert.equal(new Set(fallbackVoiceovers.map((voiceover) => voiceover.toLocaleLowerCase('pl-PL'))).size, 8, 'fallback nie powtarza narracji między scenami');
assert.ok(fallback.scenes.slice(1, 7).every((scene) => scene.voiceover.split(/\s+/).length <= 5), 'środkowe beaty fallbacku są krótkie');
const lengthyFallback = buildCreativeDirectorFallback({
  title: 'NBP omawia stopy procentowe',
  description: 'Artykuł zawiera długi opis, który nie powinien być powtarzany w każdej scenie. '.repeat(12),
  summary: 'Artykuł zawiera długi opis, który nie powinien być powtarzany w każdej scenie. '.repeat(12)
});
const totalFallbackWords = lengthyFallback.scenes.reduce((total, scene) => total + scene.voiceover.trim().split(/\s+/).filter(Boolean).length, 0);
assert.ok(totalFallbackWords <= 50, `fallback utrzymuje krótki budżet narracji, otrzymano ${totalFallbackWords} słów`);
assert.ok(lengthyFallback.riskFlags.some((flag) => /neutralne linie pomostowe/.test(flag)), 'fallback sygnalizuje, gdy źródło nie dostarcza dość krótkich, odrębnych faktów');
const longTitleFallback = buildCreativeDirectorFallback({
  title: 'Narodowy Bank Polski ogłosił ważną decyzję dotyczącą stóp procentowych oraz rat kredytów w Polsce',
  keyTakeaway: 'Bank ogłosił decyzję.',
  description: 'Szczegóły podaje artykuł źródłowy.'
});
assert.equal(longTitleFallback.hook, 'Narodowy Bank Polski ogłosił…');
assert.ok(longTitleFallback.hook.split(/\s+/).length <= 4, 'hook fallbacku mieści się w czterech słowach');
assert.ok(longTitleFallback.hook.length <= 49, 'hook fallbacku mieści się w 48 znakach plus wielokropek');
assert.ok(longTitleFallback.riskFlags.some((flag) => /Długi hook fallbacku został skrócony/.test(flag)), 'fallback jawnie sygnalizuje skrócenie długiego hooka');
assert.match(fallback.scenes[0].visualQuery, /National Bank of Poland/i);
assert.doesNotMatch(fallback.scenes[0].visualQuery, /crypto|cryptocurrency/i);
assert.notEqual(buildArticleVisualQuery(article, 'RPP pozostaje w centrum sporu.', 0), 'financial market chart dynamic');

const renderScenes = mapCreativeDirectorPlanToRenderScenes(fallback, 'Wejdź na raport-finansowy24.pl i policz ratę kredytu.', 'SPRAWDŹ WPŁYW NA RATĘ\nRAPORT-FINANSOWY24.PL');
assert.equal(renderScenes.length, 8);
assert.equal(renderScenes[0].voiceover_text, fallback.hook);
assert.equal(renderScenes[7].voiceover_text, 'Wejdź na raport-finansowy24.pl i policz ratę kredytu.');
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
const missingQueryPlan = parseCreativeDirectorPlan(JSON.stringify({
  title: 'Plan', hook: 'Hook', scenes: [{ purpose: 'hook', voiceover: 'Hook', caption: 'HOOK' }]
}), { article });
assert.equal(missingQueryPlan.scenes[0].visualQuery, '');
assert.throws(() => mapCreativeDirectorPlanToRenderScenes({ ...missingQueryPlan, scenes: Array.from({ length: 8 }, (_, index) => ({
  ...missingQueryPlan.scenes[0], start: index * 2.25, end: (index + 1) * 2.25, visualQuery: ''
})) }), /zapytania wizualnego/);
console.log('Creative Director tests passed');
