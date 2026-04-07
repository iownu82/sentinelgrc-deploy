import { useState } from 'react';
import { sha256 } from '../auth/crypto.js';

const mono={fontFamily:"'Courier New',monospace"};
const SEV_C={CRITICAL:'#cc2222',HIGH:'#cc6600',MEDIUM:'#aaaa00',LOW:'#4a7a9b',INFO:'#2a5a7b'};
const CAT_L={CVE:'CVE',IAVA:'IAVA/IAVB',KEV:'CISA KEV',STIG_UPDATE:'STIG',POLICY:'POLICY',CNSSI:'CNSSI 1253',JSIG:'JSIG'};
const DEMO=[
  {id:'CVE-2026-1234',source:'NIST NVD',cat:'CVE',sev:'CRITICAL',cvss:9.8,date:'2026-04-05',transferred:false,
   title:'Windows NTLM Authentication Remote Code Execution',
   desc:'Critical NTLM vulnerability allows unauthenticated RCE on domain controllers. Patch immediately.'},
  {id:'IAVA-2026-A-0041',source:'DISA IAVA',cat:'IAVA',sev:'HIGH',cvss:8.6,date:'2026-04-04',transferred:false,
   title:'Cisco IOS XE Web UI Privilege Escalation',
   desc:'Cisco IOS XE Web UI allows authenticated remote attacker to gain root via privilege escalation.'},
  {id:'KEV-2026-0312',source:'CISA KEV',cat:'KEV',sev:'CRITICAL',cvss:9.3,date:'2026-04-03',transferred:false,
   title:'Palo Alto PAN-OS Authentication Bypass — Actively Exploited',
   desc:'PAN-OS auth bypass is being actively exploited. CISA mandates federal remediation within 3 days.'},
  {id:'STIG-V-254478',source:'DISA STIG',cat:'STIG_UPDATE',sev:'HIGH',cvss:null,date:'2026-04-02',transferred:true,
   title:'Windows Server 2022 STIG V2R1 — 12 Updated Controls',
   desc:'DISA released WS2022 STIG V2R1 with 12 updated controls including SMB signing and FIPS enforcement.'},
  {id:'CMMC-UPD-02',source:'CMMC AB',cat:'POLICY',sev:'MEDIUM',cvss:null,date:'2026-04-01',transferred:false,
   title:'CMMC Assessment Guide v2.2 Released',
   desc:'Updated scoring methodology for AC.2.006 and IA.3.083. All L2 assessments after June 2026 must use v2.2.'},
  {id:'CNSSI-2026-01',source:'CNSSI',cat:'CNSSI',sev:'HIGH',cvss:null,date:'2026-04-05',transferred:false,
   title:'CNSSI 1253 Rev 3 — NSS Security Categorization Update',
   desc:'Updated NSS overlay controls for MODERATE-HIGH systems. New requirements for SC-28(1) hardware encryption and IA-3 machine authentication affecting National Security Systems.'},
  {id:'JSIG-2026-02',source:'JSIG',cat:'JSIG',sev:'HIGH',cvss:null,date:'2026-04-03',transferred:false,
   title:'JSIG Rev 4 Errata — SAP Audit Requirements Updated',
   desc:'Updated audit requirements for Special Access Programs. AU-2 event logging now requires CAC thumbprint in all privileged action records. Effective immediately for all SAP information systems.'},
  {id:'CSRMC-2026-01',source:'DoD CIO',cat:'POLICY',sev:'INFO',cvss:null,date:'2026-03-28',transferred:false,
   title:'CSRMC Phase 2 Build Guidance Released',
   desc:'DoD CIO released Phase 2 implementation guidance outlining DevSecOps pipeline and continuous monitoring specs.'},
];

function Chip({label,color}){
  return <span style={{fontSize:9,padding:'2px 7px',borderRadius:3,fontWeight:700,
    background:'rgba(0,0,0,0.4)',color,border:'1px solid '+color}}>{label}</span>;
}

