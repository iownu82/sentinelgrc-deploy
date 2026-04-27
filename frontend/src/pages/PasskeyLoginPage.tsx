import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  startAuthentication,
  WebAuthnError,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import { api, ApiError } from '../lib/api';
import { hydrateSession } from '../lib/cognito';
import { decodeJwtPayload } from '../lib/jwt';
import { useAuth } from '../contexts/AuthContext';
import {
  AuthLayout,
  buttonPrimary,
  errorBlock,
  inputClass,
  labelClass,
} from '../components/AuthLayout';

export function PasskeyLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    '/';

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = browserSupportsWebAuthn();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Discoverable-credential flow: email is optional.
      const optionsJSON = await api.passkeyLoginOptions(email.trim());
      const { challengeId, expiresIn: _expiresIn, ...webauthnOptions } = optionsJSON;
      const authResp = await startAuthentication({
        optionsJSON: webauthnOptions,
      });
      const tokens = await api.passkeyLoginVerify(challengeId, authResp);

      const claimedEmail =
        tokens.email ??
        decodeJwtPayload<{ email?: string }>(tokens.idToken)?.email ??
        email.trim();
      if (!claimedEmail) {
        throw new Error('Server did not return an identity claim.');
      }

      hydrateSession(claimedEmail, {
        idToken: tokens.idToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      await refresh();
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof WebAuthnError) {
        setError(`${err.name}: ${err.message}`);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Passkey sign-in failed.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in with a passkey"
      subtitle="Use a registered authenticator on this device."
      footer={
        <Link
          to="/login"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-900"
        >
          ← Use password instead
        </Link>
      }
    >
      {!supported && (
        <div className={errorBlock}>
          This browser does not support WebAuthn.
        </div>
      )}
      {error && <div className={errorBlock}>{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username webauthn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>
        <button
          type="submit"
          disabled={!supported || submitting}
          className={buttonPrimary}
        >
          {submitting ? 'Waiting for authenticator…' : 'Continue with passkey'}
        </button>
      </form>
    </AuthLayout>
  );
}
