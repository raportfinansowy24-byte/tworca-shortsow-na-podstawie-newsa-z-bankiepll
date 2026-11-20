import {
  clearGoogleAccessToken,
  mapGoogleUserInfo,
  readGoogleAccessToken,
  saveGoogleAccessToken,
  type GoogleDriveUser,
  type GoogleStorageLike
} from './googleAuthState';

export type { GoogleDriveUser } from './googleAuthState';

// Keep only scopes required by current Drive/Sheets operations and the user profile.
export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
  'openid',
  'email',
  'profile'
];

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

interface GoogleOAuth2Api {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
    error_callback?: (error: { type?: string; message?: string }) => void;
  }) => GoogleTokenClient;
  revoke: (token: string, callback?: (response: { successful?: boolean; error?: string }) => void) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleOAuth2Api;
      };
    };
  }
}

const TOKEN_CACHE: GoogleStorageLike = {
  getItem(key) {
    try { return window.sessionStorage.getItem(key); } catch { return null; }
  },
  setItem(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch {
      throw new Error('Przeglądarka blokuje pamięć sesji. Zezwól na sessionStorage i spróbuj ponownie.');
    }
  },
  removeItem(key) {
    try { window.sessionStorage.removeItem(key); } catch { /* storage may be blocked */ }
  }
};

// Remove the legacy Firebase-era persistent token. It has no trustworthy expiry metadata.
if (typeof window !== 'undefined') {
  try { window.localStorage.removeItem('gdrive_access_token'); } catch { /* storage may be blocked */ }
}

let activeSignInPromise: Promise<{ user: GoogleDriveUser; accessToken: string } | null> | null = null;

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  parents?: string[];
}

export interface DriveStorageQuota {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  usageInDriveTrash?: string;
  userDisplayName?: string;
  userEmail?: string;
  userPhotoUrl?: string;
}

async function getGoogleUserInfo(accessToken: string): Promise<GoogleDriveUser> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(response.status === 401
      ? 'Sesja Google wygasła. Zaloguj się ponownie.'
      : `Nie udało się pobrać profilu Google (HTTP ${response.status}).`);
  }
  return mapGoogleUserInfo(await response.json());
}

export const initAuth = (
  onAuthSuccess?: (user: GoogleDriveUser, token: string) => void,
  onAuthFailure?: () => void
): (() => void) => {
  let active = true;
  const initialise = async () => {
    const token = readGoogleAccessToken(TOKEN_CACHE);
    if (!token) {
      if (active) onAuthFailure?.();
      return;
    }
    try {
      const user = await getGoogleUserInfo(token);
      if (active) onAuthSuccess?.(user, token);
    } catch (error) {
      clearGoogleAccessToken(TOKEN_CACHE);
      console.warn('[Google Drive Auth] Zapisana sesja nie jest już ważna:', (error as Error).message);
      if (active) onAuthFailure?.();
    }
  };
  void initialise();
  return () => { active = false; };
};

