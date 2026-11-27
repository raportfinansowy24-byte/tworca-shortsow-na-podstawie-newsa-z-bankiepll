import assert from 'node:assert/strict';
import { summarizeScenesForHistory } from '../src/server/storyboardHistory';
import { normalizeStoryboardScenes } from '../src/utils/storyboardPreview';

const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><rect width="720" height="1280" fill="#101827"/></svg>';
const summarized = summarizeScenesForHistory([
  {
    id: 'intro',
    videoUrl: 'https://videos.pexels.com/video-files/123/123-hd_720_1280_25fps.mp4',
    thumbnailUrl: 'https://images.pexels.com/photos/1/pexels-photo-1.jpeg',
    subtitles: 'RYNEK ROŚNIE',
    voiceover_text: 'Indeksy zakończyły sesję na plusie.',
    duration: 2.1,
    trimStart: 1.5,
    trimEnd: 3.6,
    searchKeyword: 'giełda parkiet',
    captionStyle: { fontSize: 86, fontColor: 'white', outlineColor: 'black', outlineWidth: 14, boxColor: 'black@0.6', position: 'bottom', animation: 'word-by-word', highlightColor: 'red' },
    source: 'pexels'
  },
  {
    id: 'chart',
    visualMode: 'data_visual',
    visualSvg: safeSvg,
    subtitles: 'WYNIK +2,4%',
    duration: 2.4,
    captionStyle: { position: 'center', alignment: 'center', animation: 'classic' }
  },
  {
    id: 'unsafe',
    videoUrl: 'javascript:alert(1)',
    visualMode: 'data_visual',
    visualSvg: '<svg><script>alert(1)</script></svg>',
    subtitles: 'Niebezpieczna scena'
  }
]);

assert.equal(summarized.length, 3);
assert.equal(summarized[0].videoUrl, 'https://videos.pexels.com/video-files/123/123-hd_720_1280_25fps.mp4');
assert.equal(summarized[0].thumbnailUrl, 'https://images.pexels.com/photos/1/pexels-photo-1.jpeg');
assert.equal(summarized[0].trimStart, 1.5);
assert.equal(summarized[0].trimEnd, 3.6);
assert.equal((summarized[0].captionStyle as Record<string, unknown>).fontSize, 86);
assert.equal(summarized[1].visualSvg, safeSvg);
assert.equal(summarized[2].videoUrl, undefined);
assert.equal(summarized[2].visualSvg, undefined);

const normalized = normalizeStoryboardScenes(summarized, 'job-test');
assert.equal(normalized.length, 3);
assert.equal(normalized[0].id, 'intro');
assert.equal(normalized[0].duration, 2.1);
assert.equal(normalized[0].trimStart, 1.5);
assert.equal(normalized[0].trimEnd, 3.6);
assert.equal(normalized[0].captionStyle.animation, 'word-by-word');
assert.equal(normalized[1].visualMode, 'data_visual');
assert.equal(normalized[1].visualSvg, safeSvg);
assert.equal(normalized[2].videoUrl, '');
assert.equal(normalizeStoryboardScenes([], 'empty').length, 0);
assert.equal(
  normalizeStoryboardScenes([{ id: 'invalid', videoUrl: 'data:text/html,bad', subtitles: 'test' }], 'job')[0].videoUrl,
  ''
);
console.log('Storyboard preview tests passed');
