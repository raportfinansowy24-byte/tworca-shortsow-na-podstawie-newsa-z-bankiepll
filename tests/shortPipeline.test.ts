import assert from 'node:assert/strict';
import { buildFinanceShortPlan, validateFinanceShortPlan } from '../src/server/shortPipeline';

const plan = buildFinanceShortPlan({
  title: 'Dramat na akcjach Cyfrowego Polsatu i Eurocashu. Szeroki rynek pędzi dzięki bankom',
  description: 'WIG20 wzrósł o 0,86 proc. WIG-Banki urósł o 1,96 proc. Cyfrowy Polsat spadł o 17,67 proc., a Eurocash o 13,15 proc.',
  category: 'Giełda GPW & Spółki'
});

assert.equal(plan.scenes.length, 8);
assert.ok(plan.facts.length >= 3);
assert.equal(plan.hookVariants.length, 3);
assert.equal(plan.hookVariants.includes(plan.hook), true);
assert.equal(plan.scenes.every((scene) => scene.visualMode === 'data_visual'), true);
assert.equal(plan.scenes.every((scene) => typeof scene.visualSvg === 'string' && scene.visualSvg.includes('<svg')), true);
assert.equal(plan.qualityGate.publishable, true);
assert.equal(validateFinanceShortPlan(plan).publishable, true);
assert.match(plan.hook, /Cyfrowy Polsat/);

const broken = { ...plan, scenes: plan.scenes.map((scene, index) => index === 3 ? { ...scene, visualSvg: '' } : scene) };
assert.equal(validateFinanceShortPlan(broken).publishable, false);
assert.ok(validateFinanceShortPlan(broken).failures.some((failure) => failure.includes('data_visual')));

console.log('Short pipeline tests passed');
