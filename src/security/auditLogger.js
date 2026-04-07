/**
 * RiskRadar — Audit Logger
 * Client-side audit log writer. In demo mode: localStorage.
 * Production: POST to Supabase audit_log table (append-only, RLS enforced).
 *
 * Every privileged action must call auditLog().
 * AU-2: Event logging | AU-9: Protection | AU-10: Non-repudiation
 */

import { supabase, SUPABASE_CONFIGURED } from '../supabase.js';

const DEMO_LOG_KEY = 'rr_audit_log';
const MAX_DEMO_ENTRIES = 500;

export const EVENTS = {
  LOGIN_SUCCESS:      'LOGIN_SUCCESS',
  LOGIN_FAIL:         'LOGIN_FAIL',
  LOGIN_LOCKED:       'ACCOUNT_LOCKED',
  LOGIN_UNLOCKED:     'ACCOUNT_UNLOCKED',
  LOGOUT:             'LOGOUT',
  SESSION_EXPIRED:    'SESSION_EXPIRED',
  MFA_SUCCESS:        'MFA_SUCCESS',
  MFA_FAIL:           'MFA_FAIL',
  ROB_ACCEPTED:       'ROB_ACCEPTED',
  ORG_CREATED:        'ORG_CREATED',
  TOKEN_GENERATED:    'BOOTSTRAP_TOKEN_GENERATED',
  TOKEN_USED:         'BOOTSTRAP_TOKEN_USED',
  TOKEN_EXPIRED:      'BOOTSTRAP_TOKEN_EXPIRED',
  ISSM_CREATED:       'ISSM_ACCOUNT_CREATED',
  ISSO_INVITED:       'ISSO_INVITE_SENT',
  ISSO_CREATED:       'ISSO_ACCOUNT_CREATED',
  CERT_UPLOADED:      'CYBER_CERT_UPLOADED',
  CERT_VERIFIED:      'CYBER_CERT_VERIFIED',
  CERT_EXPIRED:       'CYBER_CERT_EXPIRED',
  POAM_CREATED:       'POAM_ITEM_CREATED',
  POAM_UPDATED:       'POAM_ITEM_UPDATED',
  SPRS_SCORED:        'SPRS_SCORE_CALCULATED',
  ISO_GENERATED:      'DVD_ISO_GENERATED',
  SAFE_TRANSFER:      'DOD_SAFE_TRANSFER_INITIATED',
};

/**
 * Write an audit log entry.
 * @param {string} action - EVENTS constant
 * @param {object} ctx - { actorId, actorRole, orgId, targetId, details, ip }
 */
export async function auditLog(action, ctx = {}) {
  const entry = {
    id:          crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
    action,
    actor_id:    ctx.actorId    || 'demo',
    actor_role:  ctx.actorRole  || 'unknown',
    org_id:      ctx.orgId      || 'demo',
    target_id:   ctx.targetId   || null,
    ip_address:  ctx.ip         || 'client',
    details:     ctx.details    || {},
    created_at:  new Date().toISOString(),
    // SHA-256 chain: in production, server computes hash of (prev_hash + entry)
    // Client writes the entry; server handles hash chaining
  };

  if (!SUPABASE_CONFIGURED) {
    // Demo mode: write to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem(DEMO_LOG_KEY) || '[]');
      existing.unshift(entry);
      // Cap at MAX_DEMO_ENTRIES
      if (existing.length > MAX_DEMO_ENTRIES) existing.splice(MAX_DEMO_ENTRIES);
      localStorage.setItem(DEMO_LOG_KEY, JSON.stringify(existing));
    } catch(e) {
      console.warn('Audit log write failed (localStorage full):', e);
    }
    if (import.meta.env?.DEV) {
      console.log('%c[AUDIT]', 'color:#00cc66;font-weight:bold', action, entry);
    }
    return entry;
  }

  // Production: write to Supabase (append-only table, no DELETE policy)
  try {
    const { error } = await supabase.from('audit_log').insert([entry]);
    if (error) console.error('Audit log DB write failed:', error);
  } catch(e) {
    // Never throw from audit logger — fail silently, try localStorage backup
    console.error('Audit log error:', e);
    try {
      const existing = JSON.parse(localStorage.getItem(DEMO_LOG_KEY+'_backup') || '[]');
      existing.unshift(entry);
      localStorage.setItem(DEMO_LOG_KEY+'_backup', JSON.stringify(existing.slice(0,100)));
    } catch {}
  }

  return entry;
}

/**
 * Read audit log entries (demo mode only — production queries Supabase).
 */
export function getAuditLog() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_LOG_KEY) || '[]');
  } catch { return []; }
}
