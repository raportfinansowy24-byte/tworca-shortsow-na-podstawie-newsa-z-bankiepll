import assert from 'node:assert/strict';
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
console.log('Pixabay video provider tests passed');
