import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const bunLock = fs.readFileSync(path.join(root, 'bun.lock'), 'utf8');
const npmLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const driveService = fs.readFileSync(path.join(root, 'src/services/googleDriveService.ts'), 'utf8');
const driveManager = fs.readFileSync(path.join(root, 'src/components/GoogleDriveManager.tsx'), 'utf8');
const sheetsManager = fs.readFileSync(path.join(root, 'src/components/GoogleSheetsManager.tsx'), 'utf8');
const flyConfig = fs.readFileSync(path.join(root, 'fly.toml'), 'utf8');
const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');

assert.equal(packageJson.dependencies?.firebase, undefined, 'Firebase SDK must not be a runtime dependency');
assert.equal(/"firebase"\s*:/.test(bunLock), false, 'Firebase package must be removed from Bun lockfile');
assert.equal(npmLock.packages?.['']?.dependencies?.firebase, undefined, 'Firebase package must be removed from npm lockfile');
assert.equal(fs.existsSync(path.join(root, 'firebase-applet-config.json')), false, 'Firebase app config must be removed');
assert.equal(/firebase\/(?:app|auth)/i.test(driveService + driveManager + sheetsManager), false);
assert.equal(/localStorage\.(?:getItem|setItem)\(['"]gdrive_access_token/.test(driveService), false);
assert.match(driveService, /localStorage\.removeItem\(['"]gdrive_access_token/);
assert.match(driveService, /requestAccessToken\(\)/, 'GIS token flow must be used');
assert.match(driveService, /sessionStorage/);
assert.match(driveService, /expires_in/);
assert.match(driveService, /oauth2\/v3\/userinfo/);
assert.match(driveService, /oauth2\?\.revoke/);
assert.match(driveService, /AppAuthGate's signed app session/);
assert.match(flyConfig, /\[build\.args\][\s\S]*VITE_GOOGLE_CLIENT_ID/);
assert.match(dockerfile, /ARG VITE_GOOGLE_CLIENT_ID[\s\S]*VITE_GOOGLE_CLIENT_ID=\"\$\{VITE_GOOGLE_CLIENT_ID\}\" npm run build/);
assert.equal(/FIREBASE_PROJECT_ID/.test(flyConfig), false);

console.log('Google Firebase-to-GIS migration contract tests passed');
