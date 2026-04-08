import { useState, useEffect, useCallback } from 'react';

const mono = { fontFamily:"'Courier New',monospace" };

// ── Feed sources ──────────────────────────────────────────────────────────
const SOURCES = [
  // Government / Standards
  { id:'cisa',       cat:'gov',      label:'CISA',               color:'#cc2222', url:'https://www.cisa.gov/cybersecurity-advisories/all.xml' },
  { id:'nist',       cat:'gov',      label:'NIST NVD',           color:'#cc2222', url:'https://nvd.nist.gov/feeds/json/cve/1.1/nvdcve-1.1-recent.json' },
  { id:'disa',       cat:'gov',      label:'DISA',               color:'#cc2222', url:'https://public.cyber.mil/stigs/downloads/' },
  { id:'dod',        cat:'gov',      label:'DoD Cyber Exchange',  color:'#cc2222', url:'https://public.cyber.mil/news/' },
  // Research / Intelligence
  { id:'sans',       cat:'research', label:'SANS ISC',           color:'#0055cc', url:'https://isc.sans.edu/rssfeed_full.xml' },
  { id:'krebs',      cat:'research', label:'Krebs on Security',  color:'#0055cc', url:'https://krebsonsecurity.com/feed/' },
  { id:'thhn',       cat:'research', label:'The Hacker News',    color:'#0055cc', url:'https://feeds.feedburner.com/TheHackersNews' },
  { id:'darkread',   cat:'research', label:'Dark Reading',       color:'#0055cc', url:'https://www.darkreading.com/rss.xml' },
  { id:'cso',        cat:'research', label:'CSO Online',         color:'#0055cc', url:'https://www.csoonline.com/feed/' },
  { id:'isaca',      cat:'research', label:'ISACA',              color:'#0055cc', url:'https://www.isaca.org/rss/news' },
  // Vendor Intelligence
  { id:'cisco',      cat:'vendor',   label:'Cisco Talos',        color:'#00aa66', url:'https://blog.talosintelligence.com/rss/' },
  { id:'msft',       cat:'vendor',   label:'Microsoft Security', color:'#00aa66', url:'https://www.microsoft.com/en-us/security/blog/feed/' },
  { id:'crowdstrike',cat:'vendor',   label:'CrowdStrike',        color:'#00aa66', url:'https://www.crowdstrike.com/blog/feed/' },
];

const CATS = [
  { id:'all',      label:'All sources' },
  { id:'gov',      label:'Gov / Standards' },
  { id:'research', label:'Research / Intel' },
  { id:'vendor',   label:'Vendor' },
];

const CACHE_KEY   = 'rr_cyber_news_v2';
const CACHE_TTL   = 6 * 60 * 60 * 1000; // 6 hours
const RSS2JSON    = 'https://api.rss2json.com/v1/api.json?rss_url=';

// ── Fetch one RSS feed via rss2json proxy ─────────────────────────────────
async function fetchFeed(source) {
  try {
    const url = RSS2JSON + encodeURIComponent(source.url) + '&count=8&api_key=';
    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(data.message || 'Feed error');
    return (data.items || []).map(item => ({
      id:          source.id + '_' + (item.guid || item.link || '').slice(-20),
      source:      source.label,
      sourceId:    source.id,
      cat:         source.cat,
      color:       source.color,
      title:       item.title?.replace(/<[^>]+>/g,'').trim() || 'Untitled',
      summary:     (item.description || item.content || '')
                     .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,280),
      link:        item.link || item.url || '',
      pubDate:     item.pubDate ? new Date(item.pubDate) : new Date(),
      aiSummary:   null,
    }));
  } catch(e) {
    console.warn('Feed fetch failed:', source.label, e.message);
    return [];
  }
}

// ── AI summarize a batch of headlines using Claude API ────────────────────
async function aiSummarize(items) {
  const headlines = items.slice(0,20).map((it,i)=>
    `${i+1}. [${it.source}] ${it.title}`
  ).join('\n');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are a DoD cybersecurity analyst. Analyze these headlines and return a JSON object with two fields:
1. "brief": A 2-3 sentence executive brief on today's most critical threats (mention CVEs, APT groups, or critical systems if present).
2. "critical": Array of up to 3 item numbers (1-based) that are most critical for DoD/DIB programs.

Headlines:
${headlines}

Respond ONLY with valid JSON, no markdown.`
        }]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || '{}';
    return JSON.parse(text.replace(/```json|\n```|```/g,'').trim());
  } catch(e) {
    console.warn('AI summarize failed:', e.message);
    return null;
  }
}

