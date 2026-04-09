import { useState, useEffect } from 'react';
import {
  getAllFeeds, addFeed, toggleFeed, removeFeed, resetFeeds, KNOWN_VENDORS
} from '../services/feedRegistry.js';

const mono = { fontFamily:"'Courier New',monospace" };

const TAG_COLOR  = { gov:'#cc2222', research:'#0055cc', vendor:'#00aa66', environment:'#cc8800' };
const TAG_LABEL  = { gov:'GOV', research:'RESEARCH', vendor:'VENDOR', environment:'ENV VENDOR' };
const CAT_COLOR  = { intel:'#1a3a6b', environment:'#3a2200' };

export default function FeedManager() {
  const [feeds,    setFeeds]    = useState([]);
  const [adding,   setAdding]   = useState(false);
  const [search,   setSearch]   = useState('');
  const [form,     setForm]     = useState({ label:'', url:'', vendor:'', itrNumber:'', cat:'environment' });
  const [suggest,  setSuggest]  = useState([]);
  const [saved,    setSaved]    = useState(false);
  const [filter,   setFilter]   = useState('all'); // all | intel | environment | enabled | disabled

  const reload = () => setFeeds(getAllFeeds());
  useEffect(()=>{ reload(); },[]);

  const set = (k,v) => {
    setForm(f=>({...f,[k]:v}));
    if (k==='vendor') {
      const q = v.toLowerCase();
      setSuggest(q.length>1 ? KNOWN_VENDORS.filter(kv=>kv.label.toLowerCase().includes(q)).slice(0,5) : []);
    }
  };

  const pickSuggest = (kv) => {
    setForm(f=>({...f, vendor:kv.label, label:kv.label, url:kv.url}));
    setSuggest([]);
  };

  const handleAdd = () => {
    if (!form.url.trim()) return;
    addFeed({ ...form, label: form.label||form.vendor||'Custom Feed' });
    setForm({ label:'', url:'', vendor:'', itrNumber:'', cat:'environment' });
    setSuggest([]);
    setAdding(false);
    setSaved(true);
    reload();
    setTimeout(()=>setSaved(false), 2500);
  };

  const handleToggle = (id) => { toggleFeed(id); reload(); };
  const handleRemove = (id) => { if(confirm('Remove this feed?')) { removeFeed(id); reload(); } };

  const filtered = feeds.filter(f => {
    const matchFilter =
      filter==='all'         ? true :
      filter==='intel'       ? f.cat==='intel' :
      filter==='environment' ? f.cat==='environment' :
      filter==='enabled'     ? f.enabled!==false :
      filter==='disabled'    ? f.enabled===false : true;
    const matchSearch = !search || f.label.toLowerCase().includes(search.toLowerCase()) ||
                        (f.vendor||'').toLowerCase().includes(search.toLowerCase()) ||
                        (f.itrNumber||'').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const envCount = feeds.filter(f=>f.cat==='environment').length;
  const enabledCount = feeds.filter(f=>f.enabled!==false).length;

  return (
    <div style={{padding:'20px 24px',maxWidth:760,...mono,color:'var(--rr-text)'}}>
      {/* Header */}
      <div style={{marginBottom:18}}>
        <div style={{fontSize:16,fontWeight:700,color:'var(--rr-white)',letterSpacing:1,marginBottom:2}}>
          ⚙️ FEED MANAGER
        </div>
        <div style={{fontSize:10,color:'var(--rr-mute)',lineHeight:1.8}}>
          Add, remove, or toggle intelligence feeds · Environment feeds track approved ITR vendors<br/>
          When a vendor is approved via ITR, add their feed here to monitor proactively
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        {[
          ['Total feeds', feeds.length, 'var(--rr-mute)'],
          ['Active', enabledCount, '#00aa66'],
          ['Environment vendors', envCount, '#cc8800'],
          ['Intel sources', feeds.filter(f=>f.cat==='intel').length, '#0055cc'],
        ].map(([label,val,color])=>(
          <div key={label} style={{background:'var(--rr-panel)',border:'1px solid #1e3a5f',
            borderRadius:4,padding:'8px 14px',textAlign:'center',minWidth:90}}>
            <div style={{fontSize:18,fontWeight:700,color}}>{val}</div>
            <div style={{fontSize:9,color:'var(--rr-mute)'}}>{label}</div>
          </div>
        ))}
        {saved && (
          <div style={{background:'rgba(0,150,50,0.12)',border:'1px solid #006622',
            borderRadius:4,padding:'8px 14px',color:'#00cc66',fontSize:11,
            display:'flex',alignItems:'center'}}>
            ✅ Feed added
          </div>
        )}
      </div>

      {/* Controls row */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <select value={filter} onChange={e=>setFilter(e.target.value)}
          style={{...mono,background:'var(--rr-panel)',border:'1px solid #1e3a5f',
            borderRadius:3,padding:'5px 8px',color:'var(--rr-text)',fontSize:11}}>
          <option value='all'>All feeds</option>
          <option value='intel'>Intelligence only</option>
          <option value='environment'>Environment vendors</option>
          <option value='enabled'>Enabled only</option>
          <option value='disabled'>Disabled only</option>
        </select>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search feeds..."
          style={{...mono,flex:1,minWidth:140,background:'var(--rr-panel)',
            border:'1px solid #1e3a5f',borderRadius:3,padding:'5px 10px',
            color:'var(--rr-text)',fontSize:11,outline:'none'}}/>
        <button onClick={()=>setAdding(!adding)}
          style={{...mono,background:adding?'#333':'#0055cc',border:'none',
            borderRadius:3,padding:'5px 14px',cursor:'pointer',
            color:adding?'#888':'#fff',fontSize:11,fontWeight:700}}>
          {adding ? '✕ CANCEL' : '+ ADD FEED'}
        </button>
        <button onClick={()=>{if(confirm('Reset all feeds to defaults?')){resetFeeds();reload();}}}
          style={{...mono,background:'transparent',border:'1px solid #3a1a1a',
            borderRadius:3,padding:'5px 10px',cursor:'pointer',
            color:'var(--rr-tint-red)',fontSize:10}}>
          RESET
        </button>
      </div>

      {/* Add feed form */}
      {adding && (
        <div style={{background:'var(--rr-panel-alt)',border:'1px solid #1e3a5f',
          borderRadius:6,padding:16,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:'var(--rr-text-dim)',
            marginBottom:12,letterSpacing:1}}>ADD NEW FEED</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            {/* Vendor search with autocomplete */}
            <div style={{position:'relative'}}>
              <label style={{display:'block',fontSize:9,color:'var(--rr-mute)',
                letterSpacing:2,marginBottom:4}}>VENDOR NAME</label>
              <input value={form.vendor} onChange={e=>set('vendor',e.target.value)}
                placeholder="e.g. Fortinet, Palo Alto..."
                style={{...mono,width:'100%',background:'var(--rr-panel)',border:'1px solid #1e3a5f',
                  borderRadius:3,padding:'7px 10px',color:'var(--rr-text)',fontSize:11,
                  boxSizing:'border-box',outline:'none'}}/>
              {suggest.length>0 && (
                <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:10,
                  background:'#0d1b2e',border:'1px solid #1e3a5f',borderRadius:3,marginTop:2}}>
                  {suggest.map(kv=>(
                    <div key={kv.label} onClick={()=>pickSuggest(kv)}
                      style={{padding:'6px 10px',cursor:'pointer',fontSize:11,
                        color:'var(--rr-text-dim)',borderBottom:'1px solid #0a1520'}}
                      onMouseOver={e=>e.target.style.background='var(--rr-border-md)'}
                      onMouseOut={e=>e.target.style.background='transparent'}>
                      {kv.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={{display:'block',fontSize:9,color:'var(--rr-mute)',
                letterSpacing:2,marginBottom:4}}>RSS FEED URL *</label>
              <input value={form.url} onChange={e=>set('url',e.target.value)}
                placeholder="https://vendor.com/feed.xml"
                style={{...mono,width:'100%',background:'var(--rr-panel)',border:'1px solid '+(form.url?'#00aa44':'var(--rr-border-md)'),
                  borderRadius:3,padding:'7px 10px',color:'var(--rr-text)',fontSize:11,
                  boxSizing:'border-box',outline:'none'}}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:9,color:'var(--rr-mute)',
                letterSpacing:2,marginBottom:4}}>DISPLAY LABEL</label>
              <input value={form.label} onChange={e=>set('label',e.target.value)}
                placeholder="Short display name"
                style={{...mono,width:'100%',background:'var(--rr-panel)',border:'1px solid #1e3a5f',
                  borderRadius:3,padding:'7px 10px',color:'var(--rr-text)',fontSize:11,
                  boxSizing:'border-box',outline:'none'}}/>
            </div>
            <div>
              <label style={{display:'block',fontSize:9,color:'var(--rr-mute)',
                letterSpacing:2,marginBottom:4}}>ITR NUMBER (if applicable)</label>
              <input value={form.itrNumber} onChange={e=>set('itrNumber',e.target.value)}
                placeholder="e.g. ITR-001"
                style={{...mono,width:'100%',background:'var(--rr-panel)',border:'1px solid #1e3a5f',
                  borderRadius:3,padding:'7px 10px',color:'var(--rr-text)',fontSize:11,
                  boxSizing:'border-box',outline:'none'}}/>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:9,color:'var(--rr-mute)',
              letterSpacing:2,marginBottom:4}}>CATEGORY</label>
            <div style={{display:'flex',gap:6}}>
              {[['environment','🏢 Environment Vendor','#cc8800'],['intel','🌐 Intelligence Source','#0055cc']].map(([val,lbl,col])=>(
                <label key={val} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',
                  fontSize:11,color:form.cat===val?col:'var(--rr-mute)'}}>
                  <input type='radio' name='cat' value={val} checked={form.cat===val}
                    onChange={()=>set('cat',val)} style={{accentColor:col}}/>
                  {lbl}
                </label>
              ))}
            </div>
            <div style={{fontSize:9,color:'var(--rr-mute)',marginTop:4}}>
              Environment = ITR-approved vendor in your system · Intelligence = general cyber news
            </div>
          </div>
          <button onClick={handleAdd} disabled={!form.url.trim()}
            style={{...mono,background:form.url?'#0055cc':'#1a2a3a',border:'none',
              borderRadius:3,padding:'8px 20px',cursor:form.url?'pointer':'not-allowed',
              color:form.url?'#fff':'var(--rr-mute)',fontSize:11,fontWeight:700}}>
            ADD FEED →
          </button>
        </div>
      )}

      {/* Feed list */}
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {filtered.map(feed=>(
          <div key={feed.id} style={{
            background: feed.cat==='environment'?'rgba(80,40,0,0.15)':'var(--rr-panel)',
            border:'1px solid '+(feed.enabled===false?'#1a1a1a':feed.cat==='environment'?'#3a2200':'var(--rr-panel-alt)'),
            borderLeft:'3px solid '+(feed.enabled===false?'#333':TAG_COLOR[feed.tag]||'var(--rr-mute)'),
            borderRadius:5,padding:'10px 14px',
            opacity:feed.enabled===false?0.45:1,transition:'opacity 0.2s'
          }}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              {/* Tags */}
              <span style={{fontSize:9,fontWeight:700,
                color:TAG_COLOR[feed.tag]||'var(--rr-mute)',
                border:'1px solid '+(TAG_COLOR[feed.tag]||'var(--rr-mute)')+'44',
                borderRadius:2,padding:'1px 6px',whiteSpace:'nowrap'}}>
                {TAG_LABEL[feed.tag]||feed.tag?.toUpperCase()}
              </span>
              {feed.cat==='environment' && (
                <span style={{fontSize:9,color:'#cc8800',
                  border:'1px solid #cc880044',borderRadius:2,padding:'1px 6px'}}>
                  🏢 ENV
                </span>
              )}
              {feed.itrNumber && (
                <span style={{fontSize:9,color:'#4a9fd4',
                  border:'1px solid #4a9fd444',borderRadius:2,padding:'1px 6px'}}>
                  {feed.itrNumber}
                </span>
              )}
              {feed.custom && (
                <span style={{fontSize:9,color:'#888',
                  border:'1px solid #33333344',borderRadius:2,padding:'1px 6px'}}>
                  CUSTOM
                </span>
              )}
              {/* Label */}
              <span style={{fontSize:12,fontWeight:700,color:'var(--rr-white)',flex:1}}>{feed.label}</span>
              {feed.vendor && feed.vendor!==feed.label && (
                <span style={{fontSize:10,color:'var(--rr-mute)'}}>{feed.vendor}</span>
              )}
              {/* Actions */}
              <div style={{display:'flex',gap:6,marginLeft:'auto'}}>
                <button onClick={()=>handleToggle(feed.id)}
                  style={{...mono,background:'transparent',
                    border:'1px solid '+(feed.enabled===false?'var(--rr-tint-green)':'var(--rr-tint-orange)'),
                    borderRadius:3,padding:'2px 8px',cursor:'pointer',
                    color:feed.enabled===false?'#00aa44':'#cc4444',fontSize:9,fontWeight:700}}>
                  {feed.enabled===false?'ENABLE':'DISABLE'}
                </button>
                {feed.custom && (
                  <button onClick={()=>handleRemove(feed.id)}
                    style={{...mono,background:'transparent',border:'1px solid #440000',
                      borderRadius:3,padding:'2px 8px',cursor:'pointer',
                      color:'#884444',fontSize:9}}>
                    REMOVE
                  </button>
                )}
              </div>
            </div>
            {/* URL */}
            <div style={{fontSize:9,color:'var(--rr-mute)',marginTop:4,
              whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              {feed.url}
            </div>
          </div>
        ))}
      </div>

      {filtered.length===0 && (
        <div style={{textAlign:'center',padding:30,color:'var(--rr-mute)',fontSize:12}}>
          No feeds match your filter
        </div>
      )}

      {/* ITR workflow note */}
      <div style={{marginTop:20,background:'rgba(80,40,0,0.1)',border:'1px solid #3a2200',
        borderRadius:4,padding:'12px 16px',fontSize:10,color:'#886644',lineHeight:1.9}}>
        <strong style={{color:'#cc8800',display:'block',marginBottom:4}}>
          🏢 ITR WORKFLOW — ADDING ENVIRONMENT VENDORS
        </strong>
        When an ITR is approved by ISSM, add the vendor's RSS feed here tagged as "Environment Vendor".<br/>
        This turns your threat intel from reactive to proactive — you'll see vendor security advisories,<br/>
        patch releases, and breach notifications in the Cyber Intelligence tab before they reach you via email.<br/>
        <strong>Example:</strong> Fortinet approved via ITR-004 → add Fortinet feed → any FortiOS vulnerability<br/>
        appears in your dashboard immediately, not after your next weekly security review.
      </div>
    </div>
  );
}
