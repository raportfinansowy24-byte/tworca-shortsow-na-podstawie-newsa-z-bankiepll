import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateMp4File } from '../src/server/mp4Validation';

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'r24-mp4-validation-'));
try {
  const validPath = path.join(tempDir, 'valid.mp4');
  const corruptPath = path.join(tempDir, 'truncated.mp4');

  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=black:s=360x640:r=25:d=2',
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-shortest', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', validPath
  ], { stdio: 'pipe', timeout: 30_000 });

  const validResult = await validateMp4File(validPath);
  assert.equal(validResult.valid, true, validResult.reason);
  assert.equal(validResult.hasAudio, true);
  assert.equal(validResult.width, 360);
  assert.equal(validResult.height, 640);
  assert.ok((validResult.durationSeconds || 0) > 1.5);

  const validBytes = readFileSync(validPath);
  writeFileSync(corruptPath, validBytes.subarray(0, 8));
  const corruptResult = await validateMp4File(corruptPath);
  assert.equal(corruptResult.valid, false, 'the production file validator must reject a corrupt MP4');
  assert.ok(corruptResult.reason, 'the validation failure should be diagnosable');

  console.log('MP4 validation integration test passed (real FFmpeg output + truncated corrupt file).');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
