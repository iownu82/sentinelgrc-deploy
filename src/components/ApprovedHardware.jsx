import { useState, useMemo } from 'react';
const mono = { fontFamily:"'Courier New',monospace" };
const IS_HW = true;
const STORE_KEY = IS_HW ? 'rr_approved_hw_v1' : 'rr_approved_sw_v1';

const STATUS_COLOR = { 'Approved':'#00aa44', 'Approved with Conditions':'#cc8800', 'Pending Review':'#cc6600', 'Deprecated':'#555', 'Denied':'#cc2222' };
const CAT_COLORS_HW = { 'Workstation':'#0055cc', 'Server':'#7700cc', 'Network Device':'#cc6600', 'Peripheral':'#00aa44', 'Storage':'#aaaa00', 'Mobile':'#cc44aa', 'Other':'#555' };
const CAT_COLORS_SW = { 'Operating System':'#7700cc', 'Security Tool':'#cc2222', 'Office / Productivity':'#0055cc', 'Development':'#cc6600', 'Network / Monitoring':'#00aa44', 'Database':'#aaaa00', 'Virtualization':'#cc44aa', 'Communication':'#555', 'Other':'#555' };
const CAT_COLORS = IS_HW ? CAT_COLORS_HW : CAT_COLORS_SW;
const STIG_COLOR = { 'Yes':'#00aa44', 'No':'#cc2222', 'Partial':'#cc8800' };

const DEMO_HW = [
  { id:'hw1', name:'Dell Precision 5560', cat:'Workstation', mfg:'Dell', model:'5560', status:'Approved', classification:'CUI', stigAvail:'Yes', itr:'ITR-001', approvedBy:'F. Ballard / ISSM', conditions:'', notes:'Standard ISSM/ISSO workstation' },
  { id:'hw2', name:'Cisco Catalyst 9300', cat:'Network Device', mfg:'Cisco', model:'C9300-48P', status:'Approved', classification:'CUI', stigAvail:'Yes', itr:'ITR-002', approvedBy:'F. Ballard / ISSM', conditions:'STIG applied prior to deployment', notes:'Core switch — apply STIG before production' },
  { id:'hw3', name:'YubiKey 5 NFC', cat:'Peripheral', mfg:'Yubico', model:'5 NFC', status:'Approved', classification:'Unclassified', stigAvail:'No', itr:'ITR-003', approvedBy:'F. Ballard / ISSM', conditions:'FIDO2 PIN required', notes:'Hardware MFA token — FIDO2 + PIN configured' },
];
const DEMO_SW = [
  { id:'sw1', name:'Windows 10 Enterprise', cat:'Operating System', vendor:'Microsoft', version:'22H2', latestPatch:'KB5035845', status:'Approved', license:'Government', classification:'CUI', stigAvail:'Yes', stigBench:'Microsoft Windows 10 STIG V2R8', itr:'N/A', minorUpgrade:'Yes — auto approved', approvedBy:'F. Ballard / ISSM', notes:'Minor updates auto-approved · Major upgrade to Win11 requires ITR' },
  { id:'sw2', name:'Tenable Nessus Professional', cat:'Security Tool', vendor:'Tenable', version:'10.x', latestPatch:'10.7.4', status:'Approved', license:'Commercial', classification:'CUI', stigAvail:'Partial', stigBench:'', itr:'ITR-004', minorUpgrade:'Yes — auto approved', approvedBy:'F. Ballard / ISSM', notes:'ACAS scanner — required for pre/post scan ITR process' },
  { id:'sw3', name:'Microsoft Office 365', cat:'Office / Productivity', vendor:'Microsoft', version:'Current Channel', latestPatch:'Current', status:'Approved', license:'Government', classification:'CUI', stigAvail:'Yes', stigBench:'Microsoft Office 365 ProPlus STIG', itr:'N/A', minorUpgrade:'Yes — auto approved', approvedBy:'F. Ballard / ISSM', notes:'GCC tenant required for CUI data' },
];

function loadItems() {
  try { const s=JSON.parse(localStorage.getItem(STORE_KEY)||'null'); return s||null; } catch { return null; }
}

