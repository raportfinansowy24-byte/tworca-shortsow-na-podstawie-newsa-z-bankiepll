import React, { useEffect, useState } from 'react';
import { LoaderCircle, ShieldCheck, LogOut } from 'lucide-react';

const SESSION_KEY = 'shorts_app_session';

export const AppAuthGate: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem(SESSION_KEY);
    setAuthenticated(Boolean(token));
    // Attach the app session to same-origin API calls. This deliberately overrides
    // legacy Firebase ID tokens on backend calls without touching Google Drive OAuth requests.
    const originalFetch = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const isAppApiRequest = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
      if (!isAppApiRequest || url.includes('/api/auth/login')) {
        return originalFetch(input, init);
      }
      const session = sessionStorage.getItem(SESSION_KEY);
      if (!session) return originalFetch(input, init);
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      // Use the app session for our API even if a caller still supplies a Firebase token.
      headers.set('Authorization', `Bearer ${session}`);
      return originalFetch(input, { ...init, headers });
    }) as typeof window.fetch;
    return () => { window.fetch = originalFetch; };
  }, []);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token) throw new Error(data.error || 'Logowanie nie powiodło się.');
      sessionStorage.setItem(SESSION_KEY, data.token);
      setPassword('');
      setAuthenticated(true);
    } catch (cause) {
      setError((cause as Error)?.message || 'Nie udało się zalogować.');
    } finally {
      setBusy(false);
    }
  };

  if (authenticated) {
    return (
      <>
        <div className="fixed right-4 top-4 z-50">
          <button type="button" onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthenticated(false); }} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">
            <LogOut className="h-4 w-4" /> Wyloguj
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-300">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="text-center text-2xl font-bold">Raport Finansowy 24</h1>
        <p className="mt-3 text-center text-sm leading-6 text-slate-300">Prywatny panel Shorts. Zaloguj się hasłem skonfigurowanym w ustawieniach serwera.</p>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        <form onSubmit={handleSignIn} className="mt-6 space-y-4">
          <label htmlFor="app-password" className="block text-sm font-medium text-slate-200">Hasło dostępu</label>
          <input id="app-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400" placeholder="Wpisz hasło" />
          <button type="submit" disabled={busy || !password} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50">
            {busy && <LoaderCircle className="h-5 w-5 animate-spin" />}
            {busy ? 'Logowanie…' : 'Zaloguj się'}
          </button>
        </form>
      </section>
    </main>
  );
};
