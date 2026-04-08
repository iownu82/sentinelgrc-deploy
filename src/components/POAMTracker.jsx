import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './Auth.jsx';
import {
  getAllPOAMs, createPOAM, updatePOAM, deletePOAM,
  addMilestone, exportToCSV, validatePOAM, CAT_LEVELS
} from '../services/poamService.js';

const mono = { fontFamily:"'Courier New',monospace" };
const CAT_COLOR  = { 'CAT I':'#cc2222', 'CAT II':'#cc7700', 'CAT III':'#aaaa00' };
const STATUS_COLOR = {
  'Ongoing':'#4a7a9b','Completed':'#00aa44','Risk Accepted':'#cc8800',
  'False Positive':'#555','Delayed':'#cc4400','NA - Not a Finding':'#444'
};
const SOURCES = ['ACAS/Nessus','STIG','SCA Finding','Self-Assessment','CCRI','Pen Test','Other'];
const CATS    = ['CAT I','CAT II','CAT III'];
const STATUSES= ['Ongoing','Completed','Risk Accepted','False Positive','Delayed','NA - Not a Finding'];
const SEVERITIES = ['Critical','High','Medium','Low','Informational'];
const CONTROLS_800_53 = ['AC-1','AC-2','AC-3','AC-5','AC-6','AC-7','AC-8','AC-11','AC-17','AU-2','AU-3','AU-9','AU-10','AU-11','AU-12','CA-2','CA-5','CA-7','CM-2','CM-6','CM-7','CM-8','IA-2','IA-4','IA-5','IA-8','IA-11','IR-2','IR-4','IR-5','IR-6','MA-2','MA-4','MA-5','MP-2','MP-4','MP-5','MP-6','PE-2','PE-3','PE-6','PL-2','PL-4','PS-3','PS-4','PS-5','PS-6','RA-3','RA-5','SA-9','SA-11','SC-5','SC-8','SC-12','SC-13','SC-28','SI-2','SI-3','SI-4','SI-7','SI-10'].sort();
const BLANK = {weakness:'',source:'',cat:'CAT II',rawSeverity:'High',cvss:'',cve:'',control:'',poc:'',resources:'',scheduledDate:'',description:'',comments:'',stigId:'',raJustification:'',naExplanation:''};
const CHANGE_LOG_KEY = 'rr_poam_changelog_v1';
const RA_LOG_KEY     = 'rr_poam_ra_v1';

// ── Tabs ──────────────────────────────────────────────────────────────────
const TABS = [
  { id:'sc_poam',   label:'Security Control POAM', icon:'📋', desc:'All active findings' },
  { id:'stig',      label:'STIG Summary',          icon:'📄', desc:'STIG-sourced findings by benchmark' },
  { id:'ra_life',   label:'Lifetime Risk Acceptance', icon:'♾️', desc:'AO-accepted risks' },
  { id:'ra_new',    label:'Risk Acceptance Requests', icon:'📝', desc:'Pending RA submissions' },
  { id:'na',        label:'NA / Not a Finding',    icon:'➖', desc:'Determined not applicable' },
  { id:'closed',    label:'Closed',                icon:'✅', desc:'Remediated and closed' },
  { id:'change',    label:'Change Control',        icon:'🔄', desc:'Document version history' },
];

// ── Helpers ───────────────────────────────────────────────────────────────
const fmtDate   = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
const isOverdue = d => d && new Date(d) < new Date();
const daysLeft  = d => { if(!d) return null; return Math.ceil((new Date(d)-new Date())/86400000); };

function loadLog(key) { try { return JSON.parse(localStorage.getItem(key)||'[]'); } catch { return []; } }
function saveLog(key,data) { try { localStorage.setItem(key,JSON.stringify(data)); } catch {} }

// ── Stat card ──────────────────────────────────────────────────────────────
const Stat = ({label,val,color,sub}) => (
  <div style={{background:'#061224',border:'1px solid #0d2040',borderRadius:5,padding:'10px 14px',minWidth:80,textAlign:'center'}}>
    <div style={{fontSize:22,fontWeight:700,color:color||'#4a7a9b',fontFamily:"'Courier New',monospace"}}>{val}</div>
    <div style={{fontSize:9,color:'#4a7a9b',marginTop:1}}>{label}</div>
    {sub&&<div style={{fontSize:9,color:sub.color||'#cc4400',marginTop:2}}>{sub.text}</div>}
  </div>
);

