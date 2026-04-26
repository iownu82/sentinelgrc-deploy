import {
  AuthenticationDetails,
  CognitoAccessToken,
  CognitoIdToken,
  CognitoRefreshToken,
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

const USER_POOL_ID =
  import.meta.env.VITE_COGNITO_USER_POOL_ID ?? 'us-gov-west-1_0VaQnbcFH';
const CLIENT_ID =
  import.meta.env.VITE_COGNITO_CLIENT_ID ?? 'anrf7jlfgfevp7c6esu705p7k';

export const userPool = new CognitoUserPool({
  UserPoolId: USER_POOL_ID,
  ClientId: CLIENT_ID,
});

export type SignInResult =
  | { status: 'success'; session: CognitoUserSession; user: CognitoUser }
  | { status: 'mfa-required'; user: CognitoUser; challengeName: string }
  | { status: 'mfa-setup-required'; user: CognitoUser }
  | {
      status: 'new-password-required';
      user: CognitoUser;
      userAttributes: Record<string, string>;
    };

export function getCurrentUser(): CognitoUser | null {
  return userPool.getCurrentUser();
}

export function getCurrentSession(): Promise<CognitoUserSession | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) return resolve(null);
      resolve(session);
    });
  });
}

/**
 * SRP sign-in. Mirrors the canonical amazon-cognito-identity-js USER_SRP_AUTH
 * flow used in tests/srp-login-test/srp-login-test.js. Returns a discriminated
 * result so the UI layer can branch on MFA / new-password / setup challenges.
 */
export function signIn(email: string, password: string): Promise<SignInResult> {
  const user = new CognitoUser({ Username: email, Pool: userPool });
  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });

  return new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (session) => resolve({ status: 'success', session, user }),
      onFailure: (err) => reject(err),
      totpRequired: (challengeName) =>
        resolve({ status: 'mfa-required', user, challengeName }),
      mfaSetup: () => resolve({ status: 'mfa-setup-required', user }),
      newPasswordRequired: (userAttributes) => {
        // Cognito rejects these on submit:
        delete userAttributes.email_verified;
        delete userAttributes.email;
        delete userAttributes.phone_number_verified;
        resolve({ status: 'new-password-required', user, userAttributes });
      },
    });
  });
}

export function submitMfaCode(
  user: CognitoUser,
  code: string,
): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    user.sendMFACode(
      code,
      {
        onSuccess: (session) => resolve(session),
        onFailure: (err) => reject(err),
      },
      'SOFTWARE_TOKEN_MFA',
    );
  });
}

export function completeNewPasswordChallenge(
  user: CognitoUser,
  newPassword: string,
  attrs: Record<string, string>,
): Promise<SignInResult> {
  return new Promise((resolve, reject) => {
    user.completeNewPasswordChallenge(newPassword, attrs, {
      onSuccess: (session) => resolve({ status: 'success', session, user }),
      onFailure: (err) => reject(err),
      totpRequired: (challengeName) =>
        resolve({ status: 'mfa-required', user, challengeName }),
      mfaSetup: () => resolve({ status: 'mfa-setup-required', user }),
    });
  });
}

export function associateSoftwareToken(user: CognitoUser): Promise<string> {
  return new Promise((resolve, reject) => {
    user.associateSoftwareToken({
      associateSecretCode: (secret) => resolve(secret),
      onFailure: (err) => reject(err),
    });
  });
}

export function verifySoftwareToken(
  user: CognitoUser,
  code: string,
  deviceName = 'BIS3 Authenticator',
): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    user.verifySoftwareToken(code, deviceName, {
      onSuccess: (session) => resolve(session),
      onFailure: (err) => reject(err),
    });
  });
}

export function setSoftwareTokenAsPreferredMfa(
  user: CognitoUser,
): Promise<void> {
  return new Promise((resolve, reject) => {
    user.setUserMfaPreference(
      null,
      { PreferredMfa: true, Enabled: true },
      (err) => (err ? reject(err) : resolve()),
    );
  });
}

export function forgotPassword(email: string): Promise<{ medium?: string }> {
  const user = new CognitoUser({ Username: email, Pool: userPool });
  return new Promise((resolve, reject) => {
    user.forgotPassword({
      onSuccess: () => resolve({}),
      onFailure: (err) => reject(err),
      inputVerificationCode: (data) =>
        resolve({ medium: data?.CodeDeliveryDetails?.DeliveryMedium }),
    });
  });
}

export function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  const user = new CognitoUser({ Username: email, Pool: userPool });
  return new Promise((resolve, reject) => {
    user.confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}

export function signOut(): void {
  const user = userPool.getCurrentUser();
  if (user) user.signOut();
}

/**
 * Hydrate a Cognito session from raw JWTs (used by the passkey login flow,
 * which receives Cognito-format tokens from the backend after WebAuthn verify).
 */
export function hydrateSession(
  email: string,
  tokens: { idToken: string; accessToken: string; refreshToken: string },
): CognitoUserSession {
  const user = new CognitoUser({ Username: email, Pool: userPool });
  const session = new CognitoUserSession({
    IdToken: new CognitoIdToken({ IdToken: tokens.idToken }),
    AccessToken: new CognitoAccessToken({ AccessToken: tokens.accessToken }),
    RefreshToken: new CognitoRefreshToken({ RefreshToken: tokens.refreshToken }),
  });
  user.setSignInUserSession(session);
  return session;
}

export async function getIdToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.getIdToken().getJwtToken() ?? null;
}
