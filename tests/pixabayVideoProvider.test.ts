import assert from 'node:assert/strict';
import { buildPixabayFallbackQueries } from '../src/server/pixabaySearchExpansion';
import { buildFinancialNewsSearchAliases } from '../src/server/stockSearchExpansion';
import {
  isTrustedPixabayMediaUrl,
  mapPixabayVideoCandidates,
  pixabayIdToInternalStockId
} from '../src/server/pixabayVideoProvider';

assert.equal(isTrustedPixabayMediaUrl('https://cdn.pixabay.com/video/clip.mp4'), true);
assert.equal(isTrustedPixabayMediaUrl('https://pixabay.com/videos/id-123/'), true);
assert.equal(isTrustedPixabayMediaUrl('http://cdn.pixabay.com/video/clip.mp4'), false);
assert.equal(isTrustedPixabayMediaUrl('https://pixabay.com.evil.example/video.mp4'), false);
assert.equal(isTrustedPixabayMediaUrl('https://example.com/pixabay.com/video.mp4'), false);
assert.equal(pixabayIdToInternalStockId(123), 1_000_000_000_123);
assert.equal(pixabayIdToInternalStockId(-1), null);
assert.equal(pixabayIdToInternalStockId('not-an-id'), null);

const nvidiaFallbackQueries = buildPixabayFallbackQueries(
  'Jensen Huang Nvidia keynote',
  'Wiadomość o nowych układach AI i wynikach producenta procesorów.',
  ['stock market chart'],
  4
);
assert.equal(nvidiaFallbackQueries[0], 'Jensen Huang Nvidia keynote', 'zachowaj oryginalne zapytanie jako pierwszą próbę');
assert.ok(nvidiaFallbackQueries.some((query) => /artificial intelligence/i.test(query)), 'rozszerz nazwę osoby i firmy do tematu AI');
assert.ok(nvidiaFallbackQueries.some((query) => /GPU|semiconductor/i.test(query)), 'dodaj warianty GPU i półprzewodników');
assert.ok(nvidiaFallbackQueries.length <= 4, 'ogranicz liczbę zapytań Pixabay na scenę');
assert.equal(new Set(nvidiaFallbackQueries.map((query) => query.toLowerCase())).size, nvidiaFallbackQueries.length, 'usuń duplikaty zapytań');
const newsFallbackQueries = buildPixabayFallbackQueries(
  'person reading financial news on laptop',
  '',
  ['inflation chart consumer prices data screen', 'consumer price index graph laptop', 'economist reviewing inflation chart'],
  5
);
assert.deepEqual(newsFallbackQueries, [
  'person reading financial news on laptop',
  'financial analyst reviewing business news laptop',
  'inflation chart consumer prices data screen',
  'consumer price index graph laptop',
  'economist reviewing inflation chart'
], 'dodaj celowany alias wiadomości bez usuwania trzech alternatyw kategorii');
assert.deepEqual(buildFinancialNewsSearchAliases('quarterly company report'), [], 'nie rozszerzaj niezwiązanych zapytań');

const payload = {
  hits: [
    {
      id: 123,
      pageURL: 'https://pixabay.com/videos/id-123/',
      tags: 'person, reviewing, documents, charts, desk, office',
      duration: 14,
      user: 'Creator',
      user_id: 42,
      videos: {
        large: { url: 'https://cdn.pixabay.com/video/large.mp4', width: 1080, height: 1920, thumbnail: 'https://cdn.pixabay.com/video/large.jpg' },
        medium: { url: 'https://cdn.pixabay.com/video/medium.mp4', width: 720, height: 1280, thumbnail: 'https://cdn.pixabay.com/video/medium.jpg' }
      }
    },
    {
      id: 124,
      pageURL: 'https://pixabay.com/videos/id-124/',
      tags: 'person, reviewing, documents, charts, desk, office',
      duration: 14,
      videos: {
        medium: { url: 'https://cdn.pixabay.com/video/horizontal.mp4', width: 1920, height: 1080, thumbnail: 'https://cdn.pixabay.com/video/horizontal.jpg' }
      }
    },
    {
      id: 125,
      pageURL: 'https://pixabay.com/videos/id-125/',
      tags: 'crypto coins, bitcoin, blockchain',
      duration: 14,
      videos: {
        medium: { url: 'https://cdn.pixabay.com/video/crypto.mp4', width: 720, height: 1280, thumbnail: 'https://cdn.pixabay.com/video/crypto.jpg' }
      }
    }
  ]
};

const candidates = mapPixabayVideoCandidates(payload, {
  query: 'person reviewing documents and charts at desk',
  context: 'person reviewing documents and charts at desk',
  sceneIndex: 6,
  requireTopicMatch: true
});
assert.equal(candidates.length, 2, 'dopuść pionowe i awaryjne poziome ujęcia, ale odrzuć semantycznie niepasujący materiał');
assert.deepEqual(candidates.map((candidate) => candidate.pixabayId).sort(), [123, 124], 'odrzuć klip o tematyce crypto');
assert.equal(candidates[0].source, 'pixabay');
assert.equal(candidates[0].id, 1_000_000_000_123, 'UI ma stabilne unikalne ID elementu');
assert.equal(candidates[0].pixabayId, 123);
assert.equal(candidates[0].pexelsId, 1_000_000_000_123, 'zapewnij unikalną, namespacowaną kompatybilność ze starym polem ID');
assert.equal(candidates[0].stockId, 'pixabay:123');
assert.equal(candidates[0].width, 1080);
assert.equal(candidates[0].height, 1920);
assert.equal(candidates[0].photographerUrl, 'https://pixabay.com/users/Creator-42/');

