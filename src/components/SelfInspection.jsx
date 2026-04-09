import { useState, useEffect } from 'react';
import { useAuth } from './Auth.jsx';
import { auditLog } from '../security/auditLogger.js';

const mono = { fontFamily:"'Courier New',monospace" };
const STORE_KEY = 'rr_self_inspection_v1';

// ── Master inspection checklist ───────────────────────────────────────────
const CHECKLIST = [
  // Access Control
  { id:'ac1',  family:'AC', control:'AC-2',  role:'sysadmin', cat:'CAT II', title:'Account Management', desc:'Verify all user accounts are current, active accounts have valid justification, and inactive accounts are disabled within 30 days.' },
  { id:'ac2',  family:'AC', control:'AC-3',  role:'sysadmin', cat:'CAT II', title:'Access Enforcement', desc:'Verify users only have access required for their role. Review group memberships and permission assignments.' },
  { id:'ac3',  family:'AC', control:'AC-6',  role:'sysadmin', cat:'CAT II', title:'Least Privilege', desc:'Confirm no standard users have administrator privileges. Verify privileged accounts are used only for administrative tasks.' },
  { id:'ac4',  family:'AC', control:'AC-7',  role:'sysadmin', cat:'CAT II', title:'Unsuccessful Logon Attempts', desc:'Confirm account lockout is configured — maximum 3 failed attempts before lockout.' },
  { id:'ac5',  family:'AC', control:'AC-11', role:'sysadmin', cat:'CAT II', title:'Session Lock / Screen Lock', desc:'Verify screen lock activates after 15 minutes of inactivity on all workstations.' },
  { id:'ac6',  family:'AC', control:'AC-17', role:'sysadmin', cat:'CAT II', title:'Remote Access', desc:'Review all remote access methods. Confirm VPN is required and MFA is enforced for all remote sessions.' },
  // Audit and Accountability
  { id:'au1',  family:'AU', control:'AU-2',  role:'sysadmin', cat:'CAT II', title:'Audit Events', desc:'Verify audit logging is enabled on all systems. Confirm logon/logoff, privilege use, and object access events are captured.' },
  { id:'au2',  family:'AU', control:'AU-9',  role:'sysadmin', cat:'CAT II', title:'Protection of Audit Information', desc:'Confirm audit logs are write-protected and only accessible to authorized administrators.' },
  { id:'au3',  family:'AU', control:'AU-11', role:'sysadmin', cat:'CAT II', title:'Audit Record Retention', desc:'Verify audit logs are retained for minimum 3 years. Confirm WORM storage or equivalent protection.' },
  { id:'au4',  family:'AU', control:'AU-12', role:'sysadmin', cat:'CAT III', title:'Audit Record Generation', desc:'Confirm all endpoints are forwarding security events to SIEM (Splunk). Verify no gaps in event collection.' },
  // Configuration Management
  { id:'cm1',  family:'CM', control:'CM-2',  role:'sysadmin', cat:'CAT II', title:'Baseline Configuration', desc:'Verify system baseline configurations are documented and current. Confirm STIG checklists are applied to all managed systems.' },
  { id:'cm2',  family:'CM', control:'CM-6',  role:'sysadmin', cat:'CAT II', title:'Configuration Settings', desc:'Review STIG findings from last scan. Confirm CAT I findings have been remediated or have approved Risk Acceptance.' },
  { id:'cm3',  family:'CM', control:'CM-7',  role:'sysadmin', cat:'CAT II', title:'Least Functionality', desc:'Verify unnecessary services, ports, and protocols are disabled. Review open port list against approved baseline.' },
  { id:'cm4',  family:'CM', control:'CM-8',  role:'sysadmin', cat:'CAT II', title:'System Component Inventory', desc:'Confirm all hardware and software in inventory. Verify no unauthorized devices or software are present.' },
  // Identification and Authentication
  { id:'ia1',  family:'IA', control:'IA-2',  role:'sysadmin', cat:'CAT I',  title:'Identification and Authentication', desc:'Confirm MFA is enforced for all privileged accounts and remote access. Verify no shared accounts are in use.' },
  { id:'ia2',  family:'IA', control:'IA-5',  role:'sysadmin', cat:'CAT II', title:'Authenticator Management', desc:'Verify passwords meet complexity requirements. Confirm no default credentials remain on any system or device.' },
  // System and Communications Protection
  { id:'sc1',  family:'SC', control:'SC-8',  role:'sysadmin', cat:'CAT II', title:'Transmission Confidentiality', desc:'Confirm TLS 1.2+ is enforced on all web services. Verify TLS 1.0 and 1.1 are disabled.' },
  { id:'sc2',  family:'SC', control:'SC-28', role:'sysadmin', cat:'CAT II', title:'Protection of Info at Rest', desc:'Verify full-disk encryption (BitLocker/FileVault) is enforced on all laptops and workstations processing CUI.' },
  { id:'sc3',  family:'SC', control:'SC-7',  role:'network',  cat:'CAT II', title:'Boundary Protection', desc:'Review firewall rules. Confirm no overly permissive rules (ANY/ANY). Verify DMZ segmentation is intact.' },
  // System and Information Integrity
  { id:'si1',  family:'SI', control:'SI-2',  role:'sysadmin', cat:'CAT I',  title:'Flaw Remediation', desc:'Verify all CAT I findings from last ACAS scan have been patched or have approved POA&M. Review patch cycle compliance.' },
  { id:'si2',  family:'SI', control:'SI-3',  role:'sysadmin', cat:'CAT II', title:'Malicious Code Protection', desc:'Confirm antivirus/EDR is deployed and updated on all endpoints. Verify last scan completed successfully.' },
  { id:'si3',  family:'SI', control:'SI-4',  role:'sysadmin', cat:'CAT II', title:'Information System Monitoring', desc:'Confirm SIEM is receiving events from all systems. Verify IDS/IPS signatures are current.' },
  // Awareness and Training
  { id:'at1',  family:'AT', control:'AT-2',  role:'sysadmin', cat:'CAT III', title:'Cyber Awareness Training', desc:'Verify all users have completed annual DoD Cyber Awareness training. Confirm certificates are uploaded and current.' },
  // Maintenance
  { id:'ma1',  family:'MA', control:'MA-2',  role:'sysadmin', cat:'CAT II', title:'Controlled Maintenance', desc:'Review maintenance activities log. Confirm all maintenance is documented and approved prior to execution.' },
  { id:'ma2',  family:'MA', control:'MA-4',  role:'network',  cat:'CAT II', title:'Nonlocal Maintenance', desc:'Verify remote maintenance sessions are logged and supervised. Confirm remote maintenance credentials are unique per session.' },
];

