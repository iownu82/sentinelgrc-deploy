import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  startRegistration,
  WebAuthnError,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  AuthLayout,
  buttonPrimary,
  buttonSecondary,
  errorBlock,
} from '../components/AuthLayout';

export function PasskeyRegisterPage() {
  const navigate = useNavigate();
  const { email } = useAuth();
  const [status, setStatus] = useState<
    'idle' | 'running' | 'success' | 'error'
  >('idle');
  const [error, setError] = useState<string | null>(null);

  const supported = browserSupportsWebAuthn();

  async function register() {
    setError(null);
    setStatus('running');
    try {
      const optionsJSON = await api.passkeyRegisterOptions();
      const attResp = await startRegistration({ optionsJSON });
      const verification = await api.passkeyRegisterVerify(attResp);
      if (verification.verified) {
        setStatus('success');
      } else {
        setStatus('error');
        setError('Registration was not verified by the server.');
      }
    } catch (err) {
      setStatus('error');
      if (err instanceof WebAuthnError) {
        setError(`${err.name}: ${err.message}`);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Passkey registration failed.');
      }
    }
  }

  if (status === 'success') {
    return (
      <AuthLayout
        title="Passkey registered"
        subtitle="You can now sign in from this device without a password or MFA code."
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className={buttonPrimary}
        >
          Back to dashboard
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Register a passkey"
      subtitle={`Bind a hardware-backed credential to ${email ?? 'your account'} for phishing-resistant sign-in.`}
      footer={
        <button
          type="button"
          onClick={() => navigate('/')}
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-900"
        >
          ← Back to dashboard
        </button>
      }
    >
      {!supported && (
        <div className={errorBlock}>
          This browser does not support WebAuthn. Use a current build of Chrome,
          Edge, Safari, or Firefox.
        </div>
      )}
      {error && <div className={errorBlock}>{error}</div>}

      <div className="mb-6 space-y-3 border border-neutral-200 bg-white p-5 text-sm leading-relaxed text-neutral-700">
        <p>
          Your browser will prompt you to choose where to store the passkey —
          a built-in platform authenticator (Touch ID, Windows Hello),
          a hardware key (YubiKey), or a synced credential manager.
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          NIST 800-63B AAL2 / AAL3 capable depending on authenticator
        </p>
      </div>

      <button
        type="button"
        onClick={register}
        disabled={!supported || status === 'running'}
        className={buttonPrimary}
      >
        {status === 'running' ? 'Waiting for authenticator…' : 'Register passkey'}
      </button>

      {status === 'error' && (
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className={`${buttonSecondary} mt-3`}
        >
          Try again
        </button>
      )}
    </AuthLayout>
  );
}
