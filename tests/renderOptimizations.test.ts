import assert from 'node:assert/strict';
import {
  buildConcatArgs,
  FAST_H264_OPTIONS,
  isValidConcatenatedVideo,
  mapWithConcurrency,
  SCENE_TTS_CONCURRENCY
} from '../src/server/renderOptimizations';

assert.equal(SCENE_TTS_CONCURRENCY, 2, 'TTS pozostaje ograniczone do dwóch równoczesnych wywołań');
assert.deepEqual(FAST_H264_OPTIONS, ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p']);

const copyArgs = buildConcatArgs('/tmp/list.txt', '/tmp/merged.mp4', true);
assert.deepEqual(copyArgs.slice(-5), ['-c', 'copy', '-movflags', '+faststart', '/tmp/merged.mp4']);
const reencodeArgs = buildConcatArgs('/tmp/list.txt', '/tmp/merged.mp4', false);
assert.ok(reencodeArgs.includes('veryfast'), 'fallback używa szybszego presetu H.264');
assert.ok(reencodeArgs.includes('-c:a') && reencodeArgs.includes('aac'));

const validProbe = {
  streams: [
    { codec_type: 'video', width: 720, height: 1280 },
    { codec_type: 'audio' }
  ],
  format: { duration: '18.0' }
};
assert.equal(isValidConcatenatedVideo(validProbe, 720, 1280, true, 25, 18), true);
assert.equal(isValidConcatenatedVideo({ ...validProbe, format: { duration: '24.8' } }, 720, 1280, true, 25, 24.8), true, 'dopuszcza poprawny Short w awaryjnym limicie 25 s');
assert.equal(isValidConcatenatedVideo(validProbe, 1080, 1920, true, 25, 18), false, 'odrzuca niezgodny wymiar');
assert.equal(isValidConcatenatedVideo({ ...validProbe, streams: [validProbe.streams[0]] }, 720, 1280, true, 25, 18), false, 'odrzuca brak audio dla renderu z lektorem');
assert.equal(isValidConcatenatedVideo({ ...validProbe, format: { duration: '25.5' } }, 720, 1280, true, 25, 18), false, 'odrzuca czas przekraczający twardy limit shorta');
assert.equal(isValidConcatenatedVideo({ ...validProbe, format: { duration: '15.0' } }, 720, 1280, true, 25, 18), false, 'odrzuca wynik krótszy od oczekiwanego, prawdopodobnie ucięty');

let active = 0;
let maxActive = 0;
const completed: number[] = [];
await mapWithConcurrency([0, 1, 2, 3, 4], 2, async (_item, index) => {
  active++;
  maxActive = Math.max(maxActive, active);
  await new Promise((resolve) => setTimeout(resolve, 5));
  completed.push(index);
  active--;
});
assert.equal(maxActive, 2, 'worker pool nie przekracza skonfigurowanej współbieżności');
assert.deepEqual([...completed].sort((a, b) => a - b), [0, 1, 2, 3, 4], 'każdy element jest przetwarzany dokładnie raz');

const started: number[] = [];
await assert.rejects(() => mapWithConcurrency([0, 1, 2, 3], 2, async (_item, index) => {
  started.push(index);
  if (index === 0) throw new Error('synthetic worker failure');
  await new Promise((resolve) => setTimeout(resolve, 5));
}), /synthetic worker failure/);
assert.ok(started.length < 4, 'po błędzie nie są uruchamiane nowe zadania TTS');

const abortController = new AbortController();
const startedRequests: number[] = [];
let activeRequests = 0;
const activeTtsRequests = mapWithConcurrency([0, 1, 2], 2, async (_item, index) => {
  startedRequests.push(index);
  activeRequests++;
  await new Promise<void>((_resolve, reject) => {
    abortController.signal.addEventListener('abort', () => {
      activeRequests--;
      reject(new Error('synthetic TTS request aborted'));
    }, { once: true });
  });
});
setTimeout(() => abortController.abort(), 5);
await assert.rejects(activeTtsRequests, /synthetic TTS request aborted/);
assert.equal(startedRequests.length, 2, 'anulowanie aktywnych żądań nie uruchamia kolejnych zadań TTS');
assert.equal(activeRequests, 0, 'aktywne żądania TTS zostają zakończone po abort');

console.log('Render optimization tests passed');
