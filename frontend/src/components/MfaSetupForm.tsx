import { useEffect, useState, type FormEvent } from 'react';
import type { CognitoUser } from 'amazon-cognito-identity-js';
import { QRCodeSVG } from 'qrcode.react';
import {
  associateSoftwareToken,
  setSoftwareTokenAsPreferredMfa,
  verifySoftwareToken,
} from '../lib/cognito';
import {
  buttonPrimary,
  errorBlock,
  inputClass,
  labelClass,
} from './AuthLayout';

interface MfaSetupFormProps {
  user: CognitoUser;
  email: string;
  onSuccess: () => void;
  issuer?: string;
}

export function MfaSetupForm({
  user,
  email,
  onSuccess,
  issuer = 'BIS3 Defense',
}: MfaSetupFormProps) {
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    associateSoftwareToken(user)
      .then((s) => {
        if (!cancelled) setSecret(s);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not start MFA enrollment',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const otpauthUri = secret
    ? `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
        email,
      )}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
    : null;

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifySoftwareToken(user, code.trim());
      await setSoftwareTokenAsPreferredMfa(user);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
        Generating secret…
      </div>
    );
  }

  if (error && !secret) {
    return <div className={errorBlock}>{error}</div>;
  }

  return (
    <div className="space-y-6">
      <ol className="space-y-3 text-sm leading-relaxed text-neutral-700">
        <li>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            01 ·
          </span>{' '}
          Open an authenticator app (Google Authenticator, Authy, 1Password,
          Microsoft Authenticator).
        </li>
        <li>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            02 ·
          </span>{' '}
          Scan the QR code below, or enter the secret manually.
        </li>
        <li>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            03 ·
          </span>{' '}
          Enter the 6-digit code from your app to confirm.
        </li>
      </ol>

      {otpauthUri && (
        <div className="flex flex-col items-center gap-4 border border-neutral-200 bg-white p-6">
          <QRCodeSVG value={otpauthUri} size={184} level="M" includeMargin={false} />
          <button
            type="button"
            onClick={() => setShowSecret((s) => !s)}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
          >
            {showSecret ? 'Hide secret' : 'Show secret'}
          </button>
          {showSecret && secret && (
            <code className="break-all rounded-none border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-800">
              {secret}
            </code>
          )}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        {error && <div className={errorBlock}>{error}</div>}
        <div>
          <label htmlFor="mfa-code" className={labelClass}>
            Verification code
          </label>
          <input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className={`${inputClass} font-mono tracking-[0.4em]`}
          />
        </div>
        <button
          type="submit"
          disabled={submitting || code.length !== 6}
          className={buttonPrimary}
        >
          {submitting ? 'Verifying…' : 'Verify and enable MFA'}
        </button>
      </form>
    </div>
  );
}
