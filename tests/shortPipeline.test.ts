import assert from 'node:assert/strict';
import { buildFinanceSceneDataVisual, buildFinanceShortPlan, selectHookVariantFromLearningSignals, validateFinanceShortPlan } from '../src/server/shortPipeline';
import { isSafeFinanceDataVisualSvg } from '../src/server/sceneContract';
import { selectFinanceCta } from '../src/server/financeCtaStrategy';

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
assert.match(plan.scenes[0].visualSvg || '', /FAKT Z ARTYKUŁU BANKIER\.PL/);
assert.equal(plan.qualityGate.publishable, true);
assert.equal(validateFinanceShortPlan(plan).publishable, true);
assert.match(plan.hook, /Cyfrowy Polsat/);
assert.match(plan.scenes[7].caption, /raport-finansowy24\.pl/);
assert.equal(plan.ctaUrl, 'https://raport-finansowy24.pl/firma');
assert.equal(plan.scenes[7].voiceover_text, 'Wejdź na raport-finansowy24.pl, sprawdź spółkę po NIP.');
assert.equal(plan.scenes[7].caption, plan.scenes[7].voiceover_text);
assert.equal(selectFinanceCta({ title: 'Konto osobiste: promocja i bonus' }).type === 'verified_partner_offer', false);
assert.equal(selectFinanceCta({ title: 'Promocja lokaty' }, { promotionalCtaAllowed: true, catalogStatus: 'fresh', observedOfferCount: 1, candidateOfferNamesAllowed: true }).spokenText, 'Wejdź na raport-finansowy24.pl i sprawdź ofertę.');

const wig20Card = buildFinanceSceneDataVisual(
  { title: 'GPW: sesja zakończyła się spadkiem', description: 'WIG20 zakończył sesję spadkiem o 0,68 proc.' },
  'WIG20 spadł o 0,68 procent.',
  'WIG20 -0,68%'
);
assert.equal(wig20Card?.visualMode, 'data_visual');
assert.equal(isSafeFinanceDataVisualSvg(wig20Card?.visualSvg), true);
assert.match(wig20Card?.visualSvg || '', /WIG20/);
assert.match(wig20Card?.visualSvg || '', /-0,68%/);
assert.match(wig20Card?.visualSvg || '', /<rect x="222" y="196" width="170"/);
assert.match(wig20Card?.visualSvg || '', /FAKT Z ARTYKUŁU ŹRÓDŁOWEGO/);
assert.doesNotMatch(wig20Card?.visualSvg || '', /BANKIER\.PL/);
assert.deepEqual(wig20Card?.facts.map((fact) => fact.value), [-0.68]);

const gpwCardWithSingleSourcedFact = buildFinanceSceneDataVisual(
  { title: 'GPW: podsumowanie sesji', summary: 'WIG20 wzrósł o 0,86 proc.' },
  'Indeks na GPW zakończył sesję wyżej.',
  'RYNEK GPW'
);
assert.equal(gpwCardWithSingleSourcedFact?.visualMode, 'data_visual');
assert.match(gpwCardWithSingleSourcedFact?.visualSvg || '', /\+0,86%/);

assert.equal(buildFinanceSceneDataVisual(
  { title: 'WIG20 w centrum uwagi', description: 'Artykuł nie podaje zmiany indeksu.' },
  'WIG20 na GPW — co to oznacza?',
  'WIG20'
), null, 'bez potwierdzonej wartości z artykułu generator nie może dopisać danych do karty');
assert.equal(buildFinanceSceneDataVisual(
  { title: 'GPW: WIG20 spadł o 0,68 proc.', description: 'WIG20 zakończył sesję spadkiem o 0,68 proc.' },
  'Analitycy omawiają rynki zagraniczne.',
  'RYNKI ZAGRANICZNE'
), null, 'fakt z artykułu nie powinien trafić do sceny, której lektor go nie omawia');
assert.equal(buildFinanceSceneDataVisual(
  { title: 'WIG20 spadł o 0,68 proc.', description: 'WIG20 zakończył sesję spadkiem o 0,68 proc.' },
  'WIG20 spadł o 0,82 procent.',
  'WIG20 -0,82%'
), null, 'karta nie może pokazać źródłowej liczby sprzecznej z lektorem');
assert.equal(buildFinanceSceneDataVisual(
  { title: 'Cyfrowy Polsat spadł o 17,67 proc.' },
  'WIG20 na GPW zakończył sesję.',
  'WIG20'
), null, 'wynik pojedynczej spółki nie może być przedstawiony jako wynik WIG20');

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
