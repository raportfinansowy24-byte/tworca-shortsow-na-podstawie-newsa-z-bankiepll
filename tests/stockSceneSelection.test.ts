import assert from 'node:assert/strict';
import { buildStockSceneSearchQueries, selectDiverseStockCandidates, selectStockPreviewFrameUrls } from '../src/server/stockSceneSelection';
import { buildStockClipSamplingFilter, isTrustedStockVideoDownloadUrl, stockClipSamplingFrameCountIsSufficient } from '../src/server/stockClipSampling';

const fixedRateQueries = buildStockSceneSearchQueries({
  query: 'banker reviewing interest rate table on tablet',
  narration: 'Spadły stawki okresowo stałej stopy.',
  context: 'Zdolność kredytowa, stałoprocentowe kredyty hipoteczne i oferty banków.',
  maxQueries: 3
});
assert.equal(fixedRateQueries.length, 3);
assert.equal(fixedRateQueries[0], 'banker reviewing interest rate table on tablet');
assert.ok(fixedRateQueries.some((value) => /fixed mortgage interest rates/i.test(value)));
assert.ok(fixedRateQueries.some((value) => /home loan fixed interest rate/i.test(value)));
assert.ok(!fixedRateQueries.some((value) => /bitcoin|crypto|gold vault/i.test(value)));

const capacityQueries = buildStockSceneSearchQueries({
  query: 'person calculating home loan budget laptop',
  narration: 'Zdolność kredytowa rodziny wzrosła średnio o 14 tysięcy złotych.',
  context: 'Mortgage and credit capacity article.',
  reasonToAvoid: 'Generic office keyboard shot does not show mortgage borrowing capacity.',
  maxQueries: 4
});
assert.ok(capacityQueries[1].includes('bank loan officer'));
assert.ok(capacityQueries.some((value) => /mortgage affordability/i.test(value)));

const bankAppQueries = buildStockSceneSearchQueries({
  query: 'person holding smartphone banking app close up',
  narration: 'Dotychczasowa aplikacja zmieni nazwę.',
  context: 'Bank account mobile application rebrand.',
  maxQueries: 3
});
assert.ok(bankAppQueries.some((value) => /mobile banking application/i.test(value)));

const bankRebrandQueries = buildStockSceneSearchQueries({
  query: 'bank zmienia markę i nazwy swoich usług',
  narration: 'Bank porządkuje nazwy swoich marek.',
  context: 'Bankowa zmiana identyfikacji marki.',
  maxQueries: 3
});
assert.ok(bankRebrandQueries.some((value) => /corporate bank brand identity/i.test(value)));

const nbpQueries = buildStockSceneSearchQueries({
  query: 'generic query 3',
  narration: 'Narodowy Bank Polski pozostaje w centrum decyzji.',
  context: 'NBP and RPP interest-rate decision.',
  maxQueries: 3
});
assert.ok(nbpQueries.some((value) => /National Bank of Poland/i.test(value)));

const mixed = [
  ...Array.from({ length: 6 }, (_, index) => ({ source: 'pexels' as const, pexelsId: index + 1, selectionScore: 100 - index })),
  ...Array.from({ length: 5 }, (_, index) => ({ source: 'pixabay' as const, pexelsId: 1_000_000_000_000 + index + 1, stockId: 'pixabay:' + (index + 1), selectionScore: 90 - index })),
  { source: 'pexels' as const, pexelsId: 1, selectionScore: 200 }
];
const diverse = selectDiverseStockCandidates(mixed, 8, 4);
assert.equal(diverse.length, 8);
assert.equal(diverse.filter((item) => item.source === 'pexels').length, 4);
assert.equal(diverse.filter((item) => item.source === 'pixabay').length, 4);
assert.equal(new Set(diverse.map((item) => ('stockId' in item ? item.stockId : undefined) || item.source + ':' + item.pexelsId)).size, 8);
assert.equal(diverse[0].source, 'pexels');
assert.equal(diverse[1].source, 'pixabay');
assert.equal(selectDiverseStockCandidates(mixed.filter((item) => item.source === 'pexels'), 8, 4).length, 6, 'single-provider mode is allowed to use its full available shortlist');

