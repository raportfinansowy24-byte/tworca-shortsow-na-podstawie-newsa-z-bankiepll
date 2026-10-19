import React, { useState } from 'react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';

const SESSION_KEY = 'rf24_app_access_token';

export const AppAuthGate: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    sessionStorage.setItem(SESSION_KEY, password);
    try {
      const response = await fetch('/api/auth/check', { headers: { Authorization: `Bearer ${password}` } });
      if (!response.ok) throw new Error(response.status === 401 ? 'Nieprawidłowe hasło.' : 'Nie udało się sprawdzić dostępu. Spróbuj ponownie.');
      setAuthenticated(true);
      setPassword('');
    } catch (cause) {
      sessionStorage.removeItem(SESSION_KEY);
      setError((cause as Error)?.message || 'Logowanie nie powiodło się.');
    } finally {
      setBusy(false);
    }
  };

  if (authenticated) return <>{children}</>;

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-300">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="text-center text-2xl font-bold">Raport Finansowy 24</h1>
        <p className="mt-3 text-center text-sm leading-6 text-slate-300">Wpisz hasło dostępu do aplikacji.</p>
        <form onSubmit={handleSignIn} className="mt-6 space-y-4">
          <input autoFocus type="password" autoComplete="current-password" value={password}
            onChange={(event) => setPassword(event.target.value)} placeholder="Hasło dostępu" required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400" />
          {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          <button type="submit" disabled={busy || !password} className="flex w-full items-center justify-center gap-3 rounded-xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50">
            {busy && <LoaderCircle className="h-5 w-5 animate-spin" />}
            {busy ? 'Sprawdzam…' : 'Wejdź do aplikacji'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">Sesja kończy się po zamknięciu karty przeglądarki.</p>
      </section>
    </main>
  );
};
