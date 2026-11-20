export const GOOGLE_ACCESS_TOKEN_KEY = 'gdrive_access_token';
export const GOOGLE_ACCESS_TOKEN_EXPIRY_KEY = 'gdrive_access_token_expires_at';
export const GOOGLE_TOKEN_EXPIRY_SKEW_MS = 60_000;

export interface GoogleDriveUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface GoogleUserInfo {
  sub?: unknown;
  name?: unknown;
  email?: unknown;
  picture?: unknown;
}

export interface GoogleStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function saveGoogleAccessToken(
  storage: GoogleStorageLike,
  accessToken: string,
  expiresInSeconds: number,
  now = Date.now()
): void {
  if (!accessToken || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new Error('Google zwrócił nieprawidłowy token lub czas jego ważności.');
  }
  storage.setItem(GOOGLE_ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(
    GOOGLE_ACCESS_TOKEN_EXPIRY_KEY,
    String(now + Math.floor(expiresInSeconds * 1000))
  );
}

export function readGoogleAccessToken(
  storage: GoogleStorageLike,
  now = Date.now(),
  expirySkewMs = GOOGLE_TOKEN_EXPIRY_SKEW_MS
): string | null {
  const token = storage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
  const expiresAt = Number(storage.getItem(GOOGLE_ACCESS_TOKEN_EXPIRY_KEY));
  if (!token || !Number.isFinite(expiresAt) || expiresAt - now <= expirySkewMs) {
    clearGoogleAccessToken(storage);
    return null;
  }
  return token;
}

export function clearGoogleAccessToken(storage: GoogleStorageLike): void {
  storage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
  storage.removeItem(GOOGLE_ACCESS_TOKEN_EXPIRY_KEY);
}

export function mapGoogleUserInfo(value: GoogleUserInfo): GoogleDriveUser {
  const uid = typeof value.sub === 'string' ? value.sub.trim() : '';
  const email = typeof value.email === 'string' ? value.email.trim() : '';
  if (!uid || !email) {
    throw new Error('Google nie zwrócił identyfikatora i adresu e-mail zalogowanego konta.');
  }
  return {
    uid,
    email,
    displayName: typeof value.name === 'string' && value.name.trim() ? value.name.trim() : null,
    photoURL: typeof value.picture === 'string' && value.picture.trim() ? value.picture.trim() : null
  };
}
