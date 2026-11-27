import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { generateKaraokeCaptionAss } from '../src/server/karaokeCaptions';

const text = 'Swoich rodziców chroni bank';
const timings = [
  { word: 'Swoich', start: 0.1, end: 0.35 },
  { word: 'rodziców', start: 0.36, end: 0.62 },
  { word: 'chroni', start: 0.63, end: 0.82 },
  { word: 'bank', start: 0.83, end: 1.15 },
];
const ass = generateKaraokeCaptionAss(text, 1.5, timings, {
  fontName: 'Montserrat Black', fontSize: 86, outlineWidth: 5,
  glowOutlineWidth: 14, activeColor: '&H000000FF&',
  inactiveColor: '&H00FFFFFF&',
});
assert.ok(ass, 'ASS generator must return a subtitle track');
assert.match(ass, /Style: Glow,Montserrat Black,86/);
assert.match(ass, /Style: Caption,Montserrat Black,86/);
assert.match(ass, /\\blur18/);
assert.match(ass, /\\bord14/);
assert.match(ass, /Dialogue: 0,/);
assert.match(ass, /Dialogue: 1,/);

const root = process.cwd();
const font = resolve(root, 'fonts/Montserrat-Black.ttf');
assert.ok(readFileSync(font).byteLength > 1000, 'Montserrat Black font must exist in ./fonts');
const dir = mkdtempSync(join(tmpdir(), 'r24-karaoke-'));
try {
  const assPath = join(dir, 'captions.ass');
  const outputPath = join(dir, 'render.mp4');
  writeFileSync(assPath, ass, 'utf8');
  const filter = "ass='" + assPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'") + "':fontsdir=./fonts";
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=black:s=720x1280:r=25:d=1.5',
    '-vf', filter, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', outputPath,
  ], { encoding: 'utf8', timeout: 60_000 });
  assert.equal(result.status, 0, 'FFmpeg ASS render failed: ' + (result.stderr || result.error?.message || 'unknown error'));
  assert.ok(statSync(outputPath).size > 1000, 'FFmpeg output video must be non-empty');
  console.log('Karaoke ASS FFmpeg render smoke test passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
