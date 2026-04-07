/**
 * RiskRadar — Email Service
 * Abstraction layer over AWS SES.
 * Demo mode: logs to console. Production: POST to /api/email via SES.
 *
 * All emails:
 *   - TLS 1.3 transport enforced by SES
 *   - DKIM + SPF + DMARC on ballardis3.com
 *   - No credentials in email body — tokens only
 *   - Rate limited: max 3 sends per type per hour
 *
 * Phase 3: wire VITE_SES_ENDPOINT + VITE_SES_API_KEY in Vercel env vars
 */

const DEMO_MODE = !(import.meta.env?.VITE_SES_ENDPOINT);
const FROM = 'RiskRadar <noreply@ballardis3.com>';
const BASE_URL = import.meta.env?.VITE_APP_URL || 'https://app.ballardis3.com';

// ── Email templates ───────────────────────────────────────────────────────

export function tplISSMBootstrap({ orgName, setupUrl, expiresIn = '24 hours' }) {
  return {
    subject: `RiskRadar — You have been designated as ISSM for ${orgName}`,
    text: `
You have been designated as the primary Information System Security Manager (ISSM)
for ${orgName} on RiskRadar by Ballard IS3.

Click the link below to set up your account:
${setupUrl}

This link expires in ${expiresIn} and is single-use.
Do not share this link. It is tied to your identity.

If you did not expect this email, contact admin@ballardis3.com immediately.

RiskRadar | Ballard IS3 | ballardis3.com
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Courier New',monospace;background:#070d1a;color:#c0d8f0;padding:40px 20px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#0d1b2e;border:1px solid #1e3a5f;border-radius:8px;padding:32px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:22px;font-weight:900;letter-spacing:3px;color:#e0e8f0">
        <span style="color:#cc2222">RISK</span>RADAR
      </span>
    </div>
    <h2 style="color:#e0e8f0;font-size:14px;font-weight:700;letter-spacing:1px;margin-bottom:16px">
      ISSM DESIGNATION — ${orgName}
    </h2>
    <p style="font-size:12px;line-height:1.8;margin-bottom:16px">
      You have been designated as the primary <strong style="color:#4a9fd4">Information System Security Manager (ISSM)</strong>
      for <strong style="color:#e0e8f0">${orgName}</strong> on RiskRadar.
    </p>
    <p style="font-size:12px;line-height:1.8;margin-bottom:24px">
      Click the button below to set up your account. You will be required to:
      create a password (min 15 characters), enroll an authenticator app (MFA),
      upload your Cyber Awareness certificate, and designate an ISSO.
    </p>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${setupUrl}" style="display:inline-block;background:#0055cc;color:#fff;
        text-decoration:none;padding:12px 28px;border-radius:4px;font-weight:700;
        font-size:12px;letter-spacing:1px;font-family:'Courier New',monospace">
        SET UP MY ISSM ACCOUNT →
      </a>
    </div>
    <div style="background:#061224;border:1px solid #1e3a5f;border-radius:4px;padding:14px;
      font-size:10px;color:#4a7a9b;line-height:1.8">
      ⚠ This link expires in <strong style="color:#ffaa44">${expiresIn}</strong> and is single-use.<br>
      Do not share this link. It is tied to your identity.<br>
      If you did not expect this email, contact <a href="mailto:admin@ballardis3.com"
        style="color:#4a9fd4">admin@ballardis3.com</a> immediately.
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}

export function tplISSOInvite({ orgName, issmName, inviteUrl, expiresIn = '24 hours' }) {
  return {
    subject: `RiskRadar — You have been designated as ISSO for ${orgName}`,
    text: `
${issmName} has designated you as the Information System Security Officer (ISSO)
for ${orgName} on RiskRadar.

As ISSO, you serve as the backup privileged account to the ISSM.

Click the link below to create your account:
${inviteUrl}

This link expires in ${expiresIn} and is single-use.

RiskRadar | Ballard IS3 | ballardis3.com
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Courier New',monospace;background:#070d1a;color:#c0d8f0;padding:40px 20px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#0d1b2e;border:1px solid #1e3a5f;border-radius:8px;padding:32px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:22px;font-weight:900;letter-spacing:3px;color:#e0e8f0">
        <span style="color:#cc2222">RISK</span>RADAR
      </span>
    </div>
    <h2 style="color:#e0e8f0;font-size:14px;font-weight:700;letter-spacing:1px;margin-bottom:16px">
      ISSO DESIGNATION — ${orgName}
    </h2>
    <p style="font-size:12px;line-height:1.8;margin-bottom:24px">
      <strong style="color:#e0e8f0">${issmName}</strong> has designated you as the
      <strong style="color:#4a9fd4">Information System Security Officer (ISSO)</strong>
      for <strong style="color:#e0e8f0">${orgName}</strong>.
    </p>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${inviteUrl}" style="display:inline-block;background:#0055cc;color:#fff;
        text-decoration:none;padding:12px 28px;border-radius:4px;font-weight:700;
        font-size:12px;letter-spacing:1px;font-family:'Courier New',monospace">
        CREATE MY ISSO ACCOUNT →
      </a>
    </div>
    <div style="background:#061224;border:1px solid #1e3a5f;border-radius:4px;padding:14px;
      font-size:10px;color:#4a7a9b;line-height:1.8">
      ⚠ This link expires in <strong style="color:#ffaa44">${expiresIn}</strong> and is single-use.
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}

export function tplAccountLocked({ userEmail, orgName, lockedReason }) {
  return {
    subject: `RiskRadar — Account locked: ${userEmail}`,
    text: `
SECURITY ALERT — RiskRadar

Account ${userEmail} in ${orgName} has been locked.
Reason: ${lockedReason}

Action required: Log in as ISSM and re-enable the account from the Admin Console.
All lockout events are logged and must be reviewed before re-enabling.

RiskRadar | Ballard IS3
    `.trim(),
    html: `<p>Account <strong>${userEmail}</strong> locked: ${lockedReason}</p>`.trim()
  };
}

export function tplCyberAwarenessExpiry({ userName, userEmail, expiryDate, daysUntil, jkoUrl = 'https://jko.jten.mil' }) {
  const urgency = daysUntil <= 0 ? 'EXPIRED' : daysUntil <= 7 ? 'CRITICAL' : daysUntil <= 14 ? 'WARNING' : 'NOTICE';
  return {
    subject: `RiskRadar — Cyber Awareness ${urgency}: ${userName} (${daysUntil <= 0 ? 'expired' : daysUntil + ' days'})`,
    text: `
Cyber Awareness ${urgency} — RiskRadar

User: ${userName} (${userEmail})
Expiry date: ${expiryDate}
Status: ${daysUntil <= 0 ? 'EXPIRED — account suspended' : daysUntil + ' days remaining'}

Complete Cyber Awareness training at JKO: ${jkoUrl}
Then upload your completion certificate to RiskRadar.

RiskRadar | Ballard IS3
    `.trim(),
    html: `<p>Cyber Awareness ${urgency} for <strong>${userName}</strong>. Expires: ${expiryDate}.</p>`.trim()
  };
}

// ── Send function ─────────────────────────────────────────────────────────

/**
 * Send an email.
 * @param {string} to - Recipient email address
 * @param {{ subject, text, html }} template - Email template object
 * @param {object} [options] - { cc, bcc }
 */
export async function sendEmail(to, template, options = {}) {
  if (DEMO_MODE) {
    console.group('%c📧 EMAIL (DEMO MODE)', 'color:#4a9fd4;font-weight:bold');
    console.log('TO:', to);
    console.log('SUBJECT:', template.subject);
    console.log('BODY:', template.text);
    console.groupEnd();
    return { success: true, demo: true, messageId: 'demo-' + Date.now() };
  }

  try {
    const res = await fetch(import.meta.env.VITE_SES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + import.meta.env.VITE_SES_API_KEY,
      },
      body: JSON.stringify({
        from: FROM,
        to,
        cc: options.cc,
        bcc: options.bcc,
        subject: template.subject,
        text: template.text,
        html: template.html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Email send failed:', err);
      return { success: false, error: err };
    }

    const data = await res.json();
    return { success: true, messageId: data.messageId };
  } catch (err) {
    console.error('Email service error:', err);
    return { success: false, error: err.message };
  }
}

// ── Convenience helpers ───────────────────────────────────────────────────

export async function sendISSMBootstrap({ to, orgName, token, orgSlug }) {
  const setupUrl = `${BASE_URL}/?setup=${token}&org=${orgSlug}`;
  return sendEmail(to, tplISSMBootstrap({ orgName, setupUrl }));
}

export async function sendISSOInvite({ to, orgName, issmName, token, orgSlug }) {
  const inviteUrl = `${BASE_URL}/?isso=${token}&org=${orgSlug}`;
  return sendEmail(to, tplISSOInvite({ orgName, issmName, inviteUrl }));
}

export async function sendLockoutAlert({ issmEmail, userEmail, orgName, lockedReason }) {
  return sendEmail(issmEmail, tplAccountLocked({ userEmail, orgName, lockedReason }));
}

export async function sendCyberAwarenessAlert({ issmEmail, userEmail, userName, expiryDate, daysUntil }) {
  return sendEmail(issmEmail, tplCyberAwarenessExpiry({ userName, userEmail, expiryDate, daysUntil }));
}
