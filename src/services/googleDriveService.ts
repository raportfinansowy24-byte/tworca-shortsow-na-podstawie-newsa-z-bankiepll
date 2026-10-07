import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize or reuse Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// All Google Drive scopes configured for this application
export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts'
];

const provider = new GoogleAuthProvider();
// Attach all Drive scopes
SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'select_account'
});

// Flag to track sign-in status
let isSigningIn = false;
// Strictly in-memory token cache (never stored in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;

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

// Initialize authentication listener on app load
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If user is logged in to Firebase but token is missing from memory,
        // trigger sign-in or prompt user
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Nie udało się uzyskać tokenu dostępu Google Drive z logowania.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('[Google Drive Auth] Błąd logowania:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogleDrive = async () => {
  await signOut(auth);
  cachedAccessToken = null;
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
export const getOrCreateAppFolder = async (folderName = 'Raport Finansowy 24 - Shorts'): Promise<string> => {
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
 * Upload a File (Blob or text content) directly to Google Drive via multipart upload
 */
export const uploadFileToDrive = async (options: {
  name: string;
  mimeType: string;
  content: Blob | string;
  folderId?: string;
  description?: string;
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
  description?: string;
  onProgress?: (percent: number) => void;
}): Promise<DriveFileItem> => {
  options.onProgress?.(10);
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
    description: options.description || 'Gotowy film Short 9:16 wyrenderowany przez FFmpeg & AI Auto-Pilot'
  });

  options.onProgress?.(100);
  return result;
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
