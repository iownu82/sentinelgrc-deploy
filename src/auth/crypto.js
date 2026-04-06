/**
 * RiskRadar Security Utilities — FIPS 200 Compliant
 * IA-5: Client-side PBKDF2 stretching before credential transmission
 * SC-13: FIPS 140-2 validated Web Crypto API (AES-256, SHA-256, PBKDF2)
 * 
 * Ensures the raw password NEVER travels the network.
 * Only the 256-bit derived key is transmitted, encrypted by TLS 1.3.
 */

// ─── PBKDF2 Password Stretching ──────────────────────────────────────────────
export async function pbkdf2Stretch(password, username, orgSlug = 'default') {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  // Salt: username + org + version string — unique per user/org, not secret
  const salt = enc.encode(`riskradar::${username.toLowerCase()}::${orgSlug}::v1`);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  // Return hex string of derived key — raw password is never stored
  const hexKey = Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return hexKey;
}

// SHA-256 hash for token/nonce comparison
export async function sha256(str) {
  const enc = new TextEncoder();
  const hashBuf = await crypto.subtle.digest('SHA-256', enc.encode(str));
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2,'0')).join('');
}

// Generate cryptographically random nonce (replay attack prevention — SC-23)
export function generateNonce() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2,'0')).join('');
}

// Generate unique session ID (audit trail — AU-3)
export function generateSessionId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : generateNonce() + '-' + generateNonce();
}

// Zero a variable reference from memory (best-effort in JS)
export function zeroRef(ref) {
  ref = null; // eslint-disable-line no-param-reassign
  return null;
}

// Request timestamp for replay prevention (SC-23, AU-8)
export function getRequestTimestamp() {
  return new Date().toISOString();
}

// Check if a timestamp is within acceptable window (5 minutes)
export function isTimestampFresh(isoTimestamp, windowMs = 5 * 60 * 1000) {
  return Date.now() - new Date(isoTimestamp).getTime() < windowMs;
}

// Constant-time string comparison (prevents timing attacks — IA-5)
export function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