// GIS token requests must be initiated from a real user gesture. The library is
// preloaded from index.html so requestAccessToken can run in the click handler.
export const googleSignIn = (): Promise<{ user: GoogleDriveUser; accessToken: string } | null> => {
  if (activeSignInPromise) return activeSignInPromise;

  const clientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return Promise.reject(new Error('Brak VITE_GOOGLE_CLIENT_ID. Ustaw identyfikator OAuth 2.0 Web Client dla Google Drive/Sheets.'));
  }

  const oauth = window.google?.accounts?.oauth2;
  if (!oauth) {
    return Promise.reject(new Error('Moduł Google Identity Services jeszcze się ładuje. Odśwież stronę i spróbuj ponownie.'));
  }

  let resolvePromise!: (value: { user: GoogleDriveUser; accessToken: string } | null) => void;
  let rejectPromise!: (reason: Error) => void;
  const promise = new Promise<{ user: GoogleDriveUser; accessToken: string } | null>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  activeSignInPromise = promise;

  let settled = false;
  const finish = (callback: () => void) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeout);
    if (activeSignInPromise === promise) activeSignInPromise = null;
    callback();
  };
  const timeout = window.setTimeout(() => {
    finish(() => rejectPromise(new Error('Nie otrzymano odpowiedzi od Google. Zamknij okno logowania i spróbuj ponownie.')));
  }, 120_000);

  try {
    const client = oauth.initTokenClient({
      client_id: clientId,
      scope: SCOPES.join(' '),
      callback: (response) => {
        if (settled) return;
        if (response.error) {
          if (response.error === 'access_denied') {
            finish(() => resolvePromise(null));
            return;
          }
          finish(() => rejectPromise(new Error(response.error_description || `Google OAuth: ${response.error}`)));
          return;
        }
        if (!response.access_token || !response.expires_in) {
          finish(() => rejectPromise(new Error('Google nie zwrócił kompletnego tokenu dostępu.')));
          return;
        }

        void (async () => {
          try {
            saveGoogleAccessToken(TOKEN_CACHE, response.access_token!, response.expires_in!);
            const user = await getGoogleUserInfo(response.access_token!);
            finish(() => resolvePromise({ user, accessToken: response.access_token! }));
          } catch (error) {
            clearGoogleAccessToken(TOKEN_CACHE);
            finish(() => rejectPromise(error instanceof Error ? error : new Error(String(error))));
          }
        })();
      },
      error_callback: (error) => {
        if (settled) return;
        if (error.type === 'popup_closed') {
          finish(() => resolvePromise(null));
          return;
        }
        finish(() => rejectPromise(new Error(error.message || 'Nie udało się otworzyć okna logowania Google.')));
      }
    });

    // No await before this call: GIS requires the original user gesture.
    client.requestAccessToken();
  } catch (error) {
    finish(() => rejectPromise(error instanceof Error ? error : new Error(String(error))));
  }

  return promise;
};

export const getCachedAccessToken = (): string | null =>
  readGoogleAccessToken(TOKEN_CACHE);

export const getAccessToken = async (): Promise<string | null> =>
  getCachedAccessToken();

export const logoutGoogleDrive = async (): Promise<void> => {
  const token = await getAccessToken();
  if (token) {
    try {
      window.google?.accounts?.oauth2?.revoke(token, () => undefined);
    } catch (error) {
      console.warn('[Google Drive Auth] Nie udało się unieważnić zgody Google:', (error as Error).message);
    }
  }
  clearGoogleAccessToken(TOKEN_CACHE);
};

// ---------------- Google Drive API Client Calls ----------------

/**
 * Fetch Drive Storage Quota and User info
 */
export const getDriveStorageInfo = async (): Promise<DriveStorageQuota> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Brak autoryzacji do Google Drive. Zaloguj się ponownie.');

  const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Błąd pobierania informacji o dysku (${res.status})`);
  }

  const data = await res.json();
  return {
    limit: data.storageQuota?.limit,
    usage: data.storageQuota?.usage,
    usageInDrive: data.storageQuota?.usageInDrive,
    usageInDriveTrash: data.storageQuota?.usageInDriveTrash,
    userDisplayName: data.user?.displayName,
    userEmail: data.user?.emailAddress,
    userPhotoUrl: data.user?.photoLink
  };
};

/**
 * List files from Google Drive with optional search query and pagination
 */
export const listDriveFiles = async (options?: {
  query?: string;
  folderId?: string;
  mimeTypeFilter?: string;
  pageSize?: number;
  pageToken?: string;
}): Promise<{ files: DriveFileItem[]; nextPageToken?: string }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Brak autoryzacji Google Drive. Zaloguj się przez konto Google.');

  const conditions: string[] = ['trashed = false'];

  if (options?.folderId) {
    conditions.push(`'${options.folderId}' in parents`);
  }

  if (options?.mimeTypeFilter) {
    if (options.mimeTypeFilter === 'video') {
      conditions.push("mimeType contains 'video/'");
    } else if (options.mimeTypeFilter === 'folder') {
      conditions.push("mimeType = 'application/vnd.google-apps.folder'");
    } else {
      conditions.push(`mimeType = '${options.mimeTypeFilter}'`);
    }
  }

  if (options?.query && options.query.trim()) {
    const clean = options.query.trim().replace(/'/g, "\\'");
    conditions.push(`name contains '${clean}'`);
  }

  const q = conditions.join(' and ');
  const pageSize = options?.pageSize || 20;

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('pageSize', pageSize.toString());
  url.searchParams.set(
    'fields',
    'nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents)'
  );
  url.searchParams.set('orderBy', 'folder,modifiedTime desc');

  if (options?.pageToken) {
    url.searchParams.set('pageToken', options.pageToken);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Błąd pobierania listy plików Google Drive (${res.status})`);
  }

  const data = await res.json();
  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken
  };
};