export default function ApprovedList({ readOnly = false }) {
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded,  setExpanded]  = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [form,      setForm]      = useState({});
  const [items,     setItems]     = useState(() => loadItems() || (IS_HW ? DEMO_HW : DEMO_SW));

  const save = (newItems) => { setItems(newItems); try { localStorage.setItem(STORE_KEY, JSON.stringify(newItems)); } catch {} };
  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  const cats = [...new Set(items.map(i=>i.cat))].sort();
  const statuses = [...new Set(items.map(i=>i.status))].sort();

  const filtered = useMemo(()=>items.filter(i=>{
    const ms = !search || i.name?.toLowerCase().includes(search.toLowerCase()) ||
               (i.mfg||i.vendor||'').toLowerCase().includes(search.toLowerCase()) ||
               (i.model||i.version||'').toLowerCase().includes(search.toLowerCase()) ||
               (i.itr||'').toLowerCase().includes(search.toLowerCase());
    const mc = catFilter==='all' || i.cat===catFilter;
    const mst = statusFilter==='all' || i.status===statusFilter;
    return ms && mc && mst;
  }), [items, search, catFilter, statusFilter]);

  const addItem = () => {
    if (!form.name) return;
    const newItem = { ...form, id:'item_'+Date.now(), status: form.status||'Pending Review' };
    save([...items, newItem]);
    setForm({}); setShowAdd(false);
  };

  const nameField = IS_HW ? 'Device Name' : 'Software Name';
  const secondField = IS_HW ? 'Manufacturer' : 'Vendor';
  const thirdField = IS_HW ? 'Model' : 'Approved Version(s)';

  return (
    <div style={{padding:'20px 24px',maxWidth:860,...mono,color:'#c0d8f0'}}>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:16,fontWeight:700,color:'#e0e8f0',letterSpacing:1,marginBottom:2}}>
          {IS_HW ? '🖥️ APPROVED HARDWARE LIST' : '💿 APPROVED SOFTWARE LIST'}
        </div>
        <div style={{fontSize:10,color:'#4a7a9b',lineHeight:1.8}}>
          {IS_HW
            ? 'ISSM/ISSO maintained · Read-only for System/Network Admins · All items ITR-approved'
            : 'ISSM/ISSO maintained · Minor upgrades noted · Major version changes require ITR'}
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        {[
          ['Total', items.length, '#4a7a9b'],
          ['Approved', items.filter(i=>i.status==='Approved').length, '#00aa44'],
          ['Conditional', items.filter(i=>i.status==='Approved with Conditions').length, '#cc8800'],
          ['Pending', items.filter(i=>i.status==='Pending Review').length, '#cc6600'],
          ['Deprecated', items.filter(i=>i.status==='Deprecated').length, '#555'],
        ].map(([label,val,color])=>(
          <div key={label} style={{background:'#061224',border:'1px solid #1e3a5f',
            borderRadius:4,padding:'6px 12px',textAlign:'center',minWidth:70}}>
            <div style={{fontSize:18,fontWeight:700,color}}>{val}</div>
            <div style={{fontSize:9,color:'#4a7a9b'}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder={`Search ${IS_HW?'hardware':'software'}...`}
          style={{...mono,flex:1,minWidth:160,background:'#061224',border:'1px solid #1e3a5f',
            borderRadius:3,padding:'5px 10px',color:'#c0d8f0',fontSize:11,outline:'none'}}/>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
          style={{...mono,background:'#061224',border:'1px solid #1e3a5f',
            borderRadius:3,padding:'5px 8px',color:'#c0d8f0',fontSize:11}}>
          <option value='all'>All categories</option>
          {cats.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          style={{...mono,background:'#061224',border:'1px solid #1e3a5f',
            borderRadius:3,padding:'5px 8px',color:'#c0d8f0',fontSize:11}}>
          <option value='all'>All statuses</option>
          {statuses.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={()=>setShowAdd(!showAdd)}
          style={{...mono,background:showAdd?'#333':'#0055cc',border:'none',
            borderRadius:3,padding:'5px 14px',cursor:'pointer',
            color:showAdd?'#888':'#fff',fontSize:11,fontWeight:700}}>
          {showAdd?'✕ CANCEL':'+ ADD ITEM'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{background:'#0a1a30',border:'1px solid #1e3a5f',borderRadius:6,padding:16,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:'#a0b8d0',marginBottom:12,letterSpacing:1}}>
            ADD {IS_HW?'HARDWARE':'SOFTWARE'} ITEM
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            {[
              [nameField,'name','Required'],
              [secondField,IS_HW?'mfg':'vendor',''],
              [thirdField,IS_HW?'model':'version',''],
              ['ITR Number','itr','e.g. ITR-005'],
              ['Status','status',''],
              ['Category','cat',''],
            ].map(([label,key,ph])=>(
              <div key={key}>
                <label style={{display:'block',fontSize:9,color:'#4a7a9b',letterSpacing:2,marginBottom:4}}>{label.toUpperCase()}</label>
                {key==='status'?(
                  <select value={form[key]||''} onChange={e=>setF(key,e.target.value)}
                    style={{...mono,width:'100%',background:'#061224',border:'1px solid #1e3a5f',
                      borderRadius:3,padding:'7px 10px',color:'#c0d8f0',fontSize:11,boxSizing:'border-box'}}>
                    <option value=''>Select status</option>
                    {Object.keys(STATUS_COLOR).map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                ):key==='cat'?(
                  <select value={form[key]||''} onChange={e=>setF(key,e.target.value)}
                    style={{...mono,width:'100%',background:'#061224',border:'1px solid #1e3a5f',
                      borderRadius:3,padding:'7px 10px',color:'#c0d8f0',fontSize:11,boxSizing:'border-box'}}>
                    <option value=''>Select category</option>
                    {Object.keys(CAT_COLORS).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                ):(
                  <input value={form[key]||''} onChange={e=>setF(key,e.target.value)}
                    placeholder={ph}
                    style={{...mono,width:'100%',background:'#061224',border:'1px solid #1e3a5f',
                      borderRadius:3,padding:'7px 10px',color:'#c0d8f0',fontSize:11,
                      boxSizing:'border-box',outline:'none'}}/>
                )}
              </div>
            ))}
          </div>
          <input value={form.notes||''} onChange={e=>setF('notes',e.target.value)}
            placeholder='Notes / conditions...'
            style={{...mono,width:'100%',background:'#061224',border:'1px solid #1e3a5f',
              borderRadius:3,padding:'7px 10px',color:'#c0d8f0',fontSize:11,
              boxSizing:'border-box',outline:'none',marginBottom:12}}/>
          <button onClick={addItem} disabled={!form.name}
            style={{...mono,background:form.name?'#0055cc':'#1a2a3a',border:'none',
              borderRadius:3,padding:'8px 20px',cursor:form.name?'pointer':'not-allowed',
              color:form.name?'#fff':'#2a4a6b',fontSize:11,fontWeight:700}}>
            ADD ITEM →
          </button>
        </div>
      )}

      {/* List */}
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {filtered.map(item=>{
          const isOpen = expanded===item.id;
          const statusColor = STATUS_COLOR[item.status]||'#4a7a9b';
          const catColor    = CAT_COLORS[item.cat]||'#4a7a9b';
          return (
            <div key={item.id} onClick={()=>setExpanded(isOpen?null:item.id)}
              style={{background:'#061224',border:'1px solid '+(isOpen?'#1e3a8f':'#0d2040'),
                borderLeft:'3px solid '+statusColor,borderRadius:5,padding:'10px 14px',
                cursor:'pointer',transition:'border-color 0.15s'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <span style={{fontSize:9,fontWeight:700,color:catColor,
                  border:'1px solid '+catColor+'44',borderRadius:2,padding:'1px 6px',whiteSpace:'nowrap'}}>
                  {item.cat}
                </span>
                <span style={{fontSize:12,fontWeight:700,color:'#d0e8f8',flex:1}}>{item.name}</span>
                <span style={{fontSize:9,fontWeight:700,color:statusColor,
                  border:'1px solid '+statusColor+'44',borderRadius:2,padding:'1px 8px',whiteSpace:'nowrap'}}>
                  {item.status}
                </span>
                {item.stigAvail && (
                  <span style={{fontSize:9,color:STIG_COLOR[item.stigAvail]||'#555',
                    border:'1px solid '+(STIG_COLOR[item.stigAvail]||'#555')+'44',
                    borderRadius:2,padding:'1px 6px'}}>
                    STIG: {item.stigAvail}
                  </span>
                )}
                <span style={{fontSize:10,color:'#2a4a6b',flexShrink:0}}>{isOpen?'▲':'▼'}</span>
              </div>
              <div style={{fontSize:10,color:'#2a5a7b',marginTop:3}}>
                {IS_HW
                  ? (item.mfg||'') + (item.model?' · '+item.model:'') + (item.itr?' · '+item.itr:'')
                  : (item.vendor||'') + (item.version?' · v'+item.version:'') + (item.latestPatch?' · Patch: '+item.latestPatch:'') + (item.itr&&item.itr!=='N/A'?' · '+item.itr:'')
                }
              </div>
              {isOpen && (
                <div style={{borderTop:'1px solid #0d2040',marginTop:10,paddingTop:10,
                  display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,fontSize:11}}>
                  {IS_HW ? <>
                    {item.classification&&<div><span style={{color:'#4a7a9b'}}>Classification: </span><span style={{color:'#a0c8e8'}}>{item.classification}</span></div>}
                    {item.approvedBy&&<div><span style={{color:'#4a7a9b'}}>Approved by: </span><span style={{color:'#a0c8e8'}}>{item.approvedBy}</span></div>}
                    {item.conditions&&<div style={{gridColumn:'1/-1'}}><span style={{color:'#cc8800'}}>⚠ Conditions: </span><span style={{color:'#a0c8e8'}}>{item.conditions}</span></div>}
                  </> : <>
                    {item.license&&<div><span style={{color:'#4a7a9b'}}>License: </span><span style={{color:'#a0c8e8'}}>{item.license}</span></div>}
                    {item.classification&&<div><span style={{color:'#4a7a9b'}}>Classification: </span><span style={{color:'#a0c8e8'}}>{item.classification}</span></div>}
                    {item.minorUpgrade&&<div style={{gridColumn:'1/-1'}}><span style={{color:'#4a7a9b'}}>Minor upgrades: </span><span style={{color:item.minorUpgrade.includes('auto')?'#00aa44':'#cc8800'}}>{item.minorUpgrade}</span></div>}
                    {item.stigBench&&<div style={{gridColumn:'1/-1'}}><span style={{color:'#4a7a9b'}}>STIG: </span><span style={{color:'#a0c8e8'}}>{item.stigBench}</span></div>}
                    {item.conditions&&<div style={{gridColumn:'1/-1'}}><span style={{color:'#cc8800'}}>⚠ Conditions: </span><span style={{color:'#a0c8e8'}}>{item.conditions}</span></div>}
                  </>}
                  {item.notes&&<div style={{gridColumn:'1/-1'}}><span style={{color:'#4a7a9b'}}>Notes: </span><span style={{color:'#7a9ab8'}}>{item.notes}</span></div>}
                  {item.approvedBy&&!IS_HW&&<div><span style={{color:'#4a7a9b'}}>Approved by: </span><span style={{color:'#a0c8e8'}}>{item.approvedBy}</span></div>}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length===0&&(
          <div style={{textAlign:'center',padding:30,color:'#2a4a6b',fontSize:12}}>
            No items match your search
          </div>
        )}
      </div>

      <div style={{marginTop:16,fontSize:10,color:'#2a4a6b',lineHeight:1.8,
        background:'rgba(0,0,0,0.2)',border:'1px solid #0d2040',borderRadius:4,padding:'8px 14px'}}>
        Read-only access for System Admins, Network Admins, Security Admins · ISSM/ISSO can add/edit items · All items require ITR approval · Phase 4: synced to GovCloud RDS
      </div>
    </div>
  );
}
