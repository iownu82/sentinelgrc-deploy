import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, type MeResponse } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function DashboardPage() {
  const navigate = useNavigate();
  const { signOut, email } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else if (err instanceof Error) setError(err.message);
        else setError('Failed to load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1 w-6 bg-neutral-900" aria-hidden />
            <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-neutral-700">
              BIS3 Defense
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 sm:inline">
              {email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-12">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-neutral-500">
            Staging environment
          </div>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight">
            Welcome back.
          </h1>
        </div>

        <section className="grid gap-8 lg:grid-cols-3">
          <div className="border border-neutral-200 bg-white p-6 lg:col-span-2">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              Identity claims · /auth/me
            </h2>
            <div className="mt-5">
              {loading && (
                <div className="font-mono text-xs text-neutral-500">
                  Loading…
                </div>
              )}
              {error && (
                <div className="border-l-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-900">
                  {error}
                </div>
              )}
              {me && (
                <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                  {Object.entries(me).map(([key, value]) => (
                    <div key={key} className="border-t border-neutral-100 pt-3 first:border-t-0 first:pt-0 sm:border-t-0 sm:pt-0">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                        {key}
                      </dt>
                      <dd className="mt-1 break-all font-mono text-xs text-neutral-900">
                        {Array.isArray(value)
                          ? value.join(', ') || '—'
                          : typeof value === 'object' && value !== null
                            ? JSON.stringify(value)
                            : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              Security
            </h2>
            <button
              type="button"
              onClick={() => navigate('/passkey-register')}
              className="block w-full border border-neutral-900 bg-white px-5 py-4 text-left text-sm transition hover:bg-neutral-100"
            >
              <div className="font-medium text-neutral-900">Register a passkey</div>
              <div className="mt-1 text-xs text-neutral-600">
                Phishing-resistant sign-in via WebAuthn
              </div>
            </button>
            <button
              type="button"
              onClick={() => navigate('/mfa-setup')}
              className="block w-full border border-neutral-200 bg-white px-5 py-4 text-left text-sm transition hover:bg-neutral-100"
            >
              <div className="font-medium text-neutral-900">Set up MFA</div>
              <div className="mt-1 text-xs text-neutral-600">
                TOTP authenticator app enrollment
              </div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
