import assert from 'node:assert/strict';
import { getSceneCountError, hasUniquePexelsSceneIds, MAX_SHORT_DURATION_SECONDS, sceneDurationsForCount, sceneDurationsWithNarration, sceneRequestMetadata } from '../src/server/sceneContract';
import { selectFinanceCta } from '../src/server/financeCtaStrategy';

assert.equal(getSceneCountError(8, 8), null);
assert.match(getSceneCountError(8, 1) || '', /Oczekiwano 8 scen, otrzymano 1/);
assert.match(getSceneCountError(8, 7) || '', /Oczekiwano 8 scen, otrzymano 7/);
assert.match(getSceneCountError(8, 9) || '', /Oczekiwano 8 scen, otrzymano 9/);
assert.match(getSceneCountError(undefined, 8) || '', /expectedSceneCount musi być liczbą całkowitą/);
assert.match(getSceneCountError(0, 0) || '', /expectedSceneCount musi być liczbą całkowitą/);
assert.match(getSceneCountError(9, 9) || '', /expectedSceneCount musi być liczbą całkowitą/);

assert.deepEqual(sceneDurationsForCount(8), [2, 2, 2, 2, 2.5, 2.5, 2.5, 2.5]);
assert.equal(MAX_SHORT_DURATION_SECONDS, 23);
assert.equal(selectFinanceCta({ title: 'RPP obniża stopy, co z ratą kredytu?' }).destinationPath, '/loan');
assert.equal(selectFinanceCta({ title: 'Nowe oprocentowanie lokat i oszczędności' }).destinationPath, '/savings');
assert.equal(selectFinanceCta({ title: 'Spółka publikuje wyniki finansowe na GPW' }).destinationPath, '/firma');
assert.equal(selectFinanceCta({ title: 'Bank zmienia opłaty za konto bankowe' }).destinationPath, '/konta');
for (const article of [
  { title: 'RPP obniża stopy, co z ratą kredytu?' },
  { title: 'Nowe oprocentowanie lokat i oszczędności' },
  { title: 'Spółka publikuje wyniki finansowe na GPW' },
  { title: 'Bank zmienia opłaty za konto bankowe' }
]) {
  const cta = selectFinanceCta(article);
  assert.ok(cta.spokenText.split(/\\s+/).filter(Boolean).length <= 4);
  assert.ok(cta.destinationUrl.endsWith(cta.destinationPath));
  assert.ok(!/raport-finansowy24\\.pl|https?:\\/\\//i.test(cta.spokenText));
}

const naturalSceneDurations = sceneDurationsWithNarration(
  sceneDurationsForCount(8),
  [5.9, null, null, null, null, null, null, null]
);
assert.ok(Math.abs(naturalSceneDurations[0] - 6.02) < 0.001);
assert.ok(naturalSceneDurations.reduce((sum, duration) => sum + duration, 0) < MAX_SHORT_DURATION_SECONDS);
assert.throws(
  () => sceneDurationsWithNarration(sceneDurationsForCount(8), Array(8).fill(5.9)),
  /Maksymalny czas Shorta to 23 s/
);

assert.deepEqual(sceneDurationsForCount(4), [4.5, 4.5, 4.5, 4.5]);
assert.throws(() => sceneDurationsForCount(0), /Liczba scen musi być/);
const distinctPexels = Array.from({ length: 8 }, (_, i) => ({ source: 'pexels', pexelsId: i + 1 }));
assert.equal(hasUniquePexelsSceneIds(distinctPexels), true);
assert.equal(hasUniquePexelsSceneIds([...distinctPexels.slice(0, 7), distinctPexels[0]]), false);
assert.equal(hasUniquePexelsSceneIds(distinctPexels.slice(0, 7)), false);

assert.deepEqual(sceneRequestMetadata('auto-pilot-news', 'id_123', 'fallback'), { source: 'auto-pilot-news', requestId: 'id_123' });
assert.equal(sceneRequestMetadata('bad source!', 'id_123', 'api-client').source, 'api-client');
console.log('Scene contract tests passed');