// ── Form helpers ───────────────────────────────────────────────────────────
const Field = ({label,children,required,note}) => (
  <div style={{marginBottom:12}}>
    <label style={{display:'block',fontSize:9,color:'#4a7a9b',letterSpacing:2,marginBottom:4}}>
      {label}{required&&<span style={{color:'#cc4444'}}> *</span>}
    </label>
    {children}
    {note&&<div style={{fontSize:9,color:'#2a5a7b',marginTop:3}}>{note}</div>}
  </div>
);
const Inp = ({value,onChange,placeholder,type,disabled}) => (
  <input type={type||'text'} value={value||''} onChange={onChange} placeholder={placeholder} disabled={disabled}
    style={{...mono,width:'100%',background:disabled?'#040e18':'#061224',border:'1px solid #1e3a5f',borderRadius:3,padding:'7px 10px',color:'#c0d8f0',fontSize:11,boxSizing:'border-box',outline:'none'}}/>
);
const Sel = ({value,onChange,children,disabled}) => (
  <select value={value||''} onChange={onChange} disabled={disabled}
    style={{...mono,width:'100%',background:disabled?'#040e18':'#061224',border:'1px solid #1e3a5f',borderRadius:3,padding:'7px 10px',color:'#c0d8f0',fontSize:11,boxSizing:'border-box'}}>
    {children}
  </select>
);
const Btn = ({children,onClick,disabled,variant}) => {
  const bg = variant==='danger'?'#440000':variant==='success'?'#004422':variant==='primary'?'#0055cc':'transparent';
  const col = variant==='danger'?'#ff8888':variant==='success'?'#00cc66':variant==='primary'?'#fff':'#4a7a9b';
  const bdr = variant?'none':'1px solid #1e3a5f';
  return <button style={{...mono,background:bg,border:bdr,borderRadius:3,padding:'5px 14px',cursor:disabled?'not-allowed':'pointer',color:col,fontSize:10,fontWeight:700,opacity:disabled?0.5:1}} onClick={onClick} disabled={disabled}>{children}</button>;
};

