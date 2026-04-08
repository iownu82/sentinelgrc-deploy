/**
 * RiskRadar — POAM Service (Stage 1)
 * Adapter pattern: localStorage demo → GovCloud RDS production
 * Activation: set VITE_DB_URL in Vercel → auto-switches to RDS
 *
 * Security controls:
 *   CA-5  — Plan of Action & Milestones (this IS the control)
 *   AU-2  — Every action logged with actor, timestamp, org
 *   AU-10 — Non-repudiation: actor identity on every write
 *   RA-3  — Risk assessment linkage via severity + CVSS
 *   SI-2  — Flaw remediation tracking via milestones + status
 *   CM-6  — Configuration deficiency tracking
 */

import { auditLog } from '../security/auditLogger.js';

const DB_CONFIGURED = !!(typeof import.meta !== 'undefined' && import.meta.env?.VITE_DB_URL);
const STORE_KEY  = 'rr_poam_v1';
const CAT_LEVELS = { 'CAT I': 1, 'CAT II': 2, 'CAT III': 3 };

// ── Input sanitization (XSS prevention) ──────────────────────────────────
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/[\\]/g, '&#x5C;')
    .trim()
    .slice(0, 2000); // max field length
}

function sanitizeItem(item) {
  const safe = {};
  for (const [k, v] of Object.entries(item)) {
    safe[k] = typeof v === 'string' ? sanitize(v) : v;
  }
  return safe;
}

// ── Validation ────────────────────────────────────────────────────────────
export function validatePOAM(item) {
  const errors = [];
  if (!item.weakness?.trim())          errors.push('Weakness name is required');
  if (!item.source?.trim())            errors.push('Finding source is required');
  if (!item.cat)                       errors.push('CAT level is required');
  if (!item.poc?.trim())               errors.push('Point of contact is required');
  if (!item.scheduledDate)             errors.push('Scheduled completion date is required');
  if (item.cvss && (isNaN(item.cvss) || item.cvss < 0 || item.cvss > 10))
                                       errors.push('CVSS score must be 0.0 – 10.0');
  return errors;
}

// ── Storage ───────────────────────────────────────────────────────────────
function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
}

function save(items) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(items)); } catch(e) {
    console.error('POAM save failed:', e);
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────

export function getAllPOAMs(orgId = 'demo') {
  if (DB_CONFIGURED) {
    // Phase 4: GET /api/poam?org_id=orgId (RDS via RLS)
    throw new Error('DB not yet connected — use demo mode');
  }
  return load().filter(p => p.orgId === orgId || orgId === 'demo');
}

export async function createPOAM(item, actor = 'demo') {
  const errors = validatePOAM(item);
  if (errors.length) return { success: false, errors };

  const safe = sanitizeItem(item);
  const newItem = {
    ...safe,
    id:         'poam_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
    orgId:      actor.orgId || 'demo',
    poamNumber: 'POAM-' + String(load().length + 1).padStart(4, '0'),
    status:     'Ongoing',
    createdAt:  new Date().toISOString(),
    createdBy:  actor.email || actor,
    updatedAt:  new Date().toISOString(),
    updatedBy:  actor.email || actor,
    milestones: safe.milestones || [],
    overdue:    new Date(safe.scheduledDate) < new Date(),
  };

  const items = load();
  items.push(newItem);
  save(items);

  await auditLog('POAM_CREATED', {
    actorId: actor.email || actor,
    orgId: newItem.orgId,
    targetId: newItem.id,
    details: {
      poamNumber: newItem.poamNumber,
      weakness: newItem.weakness.slice(0, 80),
      cat: newItem.cat,
      source: newItem.source,
    }
  });

  return { success: true, item: newItem };
}

export async function updatePOAM(id, changes, actor = 'demo') {
  const items = load();
  const idx = items.findIndex(p => p.id === id);
  if (idx === -1) return { success: false, errors: ['POAM not found'] };

  const safe = sanitizeItem(changes);
  items[idx] = {
    ...items[idx],
    ...safe,
    id,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.email || actor,
    overdue: new Date(safe.scheduledDate || items[idx].scheduledDate) < new Date(),
  };
  save(items);

  await auditLog('POAM_UPDATED', {
    actorId: actor.email || actor,
    orgId: items[idx].orgId,
    targetId: id,
    details: { fields: Object.keys(changes) }
  });

  return { success: true, item: items[idx] };
}

export async function deletePOAM(id, actor = 'demo') {
  const items = load();
  const item = items.find(p => p.id === id);
  if (!item) return { success: false, errors: ['POAM not found'] };

  save(items.filter(p => p.id !== id));

  await auditLog('POAM_DELETED', {
    actorId: actor.email || actor,
    orgId: item.orgId,
    targetId: id,
    details: { poamNumber: item.poamNumber, weakness: item.weakness.slice(0, 80) }
  });

  return { success: true };
}

export async function addMilestone(poamId, milestone, actor = 'demo') {
  const items = load();
  const idx = items.findIndex(p => p.id === poamId);
  if (idx === -1) return { success: false, errors: ['POAM not found'] };

  const ms = {
    id: 'ms_' + Date.now(),
    description: sanitize(milestone.description || ''),
    scheduledDate: milestone.scheduledDate,
    status: milestone.status || 'Pending',
    completedDate: milestone.completedDate || null,
    createdAt: new Date().toISOString(),
    createdBy: actor.email || actor,
  };

  items[idx].milestones = [...(items[idx].milestones || []), ms];
  items[idx].updatedAt = new Date().toISOString();
  save(items);

  await auditLog('POAM_MILESTONE_ADDED', {
    actorId: actor.email || actor,
    orgId: items[idx].orgId,
    targetId: poamId,
    details: { milestone: ms.description.slice(0, 80) }
  });

  return { success: true, milestone: ms };
}

// ── Export — eMASS-compatible CSV ─────────────────────────────────────────
export function exportToCSV(items) {
  const headers = [
    'POAM ID','Weakness Name','Source','Security Control','CAT Level',
    'Raw Severity','CVSS Score','CVE','Status','POC','Resources Required',
    'Scheduled Completion','Milestone Description','Milestone Status',
    'Created Date','Created By','Last Updated'
  ];
  const rows = items.flatMap(p => {
    if (!p.milestones?.length) return [[
      p.poamNumber, p.weakness, p.source, p.control || '', p.cat,
      p.rawSeverity || '', p.cvss || '', p.cve || '', p.status, p.poc,
      p.resources || '', p.scheduledDate, '', '', p.createdAt?.slice(0,10),
      p.createdBy, p.updatedAt?.slice(0,10)
    ]];
    return p.milestones.map(ms => [
      p.poamNumber, p.weakness, p.source, p.control || '', p.cat,
      p.rawSeverity || '', p.cvss || '', p.cve || '', p.status, p.poc,
      p.resources || '', p.scheduledDate, ms.description, ms.status,
      p.createdAt?.slice(0,10), p.createdBy, p.updatedAt?.slice(0,10)
    ]);
  });
  const csv = [headers, ...rows].map(r =>
    r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')
  ).join('
');
  const blob = new Blob([csv], {type:'text/csv'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'RiskRadar_POAM_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click(); URL.revokeObjectURL(url);
}

export { DB_CONFIGURED, CAT_LEVELS };
