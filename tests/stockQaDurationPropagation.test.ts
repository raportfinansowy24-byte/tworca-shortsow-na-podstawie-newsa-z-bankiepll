import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
// Production-news routes that render scenes from planned durations must pass those
// exact durations to stock frame QA (otherwise it samples beyond the rendered cut).
assert.match(server, /sceneNarration: String\(textContent\),\s*requirePexels: requireNewsPexels,\s*targetDurationSeconds: sceneDurations\[idx\]/);
assert.match(server, /sceneNarration: String\(sc\.voiceover_text \|\| sc\.subtitles \|\| ''\),\s*requirePexels: requireNewsPexels,\s*targetDurationSeconds: sceneDurations\[idx\]/);
assert.match(server, /targetDurationSeconds: sceneDurations\[idx\]\s*\}\);/);
// Other generation paths have their own scene-duration values.
assert.match(server, /targetDurationSeconds: dur\s*\}\s*\);/);
assert.match(server, /targetDurationSeconds: Number\(scene\.duration\) \|\| 8/);
console.log('Stock QA duration propagation tests passed');
