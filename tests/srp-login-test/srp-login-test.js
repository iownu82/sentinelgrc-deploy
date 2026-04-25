/**
 * BIS3 Defense - End-to-End SRP Login Test
 *
 * Exercises the full client-side SRP authentication flow against deployed
 * Lambdas in GovCloud. This is throwaway test tooling - in production the
 * Stage 7 React frontend will use amazon-cognito-identity-js the same way.
 *
 * Flow:
 *   1. POST /auth/login with email + SRP_A → get PASSWORD_VERIFIER challenge
 *   2. Compute password claim signature using Cognito SDK SRP helpers
 *   3. POST /auth/verify-srp with signature → get MFA_SETUP (first login)
 *   4. POST /auth/setup-mfa phase=associate → get TOTP secret + QR URI
 *   5. Generate first TOTP code from secret using speakeasy
 *   6. POST /auth/setup-mfa phase=verify → get cookies + logged in
 *
 * Usage: node srp-login-test.js
 */

const fetch = require('node-fetch');
const speakeasy = require('speakeasy');

// Hack: amazon-cognito-identity-js expects browser globals
global.fetch = fetch;
global.crypto = require('crypto').webcrypto;
global.navigator = { userAgent: 'node' };

const {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} = require('amazon-cognito-identity-js');

// ============================================================================
// CONFIG
// ============================================================================
const API_BASE = 'https://api.staging.app.bis3ai.com';
const USER_POOL_ID = 'us-gov-west-1_0VaQnbcFH';
const CLIENT_ID = 'anrf7jlfgfevp7c6esu705p7k';
const TEST_EMAIL = 'test@bis3defense.com';
const TEST_PASSWORD = 'BIS3-Test-Password-2026!';

// Lambda calls go through our API; SRP math is done locally
const userPool = new CognitoUserPool({
  UserPoolId: USER_POOL_ID,
  ClientId: CLIENT_ID,
});

// ============================================================================
// HELPERS
// ============================================================================

async function callApi(path, body) {
  console.log(`\n→ POST ${path}`);
  console.log(`  body: ${JSON.stringify(body).substring(0, 100)}...`);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  console.log(`  ← ${res.status} ${JSON.stringify(data).substring(0, 200)}`);
  return { status: res.status, data, headers: res.headers };
}

