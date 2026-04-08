import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './Auth.jsx';
import {
  getAllPOAMs, createPOAM, updatePOAM, deletePOAM,
  addMilestone, exportToCSV, validatePOAM, CAT_LEVELS
} from '../services/poamService.js';

const mono = { fontFamily:"'Courier New',monospace" };

// ── Constants ─────────────────────────────────────────────────────────────
const CAT_COLOR  = { 'CAT I':'#cc2222', 'CAT II':'#cc7700', 'CAT III':'#aaaa00' };
const STATUS_COLOR = {
  'Ongoing':'#4a7a9b', 'Completed':'#00aa44', 'Risk Accepted':'#cc8800',
  'False Positive':'#555', 'Delayed':'#cc4400'
};
const SOURCES = ['ACAS/Nessus','STIG','SCA Finding','Self-Assessment','CCRI','Pen Test','Other'];
const CATS    = ['CAT I','CAT II','CAT III'];
const STATUSES= ['Ongoing','Completed','Risk Accepted','False Positive','Delayed'];
const SEVERITIES = ['Critical','High','Medium','Low','Informational'];
const CONTROLS_800_53 = [
  'AC-1','AC-2','AC-3','AC-5','AC-6','AC-7','AC-8','AC-11','AC-17',
  'AU-2','AU-3','AU-9','AU-10','AU-11','AU-12',
  'CA-2','CA-5','CA-7',
  'CM-2','CM-6','CM-7','CM-8',
  'IA-2','IA-4','IA-5','IA-8','IA-11',
  'IR-2','IR-4','IR-5','IR-6',
  'MA-2','MA-4','MA-5',
  'MP-2','MP-4','MP-5','MP-6',
  'PE-2','PE-3','PE-6',
  'PL-2','PL-4',
  'PS-3','PS-4','PS-5','PS-6',
  'RA-3','RA-5',
  'SA-9','SA-11',
  'SC-5','SC-8','SC-12','SC-13','SC-28',
  'SI-2','SI-3','SI-4','SI-7','SI-10',
].sort();

const BLANK_FORM = {
  weakness:'', source:'', cat:'CAT II', rawSeverity:'High', cvss:'',
  cve:'', control:'', poc:'', resources:'', scheduledDate:'',
  description:'', comments:''
};

// ── Helpers ───────────────────────────────────────────────────────────────
const fmtDate   = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
const isOverdue = d => d && new Date(d) < new Date() ;
const daysLeft  = d => {
  if (!d) return null;
  const diff = Math.ceil((new Date(d) - new Date()) / 86400000);
  return diff;
};

// ── Stat card ──────────────────────────────────────────────────────────────
const Stat = ({label,val,color='#4a7a9b',sub}) => (
  <div style={{background:'#061224',border:'1px solid #0d2040',borderRadius:5,
    padding:'10px 14px',minWidth:90,textAlign:'center'}}>
    <div style={{fontSize:22,fontWeight:700,color,fontFamily:"'Courier New',monospace"}}>{val}</div>
    <div style={{fontSize:9,color:'#4a7a9b',marginTop:1}}>{label}</div>
    {sub&&<div style={{fontSize:9,color:sub.color||'#cc4400',marginTop:2}}>{sub.text}</div>}
  </div>
);

// ── Form field ─────────────────────────────────────────────────────────────
const Field = ({label,children,required,note}) => (
  <div style={{marginBottom:12}}>
    <label style={{display:'block',fontSize:9,color:'#4a7a9b',
      letterSpacing:2,marginBottom:4}}>
      {label}{required&&<span style={{color:'#cc4444'}}> *</span>}
    </label>
    {children}
    {note&&<div style={{fontSize:9,color:'#2a5a7b',marginTop:3}}>{note}</div>}
  </div>
);

const Input = ({value,onChange,placeholder,type='text',disabled}) => (
  <input type={type} value={value||''} onChange={onChange} placeholder={placeholder}
    disabled={disabled}
    style={{...mono,width:'100%',background:disabled?'#040e18':'#061224',
      border:'1px solid #1e3a5f',borderRadius:3,padding:'7px 10px',
      color:'#c0d8f0',fontSize:11,boxSizing:'border-box',outline:'none'}}/>
);

