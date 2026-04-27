import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';
import { getIdToken } from './cognito';

const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'https://api.staging.app.bis3ai.com';

export class ApiError extends Error {
  status: number;
  body?: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface FetchOptions {
  auth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  { auth = true }: FetchOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (auth) {
    const token = await getIdToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message?: unknown }).message)
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message, body);
  }
  return body as T;
}

export interface MeResponse {
  sub: string;
  email: string;
  email_verified?: boolean;
  groups?: string[];
  [key: string]: unknown;
}

export interface PasskeyTokenResponse {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  email: string;
}

export const api = {
  me: () => apiFetch<MeResponse>('/auth/me'),

  passkeyRegisterOptions: () =>
    apiFetch<PublicKeyCredentialCreationOptionsJSON & { challengeId: string; expiresIn: number }>(
      '/auth/passkey/register-options',
      { method: 'POST', body: '{}' },
    ),

  passkeyRegisterVerify: (
    challengeId: string,
    response: RegistrationResponseJSON,
    friendlyName?: string,
  ) =>
    apiFetch<{ status?: string; verified?: boolean; credential_id?: string }>(
      '/auth/passkey/register-verify',
      {
        method: 'POST',
        body: JSON.stringify({
          challengeId,
          credential: response,
          friendlyName: friendlyName ?? 'Passkey',
        }),
      },
    ),

  passkeyLoginOptions: (email?: string) =>
    apiFetch<PublicKeyCredentialRequestOptionsJSON & { challengeId: string; expiresIn: number }>(
      '/auth/passkey/auth-options',
      {
        method: 'POST',
        body: JSON.stringify(email ? { email } : {}),
      },
      { auth: false },
    ),

  passkeyLoginVerify: (
    challengeId: string,
    response: AuthenticationResponseJSON,
  ) =>
    apiFetch<PasskeyTokenResponse>(
      '/auth/passkey/auth-verify',
      {
        method: 'POST',
        body: JSON.stringify({ challengeId, credential: response }),
      },
      { auth: false },
    ),
};
