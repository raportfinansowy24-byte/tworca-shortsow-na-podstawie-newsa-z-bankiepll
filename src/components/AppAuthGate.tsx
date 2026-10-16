import React, { useEffect, useState } from 'react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { observeFirebaseUser, signInWithGoogleForApp, signOutFromApp, type User } from '../services/firebaseAuthService';

const ALLOWED_EMAIL = 'raportfinansowy24@gmail.com';

export const AppAuthGate: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => observeFirebaseUser(
    (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    },
    () => {
      setUser(null);
      setAuthReady(true);
      setError('Nie udało się połączyć z Firebase Authentication.');
    }
  ), []);

  const handleSignIn = async () => {
    setBusy(true);
    setError('');
    try {
      await signInWithGoogleForApp();
    } catch (cause) {
      setError((cause as Error)?.message || 'Logowanie Google nie powiodło się.');
    } finally {
      setBusy(false);
    }
  };

  const handleSwitchAccount = async () => {
    setBusy(true);
    setError('');
    try {
      await signOutFromApp();
    } catch (cause) {
      setError((cause as Error)?.message || 'Nie udało się wylogować.');
    } finally {
      setBusy(false);
    }
  };

  if (!authReady) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-slate-300" role="status">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span>Sprawdzam logowanie…</span>
        </div>
      </main>
    );
  }

  const email = user?.email?.trim().toLowerCase();
  const isAuthorized = email === ALLOWED_EMAIL.toLowerCase();

  if (!user || !isAuthorized) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-300">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-center text-2xl font-bold">Raport Finansowy 24</h1>
          <p className="mt-3 text-center text-sm leading-6 text-slate-300">
            Dostęp do aplikacji jest ograniczony do konta <strong className="text-white">{ALLOWED_EMAIL}</strong>.
            Logowanie służy wyłącznie do potwierdzenia tożsamości i nie prosi o dodatkowe uprawnienia do Google Drive.
          </p>
          {error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          {user && !isAuthorized ? (
            <div className="mt-5 space-y-3">
              <p className="text-center text-sm text-amber-200">Zalogowane konto: {user.email || 'brak adresu e-mail'} — nie ma dostępu.</p>
              <button type="button" onClick={handleSwitchAccount} disabled={busy} className="w-full rounded-xl border border-slate-700 px-4 py-3 font-semibold hover:bg-slate-800 disabled:opacity-50">
                {busy ? 'Wylogowywanie…' : 'Wyloguj i wybierz inne konto'}
              </button>
            </div>
          ) : (
            <button type="button" onClick={handleSignIn} disabled={busy} className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50">
              {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <span className="text-lg font-bold">G</span>}
              {busy ? 'Logowanie…' : 'Zaloguj się przez Google'}
            </button>
          )}
        </section>
      </main>
    );
  }

  return <>{children}</>;
};
