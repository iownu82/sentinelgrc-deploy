/**
 * RiskRadar — Client-side rate limiter
 * Prevents brute force, credential stuffing, and token abuse
 * Phase 4: enforce server-side at API gateway / AWS WAF
 *
 * Controls:
 *   - Login:  max 3 attempts per 15 min per IP bucket (client-enforced) — matches AC-7 lockout
 *   - Setup:  max 3 attempts per 1 hour
 *   - MFA:    max 5 attempts per 5 min (then force re-login)
 *   - ISSO:   max 3 invite sends per hour per org
 */

const WINDOWS = {
  login:  { max: 3,  windowMs: 15 * 60 * 1000, key: 'rl_login_'  },
  setup:  { max: 3,  windowMs: 60 * 60 * 1000, key: 'rl_setup_'  },
  mfa:    { max: 5,  windowMs:  5 * 60 * 1000, key: 'rl_mfa_'    },
  isso:   { max: 3,  windowMs: 60 * 60 * 1000, key: 'rl_isso_'   },
};

/**
 * Check if an action is rate limited.
 * @param {string} action - One of: login, setup, mfa, isso
 * @param {string} identifier - Email, IP bucket, or org slug
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
export function checkRateLimit(action, identifier = 'default') {
  const cfg = WINDOWS[action];
  if (!cfg) return { allowed: true, remaining: 99, resetIn: 0 };

  const storageKey = cfg.key + btoa(identifier).slice(0, 16);
  const now = Date.now();

  let record;
  try {
    record = JSON.parse(localStorage.getItem(storageKey) || 'null');
  } catch { record = null; }

  // Expired window — reset
  if (!record || now - record.start > cfg.windowMs) {
    record = { start: now, count: 0 };
  }

  const remaining = cfg.max - record.count;
  const resetIn   = Math.ceil((cfg.windowMs - (now - record.start)) / 1000);

  if (record.count >= cfg.max) {
    return { allowed: false, remaining: 0, resetIn };
  }

  return { allowed: true, remaining: remaining - 1, resetIn };
}

/**
 * Record a rate limit hit.
 * Call AFTER checkRateLimit returns allowed=true.
 */
export function recordAttempt(action, identifier = 'default') {
  const cfg = WINDOWS[action];
  if (!cfg) return;

  const storageKey = cfg.key + btoa(identifier).slice(0, 16);
  const now = Date.now();

  let record;
  try {
    record = JSON.parse(localStorage.getItem(storageKey) || 'null');
  } catch { record = null; }

  if (!record || now - record.start > cfg.windowMs) {
    record = { start: now, count: 0 };
  }

  record.count++;
  localStorage.setItem(storageKey, JSON.stringify(record));
}

/**
 * Reset rate limit for an action/identifier (e.g., on successful login).
 */
export function resetRateLimit(action, identifier = 'default') {
  const cfg = WINDOWS[action];
  if (!cfg) return;
  localStorage.removeItem(cfg.key + btoa(identifier).slice(0, 16));
}

/**
 * Format a human-readable "try again in X minutes" string.
 */
export function formatResetTime(resetInSeconds) {
  if (resetInSeconds < 60) return `${resetInSeconds} seconds`;
  return `${Math.ceil(resetInSeconds / 60)} minute${Math.ceil(resetInSeconds / 60) === 1 ? '' : 's'}`;
}