/**
 * Create a new folder in Google Drive
 */
export const createDriveFolder = async (folderName: string, parentId?: string): Promise<DriveFileItem> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Brak autoryzacji Google Drive.');

  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Błąd tworzenia folderu (${res.status})`);
  }

  return await res.json();
};

/**
 * Find or create dedicated application folder in Drive
 */
export const getOrCreateAppFolder = async (folderName = 'shorts-bot'): Promise<string> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Brak autoryzacji Google Drive.');

  const searchRes = await listDriveFiles({
    query: folderName,
    mimeTypeFilter: 'folder'
  });

  const existing = searchRes.files.find((f) => f.name === folderName);
  if (existing) {
    return existing.id;
  }

  const created = await createDriveFolder(folderName);
  return created.id;
};

/**
 * Returns web direct link to Google Drive folder
 */
export const getAppFolderUrl = (folderId?: string): string => {
  if (folderId) {
    return `https://drive.google.com/drive/folders/${folderId}`;
  }
  return 'https://drive.google.com/drive/my-drive';
};

/**
 * Upload a File (Blob or text content) directly to Google Drive via multipart upload
 */
export const uploadFileToDrive = async (options: {
  name: string;
  mimeType: string;
  content: Blob | string;
  folderId?: string;
  description?: string;
  appProperties?: Record<string, string>;
}): Promise<DriveFileItem> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Brak autoryzacji Google Drive.');

  const metadata: any = {
    name: options.name,
    mimeType: options.mimeType,
    description: options.description || 'Wygenerowano przez Raport Finansowy 24 - AI Shorts Generator'
  };

  if (options.folderId) {
    metadata.parents = [options.folderId];
  }
  if (options.appProperties && Object.keys(options.appProperties).length > 0) {
    metadata.appProperties = options.appProperties;
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const blobContent =
    typeof options.content === 'string'
      ? new Blob([options.content], { type: options.mimeType })
      : options.content;

  const metadataPart = delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata);

  const mediaHeader = delimiter +
    `Content-Type: ${options.mimeType}\r\n\r\n`;

  const requestBlob = new Blob(
    [metadataPart, mediaHeader, blobContent, closeDelimiter],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: requestBlob
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Błąd przesyłania pliku na Dysk Google (${res.status})`);
  }

  return await res.json();
};

/**
 * Upload a rendered video from a server URL to the user's Google Drive
 */
export const exportVideoUrlToDrive = async (options: {
  videoUrl: string;
  fileName: string;
  folderId?: string;
  jobId?: string;
  description?: string;
  onProgress?: (percent: number) => void;
}): Promise<DriveFileItem> => {
  const jobId = options.jobId && options.jobId.startsWith('job_') ? options.jobId : undefined;
  const attemptId = jobId ? crypto.randomUUID() : undefined;
  const startedAt = new Date().toISOString();

  const reportStatus = async (status: 'uploading' | 'completed' | 'failed', details: {
    driveFileId?: string;
    driveWebViewLink?: string;
    driveFileName?: string;
    error?: string;
  } = {}) => {
    if (!jobId || !attemptId) return;
    try {
      // Same-origin API calls are authenticated by AppAuthGate's signed app session.
      const statusResponse = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, startedAt, status, ...details })
      });
      if (!statusResponse.ok) {
        const responseBody = await statusResponse.json().catch(() => null);
        const message = responseBody?.error || `Nie zapisano statusu eksportu (HTTP ${statusResponse.status}).`;
        if (status === 'uploading') throw new Error(message);
        console.warn(`[Supabase] ${message}`);
      }
    } catch (error) {
      if (status === 'uploading') throw error;
      console.warn('[Supabase] Nie udało się zgłosić statusu eksportu; przesyłanie do Drive będzie kontynuowane.', error);
    }
  };

  options.onProgress?.(10);
  await reportStatus('uploading');
  try {
    if (jobId) {
      const token = await getAccessToken();
      if (!token) throw new Error('Brak autoryzacji Google Drive. Zaloguj się ponownie.');
      const query = [
        `appProperties has { key='bankierShortJobId' and value='${jobId.replace(/'/g, "\\'")}' }`,
        'trashed = false'
      ].join(' and ');
      const searchUrl = new URL('https://www.googleapis.com/drive/v3/files');
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('pageSize', '10');
      searchUrl.searchParams.set('orderBy', 'createdTime');
      searchUrl.searchParams.set('fields', 'files(id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink,parents)');
      const searchResponse = await fetch(searchUrl.toString(), { headers: { Authorization: `Bearer ${token}` } });
      if (!searchResponse.ok) {
        const searchError = await searchResponse.json().catch(() => ({}));
        throw new Error(searchError.error?.message || `Nie udało się sprawdzić wcześniejszego eksportu Drive (${searchResponse.status}).`);
      }
      const searchData = await searchResponse.json() as { files?: DriveFileItem[] };
      const existing = searchData.files?.[0];
      if (existing) {
        await reportStatus('completed', {
          driveFileId: existing.id,
          driveWebViewLink: existing.webViewLink,
          driveFileName: existing.name
        });
        options.onProgress?.(100);
        return existing;
      }
    }

    // 1. Download video blob from local/server endpoint
    const response = await fetch(options.videoUrl);
    if (!response.ok) {
      throw new Error(`Nie udało się pobrać wyrenderowanego pliku wideo (${response.statusText})`);
    }

    options.onProgress?.(40);
    const blob = await response.blob();

    options.onProgress?.(70);
    // 2. Upload blob to Google Drive
    const result = await uploadFileToDrive({
      name: options.fileName.endsWith('.mp4') ? options.fileName : `${options.fileName}.mp4`,
      mimeType: 'video/mp4',
      content: blob,
      folderId: options.folderId,
      description: options.description || 'Gotowy film Short 9:16 wyrenderowany przez FFmpeg & AI Auto-Pilot',
      appProperties: jobId ? { bankierShortJobId: jobId } : undefined
    });

    options.onProgress?.(100);
    await reportStatus('completed', {
      driveFileId: result.id,
      driveWebViewLink: result.webViewLink,
      driveFileName: result.name
    });
    return result;
  } catch (error) {
    await reportStatus('failed', { error: (error as Error).message || 'Błąd eksportu do Google Drive.' });
    throw error;
  }
};

/**
 * Save AI Script & Subtitles as a text/markdown file to Google Drive
 */
export const saveScriptToDrive = async (options: {
  title: string;
  scriptContent: string;
  folderId?: string;
}): Promise<DriveFileItem> => {
  const fileName = `${options.title.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 45)}_scenariusz.txt`;
  return await uploadFileToDrive({
    name: fileName,
    mimeType: 'text/plain',
    content: options.scriptContent,
    folderId: options.folderId,
    description: 'Scenariusz wideo i transkrypcja z promptami dla lektora'
  });
};

/**
 * Delete a file from Google Drive (DESTRUCTIVE OPERATION)
 * Note: Must be invoked with user confirmation dialog in the UI!
 */
export const deleteDriveFile = async (fileId: string): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Brak autoryzacji Google Drive.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Nie udało się usunąć pliku z Dysku Google (${res.status})`);
  }
};
