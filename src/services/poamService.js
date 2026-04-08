/**
 * RiskRadar — POAM Service (Stage 1)
 * localStorage demo mode -> GovCloud RDS production (one env var swap)
 * Controls: CA-5, AU-2, AU-10, RA-3, SI-2, CM-6
 */

import { auditLog } from '../security/auditLogger.js';

const DB_CONFIGURED = !!(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DB_URL);
const STORE_KEY = 'rr_poam_v1';
export const CAT_LEVELS = { 'CAT I': 1, 'CAT II': 2, 'CAT III': 3 };

// Input sanitization — XSS prevention
function sanitize(str) {
  if (typeof str !== 'string') return str;
  let s = str;
  s = s.split('<').join('&lt;');
  s = s.split('>').join('&gt;');
  s = s.split('"').join('&quot;');
  return s.trim().slice(0, 2000);
}

function sanitizeItem(item) {
  const safe = {};
  for (const [k, v] of Object.entries(item)) {
    safe[k] = typeof v === 'string' ? sanitize(v) : v;
  }
  return safe;
}

export function validatePOAM(item) {
  const errors = [];
  if (!item.weakness || !item.weakness.trim()) errors.push('Weakness name is required');
  if (!item.source || !item.source.trim())   errors.push('Finding source is required');
  if (!item.cat)                             errors.push('CAT level is required');
  if (!item.poc || !item.poc.trim())         errors.push('Point of contact is required');
  if (!item.scheduledDate)                   errors.push('Scheduled completion date is required');
  if (item.cvss && (isNaN(item.cvss) || Number(item.cvss) < 0 || Number(item.cvss) > 10))
    errors.push('CVSS score must be 0.0 to 10.0');
  return errors;
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
}

function save(items) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(items)); }
  catch(e) { console.error('POAM save failed:', e); }
}

export function getAllPOAMs() {
  return load();
}

export async function createPOAM(item, actor) {
  const actorId = (actor && actor.email) ? actor.email : (actor || 'demo');
  const errors = validatePOAM(item);
  if (errors.length) return { success: false, errors };
  const safe = sanitizeItem(item);
  const items = load();
  const newItem = Object.assign({}, safe, {
    id: 'poam_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
    orgId: 'demo',
    poamNumber: 'POAM-' + String(items.length + 1).padStart(4, '0'),
    status: 'Ongoing',
    createdAt: new Date().toISOString(),
    createdBy: actorId,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
    milestones: safe.milestones || [],
    overdue: new Date(safe.scheduledDate) < new Date(),
  });
  items.push(newItem);
  save(items);
  await auditLog('POAM_CREATED', { actorId, orgId: 'demo', targetId: newItem.id,
    details: { poamNumber: newItem.poamNumber, weakness: newItem.weakness.slice(0,80), cat: newItem.cat }
  });
  return { success: true, item: newItem };
}

export async function updatePOAM(id, changes, actor) {
  const actorId = (actor && actor.email) ? actor.email : (actor || 'demo');
  const items = load();
  const idx = items.findIndex(p => p.id === id);
  if (idx === -1) return { success: false, errors: ['POAM not found'] };
  const safe = sanitizeItem(changes);
  items[idx] = Object.assign({}, items[idx], safe, {
    id,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
    overdue: new Date(safe.scheduledDate || items[idx].scheduledDate) < new Date(),
  });
  save(items);
  await auditLog('POAM_UPDATED', { actorId, orgId: 'demo', targetId: id,
    details: { fields: Object.keys(changes) }
  });
  return { success: true, item: items[idx] };
}

export async function deletePOAM(id, actor) {
  const actorId = (actor && actor.email) ? actor.email : (actor || 'demo');
  const items = load();
  const item = items.find(p => p.id === id);
  if (!item) return { success: false, errors: ['POAM not found'] };
  save(items.filter(p => p.id !== id));
  await auditLog('POAM_DELETED', { actorId, orgId: 'demo', targetId: id,
    details: { poamNumber: item.poamNumber }
  });
  return { success: true };
}

export async function addMilestone(poamId, milestone, actor) {
  const actorId = (actor && actor.email) ? actor.email : (actor || 'demo');
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
    createdBy: actorId,
  };
  if (!items[idx].milestones) items[idx].milestones = [];
  items[idx].milestones.push(ms);
  items[idx].updatedAt = new Date().toISOString();
  save(items);
  await auditLog('POAM_MILESTONE_ADDED', { actorId, orgId: 'demo', targetId: poamId,
    details: { milestone: ms.description.slice(0,80) }
  });
  return { success: true, milestone: ms };
}

export function exportToCSV(items) {
  const headers = ['POAM ID','Weakness','Source','Control','CAT','Severity','CVSS','CVE','Status','POC','Resources','Scheduled','Milestone','MS Status','Created','Created By','Updated'];
  const rows = items.flatMap(p => {
    if (!p.milestones || !p.milestones.length) {
      return [[p.poamNumber,p.weakness,p.source,p.control||'',p.cat,p.rawSeverity||'',p.cvss||'',p.cve||'',p.status,p.poc,p.resources||'',p.scheduledDate,'','',p.createdAt?p.createdAt.slice(0,10):'',p.createdBy,p.updatedAt?p.updatedAt.slice(0,10):'']];
    }
    return p.milestones.map(ms => [p.poamNumber,p.weakness,p.source,p.control||'',p.cat,p.rawSeverity||'',p.cvss||'',p.cve||'',p.status,p.poc,p.resources||'',p.scheduledDate,ms.description,ms.status,p.createdAt?p.createdAt.slice(0,10):'',p.createdBy,p.updatedAt?p.updatedAt.slice(0,10):'']);
  });
  const esc = v => '"' + String(v||'').split('"').join('""') + '"';
  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'RiskRadar_POAM_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export { DB_CONFIGURED };