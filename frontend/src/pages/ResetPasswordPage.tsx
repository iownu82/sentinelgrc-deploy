import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { confirmForgotPassword } from '../lib/cognito';
import {
  AuthLayout,
  buttonPrimary,
  errorBlock,
  inputClass,
  labelClass,
} from '../components/AuthLayout';

interface LocationState {
  email?: string;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state as LocationState | null)?.email ?? '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await confirmForgotPassword(email.trim(), code.trim(), newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <AuthLayout
        title="Password reset"
        subtitle="You can now sign in with your new password."
      >
        <button
          type="button"
          onClick={() => navigate('/login')}
          className={buttonPrimary}
        >
          Continue to sign in
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Enter reset code"
      subtitle="Check your email for a verification code, then choose a new password."
      footer={
        <Link
          to="/login"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-900"
        >
          ← Back to sign in
        </Link>
      }
    >
      {error && <div className={errorBlock}>{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        {!initialEmail && (
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label htmlFor="code" className={labelClass}>
            Verification code
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`${inputClass} font-mono tracking-[0.3em]`}
          />
        </div>
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
          {submitting ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </AuthLayout>
  );
}
