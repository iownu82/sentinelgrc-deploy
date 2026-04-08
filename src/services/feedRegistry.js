/**
 * RiskRadar — Feed Registry
 * Dynamic vendor/source feed list stored in localStorage (→ RDS GovCloud Phase 4).
 * Feeds tagged 'environment' are approved ITR vendors — monitored proactively.
 * Feeds tagged 'intel' are general cyber intelligence sources.
 *
 * ISSM/ISSO can add any RSS feed. Feed list is per-org in production.
 */

const STORE_KEY = 'rr_feed_registry_v1';

// ── Default intelligence feeds (always present) ───────────────────────────
export const DEFAULT_FEEDS = [
  // Government / Standards
  { id:'cisa',        cat:'intel', tag:'gov',    label:'CISA',               url:'https://www.cisa.gov/cybersecurity-advisories/all.xml',     enabled:true },
  { id:'sans',        cat:'intel', tag:'gov',    label:'SANS ISC',           url:'https://isc.sans.edu/rssfeed_full.xml',                     enabled:true },
  { id:'nist',        cat:'intel', tag:'gov',    label:'NIST NVD',           url:'https://nvd.nist.gov/feeds/json/cve/1.1/nvdcve-1.1-recent.json', enabled:true },
  { id:'disa',        cat:'intel', tag:'gov',    label:'DISA',               url:'https://public.cyber.mil/stigs/downloads/',                  enabled:true },
  { id:'isaca',       cat:'intel', tag:'gov',    label:'ISACA',              url:'https://www.isaca.org/rss/news',                            enabled:true },
  // Research / Intelligence
  { id:'krebs',       cat:'intel', tag:'research', label:'Krebs on Security', url:'https://krebsonsecurity.com/feed/',                        enabled:true },
  { id:'thhn',        cat:'intel', tag:'research', label:'The Hacker News',   url:'https://feeds.feedburner.com/TheHackersNews',              enabled:true },
  { id:'darkread',    cat:'intel', tag:'research', label:'Dark Reading',      url:'https://www.darkreading.com/rss.xml',                      enabled:true },
  { id:'cso',         cat:'intel', tag:'research', label:'CSO Online',        url:'https://www.csoonline.com/feed/',                          enabled:true },
  // Vendor Intelligence (always monitored)
  { id:'cisco',       cat:'intel', tag:'vendor', label:'Cisco Talos',        url:'https://blog.talosintelligence.com/rss/',                   enabled:true },
  { id:'msft',        cat:'intel', tag:'vendor', label:'Microsoft Security', url:'https://www.microsoft.com/en-us/security/blog/feed/',       enabled:true },
  { id:'crowdstrike', cat:'intel', tag:'vendor', label:'CrowdStrike',        url:'https://www.crowdstrike.com/blog/feed/',                    enabled:true },
];

// ── Known vendor RSS feeds (auto-suggest when adding) ─────────────────────
export const KNOWN_VENDORS = [
  { label:'Adobe',            url:'https://blogs.adobe.com/security/feed' },
  { label:'Apple Security',   url:'https://support.apple.com/en-us/rss/security-updates.rss' },
  { label:'Cisco Talos',      url:'https://blog.talosintelligence.com/rss/' },
  { label:'CrowdStrike',      url:'https://www.crowdstrike.com/blog/feed/' },
  { label:'Dell Security',    url:'https://www.dell.com/support/security/en-us/rss.xml' },
  { label:'F5 Security',      url:'https://my.f5.com/manage/s/feed' },
  { label:'Fortinet',         url:'https://www.fortiguard.com/rss/ir.xml' },
  { label:'Google Security',  url:'https://feeds.feedburner.com/GoogleOnlineSecurityBlog' },
  { label:'HP Security',      url:'https://support.hp.com/us-en/product/rss' },
  { label:'IBM Security',     url:'https://www.ibm.com/blogs/psirt/feed/' },
  { label:'Juniper',          url:'https://kb.juniper.net/InfoCenter/index?page=home&rss=1' },
  { label:'Lenovo',           url:'https://support.lenovo.com/us/en/product_security/rss' },
  { label:'Microsoft Security', url:'https://www.microsoft.com/en-us/security/blog/feed/' },
  { label:'Mozilla Security', url:'https://blog.mozilla.org/security/feed/' },
  { label:'Palo Alto Unit 42',url:'https://unit42.paloaltonetworks.com/feed/' },
  { label:'Qualys Security',  url:'https://blog.qualys.com/feed' },
  { label:'Red Hat Security', url:'https://www.redhat.com/en/rss/blog/channel/security' },
  { label:'SentinelOne',      url:'https://www.sentinelone.com/feed/' },
  { label:'Sophos News',      url:'https://news.sophos.com/en-us/feed/' },
  { label:'VMware Security',  url:'https://blogs.vmware.com/security/feed' },
];

// ── CRUD operations ───────────────────────────────────────────────────────

function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; }
}

function save(feeds) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(feeds)); } catch {}
}

/** Get all feeds — defaults + custom */
export function getAllFeeds() {
  const custom = load();
  if (!custom) return DEFAULT_FEEDS.map(f=>({...f}));
  // Merge: defaults that aren't overridden + custom
  const customIds = new Set(custom.map(f=>f.id));
  return [
    ...DEFAULT_FEEDS.filter(f=>!customIds.has(f.id)),
    ...custom,
  ];
}

/** Get only enabled feeds */
export function getEnabledFeeds() {
  return getAllFeeds().filter(f=>f.enabled !== false);
}

/** Get environment feeds (approved ITR vendors) */
export function getEnvironmentFeeds() {
  return getAllFeeds().filter(f=>f.cat==='environment');
}

/** Add a custom feed */
export function addFeed({ label, url, vendor, itrNumber, cat = 'environment' }) {
  const all = getAllFeeds();
  const id  = 'custom_' + Date.now();
  const feed = {
    id, cat, tag: 'environment',
    label: label || vendor || 'Custom Feed',
    url, vendor, itrNumber,
    addedAt: new Date().toISOString(),
    enabled: true,
    custom: true,
  };
  all.push(feed);
  save(all.filter(f=>f.custom)); // only save custom feeds
  return feed;
}

/** Toggle a feed on/off */
export function toggleFeed(feedId) {
  const all = getAllFeeds();
  const feed = all.find(f=>f.id===feedId);
  if (!feed) return;
  feed.enabled = !feed.enabled;
  // For default feeds, save their override state
  const custom = all.filter(f=>f.custom);
  const overrides = all.filter(f=>!f.custom && f.enabled===false).map(f=>({...f}));
  save([...custom, ...overrides]);
}

/** Remove a custom feed */
export function removeFeed(feedId) {
  const all = getAllFeeds().filter(f=>f.id!==feedId);
  save(all.filter(f=>f.custom));
}

/** Reset to defaults */
export function resetFeeds() {
  localStorage.removeItem(STORE_KEY);
}
