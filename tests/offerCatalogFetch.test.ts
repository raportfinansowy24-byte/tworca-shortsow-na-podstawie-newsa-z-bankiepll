import assert from 'node:assert/strict';
import {
  fetchOfferCatalogCategory,
  type OfferCatalogFetchResult
} from '../src/server/offerCatalogFetch';
import type { OfferCategoryDefinition } from '../src/utils/financeOfferMatching';

const category: OfferCategoryDefinition = {
  id: 'kredyty-gotowkowe',
  name: 'Kredyty gotówkowe',
  pagePath: '/kredyty-gotowkowe',
  apiKey: 'kredyt-gotowkowy',
  group: 'kredyty',
  phrases: ['kredyt gotowkowy']
};

function ok(result: OfferCatalogFetchResult) {
  assert.equal(result.ok, true);
  return result as Extract<OfferCatalogFetchResult, { ok: true }>;
}

function failed(result: OfferCatalogFetchResult) {
  assert.equal(result.ok, false);
  return result as Extract<OfferCatalogFetchResult, { ok: false }>;
}

const parsedCard = '<div><p class="product__name"><a>Przykładowy kredyt</a></p><ul><li>Oferta do weryfikacji</li></ul></div>';

const success = ok(await fetchOfferCatalogCategory(
  category,
  'https://offers.example',
  async () => new Response(JSON.stringify([parsedCard]), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })
));
assert.equal(success.httpStatus, 200);
assert.equal(success.responseItems, 1);
assert.equal(success.offers.length, 1);
assert.equal(success.offers[0].displayName, 'Przykładowy kredyt');
assert.equal(success.endpointHost, 'offers.example');
assert.equal(success.endpointPath, '/get-category-campaigns/kredyt-gotowkowy');
assert.equal(success.contentType, 'application/json');

const forbidden = failed(await fetchOfferCatalogCategory(
  category,
  'https://offers.example',
  async () => new Response('Forbidden', {
    status: 403,
    statusText: 'Forbidden',
    headers: { 'content-type': 'text/plain' }
  })
));
assert.equal(forbidden.failureKind, 'http_error');
assert.equal(forbidden.httpStatus, 403);
assert.match(forbidden.error, /HTTP 403/);
assert.equal(forbidden.contentType, 'text/plain');

const invalidJson = failed(await fetchOfferCatalogCategory(
  category,
  'https://offers.example',
  async () => new Response('<html>not json</html>', {
    status: 200,
    headers: { 'content-type': 'text/html' }
  })
));
assert.equal(invalidJson.failureKind, 'invalid_json');
assert.equal(invalidJson.httpStatus, 200);
assert.equal(invalidJson.contentType, 'text/html');

const invalidPayload = failed(await fetchOfferCatalogCategory(
  category,
  'https://offers.example',
  async () => new Response(JSON.stringify({ offers: [] }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })
));
assert.equal(invalidPayload.failureKind, 'invalid_payload');
assert.match(invalidPayload.error, /tablicy kart ofert/);

const timeoutError = new Error('The operation timed out');
timeoutError.name = 'TimeoutError';
const timeout = failed(await fetchOfferCatalogCategory(
  category,
  'https://offers.example',
  async () => { throw timeoutError; }
));
assert.equal(timeout.failureKind, 'timeout');

const network = failed(await fetchOfferCatalogCategory(
  category,
  'https://offers.example',
  async () => { throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } }); }
));
assert.equal(network.failureKind, 'network_error');
assert.match(network.error, /ECONNRESET/);

const invalidUrl = failed(await fetchOfferCatalogCategory(category, 'not a valid URL'));
assert.equal(invalidUrl.failureKind, 'invalid_endpoint');
assert.equal(invalidUrl.endpointHost, '[invalid-url]');

const secretInMessage = failed(await fetchOfferCatalogCategory(
  category,
  'https://offers.example',
  async () => { throw new Error('request failed https://offers.example/path?token=secret api_key=super-secret'); }
));
assert.equal(secretInMessage.failureKind, 'network_error');
assert.doesNotMatch(secretInMessage.error, /secret|super-secret/);
assert.doesNotMatch(secretInMessage.endpointPath, /secret/);

console.log('Offer catalog fetch diagnostics tests passed');
