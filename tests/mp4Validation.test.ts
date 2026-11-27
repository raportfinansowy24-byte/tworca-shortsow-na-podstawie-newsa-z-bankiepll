import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolvePublicExportFile, selectValidCompletedMp4Jobs, validateMp4File, validateMp4ProbeOutput } from '../src/server/mp4Validation';

const validProbe = JSON.stringify({
  streams: [
    { codec_type: 'video', codec_name: 'h264', width: 1080, height: 1920 },
    { codec_type: 'audio', codec_name: 'aac' }
  ],
  format: { format_name: 'mov,mp4,m4a,3gp,3g2,mj2', duration: '15.002', size: '2345678' }
});
assert.deepEqual(validateMp4ProbeOutput(validProbe, 2345678, true), {
  valid: true, durationSeconds: 15.002, width: 1080, height: 1920, hasAudio: true, probedSizeBytes: 2345678
});
assert.equal(validateMp4ProbeOutput('not json', 2345678).valid, false);
assert.equal(validateMp4ProbeOutput('null', 2345678).valid, false);
assert.equal(validateMp4ProbeOutput(validProbe, 900).valid, false);
assert.equal(validateMp4ProbeOutput(validProbe, 2345679).valid, false);
assert.equal(validateMp4ProbeOutput(JSON.stringify({ streams: [], format: { duration: '15', format_name: 'mp4' } }), 2345678).valid, false);
assert.equal(validateMp4ProbeOutput(JSON.stringify({
  streams: [{ codec_type: 'video', width: 0, height: 1920 }], format: { duration: '15', format_name: 'mp4' }
}), 2345678).valid, false);
assert.equal(validateMp4ProbeOutput(JSON.stringify({
  streams: [{ codec_type: 'video', width: 1080, height: 1920 }], format: { duration: 'N/A', format_name: 'mp4' }
}), 2345678).valid, false);
assert.equal(validateMp4ProbeOutput(JSON.stringify({
  streams: [{ codec_type: 'video', width: 1080, height: 1920 }], format: { duration: '15', format_name: 'matroska,webm' }
}), 2345678).valid, false);
assert.equal(validateMp4ProbeOutput(JSON.stringify({
  streams: [{ codec_type: 'video', width: 1080, height: 1920 }], format: { duration: '15', format_name: 'mp4' }
}), 2345678, true).valid, false);

const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'r24-mp4-path-'));
try {
  writeFileSync(path.join(tempRoot, 'not-video.mp4'), 'not a real video');
  symlinkSync('/etc/passwd', path.join(tempRoot, 'linked.mp4'));
  const resolved = await resolvePublicExportFile(tempRoot, 'not-video.mp4');
  assert.equal(resolved?.filename, 'not-video.mp4');
  assert.equal(resolved?.filePath, path.join(tempRoot, 'not-video.mp4'));
  assert.equal(await resolvePublicExportFile(tempRoot, '../outside.mp4'), null);
  assert.equal(await resolvePublicExportFile(tempRoot, 'linked.mp4'), null);
  assert.equal((await validateMp4File(tempRoot, '../outside.mp4')).valid, false);
  assert.equal((await validateMp4File(tempRoot, 'not-video.mp4')).valid, false);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

const candidates = [
  { id: 'valid-1', status: 'completed', outputFilename: 'valid-1.mp4' },
  { id: 'bad', status: 'completed', outputFilename: 'broken.mp4' },
  { id: 'pending', status: 'processing', outputFilename: 'pending.mp4' },
  { id: 'valid-2', status: 'completed', outputFilename: 'valid-2.mp4' }
];
const invalidated: string[] = [];
const selected = await selectValidCompletedMp4Jobs(candidates, 2, async (filename) =>
  filename === 'broken.mp4'
    ? { valid: false, reason: 'corrupt', hasAudio: false }
    : { valid: true, durationSeconds: 15, hasAudio: true },
(job, reason) => invalidated.push(job.id + ':' + reason));
assert.deepEqual(selected.map((job) => job.id), ['valid-1', 'valid-2']);
assert.deepEqual(invalidated, ['bad:corrupt']);
console.log('MP4 validation parser, path safety and history selection tests passed');
