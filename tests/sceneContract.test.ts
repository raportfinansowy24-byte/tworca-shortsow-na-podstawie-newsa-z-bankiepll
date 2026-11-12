import assert from 'node:assert/strict';
import { getSceneCountError, hasCompleteFinanceSceneVisualAssets, hasUniquePexelsSceneIds, isSafeFinanceDataVisualSvg, MAX_SHORT_DURATION_SECONDS, TARGET_SHORT_DURATION_SECONDS, sceneDurationsForCount, sceneDurationsWithNarration, sceneRequestMetadata } from '../src/server/sceneContract';
import { selectFinanceCta } from '../src/server/financeCtaStrategy';

assert.equal(getSceneCountError(8, 8), null);
assert.match(getSceneCountError(8, 1) || '', /Oczekiwano 8 scen, otrzymano 1/);
assert.match(getSceneCountError(8, 7) || '', /Oczekiwano 8 scen, otrzymano 7/);
assert.match(getSceneCountError(8, 9) || '', /Oczekiwano 8 scen, otrzymano 9/);
assert.match(getSceneCountError(undefined, 8) || '', /expectedSceneCount musi być liczbą całkowitą/);
assert.match(getSceneCountError(0, 0) || '', /expectedSceneCount musi być liczbą całkowitą/);
assert.match(getSceneCountError(9, 9) || '', /expectedSceneCount musi być liczbą całkowitą/);

assert.deepEqual(sceneDurationsForCount(8), Array(8).fill(23 / 8));
assert.equal(TARGET_SHORT_DURATION_SECONDS, 23);
assert.equal(MAX_SHORT_DURATION_SECONDS, 28);
const shortNarrationBudgets = sceneDurationsWithNarration(sceneDurationsForCount(8), Array(8).fill(1));
assert.ok(Math.abs(shortNarrationBudgets.reduce((sum, duration) => sum + duration, 0) - 23) < 0.001, 'krótszy lektor zachowuje 23-sekundowy storyboard, bez przenoszenia całej ciszy na ostatnią scenę');
assert.ok(Math.abs(shortNarrationBudgets[7] - 23 / 8) < 0.001, 'ostatnia scena CTA nie otrzymuje sztucznie długiego ogona ciszy');
const durationAtHardCap = sceneDurationsWithNarration([2, 2, 2, 2, 2.5, 2.5, 2.5, 2.5], [11.88, null, null, null, null, null, null, null]);
assert.ok(Math.abs(durationAtHardCap.reduce((sum, duration) => sum + duration, 0) - 28) < 0.001, 'dopuszcza narrację do uzgodnionego twardego limitu 28 s');
assert.throws(() => sceneDurationsWithNarration([2, 2, 2, 2, 2.5, 2.5, 2.5, 2.5], [12.01, null, null, null, null, null, null, null]), /Maksymalny czas Shorta to 28 s/);
const nearCapNarration = sceneDurationsWithNarration(
  Array(8).fill(23 / 8),
  Array(8).fill(27.91 / 8),
  MAX_SHORT_DURATION_SECONDS
);
assert.ok(nearCapNarration.every((duration) => duration >= 27.91 / 8), 'żadna scena nie ucina naturalnego lektora przy narracji bliskiej limitowi');
assert.ok(nearCapNarration.reduce((sum, duration) => sum + duration, 0) <= MAX_SHORT_DURATION_SECONDS + 0.000001, 'zapas scen jest automatycznie ograniczany do wolnego budżetu 28 s');
assert.throws(
  () => sceneDurationsWithNarration(Array(8).fill(23 / 8), Array(8).fill(28.01 / 8), MAX_SHORT_DURATION_SECONDS),
  /bez dodatkowego zapasu scen/
);
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
  assert.ok(cta.spokenText.trim().split(/\s+/).filter(Boolean).length <= 8);
  assert.match(cta.spokenText, /\braport-finansowy24\.pl\b/);
  assert.ok(cta.destinationUrl.endsWith(cta.destinationPath));
  assert.doesNotMatch(cta.spokenText, /https?:\/\//);
  assert.equal(cta.spokenText.includes('http'), false);
}

