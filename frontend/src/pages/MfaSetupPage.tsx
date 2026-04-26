import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { CognitoUser } from 'amazon-cognito-identity-js';
import { getCurrentUser, getCurrentSession } from '../lib/cognito';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout, buttonSecondary } from '../components/AuthLayout';
import { MfaSetupForm } from '../components/MfaSetupForm';

export function MfaSetupPage() {
  const navigate = useNavigate();
  const { email, refresh } = useAuth();
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // getCurrentUser returns a CognitoUser, but we need its session populated
    // before associateSoftwareToken will work. getCurrentSession() does that.
    let cancelled = false;
    getCurrentSession().then(() => {
      if (cancelled) return;
      setUser(getCurrentUser());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (done) {
    return (
      <AuthLayout
        title="MFA enabled"
        subtitle="Your authenticator app is now active. You'll be prompted on next sign-in."
      >
        <button
          type="button"
          onClick={() => {
            refresh();
            navigate('/');
          }}
          className={buttonSecondary}
        >
          Back to dashboard
        </button>
      </AuthLayout>
    );
  }

  if (!user || !email) {
    return (
      <AuthLayout title="Set up MFA">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">
          Loading session…
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set up MFA"
      subtitle={`Add an authenticator app for ${email}.`}
      footer={
        <button
          type="button"
          onClick={() => navigate('/')}
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-900"
        >
          ← Cancel
        </button>
      }
    >
      <MfaSetupForm user={user} email={email} onSuccess={() => setDone(true)} />
    </AuthLayout>
  );
}