const CAT_COLOR = {'CAT I':'#cc2222','CAT II':'#cc7700','CAT III':'#aaaa00'};
const FAM_COLOR = {AC:'#0055cc',AU:'#cc8800',CM:'#00aa66',IA:'#cc2222',SC:'#7700cc',SI:'#cc4400',AT:'#4a7a9b',MA:'#2a7a9b'};

function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)||'{}'); } catch { return {}; } }
function save(d) { try { localStorage.setItem(STORE_KEY,JSON.stringify(d)); } catch {} }

export default function SelfInspection() {
  const { member, role } = useAuth();
  const actor = member?.email || 'demo';
  const [statuses, setStatuses] = useState(()=>load());
  const [filterFam,  setFilterFam]  = useState('all');
  const [filterStat, setFilterStat] = useState('all');
  const [filterCat,  setFilterCat]  = useState('all');
  const [quarter,    setQuarter]    = useState(()=>{
    const d=new Date(); const q=Math.ceil((d.getMonth()+1)/3);
    return 'Q'+q+' '+d.getFullYear();
  });

  // Role-based filtering: sysadmin only sees their items, issm/isso/full roles see all
  const isLimited = role==='sysadmin'||role==='readonly';
  const visibleItems = isLimited
    ? CHECKLIST.filter(i=>i.role==='sysadmin')
    : CHECKLIST;

  const families = [...new Set(visibleItems.map(i=>i.family))].sort();

  const filtered = visibleItems.filter(i=>{
    const mf = filterFam==='all'||i.family===filterFam;
    const ms = filterStat==='all'||
      (filterStat==='complete'&&statuses[i.id]==='complete')||
      (filterStat==='na'&&statuses[i.id]==='na')||
      (filterStat==='open'&&!statuses[i.id])||
      (filterStat==='finding'&&statuses[i.id]==='finding');
    const mc = filterCat==='all'||i.cat===filterCat;
    return mf&&ms&&mc;
  });

  const counts = {
    total: visibleItems.length,
    complete: visibleItems.filter(i=>statuses[i.id]==='complete').length,
    finding:  visibleItems.filter(i=>statuses[i.id]==='finding').length,
    na:       visibleItems.filter(i=>statuses[i.id]==='na').length,
    open:     visibleItems.filter(i=>!statuses[i.id]).length,
  };
  const pct = counts.total>0?Math.round((counts.complete+counts.na)/counts.total*100):0;

  const setStatus = (id, status) => {
    const updated = {...statuses,[id]:status};
    setStatuses(updated); save(updated);
    auditLog('INSPECTION_ITEM_UPDATED',{actorId:actor,orgId:'demo',targetId:id,details:{status}});
  };

  const STATUS_BTN = (id) => {
    const s = statuses[id];
    return(
      <div style={{display:'flex',gap:4,flexShrink:0}}>
        {[
          ['complete','✅','#006622','#00cc44'],
          ['finding','⚠','#662200','#ff8800'],
          ['na','➖','#333','#888'],
        ].map(([val,icon,bg,col])=>(
          <button key={val} onClick={e=>{e.stopPropagation();setStatus(id,s===val?null:val);}}
            style={{...mono,background:s===val?bg:'transparent',
              border:'1px solid '+(s===val?col:'#1e3a5f'),
              borderRadius:3,padding:'3px 8px',cursor:'pointer',
              color:s===val?col:'#2a4a6b',fontSize:10,transition:'all 0.15s'}}>
            {icon}
          </button>
        ))}
      </div>
    );
  };

  return(
    <div style={{padding:'20px 24px',maxWidth:880,...mono,color:'#c0d8f0'}}>
      {/* Header */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:700,color:'#e0e8f0',letterSpacing:1,marginBottom:2}}>
          🔎 SELF-INSPECTION CHECKLIST
        </div>
        <div style={{fontSize:10,color:'#4a7a9b',lineHeight:1.8}}>
          Quarterly inspection · NIST 800-53 controls · All actions audit-logged<br/>
          {isLimited?'Showing your assigned items only':'Full inspection — all control families'}
          {' · Quarter: '}<span style={{color:'#a0c8e8',fontWeight:700}}>{quarter}</span>
        </div>
      </div>

      {/* Progress */}
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:10,color:'#4a7a9b'}}>
          <span>INSPECTION PROGRESS — {pct}% complete</span>
          <span>{counts.complete+counts.na} / {counts.total} items</span>
        </div>
        <div style={{height:8,background:'#0a1520',borderRadius:4}}>
          <div style={{width:pct+'%',height:'100%',
            background:pct===100?'#00aa44':pct>50?'#0055cc':'#cc7700',
            borderRadius:4,transition:'width 0.4s'}}/>
        </div>
        <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
          {[['Complete',counts.complete,'#00aa44'],['Finding',counts.finding,'#cc4400'],
            ['N/A',counts.na,'#555'],['Open',counts.open,'#4a7a9b']].map(([l,v,c])=>(
            <div key={l} style={{background:'#061224',border:'1px solid #0d2040',borderRadius:4,
              padding:'5px 12px',textAlign:'center'}}>
              <span style={{fontSize:16,fontWeight:700,color:c,...mono}}>{v}</span>
              <span style={{fontSize:9,color:'#4a7a9b',marginLeft:6}}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <select value={filterFam} onChange={e=>setFilterFam(e.target.value)}
          style={{...mono,background:'#061224',border:'1px solid #1e3a5f',borderRadius:3,padding:'5px 8px',color:'#c0d8f0',fontSize:11}}>
          <option value='all'>All families</option>
          {families.map(f=><option key={f} value={f}>{f}</option>)}
        </select>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
          style={{...mono,background:'#061224',border:'1px solid #1e3a5f',borderRadius:3,padding:'5px 8px',color:'#c0d8f0',fontSize:11}}>
          <option value='all'>All CAT</option>
          <option value='CAT I'>CAT I</option>
          <option value='CAT II'>CAT II</option>
          <option value='CAT III'>CAT III</option>
        </select>
        <select value={filterStat} onChange={e=>setFilterStat(e.target.value)}
          style={{...mono,background:'#061224',border:'1px solid #1e3a5f',borderRadius:3,padding:'5px 8px',color:'#c0d8f0',fontSize:11}}>
          <option value='all'>All statuses</option>
          <option value='open'>Open</option>
          <option value='complete'>Complete</option>
          <option value='finding'>Finding</option>
          <option value='na'>N/A</option>
        </select>
        <button onClick={()=>{save({});setStatuses({});}}
          style={{...mono,background:'transparent',border:'1px solid #3a1a1a',borderRadius:3,
            padding:'5px 10px',cursor:'pointer',color:'#664444',fontSize:9,marginLeft:'auto'}}>
          RESET QUARTER
        </button>
      </div>

      {/* Checklist items */}
      {families.filter(f=>filterFam==='all'||f===filterFam).map(fam=>{
        const famItems = filtered.filter(i=>i.family===fam);
        if(famItems.length===0) return null;
        return(
          <div key={fam} style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:FAM_COLOR[fam]||'#4a7a9b',
              letterSpacing:2,marginBottom:8,paddingBottom:4,
              borderBottom:'1px solid #0d2040'}}>
              {fam} — {{'AC':'ACCESS CONTROL','AU':'AUDIT & ACCOUNTABILITY','CM':'CONFIGURATION MGMT',
                       'IA':'IDENTIFICATION & AUTH','SC':'SYSTEM COMMS PROTECTION','SI':'SYSTEM INTEGRITY',
                       'AT':'AWARENESS & TRAINING','MA':'MAINTENANCE'}[fam]||fam}
            </div>
            {famItems.map(item=>{
              const s = statuses[item.id];
              const rowBg = s==='complete'?'rgba(0,80,30,0.1)':s==='finding'?'rgba(140,40,0,0.1)':s==='na'?'rgba(30,30,30,0.2)':'#061224';
              const borderCol = s==='complete'?'#004422':s==='finding'?'#662200':s==='na'?'#333':'#0d2040';
              return(
                <div key={item.id} style={{background:rowBg,border:'1px solid '+borderCol,
                  borderLeft:'3px solid '+(CAT_COLOR[item.cat]||'#4a7a9b'),
                  borderRadius:5,padding:'10px 14px',marginBottom:6}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap'}}>
                        <span style={{fontSize:9,fontWeight:700,color:'#4a7a9b',
                          border:'1px solid #1e3a5f',borderRadius:2,padding:'1px 6px'}}>
                          {item.control}
                        </span>
                        <span style={{fontSize:9,color:CAT_COLOR[item.cat],
                          border:'1px solid '+(CAT_COLOR[item.cat]||'')+'44',borderRadius:2,padding:'1px 6px'}}>
                          {item.cat}
                        </span>
                        <span style={{fontSize:12,fontWeight:700,color:'#d0e8f8'}}>{item.title}</span>
                        {s&&(
                          <span style={{fontSize:9,marginLeft:'auto',
                            color:s==='complete'?'#00aa44':s==='finding'?'#ff8800':'#555',
                            fontWeight:700}}>
                            {s==='complete'?'✅ COMPLIANT':s==='finding'?'⚠ FINDING':'➖ N/A'}
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:11,color:'#7a9ab8',lineHeight:1.7}}>{item.desc}</div>
                    </div>
                    {STATUS_BTN(item.id)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {filtered.length===0&&(
        <div style={{textAlign:'center',padding:30,color:'#2a4a6b',fontSize:12}}>
          No items match your filter
        </div>
      )}

      <div style={{marginTop:14,fontSize:10,color:'#2a4a6b',lineHeight:1.8,
        background:'rgba(0,0,0,0.2)',border:'1px solid #0d2040',borderRadius:4,padding:'8px 14px'}}>
        Quarterly inspection · All status changes audit-logged (AU-2) ·
        System Admins see only their assigned items · ISSM/ISSO see full checklist ·
        Phase 4: synced to GovCloud RDS
      </div>
    </div>
  );
}