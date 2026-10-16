import { auth } from './firebaseAuthService';

let installed = false;

export function installFirebaseApiFetch(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const rawUrl = typeof input === 'string' || input instanceof URL ? input.toString() : input.url;
    let url: URL;
    try {
      url = new URL(rawUrl, window.location.href);
    } catch {
      return nativeFetch(input, init);
    }

    const isSameOriginApi = url.origin === window.location.origin && (url.pathname === '/api' || url.pathname.startsWith('/api/'));
    if (!isSameOriginApi || !auth.currentUser) return nativeFetch(input, init);

    const idToken = await auth.currentUser.getIdToken();
    const inheritedHeaders = input instanceof Request ? input.headers : undefined;
    const headers = new Headers(init.headers || inheritedHeaders);
    headers.set('Authorization', `Bearer ${idToken}`);
    return nativeFetch(input, { ...init, headers });
  };
}
