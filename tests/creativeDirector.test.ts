import assert from 'node:assert/strict';
import { buildCreativeDirectorFallback, loadBrandContext, parseCreativeDirectorPlan } from '../src/server/creativeDirector';

const brand = loadBrandContext(process.cwd());
assert.deepEqual(brand.filesUsed.sort(), ['ICP.md', 'brand-identity.md', 'messaging.md'].sort());

const article = { title: 'RPP pozostawiła stopy procentowe bez zmian', description: 'Bank centralny opublikował decyzję dotyczącą stóp procentowych.', category: 'Kredyty & RPP' };
const fallback = buildCreativeDirectorFallback(article, { filesUsed: brand.filesUsed });
assert.equal(fallback.scenes.length, 8);
assert.equal(fallback.voice, 'pl-PL-MarekNeural');
assert.equal(fallback.brandFilesUsed.length, 3);

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
console.log('Creative Director tests passed');
