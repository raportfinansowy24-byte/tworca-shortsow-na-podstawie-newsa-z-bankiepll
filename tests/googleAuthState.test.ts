import assert from 'node:assert/strict';
import {
  GOOGLE_ACCESS_TOKEN_EXPIRY_KEY,
  GOOGLE_ACCESS_TOKEN_KEY,
  clearGoogleAccessToken,
  mapGoogleUserInfo,
  readGoogleAccessToken,
  saveGoogleAccessToken
} from '../src/services/googleAuthState';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const storage = new MemoryStorage();
const now = 1_800_000_000_000;
assert.equal(readGoogleAccessToken(storage, now), null);

saveGoogleAccessToken(storage, 'token-123', 3600, now);
assert.equal(storage.getItem(GOOGLE_ACCESS_TOKEN_KEY), 'token-123');
assert.equal(Number(storage.getItem(GOOGLE_ACCESS_TOKEN_EXPIRY_KEY)), now + 3_600_000);
assert.equal(readGoogleAccessToken(storage, now), 'token-123');
assert.equal(readGoogleAccessToken(storage, now + 3_540_000), null, 'token expiring within one minute is rejected');
assert.equal(storage.getItem(GOOGLE_ACCESS_TOKEN_KEY), null, 'expired token is removed');

saveGoogleAccessToken(storage, 'token-456', 3600, now);
clearGoogleAccessToken(storage);
assert.equal(readGoogleAccessToken(storage, now), null);

assert.deepEqual(
  mapGoogleUserInfo({
    sub: 'google-user-1',
    name: 'Jan Testowy',
    email: 'jan@example.com',
    picture: 'https://example.com/avatar.png'
  }),
  {
    uid: 'google-user-1',
    displayName: 'Jan Testowy',
    email: 'jan@example.com',
    photoURL: 'https://example.com/avatar.png'
  }
);
assert.throws(() => mapGoogleUserInfo({ sub: 'missing-email' }), /identyfikatora i adresu e-mail/);
assert.throws(() => saveGoogleAccessToken(storage, '', 3600, now), /nieprawidłowy token/);

console.log('Google OAuth session state tests passed');
