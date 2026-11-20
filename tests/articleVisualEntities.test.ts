import assert from 'node:assert/strict';
import {
  extractArticleVisualEntities,
  selectRelevantArticleVisualEntities,
  toRequiredVisualEntityChecks,
  visibleEntityNamesMatch
} from '../src/server/articleVisualEntities';

const carArticle = [
  'Volkswagen Tayron 2.0 TDI 193 KM 4MOTION.',
  'To duży SUV marki Volkswagen.'
].join(' ');
const extractedCarEntities = extractArticleVisualEntities(carArticle);
assert.ok(extractedCarEntities.some((entity) => entity.type === 'brand' && entity.canonical === 'Volkswagen'));
assert.ok(extractedCarEntities.some((entity) => entity.type === 'model' && entity.canonical === 'Volkswagen Tayron'));

const carSceneEntities = selectRelevantArticleVisualEntities(carArticle, 'Duży SUV na drodze.');
assert.deepEqual(carSceneEntities.map((entity) => entity.canonical), ['Volkswagen Tayron']);
const requiredCarEntities = toRequiredVisualEntityChecks(carSceneEntities);
assert.equal(visibleEntityNamesMatch(requiredCarEntities, ['VW Tayron']), true);
assert.equal(visibleEntityNamesMatch(requiredCarEntities, ['Mercedes-Benz GLE']), false);
assert.equal(visibleEntityNamesMatch(requiredCarEntities, ['Volkswagen']), false);

const bankArticle = 'Narodowy Bank Polski (NBP) opublikował decyzję Rady Polityki Pieniężnej (RPP).';
const bankEntities = selectRelevantArticleVisualEntities(bankArticle, 'NBP ogłosił decyzję.');
assert.ok(bankEntities.some((entity) => entity.type === 'institution' && entity.canonical.includes('Narodowy Bank Polski')));

const productArticle = 'Program Bezpieczny Kredyt 2% wraca w debacie publicznej.';
const productEntities = selectRelevantArticleVisualEntities(productArticle, 'Program może zmienić sytuację kupujących mieszkania.');
assert.ok(productEntities.some((entity) => entity.type === 'product' && entity.canonical === 'Bezpieczny Kredyt 2%'));

const namedProductArticle = 'Nowy produkt Lokata Premium Plus oferuje zmienne oprocentowanie.';
const namedProducts = extractArticleVisualEntities(namedProductArticle);
assert.ok(namedProducts.some((entity) => entity.type === 'product' && entity.canonical === 'Lokata Premium Plus'));

const brandArticle = 'Allegro zmienia zasady opłat dla sprzedawców.';
assert.ok(extractArticleVisualEntities(brandArticle).some((entity) => entity.type === 'brand' && entity.canonical === 'Allegro'));

const uncataloguedBrandArticle = 'Marka NovaTech wchodzi na polski rynek.';
assert.ok(extractArticleVisualEntities(uncataloguedBrandArticle).some((entity) => entity.type === 'brand' && entity.canonical === 'NovaTech'));
assert.ok(selectRelevantArticleVisualEntities(uncataloguedBrandArticle, 'Firma zmienia zasady sprzedaży.').some((entity) => entity.canonical === 'NovaTech'));

const uncataloguedInstitution = 'Urząd Regulacji Rynków Cyfrowych opublikował komunikat.';
assert.ok(extractArticleVisualEntities(uncataloguedInstitution).some((entity) => entity.type === 'institution' && entity.canonical === 'Urząd Regulacji Rynków Cyfrowych'));

assert.deepEqual(selectRelevantArticleVisualEntities('Brak nazw własnych w tym artykule.', 'Neutralny obraz miasta.'), []);
assert.equal(visibleEntityNamesMatch([], []), true);
console.log('Article visual entity tests passed');