const Select = ({value,onChange,children,disabled}) => (
  <select value={value||''} onChange={onChange} disabled={disabled}
    style={{...mono,width:'100%',background:disabled?'#040e18':'#061224',
      border:'1px solid #1e3a5f',borderRadius:3,padding:'7px 10px',
      color:'#c0d8f0',fontSize:11,boxSizing:'border-box'}}>
    {children}
  </select>
);

// ── POAM item card ─────────────────────────────────────────────────────────
function POAMCard({ item, onEdit, onDelete, onAddMilestone, onUpdateStatus }) {
  const [open,       setOpen]       = useState(false);
  const [msForm,     setMsForm]     = useState({ description:'', scheduledDate:'', status:'Pending' });
  const [addingMs,   setAddingMs]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dl   = daysLeft(item.scheduledDate);
  const over = isOverdue(item.scheduledDate) && item.status === 'Ongoing';
  const pct  = item.milestones?.length
    ? Math.round((item.milestones.filter(m=>m.status==='Completed').length / item.milestones.length) * 100)
    : 0;

  const submitMs = async () => {
    if (!msForm.description.trim() || !msForm.scheduledDate) return;
    setSubmitting(true);
    await onAddMilestone(item.id, msForm);
    setMsForm({description:'',scheduledDate:'',status:'Pending'});
    setAddingMs(false);
    setSubmitting(false);
  };

  return (
    <div style={{
      background:'#061224',
      border:'1px solid '+(open?'#1e3a8f':over?'#440000':'#0d2040'),
      borderLeft:'4px solid '+(CAT_COLOR[item.cat]||'#4a7a9b'),
      borderRadius:6,marginBottom:8,transition:'border-color 0.2s'
    }}>
      {/* Header row */}
      <div onClick={()=>setOpen(!open)}
        style={{padding:'12px 16px',cursor:'pointer',display:'flex',
          alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
        {/* CAT badge */}
        <span style={{fontSize:9,fontWeight:700,color:CAT_COLOR[item.cat],
          border:'1px solid '+CAT_COLOR[item.cat]+'44',borderRadius:2,
          padding:'2px 7px',flexShrink:0,marginTop:1}}>{item.cat}</span>
        {/* Number */}
        <span style={{...mono,fontSize:10,color:'#2a5a7b',flexShrink:0,marginTop:1}}>
          {item.poamNumber}
        </span>
        {/* Weakness */}
        <span style={{fontSize:12,fontWeight:700,color:'#d0e8f8',flex:1,lineHeight:1.4}}>
          {item.weakness}
        </span>
        {/* Status */}
        <span style={{fontSize:9,fontWeight:700,
          color:STATUS_COLOR[item.status]||'#4a7a9b',
          border:'1px solid '+(STATUS_COLOR[item.status]||'#4a7a9b')+'44',
          borderRadius:2,padding:'2px 7px',flexShrink:0,whiteSpace:'nowrap'}}>
          {item.status}
        </span>
        {/* Overdue flag */}
        {over && (
          <span style={{fontSize:9,color:'#ff6666',border:'1px solid #660000',
            borderRadius:2,padding:'2px 7px',flexShrink:0}}>⚠ OVERDUE</span>
        )}
        <span style={{fontSize:10,color:'#2a4a6b',flexShrink:0,marginTop:1}}>
          {open?'▲':'▼'}
        </span>
      </div>

      {/* Summary row */}
      <div style={{paddingLeft:16,paddingRight:16,paddingBottom:10,
        display:'flex',gap:12,flexWrap:'wrap',fontSize:10,color:'#4a7a9b'}}>
        <span>Source: <span style={{color:'#7a9ab8'}}>{item.source}</span></span>
        {item.control&&<span>Control: <span style={{color:'#7a9ab8'}}>{item.control}</span></span>}
        {item.rawSeverity&&<span>Severity: <span style={{color:'#7a9ab8'}}>{item.rawSeverity}</span></span>}
        {item.cvss&&<span>CVSS: <span style={{color:'#7a9ab8'}}>{item.cvss}</span></span>}
        <span>POC: <span style={{color:'#7a9ab8'}}>{item.poc}</span></span>
        <span style={{color:over?'#ff6666':dl!=null&&dl<14?'#cc8800':'#4a7a9b'}}>
          Due: {fmtDate(item.scheduledDate)}
          {dl!=null&&item.status==='Ongoing'&&<span> ({dl<0?'overdue '+(Math.abs(dl))+'d':dl+'d left'})</span>}
        </span>
        {item.milestones?.length>0&&(
          <span>Milestones: {pct}% complete ({item.milestones.filter(m=>m.status==='Completed').length}/{item.milestones.length})</span>
        )}
      </div>

      {/* Milestone progress bar */}
      {item.milestones?.length>0&&(
        <div style={{margin:'0 16px 10px',height:3,background:'#0a1520',borderRadius:2}}>
          <div style={{width:pct+'%',height:'100%',
            background:pct===100?'#00aa44':'#0055cc',borderRadius:2,transition:'width 0.3s'}}/>
        </div>
      )}

      {/* Expanded detail */}
      {open&&(
        <div style={{borderTop:'1px solid #0d2040',padding:'14px 16px'}}>
          {/* Description */}
          {item.description&&(
            <div style={{marginBottom:12,fontSize:11,color:'#9ab0c8',lineHeight:1.7}}>
              {item.description}
            </div>
          )}

          {/* Detail grid */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 20px',
            marginBottom:14,fontSize:11}}>
            {item.cve&&<div><span style={{color:'#4a7a9b'}}>CVE: </span><span style={{color:'#a0c8e8'}}>{item.cve}</span></div>}
            {item.resources&&<div><span style={{color:'#4a7a9b'}}>Resources: </span><span style={{color:'#a0c8e8'}}>{item.resources}</span></div>}
            <div><span style={{color:'#4a7a9b'}}>Created: </span><span style={{color:'#a0c8e8'}}>{fmtDate(item.createdAt)} by {item.createdBy}</span></div>
            <div><span style={{color:'#4a7a9b'}}>Updated: </span><span style={{color:'#a0c8e8'}}>{fmtDate(item.updatedAt)} by {item.updatedBy}</span></div>
            {item.comments&&<div style={{gridColumn:'1/-1'}}><span style={{color:'#4a7a9b'}}>Comments: </span><span style={{color:'#a0c8e8'}}>{item.comments}</span></div>}
          </div>

          {/* Milestones */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,color:'#6a9ab0',
              letterSpacing:1,marginBottom:8}}>MILESTONES</div>
            {item.milestones?.length===0&&<div style={{fontSize:11,color:'#2a4a6b',marginBottom:8}}>No milestones added</div>}
            {item.milestones?.map(ms=>(
              <div key={ms.id} style={{display:'flex',alignItems:'center',gap:10,
                marginBottom:6,fontSize:11,padding:'6px 10px',
                background:'#040e18',borderRadius:4,
                border:'1px solid '+(ms.status==='Completed'?'#004422':'#0d2040')}}>
                <span style={{fontSize:14,flexShrink:0}}>
                  {ms.status==='Completed'?'✅':'⏳'}
                </span>
                <span style={{flex:1,color:'#9ab0c8'}}>{ms.description}</span>
                <span style={{color:'#4a7a9b',whiteSpace:'nowrap'}}>{fmtDate(ms.scheduledDate)}</span>
                <span style={{fontSize:9,color:ms.status==='Completed'?'#00aa44':'#cc8800',
                  border:'1px solid '+(ms.status==='Completed'?'#006622':'#cc880044'),
                  borderRadius:2,padding:'1px 6px',flexShrink:0}}>{ms.status}</span>
              </div>
            ))}

            {/* Add milestone form */}
            {addingMs?(
              <div style={{background:'#0a1a30',border:'1px solid #1e3a5f',
                borderRadius:4,padding:12,marginTop:8}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                  <div style={{gridColumn:'1/-1'}}>
                    <Input value={msForm.description}
                      onChange={e=>setMsForm(f=>({...f,description:e.target.value}))}
                      placeholder='Milestone description...'/>
                  </div>
                  <Input type='date' value={msForm.scheduledDate}
                    onChange={e=>setMsForm(f=>({...f,scheduledDate:e.target.value}))}/>
                  <Select value={msForm.status}
                    onChange={e=>setMsForm(f=>({...f,status:e.target.value}))}>
                    {['Pending','In Progress','Completed','Delayed'].map(s=><option key={s}>{s}</option>)}
                  </Select>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={submitMs} disabled={!msForm.description||!msForm.scheduledDate||submitting}
                    style={{...mono,background:'#0055cc',border:'none',borderRadius:3,
                      padding:'5px 14px',cursor:'pointer',color:'#fff',fontSize:10,fontWeight:700}}>
                    {submitting?'ADDING…':'ADD MILESTONE'}
                  </button>
                  <button onClick={()=>setAddingMs(false)}
                    style={{...mono,background:'transparent',border:'1px solid #1e3a5f',
                      borderRadius:3,padding:'5px 10px',cursor:'pointer',color:'#4a7a9b',fontSize:10}}>
                    CANCEL
                  </button>
                </div>
              </div>
            ):(
              <button onClick={()=>setAddingMs(true)}
                style={{...mono,background:'transparent',border:'1px dashed #1e3a5f',
                  borderRadius:3,padding:'5px 14px',cursor:'pointer',
                  color:'#2a5a7b',fontSize:10,marginTop:4,width:'100%'}}>
                + ADD MILESTONE
              </button>
            )}
          </div>

          {/* Actions */}
          <div style={{display:'flex',gap:8,flexWrap:'wrap',paddingTop:10,
            borderTop:'1px solid #0d2040'}}>
            <Select value={item.status}
              onChange={e=>onUpdateStatus(item.id, e.target.value)}
              disabled={false}>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
            </Select>
            <button onClick={()=>onEdit(item)}
              style={{...mono,background:'transparent',border:'1px solid #1e3a5f',
                borderRadius:3,padding:'5px 12px',cursor:'pointer',
                color:'#4a9fd4',fontSize:10,fontWeight:700,whiteSpace:'nowrap'}}>
              ✎ EDIT
            </button>
            <button onClick={()=>{ if(confirm('Delete this POAM finding? This action is logged.')) onDelete(item.id); }}
              style={{...mono,background:'transparent',border:'1px solid #440000',
                borderRadius:3,padding:'5px 12px',cursor:'pointer',
                color:'#884444',fontSize:10,whiteSpace:'nowrap'}}>
              🗑 DELETE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function POAMTracker() {
  const { member } = useAuth();
  const actor = member || 'demo';

  const [items,      setItems]      = useState([]);
  const [showForm,   setShowForm]   = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [form,       setForm]       = useState(BLANK_FORM);
  const [errors,     setErrors]     = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy,     setSortBy]     = useState('cat'); // cat | date | status

  const reload = useCallback(() => {
    try { setItems(getAllPOAMs()); } catch { setItems([]); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  // Stats
  const stats = useMemo(()=>({
    total:   items.length,
    cat1:    items.filter(i=>i.cat==='CAT I').length,
    cat2:    items.filter(i=>i.cat==='CAT II').length,
    cat3:    items.filter(i=>i.cat==='CAT III').length,
    overdue: items.filter(i=>isOverdue(i.scheduledDate)&&i.status==='Ongoing').length,
    open:    items.filter(i=>i.status==='Ongoing'||i.status==='Delayed').length,
    closed:  items.filter(i=>i.status==='Completed').length,
  }), [items]);

  // Filtered + sorted list
  const filtered = useMemo(()=>{
    let list = items;
    if (catFilter!=='all') list = list.filter(i=>i.cat===catFilter);
    if (statusFilter!=='all') list = list.filter(i=>i.status===statusFilter);
    if (search) list = list.filter(i=>
      i.weakness.toLowerCase().includes(search.toLowerCase()) ||
      i.poamNumber.toLowerCase().includes(search.toLowerCase()) ||
      (i.cve||'').toLowerCase().includes(search.toLowerCase()) ||
      (i.control||'').toLowerCase().includes(search.toLowerCase()) ||
      (i.poc||'').toLowerCase().includes(search.toLowerCase())
    );
    if (sortBy==='cat') list = [...list].sort((a,b)=>
      (CAT_LEVELS[a.cat]||9)-(CAT_LEVELS[b.cat]||9));
    if (sortBy==='date') list = [...list].sort((a,b)=>
      new Date(a.scheduledDate)-new Date(b.scheduledDate));
    if (sortBy==='status') list = [...list].sort((a,b)=>
      a.status.localeCompare(b.status));
    return list;
  }, [items, catFilter, statusFilter, search, sortBy]);

  const handleSubmit = async () => {
    const errs = validatePOAM(form);
    if (errs.length) { setErrors(errs); return; }
    setErrors([]); setSubmitting(true);

    let result;
    if (editItem) {
      result = await updatePOAM(editItem.id, form, actor);
    } else {
      result = await createPOAM(form, actor);
    }

    setSubmitting(false);
    if (result.success) {
      setForm(BLANK_FORM); setShowForm(false); setEditItem(null); reload();
    } else {
      setErrors(result.errors || ['Unknown error']);
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setForm({
      weakness: item.weakness, source: item.source, cat: item.cat,
      rawSeverity: item.rawSeverity||'', cvss: item.cvss||'',
      cve: item.cve||'', control: item.control||'', poc: item.poc,
      resources: item.resources||'', scheduledDate: item.scheduledDate,
      description: item.description||'', comments: item.comments||''
    });
    setShowForm(true); setErrors([]);
    window.scrollTo({top:0,behavior:'smooth'});
  };

  const handleDelete = async (id) => {
    await deletePOAM(id, actor); reload();
  };

  const handleAddMs = async (poamId, ms) => {
    await addMilestone(poamId, ms, actor); reload();
  };

  const handleUpdateStatus = async (id, status) => {
    await updatePOAM(id, { status }, actor); reload();
  };

  const cancelForm = () => {
    setShowForm(false); setEditItem(null); setForm(BLANK_FORM); setErrors([]);
  };

  return (
    <div style={{padding:'20px 24px',maxWidth:880,...mono,color:'#c0d8f0'}}>
      {/* Header */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:700,color:'#e0e8f0',letterSpacing:1,marginBottom:2}}>
          📋 POAM TRACKER — STAGE 1
        </div>
        <div style={{fontSize:10,color:'#4a7a9b',lineHeight:1.8}}>
          Plan of Action & Milestones · NIST 800-53 CA-5 · DoD 8510.01 RMF Step 4<br/>
          All actions logged · Input sanitized · eMASS-compatible export
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        <Stat label='TOTAL' val={stats.total} />
        <Stat label='CAT I' val={stats.cat1} color='#cc2222'
          sub={stats.cat1>0?{text:'Critical — remediate immediately',color:'#cc4444'}:null}/>
        <Stat label='CAT II' val={stats.cat2} color='#cc7700'/>
        <Stat label='CAT III' val={stats.cat3} color='#aaaa00'/>
        <Stat label='OVERDUE' val={stats.overdue} color={stats.overdue>0?'#ff6666':'#4a7a9b'}
          sub={stats.overdue>0?{text:'Requires immediate action',color:'#ff6666'}:null}/>
        <Stat label='OPEN' val={stats.open} color='#4a9fd4'/>
        <Stat label='CLOSED' val={stats.closed} color='#00aa44'/>
      </div>

      {/* CAT I critical alert */}
      {stats.cat1 > 0 && (
        <div style={{background:'rgba(180,0,0,0.1)',border:'1px solid #660000',
          borderRadius:5,padding:'10px 16px',marginBottom:14,
          display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:20}}>🚨</span>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:'#ff6666',letterSpacing:1}}>
              {stats.cat1} CAT I FINDING{stats.cat1>1?'S':''} REQUIRE IMMEDIATE REMEDIATION
            </div>
            <div style={{fontSize:10,color:'#884444'}}>
              CAT I findings represent critical vulnerabilities. STIG / DoD policy requires remediation within 30 days.
            </div>
          </div>
        </div>
      )}

      {/* Controls row */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder='Search weakness, POAM ID, CVE, control, POC...'
          style={{...mono,flex:1,minWidth:200,background:'#061224',border:'1px solid #1e3a5f',
            borderRadius:3,padding:'6px 10px',color:'#c0d8f0',fontSize:11,outline:'none'}}/>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
          style={{...mono,background:'#061224',border:'1px solid #1e3a5f',
            borderRadius:3,padding:'6px 8px',color:'#c0d8f0',fontSize:11}}>
          <option value='all'>All CAT levels</option>
          {CATS.map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          style={{...mono,background:'#061224',border:'1px solid #1e3a5f',
            borderRadius:3,padding:'6px 8px',color:'#c0d8f0',fontSize:11}}>
          <option value='all'>All statuses</option>
          {STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{...mono,background:'#061224',border:'1px solid #1e3a5f',
            borderRadius:3,padding:'6px 8px',color:'#c0d8f0',fontSize:11}}>
          <option value='cat'>Sort: CAT level</option>
          <option value='date'>Sort: Due date</option>
          <option value='status'>Sort: Status</option>
        </select>
        <button onClick={()=>exportToCSV(filtered)}
          style={{...mono,background:'transparent',border:'1px solid #1e3a5f',
            borderRadius:3,padding:'6px 12px',cursor:'pointer',
            color:'#4a7a9b',fontSize:10,fontWeight:700,whiteSpace:'nowrap'}}>
          ⬇ EXPORT eMASS CSV
        </button>
        <button onClick={()=>{if(!showForm){setEditItem(null);setForm(BLANK_FORM);setErrors([]);}setShowForm(!showForm);}}
          style={{...mono,background:showForm?'#333':'#0055cc',border:'none',
            borderRadius:3,padding:'6px 14px',cursor:'pointer',
            color:showForm?'#888':'#fff',fontSize:11,fontWeight:700,whiteSpace:'nowrap'}}>
          {showForm?(editItem?'✕ CANCEL EDIT':'✕ CANCEL'):'+ NEW FINDING'}
        </button>
      </div>

      {/* Form */}
      {showForm&&(
        <div style={{background:'#0a1a30',border:'1px solid '+(errors.length?'#660000':'#1e3a5f'),
          borderRadius:6,padding:20,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:'#e0e8f0',letterSpacing:1,marginBottom:12}}>
            {editItem?'✎ EDIT FINDING':'+ ADD POAM FINDING'}
          </div>

          {errors.length>0&&(
            <div style={{background:'rgba(160,0,0,0.15)',border:'1px solid #660000',
              borderRadius:4,padding:'10px 14px',marginBottom:14}}>
              {errors.map((e,i)=>(
                <div key={i} style={{fontSize:11,color:'#ff9999',marginBottom:i<errors.length-1?4:0}}>
                  ⚠ {e}
                </div>
              ))}
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            <div style={{gridColumn:'1/-1'}}>
              <Field label='WEAKNESS / FINDING NAME' required>
                <Input value={form.weakness} onChange={e=>setF('weakness',e.target.value)}
                  placeholder='e.g. Unauthorized access possible due to missing patch'/>
              </Field>
            </div>
            <Field label='SOURCE' required>
              <Select value={form.source} onChange={e=>setF('source',e.target.value)}>
                <option value=''>Select source...</option>
                {SOURCES.map(s=><option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label='CAT LEVEL' required>
              <Select value={form.cat} onChange={e=>setF('cat',e.target.value)}>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label='RAW SEVERITY'>
              <Select value={form.rawSeverity} onChange={e=>setF('rawSeverity',e.target.value)}>
                {SEVERITIES.map(s=><option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label='CVSS SCORE (0.0 – 10.0)'>
              <Input value={form.cvss} onChange={e=>setF('cvss',e.target.value)}
                placeholder='e.g. 9.8' type='text'/>
            </Field>
            <Field label='CVE (if applicable)'>
              <Input value={form.cve} onChange={e=>setF('cve',e.target.value)}
                placeholder='e.g. CVE-2024-12345'/>
            </Field>
            <Field label='NIST 800-53 CONTROL'>
              <Select value={form.control} onChange={e=>setF('control',e.target.value)}>
                <option value=''>Select control...</option>
                {CONTROLS_800_53.map(c=><option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label='POINT OF CONTACT' required>
              <Input value={form.poc} onChange={e=>setF('poc',e.target.value)}
                placeholder='e.g. J. Smith / System Admin'/>
            </Field>
            <Field label='RESOURCES REQUIRED'>
              <Input value={form.resources} onChange={e=>setF('resources',e.target.value)}
                placeholder='e.g. 4 hrs engineering time'/>
            </Field>
            <Field label='SCHEDULED COMPLETION DATE' required>
              <Input type='date' value={form.scheduledDate}
                onChange={e=>setF('scheduledDate',e.target.value)}/>
            </Field>
            <div style={{gridColumn:'1/-1'}}>
              <Field label='DESCRIPTION / FINDING DETAIL'>
                <textarea value={form.description}
                  onChange={e=>setF('description',e.target.value)}
                  placeholder='Detailed description of the finding, impact, and remediation steps...'
                  rows={3}
                  style={{...mono,width:'100%',background:'#061224',border:'1px solid #1e3a5f',
                    borderRadius:3,padding:'7px 10px',color:'#c0d8f0',fontSize:11,
                    boxSizing:'border-box',outline:'none',resize:'vertical'}}/>
              </Field>
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <Field label='COMMENTS'>
                <Input value={form.comments} onChange={e=>setF('comments',e.target.value)}
                  placeholder='Additional comments...'/>
              </Field>
            </div>
          </div>

          <div style={{display:'flex',gap:10,marginTop:4}}>
            <button onClick={handleSubmit} disabled={submitting}
              style={{...mono,background:'#0055cc',border:'none',borderRadius:4,
                padding:'9px 24px',cursor:'pointer',color:'#fff',
                fontSize:12,fontWeight:700,letterSpacing:1}}>
              {submitting?'SAVING…':editItem?'UPDATE FINDING →':'CREATE FINDING →'}
            </button>
            <button onClick={cancelForm}
              style={{...mono,background:'transparent',border:'1px solid #1e3a5f',
                borderRadius:4,padding:'9px 16px',cursor:'pointer',
                color:'#4a7a9b',fontSize:12}}>
              CANCEL
            </button>
          </div>

          <div style={{fontSize:9,color:'#2a4a6b',marginTop:10,lineHeight:1.8}}>
            All fields sanitized and validated · Action logged to audit trail · eMASS-compatible format
          </div>
        </div>
      )}

      {/* POAM list */}
      {filtered.length===0&&(
        <div style={{textAlign:'center',padding:40,color:'#2a4a6b',fontSize:12}}>
          {items.length===0
            ? 'No POAM findings yet — click "+ NEW FINDING" to add your first finding'
            : 'No findings match your filter'}
        </div>
      )}

      {filtered.map(item=>(
        <POAMCard key={item.id} item={item}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddMilestone={handleAddMs}
          onUpdateStatus={handleUpdateStatus}/>
      ))}

      {/* Footer note */}
      <div style={{marginTop:16,fontSize:10,color:'#2a4a6b',lineHeight:1.8,
        background:'rgba(0,0,0,0.2)',border:'1px solid #0d2040',borderRadius:4,padding:'8px 14px'}}>
        Stage 1: localStorage persistence · All actions audit-logged (AU-2, AU-10) · Input sanitized (XSS prevention) ·
        eMASS CSV export · Phase 4: GovCloud RDS via one env var swap (zero code changes)
      </div>
    </div>
  );
}
