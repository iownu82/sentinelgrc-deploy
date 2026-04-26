import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { CognitoUser } from 'amazon-cognito-identity-js';
import {
  signIn,
  submitMfaCode,
  completeNewPasswordChallenge,
  type SignInResult,
} from '../lib/cognito';
import { useAuth } from '../contexts/AuthContext';
import {
  AuthLayout,
  buttonPrimary,
  errorBlock,
  inputClass,
  labelClass,
} from '../components/AuthLayout';
import { MfaSetupForm } from '../components/MfaSetupForm';

type Stage = 'credentials' | 'mfa' | 'newPassword' | 'mfaSetup';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
    '/';

  const [stage, setStage] = useState<Stage>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingUser, setPendingUser] = useState<CognitoUser | null>(null);
  const [pendingAttrs, setPendingAttrs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyResult(result: SignInResult) {
    if (result.status === 'success') {
      refresh().then(() => navigate(from, { replace: true }));
      return;
    }
    setPendingUser(result.user);
    if (result.status === 'mfa-required') setStage('mfa');
    else if (result.status === 'mfa-setup-required') setStage('mfaSetup');
    else if (result.status === 'new-password-required') {
      setPendingAttrs(result.userAttributes);
      setStage('newPassword');
    }
  }

  async function handleCredentials(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn(email.trim(), password);
      applyResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfa(e: FormEvent) {
    e.preventDefault();
    if (!pendingUser) return;
    setError(null);
    setSubmitting(true);
    try {
      await submitMfaCode(pendingUser, mfaCode.trim());
      await refresh();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNewPassword(e: FormEvent) {
    e.preventDefault();
    if (!pendingUser) return;
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await completeNewPasswordChallenge(
        pendingUser,
        newPassword,
        pendingAttrs,
      );
      applyResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set password');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSetupComplete() {
    await refresh();
    navigate(from, { replace: true });
  }

  if (stage === 'mfa' && pendingUser) {
    return (
      <AuthLayout
        title="Enter verification code"
        subtitle={`Code from your authenticator app for ${email}.`}
        footer={
          <button
            type="button"
            onClick={() => {
              setStage('credentials');
              setMfaCode('');
              setError(null);
            }}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-900"
          >
            ← Use a different account
          </button>
        }
      >
        {error && <div className={errorBlock}>{error}</div>}
        <form onSubmit={handleMfa} className="space-y-5">
          <div>
            <label htmlFor="mfa" className={labelClass}>
              6-digit code
            </label>
            <input
              id="mfa"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className={`${inputClass} font-mono tracking-[0.4em]`}
            />
          </div>
          <button
            type="submit"
            disabled={submitting || mfaCode.length !== 6}
            className={buttonPrimary}
          >
            {submitting ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      </AuthLayout>
    );
  }

  if (stage === 'newPassword' && pendingUser) {
    return (
      <AuthLayout
        title="Set a new password"
        subtitle="Your account requires a password change before continuing."
      >
        {error && <div className={errorBlock}>{error}</div>}
        <form onSubmit={handleNewPassword} className="space-y-5">
          <div>
            <label htmlFor="np" className={labelClass}>
              New password
            </label>
            <input
              id="np"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="cp" className={labelClass}>
              Confirm password
            </label>
            <input
              id="cp"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={submitting} className={buttonPrimary}>
            {submitting ? 'Setting password…' : 'Set password and continue'}
          </button>
        </form>
      </AuthLayout>
    );
  }

  if (stage === 'mfaSetup' && pendingUser) {
    return (
      <AuthLayout
        title="Enroll an authenticator"
        subtitle="Multi-factor authentication is required on this account before sign-in can complete."
      >
        <MfaSetupForm
          user={pendingUser}
          email={email}
          onSuccess={handleMfaSetupComplete}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="BIS3 Defense compliance platform — staging environment."
      footer={
        <div className="flex flex-col gap-3">
          <Link
            to="/passkey-login"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-700 hover:text-neutral-900"
          >
            Sign in with a passkey →
          </Link>
          <Link
            to="/forgot-password"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-900"
          >
            Forgot password
          </Link>
        </div>
      }
    >
      {error && <div className={errorBlock}>{error}</div>}
      <form onSubmit={handleCredentials} className="space-y-5">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <button type="submit" disabled={submitting} className={buttonPrimary}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