// ── POAM Card ─────────────────────────────────────────────────────────────
function POAMCard({item,onEdit,onDelete,onAddMs,onStatusChange}) {
  const [open,setOpen]=useState(false);
  const [addingMs,setAddingMs]=useState(false);
  const [msForm,setMsForm]=useState({description:'',scheduledDate:'',status:'Pending'});
  const dl=daysLeft(item.scheduledDate);
  const over=isOverdue(item.scheduledDate)&&item.status==='Ongoing';
  const pct=item.milestones&&item.milestones.length?Math.round(item.milestones.filter(m=>m.status==='Completed').length/item.milestones.length*100):0;
  return (
    <div style={{background:'#061224',border:'1px solid '+(open?'#1e3a8f':over?'#440000':'#0d2040'),borderLeft:'4px solid '+(CAT_COLOR[item.cat]||'#4a7a9b'),borderRadius:6,marginBottom:8}}>
      <div onClick={()=>setOpen(!open)} style={{padding:'12px 16px',cursor:'pointer',display:'flex',alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:9,fontWeight:700,color:CAT_COLOR[item.cat],border:'1px solid '+(CAT_COLOR[item.cat]||'')+'44',borderRadius:2,padding:'2px 7px',flexShrink:0,marginTop:1}}>{item.cat}</span>
        <span style={{...mono,fontSize:10,color:'#2a5a7b',flexShrink:0,marginTop:1}}>{item.poamNumber}</span>
        <span style={{fontSize:12,fontWeight:700,color:'#d0e8f8',flex:1,lineHeight:1.4}}>{item.weakness}</span>
        <span style={{fontSize:9,fontWeight:700,color:STATUS_COLOR[item.status]||'#4a7a9b',border:'1px solid '+(STATUS_COLOR[item.status]||'#4a7a9b')+'44',borderRadius:2,padding:'2px 7px',flexShrink:0,whiteSpace:'nowrap'}}>{item.status}</span>
        {over&&<span style={{fontSize:9,color:'#ff6666',border:'1px solid #660000',borderRadius:2,padding:'2px 7px',flexShrink:0}}>⚠ OVERDUE</span>}
        <span style={{fontSize:10,color:'#2a4a6b',flexShrink:0,marginTop:1}}>{open?'▲':'▼'}</span>
      </div>
      <div style={{paddingLeft:16,paddingRight:16,paddingBottom:8,display:'flex',gap:12,flexWrap:'wrap',fontSize:10,color:'#4a7a9b'}}>
        <span>Source: <span style={{color:'#7a9ab8'}}>{item.source}</span></span>
        {item.control&&<span>Control: <span style={{color:'#7a9ab8'}}>{item.control}</span></span>}
        {item.cvss&&<span>CVSS: <span style={{color:'#7a9ab8'}}>{item.cvss}</span></span>}
        <span>POC: <span style={{color:'#7a9ab8'}}>{item.poc}</span></span>
        <span style={{color:over?'#ff6666':dl!=null&&dl<14?'#cc8800':'#4a7a9b'}}>Due: {fmtDate(item.scheduledDate)}{dl!=null&&item.status==='Ongoing'&&' ('+(dl<0?'overdue '+Math.abs(dl)+'d':dl+'d left')+')'}</span>
        {item.milestones&&item.milestones.length>0&&<span>Milestones: {pct}% ({item.milestones.filter(m=>m.status==='Completed').length}/{item.milestones.length})</span>}
      </div>
      {item.milestones&&item.milestones.length>0&&(
        <div style={{margin:'0 16px 8px',height:3,background:'#0a1520',borderRadius:2}}>
          <div style={{width:pct+'%',height:'100%',background:pct===100?'#00aa44':'#0055cc',borderRadius:2}}/>
        </div>
      )}
      {open&&(
        <div style={{borderTop:'1px solid #0d2040',padding:'14px 16px'}}>
          {item.description&&<div style={{marginBottom:10,fontSize:11,color:'#9ab0c8',lineHeight:1.7}}>{item.description}</div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 20px',marginBottom:12,fontSize:11}}>
            {item.cve&&<div><span style={{color:'#4a7a9b'}}>CVE: </span><span style={{color:'#a0c8e8'}}>{item.cve}</span></div>}
            {item.stigId&&<div><span style={{color:'#4a7a9b'}}>STIG ID: </span><span style={{color:'#a0c8e8'}}>{item.stigId}</span></div>}
            {item.resources&&<div><span style={{color:'#4a7a9b'}}>Resources: </span><span style={{color:'#a0c8e8'}}>{item.resources}</span></div>}
            <div><span style={{color:'#4a7a9b'}}>Created: </span><span style={{color:'#a0c8e8'}}>{fmtDate(item.createdAt)} by {item.createdBy}</span></div>
            {item.raJustification&&<div style={{gridColumn:'1/-1'}}><span style={{color:'#cc8800'}}>RA Justification: </span><span style={{color:'#a0c8e8'}}>{item.raJustification}</span></div>}
            {item.naExplanation&&<div style={{gridColumn:'1/-1'}}><span style={{color:'#4a7a9b'}}>NA Explanation: </span><span style={{color:'#a0c8e8'}}>{item.naExplanation}</span></div>}
            {item.comments&&<div style={{gridColumn:'1/-1'}}><span style={{color:'#4a7a9b'}}>Comments: </span><span style={{color:'#7a9ab8'}}>{item.comments}</span></div>}
          </div>
          {item.milestones&&(
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:'#6a9ab0',letterSpacing:1,marginBottom:6}}>MILESTONES</div>
              {(!item.milestones||item.milestones.length===0)&&<div style={{fontSize:11,color:'#2a4a6b',marginBottom:6}}>No milestones</div>}
              {(item.milestones||[]).map(ms=>(
                <div key={ms.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:5,fontSize:11,padding:'6px 10px',background:'#040e18',borderRadius:4,border:'1px solid '+(ms.status==='Completed'?'#004422':'#0d2040')}}>
                  <span>{ms.status==='Completed'?'✅':'⏳'}</span>
                  <span style={{flex:1,color:'#9ab0c8'}}>{ms.description}</span>
                  <span style={{color:'#4a7a9b',whiteSpace:'nowrap'}}>{fmtDate(ms.scheduledDate)}</span>
                  <span style={{fontSize:9,color:ms.status==='Completed'?'#00aa44':'#cc8800',border:'1px solid '+(ms.status==='Completed'?'#006622':'#cc880044'),borderRadius:2,padding:'1px 6px'}}>{ms.status}</span>
                </div>
              ))}
              {addingMs?(
                <div style={{background:'#0a1a30',border:'1px solid #1e3a5f',borderRadius:4,padding:10,marginTop:6}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                    <div style={{gridColumn:'1/-1'}}><Inp value={msForm.description} onChange={e=>setMsForm(f=>({...f,description:e.target.value}))} placeholder='Milestone description...'/></div>
                    <Inp type='date' value={msForm.scheduledDate} onChange={e=>setMsForm(f=>({...f,scheduledDate:e.target.value}))}/>
                    <Sel value={msForm.status} onChange={e=>setMsForm(f=>({...f,status:e.target.value}))}>
                      {['Pending','In Progress','Completed','Delayed'].map(s=><option key={s}>{s}</option>)}
                    </Sel>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <Btn variant='primary' onClick={async()=>{if(!msForm.description||!msForm.scheduledDate)return;await onAddMs(item.id,msForm);setMsForm({description:'',scheduledDate:'',status:'Pending'});setAddingMs(false);}}>ADD</Btn>
                    <Btn onClick={()=>setAddingMs(false)}>CANCEL</Btn>
                  </div>
                </div>
              ):(item.status==='Ongoing'||item.status==='Delayed')&&(
                <button onClick={()=>setAddingMs(true)} style={{...mono,background:'transparent',border:'1px dashed #1e3a5f',borderRadius:3,padding:'4px 12px',cursor:'pointer',color:'#2a5a7b',fontSize:10,marginTop:4,width:'100%'}}>+ ADD MILESTONE</button>
              )}
            </div>
          )}
          <div style={{display:'flex',gap:8,flexWrap:'wrap',paddingTop:10,borderTop:'1px solid #0d2040'}}>
            <Sel value={item.status} onChange={e=>onStatusChange(item.id,e.target.value)}>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
            </Sel>
            <Btn onClick={()=>onEdit(item)}>✎ EDIT</Btn>
            <Btn variant='danger' onClick={()=>{if(confirm('Delete this finding? This is logged.'))onDelete(item.id);}}>🗑 DELETE</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────
export default function POAMTracker() {
  const {member} = useAuth();
  const actor = member || 'demo';
  const [activeTab, setActiveTab] = useState('sc_poam');
  const [items,setItems]=useState([]);
  const [showForm,setShowForm]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [form,setForm]=useState(BLANK);
  const [errors,setErrors]=useState([]);
  const [submitting,setSubmitting]=useState(false);
  const [search,setSearch]=useState('');
  const [catFilter,setCatFilter]=useState('all');
  const [sortBy,setSortBy]=useState('cat');
  const [changelog,setChangelog]=useState([]);
  const [raLog,setRaLog]=useState([]);
  const [showRAForm,setShowRAForm]=useState(false);
  const [raForm,setRaForm]=useState({weakness:'',justification:'',aoDate:'',duration:'Lifetime'});
  const [showCCForm,setShowCCForm]=useState(false);
  const [ccForm,setCcForm]=useState({version:'',description:'',author:''});
  const setF=(k,v)=>setForm(f=>({...f,[k]:v}));

  const reload=useCallback(()=>{
    try{setItems(getAllPOAMs());}catch{setItems([]);}
    setChangelog(loadLog(CHANGE_LOG_KEY));
    setRaLog(loadLog(RA_LOG_KEY));
  },[]);
  useEffect(()=>{reload();},[reload]);

  const stats=useMemo(()=>({
    total:items.length,
    cat1:items.filter(i=>i.cat==='CAT I').length,
    cat2:items.filter(i=>i.cat==='CAT II').length,
    cat3:items.filter(i=>i.cat==='CAT III').length,
    overdue:items.filter(i=>isOverdue(i.scheduledDate)&&i.status==='Ongoing').length,
    open:items.filter(i=>i.status==='Ongoing'||i.status==='Delayed').length,
    closed:items.filter(i=>i.status==='Completed').length,
    ra:items.filter(i=>i.status==='Risk Accepted').length,
    na:items.filter(i=>i.status==='NA - Not a Finding'||i.status==='False Positive').length,
  }),[ items]);

  // Filter items per tab
  const tabItems=useMemo(()=>{
    let list=items;
    if(activeTab==='sc_poam') list=items.filter(i=>i.status==='Ongoing'||i.status==='Delayed');
    else if(activeTab==='stig') list=items.filter(i=>i.source==='STIG');
    else if(activeTab==='ra_life') list=items.filter(i=>i.status==='Risk Accepted');
    else if(activeTab==='ra_new') list=raLog;
    else if(activeTab==='na') list=items.filter(i=>i.status==='NA - Not a Finding'||i.status==='False Positive');
    else if(activeTab==='closed') list=items.filter(i=>i.status==='Completed');
    else if(activeTab==='change') return changelog;
    if(catFilter!=='all') list=list.filter(i=>i.cat===catFilter);
    if(search) list=list.filter(i=>(i.weakness||'').toLowerCase().includes(search.toLowerCase())||(i.poamNumber||'').toLowerCase().includes(search.toLowerCase())||(i.control||'').toLowerCase().includes(search.toLowerCase())||(i.cve||'').toLowerCase().includes(search.toLowerCase())||(i.stigId||'').toLowerCase().includes(search.toLowerCase()));
    if(sortBy==='cat') list=[...list].sort((a,b)=>(CAT_LEVELS[a.cat]||9)-(CAT_LEVELS[b.cat]||9));
    if(sortBy==='date') list=[...list].sort((a,b)=>new Date(a.scheduledDate)-new Date(b.scheduledDate));
    return list;
  },[items,activeTab,catFilter,search,sortBy,changelog,raLog]);

  const handleSubmit=async()=>{
    const errs=validatePOAM(form);
    if(errs.length){setErrors(errs);return;}
    setErrors([]);setSubmitting(true);
    const result=editItem?await updatePOAM(editItem.id,form,actor):await createPOAM(form,actor);
    setSubmitting(false);
    if(result.success){setForm(BLANK);setShowForm(false);setEditItem(null);reload();}
    else setErrors(result.errors||['Unknown error']);
  };

  const handleEdit=(item)=>{
    setEditItem(item);
    setForm({weakness:item.weakness,source:item.source,cat:item.cat,rawSeverity:item.rawSeverity||'',cvss:item.cvss||'',cve:item.cve||'',control:item.control||'',poc:item.poc,resources:item.resources||'',scheduledDate:item.scheduledDate,description:item.description||'',comments:item.comments||'',stigId:item.stigId||'',raJustification:item.raJustification||'',naExplanation:item.naExplanation||''});
    setShowForm(true);setErrors([]);window.scrollTo({top:0,behavior:'smooth'});
  };

  const submitRA=()=>{
    if(!raForm.weakness||!raForm.justification)return;
    const newRA={id:'ra_'+Date.now(),weakness:raForm.weakness,justification:raForm.justification,aoDate:raForm.aoDate,duration:raForm.duration,submittedBy:member?member.display_name||member.email:'Demo User',submittedAt:new Date().toISOString(),status:'Pending AO Review'};
    const updated=[...raLog,newRA];
    saveLog(RA_LOG_KEY,updated);setRaLog(updated);
    setRaForm({weakness:'',justification:'',aoDate:'',duration:'Lifetime'});setShowRAForm(false);
  };

  const submitCC=()=>{
    if(!ccForm.version||!ccForm.description)return;
    const entry={id:'cc_'+Date.now(),version:ccForm.version,description:ccForm.description,author:ccForm.author||member?member.display_name||member.email:'Demo User',date:new Date().toISOString()};
    const updated=[...changelog,entry];
    saveLog(CHANGE_LOG_KEY,updated);setChangelog(updated);
    setCcForm({version:'',description:'',author:''});setShowCCForm(false);
  };

  return (
    <div style={{padding:'20px 24px',maxWidth:920,...mono,color:'#c0d8f0'}}>
      {/* Header */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:700,color:'#e0e8f0',letterSpacing:1,marginBottom:2}}>📋 POAM TRACKER — STAGE 1</div>
        <div style={{fontSize:10,color:'#4a7a9b'}}>Plan of Action and Milestones · NIST 800-53 CA-5 · DoD 8510.01 RMF Step 4 · All actions audited</div>
      </div>

      {/* Stats */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <Stat label='TOTAL' val={stats.total}/>
        <Stat label='CAT I' val={stats.cat1} color='#cc2222' sub={stats.cat1>0?{text:'Remediate immediately',color:'#cc4444'}:null}/>
        <Stat label='CAT II' val={stats.cat2} color='#cc7700'/>
        <Stat label='CAT III' val={stats.cat3} color='#aaaa00'/>
        <Stat label='OVERDUE' val={stats.overdue} color={stats.overdue>0?'#ff6666':'#4a7a9b'} sub={stats.overdue>0?{text:'Action required',color:'#ff6666'}:null}/>
        <Stat label='OPEN' val={stats.open} color='#4a9fd4'/>
        <Stat label='CLOSED' val={stats.closed} color='#00aa44'/>
        <Stat label='RISK ACCEPTED' val={stats.ra} color='#cc8800'/>
        <Stat label='NA' val={stats.na} color='#555'/>
      </div>

      {/* CAT I Alert */}
      {stats.cat1>0&&(
        <div style={{background:'rgba(180,0,0,0.1)',border:'1px solid #660000',borderRadius:5,padding:'10px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:20}}>🚨</span>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:'#ff6666',letterSpacing:1}}>{stats.cat1} CAT I FINDING{stats.cat1>1?'S':''} REQUIRE IMMEDIATE REMEDIATION</div>
            <div style={{fontSize:10,color:'#884444'}}>STIG / DoD policy requires CAT I remediation within 30 days of discovery.</div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{display:'flex',gap:2,borderBottom:'1px solid #1e3a5f',marginBottom:16,flexWrap:'wrap'}}>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            title={tab.desc}
            style={{...mono,background:activeTab===tab.id?'#0d2040':'transparent',
              border:'none',borderBottom:activeTab===tab.id?'2px solid #4a9fd4':'2px solid transparent',
              padding:'7px 12px',cursor:'pointer',color:activeTab===tab.id?'#e0e8f0':'#4a7a9b',
              fontSize:10,fontWeight:activeTab===tab.id?700:400,whiteSpace:'nowrap'}}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Controls row — shown for most tabs */}
      {activeTab!=='change'&&activeTab!=='ra_new'&&(
        <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder={activeTab==='stig'?'Search STIG ID, finding...':'Search weakness, POAM ID, CVE, control...'}
            style={{...mono,flex:1,minWidth:180,background:'#061224',border:'1px solid #1e3a5f',borderRadius:3,padding:'6px 10px',color:'#c0d8f0',fontSize:11,outline:'none'}}/>
          {(activeTab==='sc_poam'||activeTab==='stig')&&(
            <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
              style={{...mono,background:'#061224',border:'1px solid #1e3a5f',borderRadius:3,padding:'6px 8px',color:'#c0d8f0',fontSize:11}}>
              <option value='all'>All CAT</option>
              {CATS.map(c=><option key={c}>{c}</option>)}
            </select>
          )}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            style={{...mono,background:'#061224',border:'1px solid #1e3a5f',borderRadius:3,padding:'6px 8px',color:'#c0d8f0',fontSize:11}}>
            <option value='cat'>Sort: CAT</option>
            <option value='date'>Sort: Due date</option>
          </select>
          <Btn onClick={()=>exportToCSV(activeTab==='ra_life'?items.filter(i=>i.status==='Risk Accepted'):activeTab==='closed'?items.filter(i=>i.status==='Completed'):activeTab==='na'?items.filter(i=>i.status==='NA - Not a Finding'||i.status==='False Positive'):activeTab==='stig'?items.filter(i=>i.source==='STIG'):items)}>⬇ EXPORT CSV</Btn>
          {activeTab==='sc_poam'&&<Btn variant='primary' onClick={()=>{if(!showForm){setEditItem(null);setForm(BLANK);setErrors([]);}setShowForm(!showForm);}}>{showForm?'✕ CANCEL':'+ NEW FINDING'}</Btn>}
          {activeTab==='ra_life'&&<Btn variant='primary' onClick={()=>setShowRAForm(!showRAForm)}>{showRAForm?'✕ CANCEL':'+ NEW RA REQUEST'}</Btn>}
        </div>
      )}

      {/* ── New Finding Form ── */}
      {showForm&&activeTab==='sc_poam'&&(
        <div style={{background:'#0a1a30',border:'1px solid '+(errors.length?'#660000':'#1e3a5f'),borderRadius:6,padding:20,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:'#e0e8f0',letterSpacing:1,marginBottom:12}}>{editItem?'✎ EDIT FINDING':'+ NEW POAM FINDING'}</div>
          {errors.length>0&&<div style={{background:'rgba(160,0,0,0.15)',border:'1px solid #660000',borderRadius:4,padding:'10px 14px',marginBottom:12}}>{errors.map((e,i)=><div key={i} style={{fontSize:11,color:'#ff9999',marginBottom:i<errors.length-1?4:0}}>⚠ {e}</div>)}</div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            <div style={{gridColumn:'1/-1'}}><Field label='WEAKNESS / FINDING NAME' required><Inp value={form.weakness} onChange={e=>setF('weakness',e.target.value)} placeholder='e.g. Missing patch allows RCE'/></Field></div>
            <Field label='SOURCE' required><Sel value={form.source} onChange={e=>setF('source',e.target.value)}><option value=''>Select...</option>{SOURCES.map(s=><option key={s}>{s}</option>)}</Sel></Field>
            <Field label='CAT LEVEL' required><Sel value={form.cat} onChange={e=>setF('cat',e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</Sel></Field>
            <Field label='SEVERITY'><Sel value={form.rawSeverity} onChange={e=>setF('rawSeverity',e.target.value)}>{SEVERITIES.map(s=><option key={s}>{s}</option>)}</Sel></Field>
            <Field label='CVSS (0-10)'><Inp value={form.cvss} onChange={e=>setF('cvss',e.target.value)} placeholder='e.g. 9.8'/></Field>
            <Field label='CVE'><Inp value={form.cve} onChange={e=>setF('cve',e.target.value)} placeholder='CVE-2024-XXXXX'/></Field>
            <Field label='STIG V-ID (if STIG source)'><Inp value={form.stigId} onChange={e=>setF('stigId',e.target.value)} placeholder='V-220679'/></Field>
            <Field label='NIST 800-53 CONTROL'><Sel value={form.control} onChange={e=>setF('control',e.target.value)}><option value=''>Select...</option>{CONTROLS_800_53.map(c=><option key={c}>{c}</option>)}</Sel></Field>
            <Field label='POINT OF CONTACT' required><Inp value={form.poc} onChange={e=>setF('poc',e.target.value)} placeholder='J. Smith / System Admin'/></Field>
            <Field label='SCHEDULED COMPLETION' required><Inp type='date' value={form.scheduledDate} onChange={e=>setF('scheduledDate',e.target.value)}/></Field>
            <div style={{gridColumn:'1/-1'}}><Field label='DESCRIPTION'><textarea value={form.description} onChange={e=>setF('description',e.target.value)} rows={3} placeholder='Finding detail and remediation steps...' style={{...mono,width:'100%',background:'#061224',border:'1px solid #1e3a5f',borderRadius:3,padding:'7px 10px',color:'#c0d8f0',fontSize:11,boxSizing:'border-box',outline:'none',resize:'vertical'}}/></Field></div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:4}}>
            <Btn variant='primary' onClick={handleSubmit} disabled={submitting}>{submitting?'SAVING…':editItem?'UPDATE →':'CREATE FINDING →'}</Btn>
            <Btn onClick={()=>{setShowForm(false);setEditItem(null);setForm(BLANK);setErrors([]); }}>CANCEL</Btn>
          </div>
        </div>
      )}

      {/* ── RA Request Form ── */}
      {showRAForm&&activeTab==='ra_life'&&(
        <div style={{background:'#0a1a30',border:'1px solid #1e3a5f',borderRadius:6,padding:18,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:'#cc8800',marginBottom:12,letterSpacing:1}}>📝 NEW RISK ACCEPTANCE REQUEST</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            <div style={{gridColumn:'1/-1'}}><Field label='WEAKNESS / RISK' required><Inp value={raForm.weakness} onChange={e=>setRaForm(f=>({...f,weakness:e.target.value}))} placeholder='Describe the risk being accepted...'/></Field></div>
            <div style={{gridColumn:'1/-1'}}><Field label='JUSTIFICATION' required><textarea value={raForm.justification} onChange={e=>setRaForm(f=>({...f,justification:e.target.value}))} rows={3} placeholder='Why this risk is acceptable and mitigating factors...' style={{...mono,width:'100%',background:'#061224',border:'1px solid #1e3a5f',borderRadius:3,padding:'7px 10px',color:'#c0d8f0',fontSize:11,boxSizing:'border-box',outline:'none',resize:'vertical'}}/></Field></div>
            <Field label='AO APPROVAL DATE'><Inp type='date' value={raForm.aoDate} onChange={e=>setRaForm(f=>({...f,aoDate:e.target.value}))}/></Field>
            <Field label='DURATION'><Sel value={raForm.duration} onChange={e=>setRaForm(f=>({...f,duration:e.target.value}))}><option>Lifetime</option><option>1 Year</option><option>2 Years</option><option>3 Years</option></Sel></Field>
          </div>
          <div style={{display:'flex',gap:10,marginTop:4}}>
            <Btn variant='primary' onClick={submitRA} disabled={!raForm.weakness||!raForm.justification}>SUBMIT RA REQUEST →</Btn>
            <Btn onClick={()=>setShowRAForm(false)}>CANCEL</Btn>
          </div>
        </div>
      )}

      {/* ── RA New Requests Tab ── */}
      {activeTab==='ra_new'&&(
        <div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <Btn variant='primary' onClick={()=>setShowRAForm(!showRAForm)}>{showRAForm?'✕ CANCEL':'+ SUBMIT RA REQUEST'}</Btn>
          </div>
          {showRAForm&&(
            <div style={{background:'#0a1a30',border:'1px solid #1e3a5f',borderRadius:6,padding:18,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:'#cc8800',marginBottom:12,letterSpacing:1}}>📝 NEW RISK ACCEPTANCE REQUEST</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                <div style={{gridColumn:'1/-1'}}><Field label='WEAKNESS / RISK' required><Inp value={raForm.weakness} onChange={e=>setRaForm(f=>({...f,weakness:e.target.value}))} placeholder='Describe the risk being accepted...'/></Field></div>
                <div style={{gridColumn:'1/-1'}}><Field label='JUSTIFICATION' required><textarea value={raForm.justification} onChange={e=>setRaForm(f=>({...f,justification:e.target.value}))} rows={3} placeholder='Why this risk is acceptable...' style={{...mono,width:'100%',background:'#061224',border:'1px solid #1e3a5f',borderRadius:3,padding:'7px 10px',color:'#c0d8f0',fontSize:11,boxSizing:'border-box',outline:'none',resize:'vertical'}}/></Field></div>
                <Field label='AO APPROVAL DATE'><Inp type='date' value={raForm.aoDate} onChange={e=>setRaForm(f=>({...f,aoDate:e.target.value}))}/></Field>
                <Field label='DURATION'><Sel value={raForm.duration} onChange={e=>setRaForm(f=>({...f,duration:e.target.value}))}><option>Lifetime</option><option>1 Year</option><option>2 Years</option><option>3 Years</option></Sel></Field>
              </div>
              <div style={{display:'flex',gap:10,marginTop:4}}>
                <Btn variant='primary' onClick={submitRA} disabled={!raForm.weakness||!raForm.justification}>SUBMIT →</Btn>
                <Btn onClick={()=>setShowRAForm(false)}>CANCEL</Btn>
              </div>
            </div>
          )}
          {raLog.length===0&&!showRAForm&&<div style={{textAlign:'center',padding:30,color:'#2a4a6b',fontSize:12}}>No pending RA requests</div>}
          {raLog.map(ra=>(
            <div key={ra.id} style={{background:'#061224',border:'1px solid #3a2200',borderLeft:'4px solid #cc8800',borderRadius:6,padding:'12px 16px',marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:'#d0e8f8',flex:1}}>{ra.weakness}</span>
                <span style={{fontSize:9,color:ra.status.includes('Pending')?'#cc8800':'#00aa44',border:'1px solid #cc880044',borderRadius:2,padding:'2px 8px'}}>{ra.status}</span>
              </div>
              <div style={{fontSize:11,color:'#9ab0c8',marginBottom:4}}>{ra.justification}</div>
              <div style={{fontSize:10,color:'#4a7a9b'}}>Duration: {ra.duration} · Submitted: {fmtDate(ra.submittedAt)} by {ra.submittedBy}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Change Control Tab ── */}
      {activeTab==='change'&&(
        <div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <Btn variant='primary' onClick={()=>setShowCCForm(!showCCForm)}>{showCCForm?'✕ CANCEL':'+ LOG CHANGE'}</Btn>
          </div>
          {showCCForm&&(
            <div style={{background:'#0a1a30',border:'1px solid #1e3a5f',borderRadius:6,padding:18,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:'#4a9fd4',marginBottom:12,letterSpacing:1}}>🔄 LOG POAM CHANGE</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                <Field label='VERSION' required><Inp value={ccForm.version} onChange={e=>setCcForm(f=>({...f,version:e.target.value}))} placeholder='e.g. v1.1 or 2026-04-07-A'/></Field>
                <Field label='AUTHOR'><Inp value={ccForm.author} onChange={e=>setCcForm(f=>({...f,author:e.target.value}))} placeholder='F. Ballard / ISSM'/></Field>
                <div style={{gridColumn:'1/-1'}}><Field label='CHANGE DESCRIPTION' required><textarea value={ccForm.description} onChange={e=>setCcForm(f=>({...f,description:e.target.value}))} rows={3} placeholder='What was changed and why...' style={{...mono,width:'100%',background:'#061224',border:'1px solid #1e3a5f',borderRadius:3,padding:'7px 10px',color:'#c0d8f0',fontSize:11,boxSizing:'border-box',outline:'none',resize:'vertical'}}/></Field></div>
              </div>
              <Btn variant='primary' onClick={submitCC} disabled={!ccForm.version||!ccForm.description}>LOG CHANGE →</Btn>
            </div>
          )}
          {changelog.length===0&&!showCCForm&&<div style={{textAlign:'center',padding:30,color:'#2a4a6b',fontSize:12}}>No change log entries — log your first version change above</div>}
          {[...changelog].reverse().map(entry=>(
            <div key={entry.id} style={{background:'#061224',border:'1px solid #0d2040',borderLeft:'4px solid #4a9fd4',borderRadius:6,padding:'12px 16px',marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:700,color:'#4a9fd4',border:'1px solid #4a9fd444',borderRadius:2,padding:'2px 8px'}}>{entry.version}</span>
                <span style={{fontSize:10,color:'#4a7a9b'}}>{fmtDate(entry.date)}</span>
                <span style={{fontSize:10,color:'#4a7a9b',marginLeft:'auto'}}>{entry.author}</span>
              </div>
              <div style={{fontSize:11,color:'#9ab0c8',lineHeight:1.6}}>{entry.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── POAM Item List (all non-special tabs) ── */}
      {activeTab!=='change'&&activeTab!=='ra_new'&&(
        <div>
          {tabItems.length===0&&<div style={{textAlign:'center',padding:30,color:'#2a4a6b',fontSize:12}}>
            {activeTab==='sc_poam'?'No open findings — click \'+ NEW FINDING\' to add':
             activeTab==='stig'?'No STIG-sourced findings':
             activeTab==='ra_life'?'No lifetime risk acceptances — use \'+ NEW RA REQUEST\' to submit':
             activeTab==='na'?'No NA / Not a Finding items':
             activeTab==='closed'?'No closed findings':'No items'}
          </div>}
          {tabItems.map(item=>(
            <POAMCard key={item.id} item={item}
              onEdit={handleEdit}
              onDelete={async(id)=>{await deletePOAM(id,actor);reload();}}
              onAddMs={async(pid,ms)=>{await addMilestone(pid,ms,actor);reload();}}
              onStatusChange={async(id,status)=>{await updatePOAM(id,{status},actor);reload();}}/>
          ))}
        </div>
      )}

      <div style={{marginTop:14,fontSize:10,color:'#2a4a6b',lineHeight:1.8,background:'rgba(0,0,0,0.2)',border:'1px solid #0d2040',borderRadius:4,padding:'8px 14px'}}>
        Stage 1 · localStorage · All actions AU-2 logged · XSS sanitized · eMASS CSV export · Phase 4: GovCloud RDS (one env var)  
      </div>
    </div>
  );
}