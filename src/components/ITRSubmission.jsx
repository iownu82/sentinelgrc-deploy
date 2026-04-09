import { useState, useEffect } from 'react';
import { useAuth } from './Auth.jsx';
import { auditLog } from '../security/auditLogger.js';

const mono = { fontFamily:"'Courier New',monospace" };
const STORE_KEY = 'rr_itr_submissions_v1';
const ITR_COUNTER_KEY = 'rr_itr_counter_v1';

function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)||'[]'); } catch { return []; } }
function save(d) { try { localStorage.setItem(STORE_KEY,JSON.stringify(d)); } catch {} }
function nextITRNumber() {
  const n = parseInt(localStorage.getItem(ITR_COUNTER_KEY)||'0')+1;
  localStorage.setItem(ITR_COUNTER_KEY,n.toString());
  return 'ITR-'+String(n).padStart(3,'0');
}

const BLANK = {
  vendor:'',product:'',version:'',type:'Software',
  justification:'',businessNeed:'',
  inEnv:'No',envImpact:'',
  drivers:'',rssUrl:'',
};

const STATUS_COLOR = {
  'Draft':'#555','Submitted':'#0055cc','Under Review':'#cc7700',
  'SCA Approved':'#cc8800','ISSM Approved — Signed':'#00aa44',
  'Rejected':'#cc2222','Withdrawn':'#555',
};

