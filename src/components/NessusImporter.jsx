import { useState, useRef } from 'react';
import { createPOAM } from '../services/poamService.js';
import { useAuth } from './Auth.jsx';

const mono = { fontFamily:"'Courier New',monospace" };

// Nessus severity → RiskRadar CAT level
function sevToCAT(sev) {
  if(sev>=4) return 'CAT I';
  if(sev===3) return 'CAT I';
  if(sev===2) return 'CAT II';
  if(sev===1) return 'CAT III';
  return null; // sev=0 is informational — skip
}

function sevLabel(sev) {
  return ['Informational','Low','Medium','High','Critical'][sev]||'Unknown';
}

// Parse .nessus XML → findings array
function parseNessus(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText,'application/xml');
  const items = [...doc.querySelectorAll('ReportItem')];
  const findings = [];
  for(const item of items) {
    const sev = parseInt(item.getAttribute('severity')||'0');
    if(sev===0) continue; // skip informational
    const pluginName = item.getAttribute('pluginName')||'Unknown';
    const pluginID   = item.getAttribute('pluginID')||'';
    const port       = item.getAttribute('port')||'0';
    const proto      = item.getAttribute('protocol')||'';
    const host       = item.closest('ReportHost')?.getAttribute('name')||'Unknown';
    const cvss       = item.querySelector('cvss_base_score')?.textContent||
                       item.querySelector('cvss3_base_score')?.textContent||'';
    const cveList    = [...item.querySelectorAll('cve')].map(c=>c.textContent).join(', ');
    const desc       = (item.querySelector('description')?.textContent||'').slice(0,400);
    const solution   = (item.querySelector('solution')?.textContent||'').slice(0,300);
    const stigID     = item.querySelector('stig_severity')?item.querySelector('vuln_publication_date')?.textContent:'';
    const pluginFam  = item.getAttribute('pluginFamily')||'';
    findings.push({ sev, pluginID, pluginName, pluginFam, host, port, proto, cvss, cve:cveList, desc, solution, stigID });
  }
  return findings;
}

// Map Nessus plugin family → NIST control
function familyToControl(fam) {
  const m = {
    'Windows':'CM-6','Unix':'CM-6','Firewalls':'SC-7','DNS':'SC-20',
    'Web Servers':'SC-8','Databases':'SC-28','SMTP':'SC-8',
    'Backdoors':'SI-3','Malware':'SI-3','Patch Management':'SI-2',
    'Misc.':'CM-6','Service detection':'CM-7','Settings':'CM-6',
  };
  for(const[k,v] of Object.entries(m)) if(fam.includes(k)) return v;
  return 'SI-2';
}

