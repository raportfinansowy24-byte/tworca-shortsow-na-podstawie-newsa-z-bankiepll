import assert from 'node:assert/strict';
import {
  classifyFinanceVisualCategory,
  getFinanceSceneVisualPlan,
  isGenericFinanceVisualQuery,
  isVisualQueryAlignedWithNews,
  scorePexelsCandidate
} from './src/utils/financeSceneMatching';

const rppNews = 'Rada Polityki Pieniężnej utrzymała stopy procentowe. Rynek rozważa, czy zmieni się rata kredytu.';
assert.equal(classifyFinanceVisualCategory(rppNews), 'rates-credit');
assert.equal(isGenericFinanceVisualQuery('stock market candlestick chart dynamic'), true, 'ogólne hasła finansowe nie powinny dominować wyszukiwania sceny');
assert.equal(isGenericFinanceVisualQuery('analyst reviewing company earnings report'), false, 'konkretna osoba/czynność/obiekt to użyteczne zapytanie stockowe');

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
const falseNewsPrefix = scorePexelsCandidate('', 'news', 'https://www.pexels.com/video/new-books-library-123456/');
assert.equal(falseNewsPrefix.relevant, false, 'news nie może dopasować krótszego tokenu new.');
const falseInflationPrefix = scorePexelsCandidate('', 'inflation', 'https://www.pexels.com/video/ship-in-storm-123456/');
assert.deepEqual(falseInflationPrefix.sceneMatches, [], 'inflation nie może dopasować przyimka in w slugu.');

const savingsNews = 'Bank uruchamia nowe konto oszczędnościowe z oprocentowaniem promocyjnym.';
assert.equal(classifyFinanceVisualCategory(savingsNews), 'savings-deposits');
const savingsPlan = getFinanceSceneVisualPlan(savingsNews, 4);
assert.ok(savingsPlan?.every((scene) => /saving|deposit|interest|account|bank/i.test(scene.primaryKeyword)), 'Wizualizacje oszczędności powinny pozostawać w kategorii kont i depozytów.');


const landNews = 'Ziemia pod budowę domu za pół ceny. Suwałki oferują młodym osobom działki budowlane.';
assert.equal(classifyFinanceVisualCategory(landNews), 'real-estate-land');
const landPlan = getFinanceSceneVisualPlan(landNews, 8);
assert.equal(landPlan?.length, 8, 'land storyboard ma osobne zapytania dla ośmiu scen');
assert.ok(landPlan?.[0].primaryKeyword.includes('vacant residential building plots'));
assert.equal(isVisualQueryAlignedWithNews(landNews, 'aerial view of vacant residential building plots parcel boundaries'), true);
assert.equal(isVisualQueryAlignedWithNews(landNews, 'tram street city traffic timelapse'), false, 'tramwaje i generyczne ulice nie są dopasowaniem do działek');

const matchingLandClip = scorePexelsCandidate(
  landNews,
  'aerial view of vacant residential building plots with parcel boundaries',
  'https://www.pexels.com/video/drone-aerial-view-of-empty-residential-land-plots-123456/'
);
assert.equal(matchingLandClip.relevant, true, 'slug Pexels opisujący działki ma przejść dopasowanie');
const tramClip = scorePexelsCandidate(
  landNews,
  'small polish town exterior street footage',
  'https://www.pexels.com/video/tram-streetcar-city-traffic-123456/'
);
assert.equal(tramClip.relevant, false, 'materiał z tramwajem powinien zostać jawnie odrzucony dla Suwałk i programu działek');
const insuranceClip = scorePexelsCandidate(
  landNews,
  'real estate purchase contract documents',
  'https://www.pexels.com/video/home-insurance-policy-form-123456/'
);
assert.equal(insuranceClip.relevant, false, 'formularz ubezpieczenia domu nie może zastępować umowy sprzedaży działki');

console.log('PASS: klasyfikacja tematów, sceny działek, semantyczne dopasowanie Pexels i odrzucanie nietrafionych klipów.');