export default function ITRSubmission() {
  const { member, role } = useAuth();
  const actor = member?.email || member?.display_name || 'Demo User';
  const isISSM = role==='issm'||role==='isso';
  const [submissions, setSubmissions] = useState(()=>load());
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState(BLANK);
  const [errors,      setErrors]      = useState([]);
  const [saved,       setSaved]       = useState(false);
  const [activeTab,   setActiveTab]   = useState('all');
  const [expanded,    setExpanded]    = useState(null);
  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  const filtered = submissions.filter(s=>{
    if(activeTab==='pending') return s.stage!=='ISSM Approved — Signed'&&s.stage!=='Rejected'&&s.stage!=='Withdrawn';
    if(activeTab==='approved') return s.stage==='ISSM Approved — Signed';
    if(activeTab==='mine') return s.submittedBy===actor;
    return true;
  });

  const validate = () => {
    const e = [];
    if(!form.vendor.trim()) e.push('Vendor is required');
    if(!form.product.trim()) e.push('Product / device name is required');
    if(!form.justification.trim()) e.push('Justification is required');
    if(!form.businessNeed.trim()) e.push('Business need is required');
    return e;
  };

  const handleSubmit = () => {
    const e = validate(); if(e.length){setErrors(e);return;}
    const itrNum = nextITRNumber();
    const title = 'ITR - '+form.product+(form.version?' ('+form.version+')':'');
    const newITR = {
      id: 'itr_'+Date.now(),
      itrNumber: itrNum,
      title,
      vendor: form.vendor,
      product: form.product,
      version: form.version,
      type: form.type,
      justification: form.justification,
      businessNeed: form.businessNeed,
      inEnv: form.inEnv,
      envImpact: form.envImpact,
      drivers: form.drivers,
      rssUrl: form.rssUrl,
      stage: 'Submitted',
      submittedBy: actor,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issoNotes: '',
      scaNotes: '',
    };
    const updated = [newITR,...submissions];
    save(updated); setSubmissions(updated);
    auditLog('ITR_SUBMITTED',{actorId:actor,orgId:'demo',targetId:newITR.id,
      details:{itrNumber:itrNum,title,vendor:form.vendor}});
    setForm(BLANK); setShowForm(false); setErrors([]); setSaved(true);
    setTimeout(()=>setSaved(false),3000);
  };

  const updateStage = (id, stage, notes) => {
    const updated = submissions.map(s=>
      s.id===id?{...s,stage,issoNotes:notes||s.issoNotes,updatedAt:new Date().toISOString()}:s
    );
    save(updated); setSubmissions(updated);
    auditLog('ITR_STAGE_UPDATED',{actorId:actor,orgId:'demo',targetId:id,details:{stage}});
  };

  return(
    <div style={{padding:'20px 24px',maxWidth:880,...mono,color:'var(--rr-text)'}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:700,color:'var(--rr-white)',letterSpacing:1,marginBottom:2}}>
          📋 IT REQUEST (ITR) — SUBMISSION
        </div>
        <div style={{fontSize:10,color:'var(--rr-mute)',lineHeight:1.8}}>
          Submit hardware or software requests for ISSO/ISSM review · All submissions audit-logged<br/>
          {isISSM?'ISSM/ISSO view — can review and update status':'System Admin view — submit and track your requests'}
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {[
          ['Total',submissions.length,'var(--rr-mute)'],
          ['Pending',submissions.filter(s=>s.stage==='Submitted'||s.stage==='Under Review').length,'#cc7700'],
          ['Approved',submissions.filter(s=>s.stage==='ISSM Approved — Signed').length,'#00aa44'],
          ['Rejected',submissions.filter(s=>s.stage==='Rejected').length,'#cc2222'],
        ].map(([l,v,c])=>(
          <div key={l} style={{background:'var(--rr-panel)',border:'1px solid #0d2040',borderRadius:5,
            padding:'8px 14px',textAlign:'center',minWidth:80}}>
            <div style={{fontSize:20,fontWeight:700,color:c,...mono}}>{v}</div>
            <div style={{fontSize:9,color:'var(--rr-mute)'}}>{l}</div>
          </div>
        ))}
        {saved&&(
          <div style={{background:'rgba(0,120,50,0.1)',border:'1px solid #006622',borderRadius:5,
            padding:'8px 14px',display:'flex',alignItems:'center',gap:8,color:'#00cc66',fontSize:11,fontWeight:700}}>
            ✅ {form.itrNumber||'ITR'} submitted successfully
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{display:'flex',gap:2,borderBottom:'1px solid #1e3a5f',marginBottom:14}}>
        {[['all','All ITRs'],['mine','My Submissions'],['pending','Pending Review'],['approved','Approved']].map(([id,lbl])=>(
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{...mono,background:activeTab===id?'var(--rr-panel-alt)':'transparent',
              border:'none',borderBottom:activeTab===id?'2px solid #4a9fd4':'2px solid transparent',
              padding:'6px 12px',cursor:'pointer',color:activeTab===id?'var(--rr-white)':'var(--rr-mute)',
              fontSize:10,fontWeight:activeTab===id?700:400}}>
            {lbl}
          </button>
        ))}
        <button onClick={()=>{setShowForm(!showForm);setErrors([]);}}
          style={{...mono,background:showForm?'#333':'#0055cc',border:'none',borderRadius:3,
            padding:'5px 14px',cursor:'pointer',color:showForm?'#888':'#fff',
            fontSize:10,fontWeight:700,marginLeft:'auto'}}>
          {showForm?'✕ CANCEL':'+ SUBMIT ITR'}
        </button>
      </div>

      {/* Submission form */}
      {showForm&&(
        <div style={{background:'var(--rr-panel-alt)',border:'1px solid #1e3a5f',borderRadius:6,padding:20,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--rr-white)',letterSpacing:1,marginBottom:14}}>
            NEW IT REQUEST
          </div>
          {errors.length>0&&(
            <div style={{background:'rgba(160,0,0,0.15)',border:'1px solid #660000',borderRadius:4,
              padding:'10px 14px',marginBottom:12}}>
              {errors.map((e,i)=><div key={i} style={{fontSize:11,color:'#ff9999'}}>⚠ {e}</div>)}
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            {[
              ['VENDOR *','vendor','e.g. Cisco, Microsoft, Tenable'],
              ['PRODUCT / DEVICE NAME *','product','e.g. Cisco 9800, NetBackup'],
              ['VERSION / MODEL','version','e.g. v10.4, WLC v17.9'],
              ['TYPE','type',null],
            ].map(([label,key,ph])=>(
              <div key={key} style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:9,color:'var(--rr-mute)',letterSpacing:2,marginBottom:4}}>
                  {label}
                </label>
                {key==='type'?(
                  <select value={form[key]} onChange={e=>setF(key,e.target.value)}
                    style={{...mono,width:'100%',background:'var(--rr-panel)',border:'1px solid #1e3a5f',
                      borderRadius:3,padding:'7px 10px',color:'var(--rr-text)',fontSize:11,boxSizing:'border-box'}}>
                    {['Software','Hardware','Firmware','Service'].map(o=><option key={o}>{o}</option>)}
                  </select>
                ):(
                  <input value={form[key]} onChange={e=>setF(key,e.target.value)} placeholder={ph}
                    style={{...mono,width:'100%',background:'var(--rr-panel)',border:'1px solid #1e3a5f',
                      borderRadius:3,padding:'7px 10px',color:'var(--rr-text)',fontSize:11,
                      boxSizing:'border-box',outline:'none'}}/>
                )}
              </div>
            ))}
            <div style={{gridColumn:'1/-1',marginBottom:12}}>
              <label style={{display:'block',fontSize:9,color:'var(--rr-mute)',letterSpacing:2,marginBottom:4}}>
                BUSINESS JUSTIFICATION *
              </label>
              <textarea value={form.justification} onChange={e=>setF('justification',e.target.value)}
                rows={3} placeholder='Why is this hardware/software needed? What problem does it solve?'
                style={{...mono,width:'100%',background:'var(--rr-panel)',border:'1px solid #1e3a5f',
                  borderRadius:3,padding:'7px 10px',color:'var(--rr-text)',fontSize:11,
                  boxSizing:'border-box',outline:'none',resize:'vertical'}}/>
            </div>
            <div style={{gridColumn:'1/-1',marginBottom:12}}>
              <label style={{display:'block',fontSize:9,color:'var(--rr-mute)',letterSpacing:2,marginBottom:4}}>
                BUSINESS NEED / USE CASE *
              </label>
              <textarea value={form.businessNeed} onChange={e=>setF('businessNeed',e.target.value)}
                rows={2} placeholder='Specific business need this resource fulfills'
                style={{...mono,width:'100%',background:'var(--rr-panel)',border:'1px solid #1e3a5f',
                  borderRadius:3,padding:'7px 10px',color:'var(--rr-text)',fontSize:11,
                  boxSizing:'border-box',outline:'none',resize:'vertical'}}/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:'block',fontSize:9,color:'var(--rr-mute)',letterSpacing:2,marginBottom:4}}>
                ALREADY IN ENVIRONMENT?
              </label>
              <select value={form.inEnv} onChange={e=>setF('inEnv',e.target.value)}
                style={{...mono,width:'100%',background:'var(--rr-panel)',border:'1px solid #1e3a5f',
                  borderRadius:3,padding:'7px 10px',color:'var(--rr-text)',fontSize:11,boxSizing:'border-box'}}>
                {['No','Yes','Partial'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:'block',fontSize:9,color:'var(--rr-mute)',letterSpacing:2,marginBottom:4}}>
                REQUIRED DRIVERS / DEPENDENCIES
              </label>
              <input value={form.drivers} onChange={e=>setF('drivers',e.target.value)}
                placeholder='e.g. Java 17, .NET 6.0'
                style={{...mono,width:'100%',background:'var(--rr-panel)',border:'1px solid #1e3a5f',
                  borderRadius:3,padding:'7px 10px',color:'var(--rr-text)',fontSize:11,
                  boxSizing:'border-box',outline:'none'}}/>
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:4}}>
            <button onClick={handleSubmit}
              style={{...mono,background:'#0055cc',border:'none',borderRadius:4,padding:'9px 24px',
                cursor:'pointer',color:'#fff',fontSize:12,fontWeight:700,letterSpacing:1}}>
              SUBMIT ITR FOR REVIEW →
            </button>
            <button onClick={()=>{setShowForm(false);setErrors([]);}}
              style={{...mono,background:'transparent',border:'1px solid #1e3a5f',borderRadius:4,
                padding:'9px 16px',cursor:'pointer',color:'var(--rr-mute)',fontSize:12}}>
              CANCEL
            </button>
          </div>
          <div style={{fontSize:9,color:'var(--rr-mute)',marginTop:8}}>
            Submitted ITRs go to ISSO for SIA review, then SCA recommendation, then ISSM signature
          </div>
        </div>
      )}

      {/* ITR list */}
      {filtered.length===0&&(
        <div style={{textAlign:'center',padding:30,color:'var(--rr-mute)',fontSize:12}}>
          {submissions.length===0?'No ITRs submitted yet — click "+ SUBMIT ITR" to create your first request':'No ITRs match this filter'}
        </div>
      )}
      {filtered.map(itr=>{
        const isOpen=expanded===itr.id;
        const sc = STATUS_COLOR[itr.stage]||'var(--rr-mute)';
        return(
          <div key={itr.id}
            style={{background:'var(--rr-panel)',border:'1px solid '+(isOpen?'#1e3a8f':'var(--rr-panel-alt)'),
              borderLeft:'4px solid '+sc,borderRadius:6,marginBottom:8}}>
            <div onClick={()=>setExpanded(isOpen?null:itr.id)}
              style={{padding:'12px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
              <span style={{...mono,fontSize:10,color:'#4a9fd4',fontWeight:700,flexShrink:0}}>{itr.itrNumber}</span>
              <span style={{fontSize:12,fontWeight:700,color:'var(--rr-white)',flex:1}}>{itr.title}</span>
              <span style={{fontSize:9,color:itr.type==='Hardware'?'#4a9fd4':'#9a6aff',
                border:'1px solid '+(itr.type==='Hardware'?'#4a9fd4':'#9a6aff')+'44',
                borderRadius:2,padding:'1px 6px'}}>{itr.type}</span>
              <span style={{fontSize:9,fontWeight:700,color:sc,
                border:'1px solid '+sc+'44',borderRadius:2,padding:'2px 8px',whiteSpace:'nowrap'}}>{itr.stage}</span>
              <span style={{fontSize:10,color:'var(--rr-mute)',flexShrink:0}}>{isOpen?'▲':'▼'}</span>
            </div>
            <div style={{paddingLeft:16,paddingBottom:8,fontSize:10,color:'var(--rr-mute)'}}>
              Vendor: <span style={{color:'var(--rr-text-dim)'}}>{itr.vendor}</span>
              {itr.version&&' · v'+itr.version}
              {' · Submitted by '+itr.submittedBy}
              {' · '+new Date(itr.submittedAt).toLocaleDateString()}
            </div>
            {isOpen&&(
              <div style={{borderTop:'1px solid #0d2040',padding:'14px 16px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 20px',marginBottom:12,fontSize:11}}>
                  <div><span style={{color:'var(--rr-mute)'}}>Already in env: </span><span style={{color:'var(--rr-text-dim)'}}>{itr.inEnv}</span></div>
                  {itr.drivers&&<div><span style={{color:'var(--rr-mute)'}}>Dependencies: </span><span style={{color:'var(--rr-text-dim)'}}>{itr.drivers}</span></div>}
                  <div style={{gridColumn:'1/-1'}}><span style={{color:'var(--rr-mute)'}}>Justification: </span><span style={{color:'var(--rr-text-dim)'}}>{itr.justification}</span></div>
                  <div style={{gridColumn:'1/-1'}}><span style={{color:'var(--rr-mute)'}}>Business need: </span><span style={{color:'var(--rr-text-dim)'}}>{itr.businessNeed}</span></div>
                  {itr.issoNotes&&<div style={{gridColumn:'1/-1'}}><span style={{color:'#cc8800'}}>ISSO notes: </span><span style={{color:'var(--rr-text-dim)'}}>{itr.issoNotes}</span></div>}
                </div>
                {isISSM&&(
                  <div>
                    <div style={{fontSize:10,color:'var(--rr-mute)',letterSpacing:1,marginBottom:8,fontWeight:700}}>ISSM/ISSO REVIEW ACTIONS</div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {['Under Review','SCA Approved','ISSM Approved — Signed','Rejected'].map(stage=>(
                        <button key={stage} onClick={()=>updateStage(itr.id,stage,'')}
                          style={{...mono,background:itr.stage===stage?'#1a3a1a':'transparent',
                            border:'1px solid '+(STATUS_COLOR[stage]||'var(--rr-border-md)')+'88',
                            borderRadius:3,padding:'4px 10px',cursor:'pointer',
                            color:STATUS_COLOR[stage]||'var(--rr-mute)',fontSize:9,fontWeight:700}}>
                          {stage}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div style={{marginTop:14,fontSize:10,color:'var(--rr-mute)',lineHeight:1.8,
        background:'rgba(0,0,0,0.2)',border:'1px solid #0d2040',borderRadius:4,padding:'8px 14px'}}>
        ITR naming: ITR - [Product] ([Version]) · All submissions audit-logged · ISSM can update stage ·
        Phase 4: Notion/RDS sync, pre/post ACAS scan upload, SCA portal
      </div>
    </div>
  );
}