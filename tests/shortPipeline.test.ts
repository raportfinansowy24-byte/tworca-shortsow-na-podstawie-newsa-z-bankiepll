import assert from 'node:assert/strict';
import { buildFinanceShortPlan, selectHookVariantFromLearningSignals, validateFinanceShortPlan } from '../src/server/shortPipeline';

const plan = buildFinanceShortPlan({
  title: 'Dramat na akcjach Cyfrowego Polsatu i Eurocashu. Szeroki rynek pędzi dzięki bankom',
  description: 'WIG20 wzrósł o 0,86 proc. WIG-Banki urósł o 1,96 proc. Cyfrowy Polsat spadł o 17,67 proc., a Eurocash o 13,15 proc.',
  category: 'Giełda GPW & Spółki'
});

assert.equal(plan.scenes.length, 8);
assert.ok(plan.facts.length >= 3);
assert.equal(plan.hookVariants.length, 3);
assert.equal(plan.hookVariants.includes(plan.hook), true);
assert.equal(plan.hookFormula, 'contrarian_claim');
assert.equal(plan.viralStrategy.hookWindowSeconds, 2);
assert.equal(plan.viralStrategy.mutedFirst, true);
assert.equal(plan.viralStrategy.retentionTargets.retention3s, 0.6);
assert.equal(plan.scenes.every((scene) => scene.visualMode === 'data_visual'), true);
assert.equal(plan.scenes.every((scene) => typeof scene.visualSvg === 'string' && scene.visualSvg.includes('<svg')), true);
assert.equal(plan.qualityGate.publishable, true);
assert.equal(validateFinanceShortPlan(plan).publishable, true);
assert.match(plan.hook, /Cyfrowy Polsat/);
assert.equal(plan.scenes[7].voiceover_text, 'Sprawdź spółkę po NIP.');
assert.match(plan.scenes[7].caption, /RAPORT-FINANSOWY24\.PL/);
assert.equal(plan.ctaUrl, 'https://raport-finansowy24.pl/firma');

const warningWins = selectHookVariantFromLearningSignals(plan, [
  { hookText: 'Stop: Cyfrowy Polsat traci 17,67% — sprawdź dlaczego.', sampleSize: 6, averageCompletionRate: 0.74 },
  { hookText: 'Top 3 ruchy GPW: Cyfrowy Polsat traci 17,67%.', sampleSize: 6, averageCompletionRate: 0.58 },
  { hookText: 'Indeks rośnie, ale Cyfrowy Polsat traci 17,67%.', sampleSize: 6, averageCompletionRate: 0.62 }
]);
assert.equal(warningWins.index, 1);
assert.equal(warningWins.formula, 'mistake_warning');
assert.equal(warningWins.sampleSize, 6);
const insufficientSignal = selectHookVariantFromLearningSignals(plan, [
  { hookText: 'Stop: Cyfrowy Polsat traci 17,67% — sprawdź dlaczego.', sampleSize: 4, averageCompletionRate: 0.99 }
]);
assert.equal(insufficientSignal.index, 0);
assert.equal(insufficientSignal.sampleSize, 0);

const broken = { ...plan, scenes: plan.scenes.map((scene, index) => index === 3 ? { ...scene, visualSvg: '' } : scene) };
assert.equal(validateFinanceShortPlan(broken).publishable, false);
assert.ok(validateFinanceShortPlan(broken).failures.some((failure) => failure.includes('data_visual')));

const weakHook = { ...plan, hook: 'Rynek zachował się dziś ciekawie i warto to sprawdzić' };
assert.equal(validateFinanceShortPlan(weakHook).publishable, false);
assert.ok(validateFinanceShortPlan(weakHook).failures.some((failure) => failure.includes('liczbę')));

console.log('Short pipeline tests passed');