const naturalSceneDurations = sceneDurationsWithNarration(
  [2, 2, 2, 2, 2.5, 2.5, 2.5, 2.5],
  [5.9, null, null, null, null, null, null, null]
);
assert.ok(Math.abs(naturalSceneDurations[0] - 6.02) < 0.001);
assert.ok(naturalSceneDurations.reduce((sum, duration) => sum + duration, 0) < MAX_SHORT_DURATION_SECONDS);
assert.throws(
  () => sceneDurationsWithNarration([2, 2, 2, 2, 2.5, 2.5, 2.5, 2.5], Array(8).fill(7.9)),
  /Maksymalny czas Shorta to 28 s/
);
const repairBaseDurations = [2, 2, 2, 2, 2.5, 2.5, 2.5, 2.5];
const repairDurationsFromFreshTts = sceneDurationsWithNarration(
  repairBaseDurations,
  [2.8, 2.1, null, null, null, null, null, null],
  MAX_SHORT_DURATION_SECONDS
);
assert.ok(Math.abs(repairDurationsFromFreshTts[0] - 2.92) < 0.001, 'naprawa przedłuża scenę, gdy nowy TTS jest dłuższy niż zapisany budżet');
assert.ok(repairDurationsFromFreshTts.reduce((sum, duration) => sum + duration, 0) <= MAX_SHORT_DURATION_SECONDS);
assert.throws(
  () => sceneDurationsWithNarration(repairBaseDurations, Array(8).fill(7.9), MAX_SHORT_DURATION_SECONDS),
  /Maksymalny czas Shorta to 28 s/
);

assert.deepEqual(sceneDurationsForCount(4), [5.75, 5.75, 5.75, 5.75]);
assert.throws(() => sceneDurationsForCount(0), /Liczba scen musi być/);
const distinctPexels = Array.from({ length: 8 }, (_, i) => ({ source: 'pexels', pexelsId: i + 1 }));
assert.equal(hasUniquePexelsSceneIds(distinctPexels), true);
assert.equal(hasUniquePexelsSceneIds([...distinctPexels.slice(0, 7), distinctPexels[0]]), false);
assert.equal(hasUniquePexelsSceneIds(distinctPexels.slice(0, 7)), false);
const distinctPixabay = Array.from({ length: 8 }, (_, i) => ({ source: 'pixabay', pexelsId: 1_000_000_000_000 + i + 1, pixabayId: i + 1, stockId: 'pixabay:' + (i + 1) }));
assert.equal(hasUniquePexelsSceneIds(distinctPixabay), true, 'zaakceptuj unikalne ID Pixabay namespacowane poza zakresem Pexels');
assert.equal(hasUniquePexelsSceneIds([...distinctPixabay.slice(0, 7), distinctPixabay[0]]), false, 'blokuj powtórzone ID stock');
assert.equal(hasUniquePexelsSceneIds([...distinctPixabay.slice(0, 7), { ...distinctPixabay[7], pixabayId: undefined }]), false, 'Pixabay musi zachować oryginalne ID dostawcy');

const safeFinanceDataSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><rect width="720" height="1280" fill="#fff"/></svg>';
assert.equal(isSafeFinanceDataVisualSvg(safeFinanceDataSvg), true);
assert.equal(isSafeFinanceDataVisualSvg(safeFinanceDataSvg.replace('<rect', '<script>alert(1)</script><rect')), false);
const mixedVisualAssets = [
  { visualMode: 'data_visual', visualSvg: safeFinanceDataSvg },
  ...Array.from({ length: 6 }, (_, index) => ({ visualMode: 'matched_clip', source: 'pexels', pexelsId: index + 1 })),
  { visualMode: 'data_visual', visualSvg: safeFinanceDataSvg }
];
assert.equal(hasCompleteFinanceSceneVisualAssets(mixedVisualAssets), true);
assert.equal(hasCompleteFinanceSceneVisualAssets([...mixedVisualAssets.slice(0, 3), { ...mixedVisualAssets[3], pexelsId: 1 }, ...mixedVisualAssets.slice(4)]), false);
assert.equal(hasCompleteFinanceSceneVisualAssets([{ ...mixedVisualAssets[0], visualSvg: '' }, ...mixedVisualAssets.slice(1)]), false);
assert.equal(hasCompleteFinanceSceneVisualAssets([{ ...mixedVisualAssets[0], visualSvg: safeFinanceDataSvg.replace('<rect', '<script>alert(1)</script><rect') }, ...mixedVisualAssets.slice(1)]), false);
assert.equal(hasCompleteFinanceSceneVisualAssets(Array.from({ length: 8 }, () => ({ visualMode: 'data_visual', visualSvg: safeFinanceDataSvg }))), true);
assert.equal(hasCompleteFinanceSceneVisualAssets(distinctPixabay.map((scene) => ({ ...scene, visualMode: 'matched_clip', videoUrl: 'https://cdn.pixabay.com/video/clip.mp4' }))), true, 'Pixabay może legalnie uzupełnić wszystkie sceny stockowe');
assert.equal(hasCompleteFinanceSceneVisualAssets(distinctPixabay.map((scene, index) => ({ ...scene, pixabayId: index === 7 ? undefined : scene.pixabayId, visualMode: 'matched_clip' }))), false, 'nie akceptuj Pixabay bez oryginalnego ID');


assert.deepEqual(sceneRequestMetadata('auto-pilot-news', 'id_123', 'fallback'), { source: 'auto-pilot-news', requestId: 'id_123' });
assert.equal(sceneRequestMetadata('bad source!', 'id_123', 'api-client').source, 'api-client');
console.log('Scene contract tests passed');
