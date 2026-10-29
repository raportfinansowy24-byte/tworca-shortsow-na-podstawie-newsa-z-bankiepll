import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildAudioMixFilter, buildMotionFilter, generateSceneSoundEffect, motionSoundSpecForBeat } from '../src/server/motionSoundRenderer';

const spec = motionSoundSpecForBeat('loser');
assert.equal(spec.motion, 'impact-drop');
assert.equal(spec.sound, 'negative-impact');
assert.match(buildMotionFilter(spec, 720, 1280, 30, 2.5), /zoompan/);
assert.match(buildMotionFilter(spec, 720, 1280, 30, 2.5), /fade/);
assert.match(buildAudioMixFilter(true, true).filter, /amix=inputs=2/);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'raport-motion-'));
const sfx = path.join(dir, 'impact.m4a');
await generateSceneSoundEffect(sfx, spec.sound, 0.5);
assert.ok(fs.existsSync(sfx));
assert.ok(fs.statSync(sfx).size > 500);
fs.rmSync(dir, { recursive: true, force: true });
console.log('Motion/sound renderer tests passed');