export default function NessusImporter() {
  const { member } = useAuth();
  const actor = member || 'demo';
  const fileRef = useRef();
  const [findings,   setFindings]   = useState([]);
  const [fileName,   setFileName]   = useState('');
  const [importing,  setImporting]  = useState(false);
  const [created,    setCreated]    = useState(0);
  const [skipped,    setSkipped]    = useState(0);
  const [errors,     setErrors]     = useState([]);
  const [filter,     setFilter]     = useState('all');
  const [search,     setSearch]     = useState('');
  const [expanded,   setExpanded]   = useState(null);
  const [done,       setDone]       = useState(false);
  const [schedDate,  setSchedDate]  = useState('');
  const [poc,        setPoc]        = useState('');

  const CAT_COLOR = {'CAT I':'#cc2222','CAT II':'#cc7700','CAT III':'#aaaa00'};
  const SEV_COLOR = {4:'#cc2222',3:'#cc4400',2:'#cc7700',1:'#aaaa00'};

  const handleFile = async(e) => {
    const file = e.target.files?.[0]; if(!file) return;
    setFileName(file.name); setDone(false); setCreated(0); setSkipped(0); setErrors([]); setFindings([]);
    const text = await file.text();
    try {
      const parsed = parseNessus(text);
      setFindings(parsed);
    } catch(err) {
      setErrors(['Failed to parse file: '+err.message]);
    }
  };

  const filtered = findings.filter(f=>{
    const mc = filter==='all'||sevToCAT(f.sev)===filter;
    const ms = !search||f.pluginName.toLowerCase().includes(search.toLowerCase())||
              f.host.toLowerCase().includes(search.toLowerCase())||
              (f.cve||'').toLowerCase().includes(search.toLowerCase());
    return mc&&ms;
  });

  const stats = {
    cat1: findings.filter(f=>sevToCAT(f.sev)==='CAT I').length,
    cat2: findings.filter(f=>sevToCAT(f.sev)==='CAT II').length,
    cat3: findings.filter(f=>sevToCAT(f.sev)==='CAT III').length,
  };

  const importToPOAM = async() => {
    if(!schedDate||!poc) { setErrors(['Scheduled completion date and POC are required before importing.']); return; }
    setImporting(true); setErrors([]); let ok=0,sk=0;
    for(const f of findings) {
      const cat = sevToCAT(f.sev);
      if(!cat) { sk++; continue; }
      const result = await createPOAM({
        weakness: f.pluginName,
        source: 'ACAS/Nessus',
        cat,
        rawSeverity: sevLabel(f.sev),
        cvss: f.cvss||'',
        cve: f.cve||'',
        stigId: f.stigID||'',
        control: familyToControl(f.pluginFam),
        poc,
        resources: '',
        scheduledDate: schedDate,
        description: 'Plugin '+f.pluginID+' on '+f.host+(f.port&&f.port!=='0'?' port '+f.port+'/'+f.proto:'')+'. '+f.desc,
        comments: f.solution?'Recommended fix: '+f.solution.slice(0,200):'',
        milestones: [],
      }, actor);
      if(result.success) ok++; else sk++;
    }
    setCreated(ok); setSkipped(sk); setImporting(false); setDone(true);
  };

  return (
    <div style={{padding:'20px 24px',maxWidth:900,...mono,color:'#c0d8f0'}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:700,color:'#e0e8f0',letterSpacing:1,marginBottom:2}}>
          📥 NESSUS / ACAS IMPORTER
        </div>
        <div style={{fontSize:10,color:'#4a7a9b',lineHeight:1.8}}>
          Upload a .nessus scan file · Auto-parse findings · Preview before importing to POAM Tracker<br/>
          CAT I/II/III mapped from Nessus severity · CVEs and CVSS auto-populated · Phase 4: live ACAS API
        </div>
      </div>

      {/* Upload area */}
      <div
        onClick={()=>fileRef.current?.click()}
        style={{background:'#061224',border:'2px dashed #1e3a5f',borderRadius:8,
          padding:'28px 24px',textAlign:'center',cursor:'pointer',marginBottom:16,
          transition:'border-color 0.2s'}}
        onMouseOver={e=>e.currentTarget.style.borderColor='#4a9fd4'}
        onMouseOut={e=>e.currentTarget.style.borderColor='#1e3a5f'}>
        <input ref={fileRef} type='file' accept='.nessus,.xml' style={{display:'none'}} onChange={handleFile}/>
        <div style={{fontSize:32,marginBottom:8}}>📤</div>
        <div style={{fontSize:13,color:'#a0c8e8',fontWeight:700}}>
          {fileName?'📄 '+fileName:'Click to upload .nessus scan file'}
        </div>
        <div style={{fontSize:10,color:'#2a5a7b',marginTop:4}}>
          Accepts Nessus Professional, ACAS (.nessus) format
        </div>
      </div>

      {errors.length>0&&(
        <div style={{background:'rgba(160,0,0,0.15)',border:'1px solid #660000',borderRadius:4,
          padding:'10px 14px',marginBottom:14}}>
          {errors.map((e,i)=><div key={i} style={{fontSize:11,color:'#ff9999'}}>⚠ {e}</div>)}
        </div>
      )}

      {findings.length>0&&(
        <>
          {/* Stats */}
          <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
            {[['Total',findings.length,'#4a7a9b'],['CAT I',stats.cat1,'#cc2222'],
              ['CAT II',stats.cat2,'#cc7700'],['CAT III',stats.cat3,'#aaaa00']].map(([l,v,c])=>(
              <div key={l} style={{background:'#061224',border:'1px solid #0d2040',borderRadius:5,
                padding:'8px 14px',textAlign:'center',minWidth:80}}>
                <div style={{fontSize:22,fontWeight:700,color:c,...mono}}>{v}</div>
                <div style={{fontSize:9,color:'#4a7a9b'}}>{l}</div>
              </div>
            ))}
            {stats.cat1>0&&(
              <div style={{background:'rgba(180,0,0,0.1)',border:'1px solid #660000',borderRadius:5,
                padding:'8px 14px',display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:18}}>🚨</span>
                <div style={{fontSize:11,color:'#ff6666',fontWeight:700}}>
                  {stats.cat1} CAT I finding{stats.cat1>1?'s':''} — remediate within 30 days
                </div>
              </div>
            )}
          </div>

          {/* Import config */}
          {!done&&(
            <div style={{background:'#0a1a30',border:'1px solid #1e3a5f',borderRadius:6,
              padding:'14px 16px',marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:'#a0b8d0',letterSpacing:1,marginBottom:10}}>
                IMPORT SETTINGS — applied to all findings
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                <div style={{marginBottom:10}}>
                  <label style={{display:'block',fontSize:9,color:'#4a7a9b',letterSpacing:2,marginBottom:4}}>
                    POINT OF CONTACT *
                  </label>
                  <input value={poc} onChange={e=>setPoc(e.target.value)}
                    placeholder='e.g. F. Ballard / ISSM'
                    style={{...mono,width:'100%',background:'#061224',border:'1px solid #1e3a5f',
                      borderRadius:3,padding:'7px 10px',color:'#c0d8f0',fontSize:11,
                      boxSizing:'border-box',outline:'none'}}/>
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{display:'block',fontSize:9,color:'#4a7a9b',letterSpacing:2,marginBottom:4}}>
                    SCHEDULED COMPLETION DATE *
                  </label>
                  <input type='date' value={schedDate} onChange={e=>setSchedDate(e.target.value)}
                    style={{...mono,width:'100%',background:'#061224',border:'1px solid #1e3a5f',
                      borderRadius:3,padding:'7px 10px',color:'#c0d8f0',fontSize:11,
                      boxSizing:'border-box',outline:'none'}}/>
                </div>
              </div>
              <button onClick={importToPOAM} disabled={importing||!poc||!schedDate}
                style={{...mono,background:(importing||!poc||!schedDate)?'#1a2a3a':'#0055cc',
                  border:'none',borderRadius:4,padding:'9px 24px',cursor:(importing||!poc||!schedDate)?'not-allowed':'pointer',
                  color:(importing||!poc||!schedDate)?'#2a4a6b':'#fff',fontSize:12,fontWeight:700,letterSpacing:1}}>
                {importing?'⏳ IMPORTING '+findings.length+' FINDINGS...':'⬆ IMPORT ALL TO POAM TRACKER'}
              </button>
            </div>
          )}

          {done&&(
            <div style={{background:'rgba(0,120,50,0.1)',border:'1px solid #006622',borderRadius:6,
              padding:'14px 16px',marginBottom:14,display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:24}}>✅</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#00cc66',letterSpacing:1}}>
                  IMPORT COMPLETE — {created} findings added to POAM Tracker
                </div>
                <div style={{fontSize:10,color:'#4a9a6b'}}>
                  {skipped>0?skipped+' informational items skipped · ':''} Navigate to POAM Tracker to review
                </div>
              </div>
            </div>
          )}

          {/* Filter + search */}
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
            {['all','CAT I','CAT II','CAT III'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{...mono,background:filter===f?'#0055cc':'transparent',
                  border:'1px solid '+(filter===f?'#0055cc':'#1e3a5f'),
                  borderRadius:3,padding:'4px 10px',cursor:'pointer',
                  color:filter===f?'#fff':'#4a7a9b',fontSize:10,fontWeight:700}}>
                {f==='all'?'All':f}
              </button>
            ))}
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder='Search plugin, host, CVE...'
              style={{...mono,flex:1,minWidth:160,background:'#061224',border:'1px solid #1e3a5f',
                borderRadius:3,padding:'5px 10px',color:'#c0d8f0',fontSize:11,outline:'none'}}/>
            <span style={{fontSize:10,color:'#4a7a9b'}}>{filtered.length} showing</span>
          </div>

          {/* Findings list */}
          <div style={{maxHeight:480,overflowY:'auto',paddingRight:4}}>
            {filtered.map((f,i)=>{
              const cat=sevToCAT(f.sev);
              const isOpen=expanded===i;
              return(
                <div key={i} onClick={()=>setExpanded(isOpen?null:i)}
                  style={{background:'#061224',border:'1px solid '+(isOpen?'#1e3a8f':'#0d2040'),
                    borderLeft:'4px solid '+(CAT_COLOR[cat]||'#555'),
                    borderRadius:5,marginBottom:6,padding:'10px 14px',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span style={{fontSize:9,fontWeight:700,color:CAT_COLOR[cat],
                      border:'1px solid '+(CAT_COLOR[cat]||'')+'44',borderRadius:2,padding:'1px 6px'}}>
                      {cat}
                    </span>
                    <span style={{fontSize:9,color:SEV_COLOR[f.sev]||'#555',
                      border:'1px solid '+(SEV_COLOR[f.sev]||'#555')+'44',borderRadius:2,padding:'1px 6px'}}>
                      {sevLabel(f.sev)}
                    </span>
                    <span style={{fontSize:12,fontWeight:700,color:'#d0e8f8',flex:1}}>{f.pluginName}</span>
                    <span style={{fontSize:9,color:'#2a4a6b',flexShrink:0}}>{isOpen?'▲':'▼'}</span>
                  </div>
                  <div style={{fontSize:10,color:'#4a7a9b',marginTop:3}}>
                    Host: {f.host}
                    {f.port&&f.port!=='0'?' · Port: '+f.port+'/'+f.proto:''}
                    {f.cvss?' · CVSS: '+f.cvss:''}
                    {f.cve?' · '+f.cve:''}
                    {' · Plugin: '+f.pluginID}
                  </div>
                  {isOpen&&(
                    <div style={{borderTop:'1px solid #0d2040',marginTop:8,paddingTop:8,fontSize:11,color:'#9ab0c8',lineHeight:1.7}}>
                      {f.desc&&<div style={{marginBottom:6}}><span style={{color:'#4a7a9b'}}>Description: </span>{f.desc}</div>}
                      {f.solution&&<div><span style={{color:'#4a7a9b'}}>Solution: </span>{f.solution}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {findings.length===0&&!fileName&&(
        <div style={{textAlign:'center',padding:'40px 0',color:'#2a4a6b',fontSize:11}}>
          <div style={{fontSize:32,marginBottom:8}}>🔍</div>
          <div>Upload a .nessus file to preview findings before importing to POAM Tracker</div>
          <div style={{marginTop:12,fontSize:10,color:'#1e3a5f',lineHeight:1.8}}>
            Export from Nessus Professional: Scan → Export → .nessus format<br/>
            Export from ACAS: Scan → Export → Nessus v2 (.nessus)
          </div>
        </div>
      )}

      <div style={{marginTop:16,fontSize:10,color:'#2a4a6b',lineHeight:1.8,
        background:'rgba(0,0,0,0.2)',border:'1px solid #0d2040',borderRadius:4,padding:'8px 14px'}}>
        Phase 1: File upload · CAT I/II/III auto-mapped · CVE + CVSS auto-populated · Audit logged ·
        Phase 4: Live ACAS API push via Collector Agent (GovCloud)
      </div>
    </div>
  );
}