// ============================================================================
// MAIN FLOW
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('BIS3 Defense - SRP Login End-to-End Test');
  console.log('═══════════════════════════════════════════════════════════');

  // Use Cognito SDK to do the SRP math locally
  // We can't easily extract just the SRP_A from the SDK, so we use its
  // authenticateUser flow but intercept the auth steps to call OUR endpoints.
  const cognitoUser = new CognitoUser({
    Username: TEST_EMAIL,
    Pool: userPool,
  });

  const authDetails = new AuthenticationDetails({
    Username: TEST_EMAIL,
    Password: TEST_PASSWORD,
  });

  // Cognito SDK exposes internal SRP helpers
  // We use AuthenticationHelper to compute SRP_A and password claim signature
  const AuthenticationHelper = require('amazon-cognito-identity-js/lib/AuthenticationHelper').default;
  const BigInteger = require('amazon-cognito-identity-js/lib/BigInteger').default;
  const DateHelper = require('amazon-cognito-identity-js/lib/DateHelper').default;

  const userPoolName = USER_POOL_ID.split('_')[1];
  const helper = new AuthenticationHelper(userPoolName);

  // Step 1: Compute SRP_A and call /auth/login
  console.log('\n[Step 1] Compute SRP_A and call /auth/login');
  const srpA = await new Promise((resolve, reject) => {
    helper.getLargeAValue((err, aValue) => {
      if (err) reject(err);
      else resolve(aValue.toString(16));
    });
  });

  const loginResp = await callApi('/auth/login', {
    email: TEST_EMAIL,
    srpA: srpA,
  });

  if (loginResp.status !== 200) {
    console.error('❌ Login step failed');
    return;
  }

  const { session, challengeParameters } = loginResp.data;
  const challengeName = loginResp.data.challenge;
  if (challengeName !== 'PASSWORD_VERIFIER') {
    console.error(`❌ Expected PASSWORD_VERIFIER, got ${challengeName}`);
    return;
  }

  // Step 2: Compute password claim signature
  console.log('\n[Step 2] Compute password claim signature');
  const dateNow = new DateHelper().getNowString();

  const signature = await new Promise((resolve, reject) => {
    helper.getPasswordAuthenticationKey(
      challengeParameters.USER_ID_FOR_SRP,
      TEST_PASSWORD,
      new BigInteger(challengeParameters.SRP_B, 16),
      new BigInteger(challengeParameters.SALT, 16),
      (err, hkdf) => {
        if (err) {
          reject(err);
          return;
        }
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', hkdf);
        hmac.update(Buffer.from(userPoolName, 'utf8'));
        hmac.update(Buffer.from(challengeParameters.USER_ID_FOR_SRP, 'utf8'));
        hmac.update(Buffer.from(challengeParameters.SECRET_BLOCK, 'base64'));
        hmac.update(Buffer.from(dateNow, 'utf8'));
        resolve(hmac.digest('base64'));
      }
    );
  });

  // Step 3: Call /auth/verify-srp
  console.log('\n[Step 3] Call /auth/verify-srp');
  const verifyResp = await callApi('/auth/verify-srp', {
    email: TEST_EMAIL,
    session: session,
    passwordClaimSignature: signature,
    timestamp: dateNow,
    secretBlock: challengeParameters.SECRET_BLOCK,
  });

  if (verifyResp.status !== 200) {
    console.error('❌ verify-srp step failed');
    return;
  }

  const verifyChallenge = verifyResp.data.challenge;
  console.log(`  Got challenge: ${verifyChallenge}`);

  if (verifyChallenge !== 'MFA_SETUP') {
    console.log(`  Got ${verifyChallenge} - test user may already have MFA`);
    if (verifyChallenge === 'SOFTWARE_TOKEN_MFA') {
      console.log('  ❗ User already has MFA - cannot test setup flow');
      console.log('  ❗ Delete the test user and recreate to test MFA setup');
      return;
    }
    return;
  }

  // Step 4: Call /auth/setup-mfa phase=associate
  console.log('\n[Step 4] Call /auth/setup-mfa phase=associate');
  const associateResp = await callApi('/auth/setup-mfa', {
    phase: 'associate',
    session: verifyResp.data.session,
    email: TEST_EMAIL,
  });

  if (associateResp.status !== 200) {
    console.error('❌ MFA associate step failed');
    return;
  }

  const { secretCode, qrCodeUri } = associateResp.data;
  console.log(`  TOTP secret: ${secretCode.substring(0, 8)}...`);
  console.log(`  QR URI:      ${qrCodeUri.substring(0, 80)}...`);

  // Step 5: Generate first TOTP code from secret
  console.log('\n[Step 5] Generate first TOTP code from secret');
  const totpCode = speakeasy.totp({
    secret: secretCode,
    encoding: 'base32',
  });
  console.log(`  TOTP code: ${totpCode}`);

  // Step 6: Call /auth/setup-mfa phase=verify
  console.log('\n[Step 6] Call /auth/setup-mfa phase=verify');
  const finalResp = await callApi('/auth/setup-mfa', {
    phase: 'verify',
    session: associateResp.data.session,
    email: TEST_EMAIL,
    totpCode: totpCode,
    friendlyDeviceName: 'BIS3 Test SRP Script',
  });

  if (finalResp.status !== 200) {
    console.error('❌ MFA verify step failed');
    return;
  }

  // Check for cookies
  const setCookieHeaders = finalResp.headers.raw()['set-cookie'] || [];
  console.log(`\n  ✅ Got ${setCookieHeaders.length} Set-Cookie headers`);
  setCookieHeaders.forEach(c => {
    const name = c.split('=')[0];
    console.log(`     - ${name}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ END-TO-END SRP + MFA SETUP TEST PASSED');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`User: ${finalResp.data.user.email}`);
  console.log(`Role: ${finalResp.data.user.role}`);
  console.log(`Tenant: ${finalResp.data.user.tenant_id}`);
}

main().catch(err => {
  console.error('\n❌ UNEXPECTED ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
