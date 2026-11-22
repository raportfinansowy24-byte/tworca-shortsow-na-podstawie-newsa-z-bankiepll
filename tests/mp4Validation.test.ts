import assert from 'node:assert/strict';
import { validateMp4ProbeOutput } from '../src/server/mp4Validation';

const validMp4 = JSON.stringify({
  streams: [
    { codec_type: 'video', codec_name: 'h264', width: 1080, height: 1920 },
    { codec_type: 'audio', codec_name: 'aac' }
  ],
  format: { format_name: 'mov,mp4,m4a,3gp,3g2,mj2', duration: '15.002', size: '2345678' }
});

assert.deepEqual(
  validateMp4ProbeOutput(validMp4, 2345678, true),
  {
    valid: true,
    durationSeconds: 15.002,
    width: 1080,
    height: 1920,
    hasAudio: true,
    probedSizeBytes: 2345678
  }
);

assert.equal(validateMp4ProbeOutput('not json', 2345678).valid, false);
assert.equal(validateMp4ProbeOutput(validMp4, 900).valid, false);
assert.equal(
  validateMp4ProbeOutput(JSON.stringify({ streams: [], format: { duration: '15', format_name: 'mp4' } }), 2345678).reason,
  'Plik nie zawiera strumienia wideo.'
);
assert.equal(
  validateMp4ProbeOutput(JSON.stringify({
    streams: [{ codec_type: 'video', width: 0, height: 1920 }],
    format: { duration: '15', format_name: 'mp4' }
  }), 2345678).valid,
  false
);
assert.equal(
  validateMp4ProbeOutput(JSON.stringify({
    streams: [{ codec_type: 'video', width: 1080, height: 1920 }],
    format: { duration: 'N/A', format_name: 'mp4' }
  }), 2345678).valid,
  false
);
assert.equal(
  validateMp4ProbeOutput(JSON.stringify({
    streams: [{ codec_type: 'video', width: 1080, height: 1920 }],
    format: { duration: '15', format_name: 'mp4' }
  }), 2345678, true).reason,
  'Plik nie zawiera wymaganego strumienia audio.'
);
assert.equal(
  validateMp4ProbeOutput(JSON.stringify({
    streams: [{ codec_type: 'video', width: 1080, height: 1920 }],
    format: { duration: '15', format_name: 'matroska,webm' }
  }), 2345678).valid,
  false
);

console.log('MP4 validation tests passed');
