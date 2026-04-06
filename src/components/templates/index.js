// RiskRadar — Template Lazy Loader
// Explicit imports per family — Vite requires static paths for code splitting

export const ALL_FAMILIES = [
  { id:"AC", name:"Access Control",                 file:"ac" },
  { id:"AT", name:"Awareness and Training",          file:"at" },
  { id:"AU", name:"Audit and Accountability",        file:"au" },
  { id:"CA", name:"Assessment, Auth, Monitoring",    file:"ca" },
  { id:"CM", name:"Configuration Management",        file:"cm" },
  { id:"CP", name:"Contingency Planning",            file:"cp" },
  { id:"IA", name:"Identification and Auth",         file:"ia" },
  { id:"IR", name:"Incident Response",               file:"ir" },
  { id:"MA", name:"Maintenance",                     file:"ma" },
  { id:"MP", name:"Media Protection",                file:"mp" },
  { id:"PE", name:"Physical and Environmental",      file:"pe" },
  { id:"PL", name:"Planning",                        file:"pl" },
  { id:"PM", name:"Program Management",              file:"pm" },
  { id:"PS", name:"Personnel Security",              file:"ps" },
  { id:"PT", name:"PII Processing and Transparency", file:"pt" },
  { id:"RA", name:"Risk Assessment",                 file:"ra" },
  { id:"SA", name:"System and Svcs Acquisition",     file:"sa" },
  { id:"SC", name:"System and Comms Protection",     file:"sc" },
  { id:"SI", name:"System and Info Integrity",       file:"si" },
  { id:"SR", name:"Supply Chain Risk Mgmt",          file:"sr" },
];

// Explicit loader map — Vite can statically analyze these for code splitting
const LOADERS = {
  ac: () => import('./ac.js'),
  at: () => import('./at.js'),
  au: () => import('./au.js'),
  ca: () => import('./ca.js'),
  cm: () => import('./cm.js'),
  cp: () => import('./cp.js'),
  ia: () => import('./ia.js'),
  ir: () => import('./ir.js'),
  ma: () => import('./ma.js'),
  mp: () => import('./mp.js'),
  pe: () => import('./pe.js'),
  pl: () => import('./pl.js'),
  pm: () => import('./pm.js'),
  ps: () => import('./ps.js'),
  pt: () => import('./pt.js'),
  ra: () => import('./ra.js'),
  sa: () => import('./sa.js'),
  sc: () => import('./sc.js'),
  si: () => import('./si.js'),
  sr: () => import('./sr.js'),
};

// Cache — keeps loaded families in memory for the session
const _cache = {};

export async function loadFamily(familyId) {
  if (_cache[familyId]) return _cache[familyId];
  const fam = ALL_FAMILIES.find(f => f.id === familyId);
  if (!fam || !LOADERS[fam.file]) return {};
  try {
    const module = await LOADERS[fam.file]();
    _cache[familyId] = module.default || {};
    return _cache[familyId];
  } catch (e) {
    console.warn(`Failed to load templates for ${familyId}:`, e);
    return {};
  }
}

export function isFamilyLoaded(familyId) {
  return !!_cache[familyId];
}

export function prefetchFamily(familyId) {
  if (!_cache[familyId]) loadFamily(familyId);
}
