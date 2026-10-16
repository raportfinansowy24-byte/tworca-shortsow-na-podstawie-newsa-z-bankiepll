import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, type User } from 'firebase/auth';
import { auth, logoutGoogleDrive } from './googleDriveService';

const appLoginProvider = new GoogleAuthProvider();
appLoginProvider.setCustomParameters({ prompt: 'select_account' });

export { auth };
export type { User };

export function observeFirebaseUser(callback: (user: User | null) => void, onError?: (error: Error) => void) {
  return onAuthStateChanged(auth, callback, onError);
}

/** Signs in only for Firebase identity; it does not request Drive or other Google API scopes. */
export async function signInWithGoogleForApp(): Promise<User> {
  const result = await signInWithPopup(auth, appLoginProvider);
  return result.user;
}

export async function signOutFromApp(): Promise<void> {
  await logoutGoogleDrive();
}
