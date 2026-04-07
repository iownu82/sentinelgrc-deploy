/**
 * RiskRadar — RSA SecurID Service
 * Abstraction for RSA ID Plus Cloud Authentication Service.
 * Demo mode: accepts '000000' as valid. Production: RSA Cloud REST API.
 *
 * Activation: set VITE_RSA_API_URL + VITE_RSA_API_KEY in Vercel env vars
 * No code changes needed — service auto-detects configuration.
 *
 * Note: YubiKey/FIDO2 is the preferred MFA for RiskRadar. RSA SecurID
 * is supported for programs that have existing RSA infrastructure or
 * users who cannot use hardware FIDO2 keys.
 *
 * Controls: NIST 800-53 IA-2 · IA-11 · CMMC IA.3.083
 */

const RSA_CONFIGURED = !!(
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_RSA_API_URL &&
  import.meta.env?.VITE_RSA_API_KEY
);

/**
 * Verify an RSA SecurID OTP code.
 * User enters: PIN + token code (e.g., PIN=1234, token=567890 → "1234567890")
 *
 * @param {string} userId  - RSA user ID (usually email)
 * @param {string} otpCode - PIN + token code combined
 * @returns {{ success: boolean, reason?: string }}
 */
export async function verifyRSA(userId, otpCode) {
  if (!RSA_CONFIGURED) {
    // Demo mode: accept 000000
    const valid = otpCode === '000000';
    return {
      success: valid,
      reason: valid ? 'SUCCESS' : 'INVALID_OTP',
      demo: true,
    };
  }

  try {
    const res = await fetch(
      import.meta.env.VITE_RSA_API_URL + '/authn/identity/verify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + import.meta.env.VITE_RSA_API_KEY,
        },
        body: JSON.stringify({
          userId,
          authnAttempt: { otp: otpCode },
        }),
      }
    );

    if (res.status === 200) {
      const data = await res.json();
      return { success: data.status === 'SUCCESS', reason: data.status };
    }
    if (res.status === 401) {
      const data = await res.json();
      return { success: false, reason: data.reason || 'INVALID_OTP' };
    }
    return { success: false, reason: 'SERVICE_ERROR' };
  } catch (err) {
    console.error('RSA service error:', err);
    return { success: false, reason: 'NETWORK_ERROR' };
  }
}

export { RSA_CONFIGURED };