export default function UpdatesFeed(){
  const [items,setItems]=useState(DEMO);
  const [sel,setSel]=useState(new Set());
  const [filter,setFilter]=useState('ALL');
  const [busy,setBusy]=useState(false);
  const [pkg,setPkg]=useState(null);

  const counts={CRITICAL:items.filter(u=>u.sev==='CRITICAL').length,
    HIGH:items.filter(u=>u.sev==='HIGH').length,
    pending:items.filter(u=>!u.transferred).length};

  const shown=filter==='ALL'?items:filter==='PENDING'?items.filter(u=>!u.transferred):items.filter(u=>u.sev===filter||u.cat===filter);

  const toggle=id=>setSel(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const selAll=()=>setSel(new Set(shown.filter(u=>!u.transferred).map(u=>u.id)));
  const selCrit=()=>setSel(new Set(items.filter(u=>u.sev==='CRITICAL'&&!u.transferred).map(u=>u.id)));

  const genISO=async()=>{
    if(!sel.size)return;
    setBusy(true);
    await new Promise(r=>setTimeout(r,1500));
    const picked=items.filter(u=>sel.has(u.id));
    const manifest={version:'2026.04.06-'+String(Math.floor(Math.random()*999)).padStart(3,'0'),
      generated:new Date().toISOString(),classification:'UNCLASSIFIED//CUI',
      method:'DVD_ISO',count:picked.length,
      critical:picked.filter(i=>i.sev==='CRITICAL').length,
      items:picked.map(i=>({id:i.id,source:i.source,title:i.title,severity:i.sev}))};
    const hash=await sha256(JSON.stringify(manifest));
    setPkg({manifest,hash});
    setItems(p=>p.map(u=>sel.has(u.id)?{...u,transferred:true}:u));
    setSel(new Set());
    setBusy(false);
  };

  const FILTERS=['ALL','PENDING','CRITICAL','HIGH','CVE','IAVA','KEV','STIG_UPDATE','POLICY','CNSSI','JSIG'];

  return(
    <div style={{padding:24,...mono,color:'#c0d8f0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div>
          <div style={{fontSize:16,fontWeight:900,color:'#e0e8f0',letterSpacing:2}}>🔄 SECURITY UPDATES</div>
          <div style={{fontSize:10,color:'#4a7a9b',marginTop:3}}>
            Sources: NIST NVD · CISA KEV · DISA STIG/IAVA · CMMC AB · DoD CIO · CNSSI 1253 · JSIG · Last polled: 2026-04-06 08:00 UTC
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {[['CRITICAL',counts.CRITICAL,'#cc4444','#660000'],['HIGH',counts.HIGH,'#ffaa44','#664400'],
            ['PENDING',counts.pending,'#4a9fd4','#004488']].map(([l,n,c,b])=>(
            <div key={l} style={{fontSize:10,padding:'4px 10px',borderRadius:4,
              background:'rgba(0,0,0,0.3)',border:'1px solid '+b,color:c}}>
              {l}: {n}
            </div>
          ))}
        </div>
      </div>

      {pkg&&(
        <div style={{background:'rgba(0,100,40,0.1)',border:'2px solid #006622',borderRadius:8,
          padding:18,marginBottom:18,display:'flex',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'#00cc66',marginBottom:6}}>
              💿 PACKAGE READY — {pkg.manifest.version}
            </div>
            <div style={{fontSize:10,color:'#4a7a9b',lineHeight:1.8}}>
              {pkg.manifest.count} items · {pkg.manifest.critical} critical ·
              SHA-256: <span style={{color:'#00aa44'}}>{pkg.hash.slice(0,24)}...</span><br/>
              Burn to DVD · Verify hash on classified side before import
            </div>
          </div>
          <button onClick={()=>setPkg(null)} style={{...mono,fontSize:10,background:'transparent',
            border:'1px solid #1e3a5f',color:'#4a7a9b',borderRadius:4,padding:'4px 10px',cursor:'pointer'}}>
            DISMISS
          </button>
        </div>
      )}

      <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
        {FILTERS.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{...mono,fontSize:9,fontWeight:700,
            background:filter===f?'#0d2a4a':'transparent',
            border:'1px solid '+(filter===f?'#0066cc':'#1e3a5f'),
            color:filter===f?'#4a9fd4':'#2a5a7b',borderRadius:4,padding:'4px 10px',cursor:'pointer'}}>
            {f.replace('_',' ')}
          </button>
        ))}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center',
        paddingBottom:12,borderBottom:'1px solid #1e3a5f'}}>
        <button onClick={selAll} style={{...mono,fontSize:10,fontWeight:700,background:'transparent',
          border:'1px solid #1e3a5f',color:'#4a7a9b',borderRadius:4,padding:'6px 12px',cursor:'pointer'}}>
          SELECT ALL PENDING ({shown.filter(u=>!u.transferred).length})
        </button>
        <button onClick={selCrit} style={{...mono,fontSize:10,fontWeight:700,
          background:'rgba(180,0,0,0.1)',border:'1px solid #660000',color:'#cc4444',
          borderRadius:4,padding:'6px 12px',cursor:'pointer'}}>
          CRITICAL ONLY
        </button>
        <div style={{flex:1}}/>
        <span style={{fontSize:10,color:'#4a7a9b'}}>{sel.size} selected</span>
        <button onClick={genISO} disabled={!sel.size||busy}
          style={{...mono,fontSize:10,fontWeight:700,
            background:sel.size?'#003366':'#0a1520',
            border:'1px solid '+(sel.size?'#0055aa':'#1e3a5f'),
            color:sel.size?'#4a9fd4':'#2a5a7b',
            borderRadius:4,padding:'7px 14px',cursor:sel.size?'pointer':'not-allowed'}}>
          {busy?'⏳ GENERATING…':'💿 GENERATE DVD ISO'}
        </button>
        <button onClick={()=>alert('DoD SAFE requires AO approval. Submit transfer request.')}
          disabled={!sel.size} style={{...mono,fontSize:10,fontWeight:700,
            background:sel.size?'#002244':'#0a1520',
            border:'1px solid '+(sel.size?'#004488':'#1e3a5f'),
            color:sel.size?'#4a8ab0':'#2a5a7b',
            borderRadius:4,padding:'7px 14px',cursor:sel.size?'pointer':'not-allowed'}}>
          📁 DoD SAFE
        </button>
      </div>

      <div style={{display:'grid',gap:8}}>
        {shown.map(u=>(
          <div key={u.id} onClick={()=>!u.transferred&&toggle(u.id)}
            style={{background:sel.has(u.id)?'#0d2a4a':'#061224',
              border:'1px solid '+(sel.has(u.id)?'#0066cc':u.transferred?'#0d2a1a':'#1e3a5f'),
              borderRadius:6,padding:14,cursor:u.transferred?'default':'pointer',opacity:u.transferred?0.6:1}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
              <div style={{width:18,flexShrink:0,marginTop:2}}>
                {u.transferred
                  ?<span style={{color:'#00aa44',fontSize:14}}>✓</span>
                  :<div style={{width:16,height:16,border:'2px solid '+(sel.has(u.id)?'#0066cc':'#2a5a7b'),
                    borderRadius:3,background:sel.has(u.id)?'#0066cc':'transparent',
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {sel.has(u.id)&&<span style={{color:'#fff',fontSize:11}}>✓</span>}
                  </div>}
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5,flexWrap:'wrap'}}>
                  <Chip label={u.sev} color={SEV_C[u.sev]||'#888'}/>
                  <Chip label={CAT_L[u.cat]||u.cat} color='#4a8ab0'/>
                  <span style={{fontSize:9,color:'#4a7a9b'}}>{u.source}</span>
                  <span style={{fontSize:9,color:'#2a4a6b'}}>· {u.date}</span>
                  {u.cvss&&<span style={{fontSize:9,color:'#ffaa44'}}>CVSS {u.cvss}</span>}
                  {u.transferred&&<span style={{fontSize:9,color:'#00aa44'}}>✓ TRANSFERRED</span>}
                </div>
                <div style={{fontSize:12,fontWeight:700,color:'#e0e8f0',marginBottom:4}}>{u.title}</div>
                <div style={{fontSize:10,color:'#6a8aaa',lineHeight:1.7}}>{u.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}