import assert from 'node:assert/strict';
import { buildContinuousNarrationMuxArgs } from '../src/server/finalNarrationMix';

const noMusic = buildContinuousNarrationMuxArgs({
  mergedVideoPath: '/tmp/merged_scenes.mp4',
  fullNarrationPath: '/tmp/short_narration_full.mp3',
  durationSeconds: 21.75,
  outputPath: '/tmp/final.mp4'
});
assert.deepEqual(noMusic.slice(0, 5), [
  '-y', '-i', '/tmp/merged_scenes.mp4', '-i', '/tmp/short_narration_full.mp3'
]);
assert.equal(noMusic.filter((value) => value === '-i').length, 2, 'only one full narration input is added after concat');
assert.match(noMusic[noMusic.indexOf('-filter_complex') + 1], /\[1:a\]volume=1\.0,apad,atrim=duration=21\.750\[full_voice\]/);
assert.match(noMusic[noMusic.indexOf('-filter_complex') + 1], /amix=inputs=2/);
assert.doesNotMatch(noMusic.join(' '), /scene_tts_\d+\.wav/);

const withMusic = buildContinuousNarrationMuxArgs({
  mergedVideoPath: '/tmp/merged_scenes.mp4',
  fullNarrationPath: '/tmp/short_narration_full.mp3',
  backgroundMusicPath: '/tmp/music.mp3',
  backgroundMusicVolume: 0.25,
  durationSeconds: 28,
  outputPath: '/tmp/final.mp4'
});
assert.equal(withMusic.filter((value) => value === '-i').length, 3, 'one full narration and one music input are added');
const withMusicFilter = withMusic[withMusic.indexOf('-filter_complex') + 1];
assert.match(withMusicFilter, /\[2:a\]volume=0\.250,apad,atrim=duration=28\.000\[music\]/);
assert.match(withMusicFilter, /amix=inputs=3:duration=first/);
assert.match(withMusicFilter, /alimiter=limit=0\.95/);

assert.throws(() => buildContinuousNarrationMuxArgs({
  mergedVideoPath: '/tmp/merged.mp4',
  fullNarrationPath: '/tmp/voice.mp3',
  durationSeconds: 0,
  outputPath: '/tmp/final.mp4'
}), /Nieprawidłowe parametry/);

console.log('Continuous narration final-mix tests passed');
