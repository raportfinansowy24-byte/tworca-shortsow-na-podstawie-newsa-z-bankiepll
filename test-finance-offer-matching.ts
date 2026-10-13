import assert from 'node:assert/strict';
import {
  createEmptyOfferCatalogSnapshot,
  buildOfferMatchPromptInstructions,
  matchNewsToCurrentOffers,
  parseOfferCatalogPayload,
  type OfferCatalogSnapshot
} from './src/utils/financeOfferMatching.ts';

const catalog: OfferCatalogSnapshot = {
  status: 'fresh',
  lastSuccessAt: '2026-10-13T01:00:00.000Z',
  categories: {
    'kredyty-hipoteczne': {
      categoryId: 'kredyty-hipoteczne',
      status: 'fresh',
      fetchedAt: '2026-10-13T01:00:00.000Z',
      offers: [{ displayName: 'Bank X - Kredyt hipoteczny', visibleClaims: ['Przykładowy claim'], status: 'visible_unverified' }]
    },
    'konta-osobiste': {
      categoryId: 'konta-osobiste',
      status: 'fresh',
      fetchedAt: '2026-10-13T01:00:00.000Z',
      offers: []
    }
  }
};

const mortgageMatch = matchNewsToCurrentOffers({
  title: 'Kredyt hipoteczny i zmiana rat po decyzji RPP',
  description: 'Bank centralny pozostawił stopy procentowe bez zmian.'
}, catalog);
assert.equal(mortgageMatch.status, 'matched');
assert.equal(mortgageMatch.categoryId, 'kredyty-hipoteczne');
assert.equal(mortgageMatch.observedOfferCount, 1);
assert.deepEqual(mortgageMatch.candidateOffers, ['Bank X - Kredyt hipoteczny']);
assert.equal(mortgageMatch.specificOfferClaimsAllowed, false);
assert.equal(mortgageMatch.promotionalCtaAllowed, false);
assert.equal(mortgageMatch.candidateOfferNamesAllowed, true);
assert.equal(mortgageMatch.reviewRequired, true);

const ratesOnlyMatch = matchNewsToCurrentOffers({
  title: 'RPP pozostawia stopy procentowe bez zmian',
  description: 'Rada Polityki Pieniężnej ogłosiła decyzję.'
}, catalog);
assert.equal(ratesOnlyMatch.status, 'no_match', 'Ogólny news o stopach nie powinien być wciskany do kategorii produktu.');

const emptyPersonalAccountMatch = matchNewsToCurrentOffers({
  title: 'Nowe konto osobiste i premia za założenie rachunku'
}, catalog);
assert.equal(emptyPersonalAccountMatch.categoryId, 'konta-osobiste');
assert.equal(emptyPersonalAccountMatch.observedOfferCount, 0);
assert.equal(emptyPersonalAccountMatch.candidateOffers.length, 0);
assert.equal(emptyPersonalAccountMatch.candidateOfferNamesAllowed, false);
assert.match(emptyPersonalAccountMatch.reason, /nie zwraca widocznych kart ofert/i);

const businessAccountMatch = matchNewsToCurrentOffers({ title: 'Nowe konto firmowe dla przedsiębiorców' }, catalog);
assert.equal(businessAccountMatch.categoryId, 'konta-dla-firm');
assert.equal(businessAccountMatch.status, 'matched');

const noCatalogData = matchNewsToCurrentOffers({ title: 'Kredyt samochodowy: co warto sprawdzić?' }, createEmptyOfferCatalogSnapshot());
assert.equal(noCatalogData.categoryId, 'kredyty-samochodowe');
assert.equal(noCatalogData.observedOfferCount, 0);
assert.equal(noCatalogData.catalogStatus, 'loading');

const parsed = parseOfferCatalogPayload([
  '<div class="product"><a data-href="https://tmlead.pl/redirect/123">Logo</a><p class="product__name"><a class="link">PKO Bank Polski - Pożyczka konsolidacyjna</a></p><ul><li>Możliwość połączenia zobowiązań</li><li>RRSO 12,14%</li></ul></div>',
  '<div class="product"><p class="product__name"><a>BIK - Raport</a></p><ul><li>Sprawdzisz dane w BIK</li></ul></div>',
  '<div class="product"><p>Brak nazwy, ten wpis trzeba pominąć</p></div>'
]);
assert.equal(parsed.length, 2);
assert.equal(parsed[0].displayName, 'PKO Bank Polski - Pożyczka konsolidacyjna');
assert.deepEqual(parsed[0].visibleClaims, ['Możliwość połączenia zobowiązań', 'RRSO 12,14%']);
assert.equal(parsed[0].status, 'visible_unverified');
assert.equal(parsed[0].detailUrl, 'https://tmlead.pl/redirect/123');

const promotionalNameMatch = matchNewsToCurrentOffers(
  { title: 'Kredyt hipoteczny — oferta banku' },
  {
    status: 'fresh',
    categories: {
      'kredyty-hipoteczne': {
        categoryId: 'kredyty-hipoteczne',
        status: 'fresh',
        offers: [{
          displayName: 'VeloBank - Kredyt hipoteczny VeloDom ze stałym oprocentowaniem w promocji z bonusem do 5000 zł',
          visibleClaims: [],
          status: 'visible_unverified'
        }]
      }
    }
  }
);
assert.equal(promotionalNameMatch.candidateOffers[0], 'VeloBank - Kredyt hipoteczny VeloDom');
assert.equal(promotionalNameMatch.candidateOfferNamesAllowed, true);
assert.equal(promotionalNameMatch.specificOfferClaimsAllowed, false);
const offerPrompt = buildOfferMatchPromptInstructions(promotionalNameMatch);
assert.match(offerPrompt, /Kredyt hipoteczny VeloDom/);
assert.doesNotMatch(offerPrompt, /5000|oprocentow|bonus/i);

console.log('✓ Finance offer matching tests passed.');
