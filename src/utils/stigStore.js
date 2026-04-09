// Shared STIG Evidence store using localStorage as cross-role event bus
// Allows SysAdmin submissions to appear in ISSO/ISSM review and vice versa

const STORE_KEY = 'rr_stig_evidence_v1';

const DEFAULT_SUBMISSIONS = [
  {
    id:'SE-001', ruleId:'V-220706', vulnId:'V-220706',
    title:'Account lockout threshold must be 3 attempts',
    cat:'CAT I', family:'Windows Server 2022', status:'approved',
    submittedBy:'K. Thompson (SysAdmin)', submittedAt:'2026-04-08 14:32',
    notes:'Applied via Default Domain Policy GPO. RSOP confirms lockout threshold = 3.',
    hasScreenshot:false, approvedBy:'ISSO', approvedAt:'2026-04-08 15:45',
  },
  {
    id:'SE-002', ruleId:'V-254239', vulnId:'V-254239',
    title:'Minimum password length must be 14 characters',
    cat:'CAT II', family:'Windows Server 2022', status:'pending',
    submittedBy:'J. Martinez (SysAdmin)', submittedAt:'2026-04-09 08:14',
    notes:'Configured via Local Security Policy. Screenshot shows minimum password length set to 14.',
    hasScreenshot:true,
  },
  {
    id:'SE-003', ruleId:'V-254315', vulnId:'V-254315',
    title:'Windows Server must use FIPS-compliant algorithms',
    cat:'CAT II', family:'Windows Server 2022', status:'pending',
    submittedBy:'J. Martinez (SysAdmin)', submittedAt:'2026-04-09 09:18',
    notes:'Registry key: HKLM\\System\\CurrentControlSet\\Control\\Lsa\\FIPSAlgorithmPolicy\\Enabled = 1.',
    hasScreenshot:true,
  },
];

export function loadSubmissions() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  // Seed with demo data on first load
  saveSubmissions(DEFAULT_SUBMISSIONS);
  return DEFAULT_SUBMISSIONS;
}

export function saveSubmissions(submissions) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(submissions));
    // Dispatch storage event so other components update
    window.dispatchEvent(new StorageEvent('storage', { key: STORE_KEY }));
  } catch(e) {}
}

export function addSubmission(sub) {
  const current = loadSubmissions();
  const updated = [sub, ...current];
  saveSubmissions(updated);
  return updated;
}

export function updateSubmission(id, changes) {
  const current = loadSubmissions();
  const updated = current.map(s => s.id === id ? { ...s, ...changes } : s);
  saveSubmissions(updated);
  return updated;
}

export function generateId() {
  const current = loadSubmissions();
  return 'SE-' + String(current.length + 1).padStart(3, '0');
}