assert.equal(mapPixabayVideoCandidates(payload, {
  query: 'person reviewing documents and charts at desk',
  context: 'person reviewing documents and charts at desk',
  avoidVideoIds: [1_000_000_000_123],
  requireTopicMatch: true
}).length, 1, 'wyklucz użyty klip i zachowaj kolejny niezależny kandydat');
assert.equal(mapPixabayVideoCandidates({ hits: [{ id: 0 }] }, { query: 'office' }).length, 0);

const genericFinanceOnly = mapPixabayVideoCandidates({
  hits: [{
    id: 128,
    pageURL: 'https://pixabay.com/videos/id-128/',
    tags: 'financial market charts data screen',
    duration: 14,
    videos: { medium: { url: 'https://cdn.pixabay.com/video/generic-finance.mp4', width: 720, height: 1280, thumbnail: 'https://cdn.pixabay.com/video/generic-finance.jpg' } }
  }]
}, {
  query: 'stock market chart dynamic financial data',
  context: 'News about a Polish company and its factory expansion',
  requireTopicMatch: true,
  allowBroadSceneMatch: true
});
assert.equal(genericFinanceOnly.length, 0, 'odrzuć generyczne finanse, gdy nie zgadzają się konkretne pojęcia sceny');

const technologyFallbackPayload = {
  hits: [{
    id: 126,
    pageURL: 'https://pixabay.com/videos/id-126/',
    tags: 'artificial intelligence, technology, conference, GPU, servers',
    duration: 18,
    videos: {
      medium: { url: 'https://cdn.pixabay.com/video/technology.mp4', width: 1080, height: 1920, thumbnail: 'https://cdn.pixabay.com/video/technology.jpg' }
    }
  }, {
    id: 127,
    pageURL: 'https://pixabay.com/videos/id-127/',
    tags: 'artificial intelligence, technology conference, bitcoin, crypto',
    duration: 18,
    videos: {
      medium: { url: 'https://cdn.pixabay.com/video/crypto-tech.mp4', width: 1080, height: 1920, thumbnail: 'https://cdn.pixabay.com/video/crypto-tech.jpg' }
    }
  }]
};
const technologyFallbackOptions = {
  query: 'artificial intelligence technology conference',
  context: 'Jensen Huang Nvidia stock market news and AI presentation',
  requireTopicMatch: true,
  allowBroadSceneMatch: true
};
assert.equal(mapPixabayVideoCandidates(technologyFallbackPayload, technologyFallbackOptions).length, 1, 'przyjmij tematyczny alias do późniejszej kontroli obrazu, nawet bez tagu kategorii rynkowej');
assert.equal(mapPixabayVideoCandidates(technologyFallbackPayload, { ...technologyFallbackOptions, allowBroadSceneMatch: false }).length, 0, 'bez flagi broad match zachowaj dotychczasowy rygor tagów kategorii');

const prefixTrapPayload = { hits: [
  {
    id: 846,
    pageURL: 'https://pixabay.com/videos/id-846/',
    tags: 'library, books, reading, new items, shelves',
    duration: 13,
    videos: { medium: { url: 'https://cdn.pixabay.com/video/library.mp4', width: 1920, height: 1080, thumbnail: 'https://cdn.pixabay.com/video/library.jpg' } }
  },
  {
    id: 1028,
    pageURL: 'https://pixabay.com/videos/id-1028/',
    tags: 'homework, girl, student, laptop, study, studying, notebook, desk, reading, education',
    duration: 12,
    videos: { medium: { url: 'https://cdn.pixabay.com/video/student.mp4', width: 1920, height: 1080, thumbnail: 'https://cdn.pixabay.com/video/student.jpg' } }
  },
  {
    id: 35792,
    pageURL: 'https://pixabay.com/videos/id-35792/',
    tags: 'boat, sea, boat review, yacht, ship in storm, new, tips',
    duration: 10,
    videos: { medium: { url: 'https://cdn.pixabay.com/video/boat.mp4', width: 1920, height: 1080, thumbnail: 'https://cdn.pixabay.com/video/boat.jpg' } }
  }
] };
const newsSceneCandidates = mapPixabayVideoCandidates(prefixTrapPayload, {
  query: 'person reading financial news on laptop',
  context: 'inflation and financial news',
  requireTopicMatch: true,
  allowBroadSceneMatch: true
});
assert.deepEqual(newsSceneCandidates.map((candidate) => candidate.pixabayId), [1028], 'news/new must not let the library clip through, while a broader laptop clip remains available for visual QA');
assert.equal(mapPixabayVideoCandidates(prefixTrapPayload, {
  query: 'economist reviewing inflation chart',
  context: 'inflation and financial news',
  requireTopicMatch: true,
  allowBroadSceneMatch: true
}).length, 0, 'inflation/in must not let a boat-in-storm clip satisfy the query');
console.log('Pixabay video provider tests passed');