assert.deepEqual(selectStockPreviewFrameUrls(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 4), ['a', 'c', 'e', 'g']);
assert.deepEqual(selectStockPreviewFrameUrls(['a', 'a', '', 'b'], 4), ['a', 'b']);
assert.equal(isTrustedStockVideoDownloadUrl('https://videos.pexels.com/video-files/123/clip.mp4'), true);
assert.equal(isTrustedStockVideoDownloadUrl('https://cdn.pixabay.com/video/clip.mp4'), true);
assert.equal(isTrustedStockVideoDownloadUrl('http://cdn.pixabay.com/video/clip.mp4'), false);
assert.equal(isTrustedStockVideoDownloadUrl('https://cdn.pixabay.com.evil.example/video.mp4'), false);
assert.equal(isTrustedStockVideoDownloadUrl('https://user:pass@videos.pexels.com/clip.mp4'), false);
assert.equal(buildStockClipSamplingFilter(15), "select='isnan(prev_selected_t)+gte(t-prev_selected_t,6.8182)',scale=512:-2");
assert.throws(() => buildStockClipSamplingFilter(2), /Nieprawidłowa długość/);
assert.equal(stockClipSamplingFrameCountIsSufficient(3), true);
assert.equal(stockClipSamplingFrameCountIsSufficient(2), false);
console.log('Stock scene selection tests passed');


const tayronQueries = buildStockSceneSearchQueries({
  query: 'large modern SUV driving on asphalt road',
  narration: 'Nowy SUV sprawdziliśmy na trasie.',
  context: 'Volkswagen Tayron 2.0 TDI 193 KM 4MOTION. Duży SUV marki Volkswagen.',
  maxQueries: 3
});
assert.match(tayronQueries[0], /Volkswagen Tayron/i, 'named model must anchor stock search before generic SUV phrases');
assert.doesNotMatch(tayronQueries.join(' '), /Mercedes GLE|Peugeot/i);

const namedInstitutionQueries = buildStockSceneSearchQueries({
  query: 'government official speaking at press conference',
  narration: 'Urząd opublikował nowe zasady.',
  context: 'Komisja Nadzoru Finansowego (KNF) opublikowała komunikat.',
  maxQueries: 3
});
assert.match(namedInstitutionQueries[0], /Polish Financial Supervision Authority/i);

const namedProductQueries = buildStockSceneSearchQueries({
  query: 'person reviewing mortgage offer documents',
  narration: 'Program może pomóc kupującym mieszkania.',
  context: 'Program Bezpieczny Kredyt 2% wraca w debacie publicznej.',
  maxQueries: 3
});
assert.match(namedProductQueries[0], /Bezpieczny Kredyt 2/i);

const mixedTopicArticleContext = [
  'Wall Street, NVIDIA i notowania spółek technologicznych.',
  'Artykuł omawia również inflację, wzrost cen żywności i decyzję RPP.'
].join(' ');
const wallStreetSceneQueries = buildStockSceneSearchQueries({
  query: 'Wall Street stock exchange trading floor monitors',
  narration: 'Strach na Wall Street i spadek notowań Nvidii.',
  context: mixedTopicArticleContext,
  maxQueries: 5
});
assert.ok(wallStreetSceneQueries.some((value) => /equity trader|stock market index/i.test(value)));
assert.doesNotMatch(
  wallStreetSceneQueries.join(' '),
  /shopper comparing grocery prices|supermarket price labels|consumer price index/i,
  'article-level inflation must not inject grocery searches into a Wall Street scene'
);

const centralBankSceneQueries = buildStockSceneSearchQueries({
  query: 'central bank press conference speaker at podium microphone',
  narration: 'NBP i RPP komentują decyzję dotyczącą stóp procentowych.',
  context: mixedTopicArticleContext,
  maxQueries: 5
});
assert.ok(centralBankSceneQueries.some((value) => /central bank|National Bank of Poland/i.test(value)));
assert.doesNotMatch(
  centralBankSceneQueries.join(' '),
  /shopper comparing grocery prices|supermarket price labels/i,
  'article-level inflation must not replace a central-bank scene with grocery shots'
);

const weatherSceneQueries = buildStockSceneSearchQueries({
  query: 'stormy ocean waves heavy clouds',
  narration: 'El Niño może wpłynąć na pogodę.',
  context: mixedTopicArticleContext,
  maxQueries: 5
});
assert.deepEqual(weatherSceneQueries, ['stormy ocean waves heavy clouds'],
  'unrelated article topics must not add stock-query aliases to a weather scene');

