import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../lib/cognito';
import {
  AuthLayout,
  buttonPrimary,
  errorBlock,
  inputClass,
  labelClass,
} from '../components/AuthLayout';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      navigate('/reset-password', { state: { email: email.trim() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start reset');
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We'll send a verification code to your email."
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
        <button type="submit" disabled={submitting} className={buttonPrimary}>
          {submitting ? 'Sending code…' : 'Send code'}
        </button>
      </form>
    </AuthLayout>
  );
}