// ── Main component ────────────────────────────────────────────────────────
export default function CyberNewsFeed() {
  const [items,      setItems]      = useState([]);
  const [aiInsight,  setAiInsight]  = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [cat,        setCat]        = useState('all');
  const [search,     setSearch]     = useState('');
  const [lastFetch,  setLastFetch]  = useState(null);
  const [failedSrcs, setFailedSrcs] = useState([]);
  const [expanded,   setExpanded]   = useState(null);

  // Load cache on mount
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setItems(cached.items.map(i=>({...i,pubDate:new Date(i.pubDate)})));
        setAiInsight(cached.aiInsight||null);
        setLastFetch(new Date(cached.ts));
        setFailedSrcs(cached.failedSrcs||[]);
        return;
      }
    } catch {}
    fetchAll();
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true); setItems([]); setAiInsight(null); setFailedSrcs([]);
    const results = await Promise.allSettled(SOURCES.map(fetchFeed));
    const all = [], failed = [];
    results.forEach((r,i) => {
      if (r.status==='fulfilled' && r.value.length>0) all.push(...r.value);
      else if (r.status==='rejected' || (r.status==='fulfilled' && r.value.length===0)) {
        failed.push(SOURCES[i].label);
      }
    });
    all.sort((a,b) => b.pubDate - a.pubDate);
    const ts = Date.now();
    setItems(all); setLoading(false); setLastFetch(new Date(ts)); setFailedSrcs(failed);

    // AI analysis
    if (all.length > 0) {
      setAiLoading(true);
      const insight = await aiSummarize(all);
      setAiInsight(insight); setAiLoading(false);
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        ts, items: all.map(i=>({...i,pubDate:i.pubDate.toISOString()})),
        aiInsight: null, failedSrcs: failed
      }));
    } catch {}
  }, []);

  const filtered = items.filter(i => {
    const matchCat  = cat === 'all' || i.cat === cat;
    const matchSrch = !search || i.title.toLowerCase().includes(search.toLowerCase()) ||
                      i.source.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSrch;
  });

  const criticalIds = new Set((aiInsight?.critical||[]).map(n => {
    const idx = (n-1);
    return items[idx]?.id;
  }).filter(Boolean));

  const catColor = { gov:'#cc2222', research:'#0055cc', vendor:'#00aa66' };
  const timeSince = d => {
    if (!d) return '';
    const m = Math.floor((Date.now()-d)/60000);
    if (m < 60) return m+'m ago';
    const h = Math.floor(m/60);
    if (h < 24) return h+'h ago';
    return Math.floor(h/24)+'d ago';
  };

  return (
    <div style={{padding:'20px 24px',maxWidth:860,...mono,color:'#c0d8f0'}}>
      {/* Header */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:700,color:'#e0e8f0',letterSpacing:1,marginBottom:2}}>
          📡 CYBER INTELLIGENCE FEED
        </div>
        <div style={{fontSize:10,color:'#4a7a9b',lineHeight:1.8}}>
          {SOURCES.length} sources · CISA · NIST · DISA · SANS · Krebs · Dark Reading · CSO · The Hacker News · ISACA · Cisco Talos · Microsoft · CrowdStrike
        </div>
      </div>

      {/* AI Brief */}
      <div style={{background:'rgba(0,60,120,0.12)',border:'1px solid #1e3a5f',
        borderRadius:6,padding:'12px 16px',marginBottom:16,minHeight:54}}>
        <div style={{fontSize:10,color:'#4a7a9b',letterSpacing:2,marginBottom:6,fontWeight:700}}>
          🤖 AI THREAT BRIEF — TODAY
        </div>
        {aiLoading && <div style={{fontSize:11,color:'#4a7a9b'}}>Analyzing {items.length} headlines with Claude AI...</div>}
        {!aiLoading && aiInsight?.brief && (
          <div style={{fontSize:12,color:'#a0c8e8',lineHeight:1.8}}>{aiInsight.brief}</div>
        )}
        {!aiLoading && !aiInsight?.brief && !loading && items.length > 0 && (
          <div style={{fontSize:11,color:'#2a5a7b'}}>AI analysis not available — API key required</div>
        )}
        {!aiLoading && !aiInsight?.brief && loading && (
          <div style={{fontSize:11,color:'#2a5a7b'}}>Loading feeds...</div>
        )}
      </div>

      {/* Controls */}
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14,flexWrap:'wrap'}}>
        {/* Category filter */}
        <div style={{display:'flex',gap:4}}>
          {CATS.map(c=>(
            <button key={c.id} onClick={()=>setCat(c.id)} style={{
              ...mono,background:cat===c.id?'#0055cc':'transparent',
              border:'1px solid '+(cat===c.id?'#0055cc':'#1e3a5f'),
              borderRadius:3,padding:'4px 10px',cursor:'pointer',
              color:cat===c.id?'#fff':'#4a7a9b',fontSize:10,fontWeight:700
            }}>{c.label}</button>
          ))}
        </div>
        {/* Search */}
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search headlines..."
          style={{...mono,flex:1,minWidth:160,background:'#061224',
            border:'1px solid #1e3a5f',borderRadius:3,padding:'5px 10px',
            color:'#c0d8f0',fontSize:11,outline:'none'}}/>
        {/* Refresh */}
        <button onClick={fetchAll} disabled={loading} style={{
          ...mono,background:'transparent',border:'1px solid #1e3a5f',
          borderRadius:3,padding:'4px 12px',cursor:'pointer',
          color:'#4a7a9b',fontSize:10,fontWeight:700,
          opacity:loading?0.5:1
        }}>{loading?'⏳ LOADING...':'🔄 REFRESH'}</button>
        {lastFetch && (
          <span style={{fontSize:9,color:'#2a5a7b'}}>
            Updated {timeSince(lastFetch)}
          </span>
        )}
      </div>

      {/* Stats row */}
      {!loading && items.length > 0 && (
        <div style={{display:'flex',gap:12,marginBottom:14,flexWrap:'wrap'}}>
          {['gov','research','vendor'].map(c=>{
            const count = items.filter(i=>i.cat===c).length;
            return (
              <div key={c} style={{fontSize:10,color:catColor[c],
                background:'rgba(0,0,0,0.2)',border:'1px solid '+catColor[c]+'44',
                borderRadius:3,padding:'3px 10px'}}>
                {c==='gov'?'GOV':c==='research'?'RESEARCH':'VENDOR'}: {count}
              </div>
            );
          })}
          <div style={{fontSize:10,color:'#4a7a9b',background:'rgba(0,0,0,0.2)',
            border:'1px solid #1e3a5f',borderRadius:3,padding:'3px 10px'}}>
            TOTAL: {filtered.length} articles
          </div>
          {failedSrcs.length > 0 && (
            <div style={{fontSize:9,color:'#663300',background:'rgba(80,30,0,0.2)',
              border:'1px solid #663300',borderRadius:3,padding:'3px 10px'}}>
              ⚠ {failedSrcs.length} source(s) unavailable
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{textAlign:'center',padding:40,color:'#4a7a9b',fontSize:12}}>
          <div style={{fontSize:24,marginBottom:12}}>📡</div>
          Fetching {SOURCES.length} intelligence sources...
        </div>
      )}

      {/* News items */}
      {!loading && filtered.length === 0 && (
        <div style={{textAlign:'center',padding:40,color:'#2a4a6b',fontSize:12}}>
          {items.length===0 ? 'No articles loaded — click Refresh to fetch feeds' : 'No articles match your filter'}
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {filtered.map(item => {
          const isCrit = criticalIds.has(item.id);
          const isOpen = expanded === item.id;
          return (
            <div key={item.id}
              style={{
                background: isCrit?'rgba(180,0,0,0.08)':'#061224',
                border:'1px solid '+(isCrit?'#660000':isOpen?'#1e3a8f':'#0d2040'),
                borderLeft:'3px solid '+item.color,
                borderRadius:5,padding:'10px 14px',
                cursor:'pointer',transition:'border-color 0.15s',
              }}
              onClick={()=>setExpanded(isOpen?null:item.id)}
            >
              <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                    <span style={{fontSize:9,fontWeight:700,color:item.color,
                      border:'1px solid '+item.color+'44',borderRadius:2,
                      padding:'1px 6px',whiteSpace:'nowrap'}}>
                      {item.source}
                    </span>
                    {isCrit && (
                      <span style={{fontSize:9,fontWeight:700,color:'#ff6666',
                        border:'1px solid #660000',borderRadius:2,padding:'1px 6px'}}>
                        ⚠ CRITICAL
                      </span>
                    )}
                    <span style={{fontSize:9,color:'#2a5a7b',marginLeft:'auto'}}>
                      {timeSince(item.pubDate)}
                    </span>
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:'#d0e8f8',lineHeight:1.5,marginBottom:4}}>
                    {item.title}
                  </div>
                  {isOpen && item.summary && (
                    <div style={{fontSize:11,color:'#7a9ab8',lineHeight:1.7,
                      marginBottom:8,borderTop:'1px solid #0d2040',paddingTop:8}}>
                      {item.summary}
                    </div>
                  )}
                  {isOpen && (
                    <a href={item.link} target='_blank' rel='noopener noreferrer'
                      onClick={e=>e.stopPropagation()}
                      style={{fontSize:10,color:'#4a9fd4',textDecoration:'none'}}>
                      READ FULL ARTICLE →
                    </a>
                  )}
                </div>
                <span style={{fontSize:10,color:'#2a4a6b',flexShrink:0,marginTop:2}}>
                  {isOpen?'▲':'▼'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Failed sources detail */}
      {failedSrcs.length > 0 && !loading && (
        <div style={{marginTop:16,fontSize:10,color:'#2a4a6b',
          background:'rgba(0,0,0,0.2)',border:'1px solid #0d2040',
          borderRadius:4,padding:'8px 14px',lineHeight:1.8}}>
          <strong style={{color:'#4a7a9b'}}>Sources with CORS restrictions (normal for .gov/.mil):</strong><br/>
          {failedSrcs.join(' · ')}<br/>
          These sources are fetched via the Updates tab's direct API integration.
        </div>
      )}
    </div>
  );
}
