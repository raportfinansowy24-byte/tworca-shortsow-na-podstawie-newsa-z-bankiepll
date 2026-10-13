import assert from 'node:assert/strict';
import {
  classifyFinanceVisualCategory,
  getFinanceSceneVisualPlan,
  isVisualQueryAlignedWithNews,
  scorePexelsCandidate
} from './src/utils/financeSceneMatching';

const rppNews = 'Rada Polityki Pieniężnej utrzymała stopy procentowe. Rynek rozważa, czy zmieni się rata kredytu.';
assert.equal(classifyFinanceVisualCategory(rppNews), 'rates-credit');

const rppPlan = getFinanceSceneVisualPlan(rppNews, 4);
assert.ok(rppPlan, 'News o stopach powinien dostać plan scen.');
assert.equal(rppPlan.length, 4, 'Plan ma mieć cztery sceny.');
assert.equal(new Set(rppPlan.map((scene) => scene.primaryKeyword)).size, 4, 'Zapytania scen powinny być różne.');
assert.ok(rppPlan.every((scene) => !/cash|banknotes?|counting|bullion|gold vault|crypto|bitcoin/i.test(`${scene.primaryKeyword} ${scene.alternativeKeywords.join(' ')}`)), 'Plan dla RPP nie może zawierać gotówki, złota ani krypto.');
assert.equal(isVisualQueryAlignedWithNews(rppNews, 'counting cash money bills dynamic'), false, 'Liczenie gotówki nie pasuje do newsu o stopach.');
assert.equal(isVisualQueryAlignedWithNews(rppNews, 'interest rate chart financial analysis'), true, 'Wykres stóp pasuje do newsa o RPP.');

const matchingCreditClip = scorePexelsCandidate(
  rppNews,
  'loan payment calculator monthly installment',
  'https://www.pexels.com/video/person-calculating-mortgage-loan-payment-123456/'
);
assert.equal(matchingCreditClip.relevant, true, 'Klip o racie kredytu powinien przejść dopasowanie.');

const unrelatedCashClip = scorePexelsCandidate(
  rppNews,
  'loan payment calculator monthly installment',
  'https://www.pexels.com/video/person-counting-cash-banknotes-123456/'
);
assert.equal(unrelatedCashClip.relevant, false, 'Klip z liczeniem gotówki powinien zostać odrzucony.');
assert.ok(unrelatedCashClip.forbiddenMatches.length > 0, 'Powód odrzucenia powinien wskazywać wykluczony motyw.');

const savingsNews = 'Bank uruchamia nowe konto oszczędnościowe z oprocentowaniem promocyjnym.';
assert.equal(classifyFinanceVisualCategory(savingsNews), 'savings-deposits');
const savingsPlan = getFinanceSceneVisualPlan(savingsNews, 4);
assert.ok(savingsPlan?.every((scene) => /saving|deposit|interest|account|bank/i.test(scene.primaryKeyword)), 'Wizualizacje oszczędności powinny pozostawać w kategorii kont i depozytów.');

console.log('PASS: klasyfikacja tematów, cztery odrębne sceny i odrzucanie nietrafionych klipów.');
