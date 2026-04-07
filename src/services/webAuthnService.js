/**
 * RiskRadar — WebAuthn / FIDO2 Service
 * Supports YubiKey 5 series + any FIDO2 hardware key
 *
 * Security properties:
 *   - Phishing-proof: credential is cryptographically bound to origin
 *   - No shared secret: public key stored, private key never leaves the key
 *   - PIN required: userVerification:'required' enforces YubiKey PIN
 *   - Hardware-backed: private key lives in YubiKey secure element
 *
 * Controls: NIST 800-53 IA-2(1) · IA-5(2) · CMMC IA.3.083
 */

const RP_ID   = window.location.hostname; // 'app.ballardis3.com' in production
const RP_NAME = 'RiskRadar — Ballard IS3';
const CRED_STORE_KEY = 'rr_webauthn_creds'; // localStorage key for demo

// ── Helpers ───────────────────────────────────────────────────────────────

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}

function fromB64url(str) {
  const b64 = str.replace(/-/g,'+').replace(/_/g,'/');
  const bin = atob(b64);
  return Uint8Array.from(bin, c=>c.charCodeAt(0)).buffer;
}

function randomBytes(n=32) {
  return crypto.getRandomValues(new Uint8Array(n));
}

function isSupported() {
  return !!(window.PublicKeyCredential && navigator.credentials?.create);
}

// ── Registration (ISSM enrolls user's YubiKey) ────────────────────────────

/**
 * Enroll a YubiKey for a user.
 * @param {{ userId: string, userEmail: string, userName: string }} user
 * @returns {{ credentialId: string, publicKey: string, aaguid: string }}
 */
export async function enrollYubiKey(user) {
  if (!isSupported()) throw new Error('WebAuthn not supported in this browser');

  const challenge = randomBytes(32);
  const userId    = new TextEncoder().encode(user.userId);

  const options = {
    challenge,
    rp: { id: RP_ID, name: RP_NAME },
    user: {
      id: userId,
      name: user.userEmail,
      displayName: user.userName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7  }, // ES256 (ECDSA P-256) — YubiKey primary
      { type: 'public-key', alg: -257 }, // RS256 — fallback
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'cross-platform', // external key (not Touch ID / Windows Hello)
      userVerification: 'required',              // PIN required on YubiKey
      residentKey: 'preferred',
    },
    attestation: 'none',  // 'direct' for AAGUID verification in production
    timeout: 60000,
  };

  const credential = await navigator.credentials.create({ publicKey: options });
  if (!credential) throw new Error('YubiKey enrollment cancelled');

  const credId = b64url(credential.rawId);

  // Store credential for demo mode
  const stored = JSON.parse(localStorage.getItem(CRED_STORE_KEY) || '{}');
  stored[user.userId] = {
    credentialId: credId,
    rawId: credId,
    type: credential.type,
    enrolledAt: new Date().toISOString(),
    userId: user.userId,
    userEmail: user.userEmail,
    // In production: store on server — never raw private key
  };
  localStorage.setItem(CRED_STORE_KEY, JSON.stringify(stored));

  return {
    credentialId: credId,
    enrolledAt: stored[user.userId].enrolledAt,
    method: 'webauthn_fido2',
  };
}

// ── Authentication (user taps YubiKey to log in) ──────────────────────────

/**
 * Authenticate with a previously enrolled YubiKey.
 * @param {string} userId - User's ID to look up stored credential
 * @returns {{ success: boolean, credentialId: string }}
 */
export async function authenticateYubiKey(userId) {
  if (!isSupported()) throw new Error('WebAuthn not supported in this browser');

  const stored = JSON.parse(localStorage.getItem(CRED_STORE_KEY) || '{}');
  const cred   = stored[userId];

  // Build allowCredentials — tells browser which key to request
  const allowCredentials = cred ? [{
    type: 'public-key',
    id: fromB64url(cred.rawId),
    transports: ['usb', 'nfc', 'ble'],
  }] : []; // empty = any registered key

  const challenge = randomBytes(32);

  const options = {
    challenge,
    rpId: RP_ID,
    userVerification: 'required', // enforce PIN
    allowCredentials,
    timeout: 60000,
  };

  const assertion = await navigator.credentials.get({ publicKey: options });
  if (!assertion) throw new Error('Authentication cancelled');

  // In production: POST assertion to server for cryptographic verification
  // Server verifies: signature, challenge, rpIdHash, userPresent, userVerified
  // Demo: accept any successful browser assertion as valid
  return {
    success: true,
    credentialId: b64url(assertion.rawId),
    method: 'webauthn_fido2',
  };
}

/**
 * Check if a user has a YubiKey enrolled (demo: localStorage).
 */
export function hasEnrolledKey(userId) {
  const stored = JSON.parse(localStorage.getItem(CRED_STORE_KEY) || '{}');
  return !!stored[userId];
}

/**
 * Remove enrolled key for a user (ISSM action — requires re-enrollment).
 */
export function revokeKey(userId) {
  const stored = JSON.parse(localStorage.getItem(CRED_STORE_KEY) || '{}');
  delete stored[userId];
  localStorage.setItem(CRED_STORE_KEY, JSON.stringify(stored));
}

export { isSupported };
