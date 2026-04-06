import { useState, useRef, useMemo } from "react";
import { useColors, useTheme } from "../theme.js";

const C = { bg:"#03080E", panel:"#060D16", panelAlt:"#08111C", panel2:"#08111C", border:"#0D1E2E", borderMd:"#152840", text:"#C8D8E8", textDim:"#7A9AB8", dim:"#7A9AB8", textMute:"#3A5570", mute:"#3A5570", white:"#F0F8FF", input:"#040C16", inputBorder:"#1A3A5C", rowA:"#050C14", rowB:"#040A12", scroll:"#1A3A5C", headerBg:"#02060C", teal:"#00D4AA", blue:"#1A7AFF", red:"#FF4444", orange:"#FF8C00", gold:"#FFD700", green:"#00CC88", purple:"#AA66FF" };

// ── Evidence types ─────────────────────────────────────────────────────────
const EVIDENCE_TYPES = [
  { id:"scan",      label:"Vulnerability Scan",     icon:"🔍", color:"#1A7AFF", desc:"ACAS/Nessus scan results, Inspector findings" },
  { id:"stig",      label:"STIG/SCAP Results",      icon:"✅", color:"#00C49A", desc:"STIG checklists, SCAP compliance reports" },
  { id:"screenshot",label:"Screenshot",             icon:"📸", color:"#AA66FF", desc:"GPO settings, AD config, system properties" },
  { id:"config",    label:"Config Export",          icon:"⚙",  color:"#FF8C00", desc:"Running-config, policy exports, registry exports" },
  { id:"policy",    label:"Policy/Procedure",       icon:"📋", color:"#E8B800", desc:"SOPs, policies, plans, procedures" },
  { id:"log",       label:"Audit Log",              icon:"📊", color:"#00B87A", desc:"Event logs, SIEM exports, audit trails" },
  { id:"interview", label:"Interview Notes",        icon:"🗣",  color:"#FF6688", desc:"SCA interview documentation, meeting notes" },
  { id:"test",      label:"Test Result",            icon:"🧪", color:"#FF8C00", desc:"Penetration test results, functional test evidence" },
  { id:"cert",      label:"Certificate/Training",   icon:"🎓", color:"#AA66FF", desc:"Training completion, certifications, sign-offs" },
  { id:"other",     label:"Other",                  icon:"📄", color:"#7A9AB8", desc:"Miscellaneous supporting documentation" },
];
// ── NIST control families for mapping ──────────────────────────────────────
const CONTROL_FAMILIES = [
  "AC","AT","AU","CA","CM","CP","IA","IR","MA","MP",
  "PE","PL","PM","PS","PT","RA","SA","SC","SI","SR"
];
// ── CUI markings ───────────────────────────────────────────────────────────
const CUI_MARKINGS = [
  { id:"none",        label:"Not CUI",                color:"#7A9AB8" },
  { id:"cui",         label:"CUI",                    color:"#E8B800" },
  { id:"cui_sp",      label:"CUI//SP-CTI",            color:"#FF8C00" },
  { id:"cui_itar",    label:"CUI//ITAR",              color:"#FF8C00" },
  { id:"fouo",        label:"CUI//FOUO",              color:"#FF8C00" },
];
// ── Expiration logic ───────────────────────────────────────────────────────
const EXPIRY_RULES = {
  scan:       { days:90,  label:"90 days",  reason:"Vulnerability scans expire after 90 days per DoD continuous monitoring policy" },
  stig:       { days:180, label:"180 days", reason:"STIG assessments expire after 180 days (quarterly compliance requirement)" },
  screenshot: { days:365, label:"1 year",   reason:"Configuration screenshots should be refreshed annually" },
  config:     { days:180, label:"180 days", reason:"Configuration exports should be refreshed after significant changes or 180 days" },
  policy:     { days:365, label:"1 year",   reason:"Policies should be reviewed and re-confirmed annually" },
  log:        { days:30,  label:"30 days",  reason:"Audit log exports are point-in-time and expire after 30 days for ATO purposes" },
  interview:  { days:365, label:"1 year",   reason:"Interview notes are valid for the assessment period" },
  test:       { days:365, label:"1 year",   reason:"Penetration test results are valid for 1 year" },
  cert:       { days:365, label:"1 year",   reason:"Certifications should be re-confirmed annually" },
  other:      { days:365, label:"1 year",   reason:"Review annually" },
};
function getExpiryStatus(uploadDate, type) {
  const rule = EXPIRY_RULES[type] || EXPIRY_RULES.other;
  const uploaded = new Date(uploadDate);
  const expiry = new Date(uploaded);
  expiry.setDate(expiry.getDate() + rule.days);
  const now = new Date();
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0)   return { status:"Expired",       color:"#E84444", days:Math.abs(daysLeft), expiry };
  if (daysLeft < 30)  return { status:"Expiring Soon",  color:"#F07820", days:daysLeft, expiry };
  return              { status:"Current",              color:"#00B87A", days:daysLeft, expiry };
}
// ── Mock evidence ──────────────────────────────────────────────────────────
const MOCK_EVIDENCE = [
  { id:"E001", name:"ACAS_Scan_2025-03-15.nessus", type:"scan", controls:["RA-5","SI-2","CM-6"], uploadedBy:"SA", uploadDate:"2025-03-15", size:"4.2 MB", cui:"none", notes:"Weekly authenticated scan — 23 hosts. 0 CAT I, 3 CAT II, 12 CAT III. See POAM-002 and POAM-008 for open items.", hash:"sha256:a4f8e2c1b9d3..." },
  { id:"E002", name:"Windows11_STIG_Checklist_v2.xlsx", type:"stig", controls:["CM-6","CM-2","AC-3"], uploadedBy:"ISSO", uploadDate:"2025-03-01", size:"1.1 MB", cui:"none", notes:"STIG compliance check for all WS endpoints. 94% compliant. 3 open findings.", hash:"sha256:b7d2a1f4c8e9..." },
  { id:"E003", name:"AD_Account_Audit_Q1_2025.csv", type:"config", controls:["AC-2","AC-2(3)","AC-6"], uploadedBy:"SA", uploadDate:"2025-03-20", size:"0.3 MB", cui:"cui", notes:"Quarterly account review. 147 active users, 0 inactive >30 days, 12 privileged accounts all verified.", hash:"sha256:c1e9d8b3a7f2..." },
  { id:"E004", name:"GPO_PasswordPolicy_Screenshot.png", type:"screenshot", controls:["IA-5","IA-5(1)","AC-7"], uploadedBy:"ISSO", uploadDate:"2025-02-10", size:"0.4 MB", cui:"none", notes:"GPO enforcing 15-char minimum, complexity, 60-day max age, 24-password history. Captured from GPMC.", hash:"sha256:d4a2c7e1b8f3..." },
  { id:"E005", name:"Incident_Response_Plan_v3.2.pdf", type:"policy", controls:["IR-8","IR-4","IR-6"], uploadedBy:"ISSO", uploadDate:"2025-01-15", size:"2.8 MB", cui:"fouo", notes:"Approved IRP v3.2. Approved by ISSM 2025-01-15. Includes DFARS 72-hour reporting procedures.", hash:"sha256:e8f3b1a9d2c7..." },
  { id:"E006", name:"CrowdStrike_Detections_March2025.pdf", type:"log", controls:["SI-4","IR-5","AU-6"], uploadedBy:"ISSO", uploadDate:"2025-03-31", size:"1.7 MB", cui:"none", notes:"March 2025 monthly detection report. 3 detections, 0 escalated to incident. All resolved.", hash:"sha256:f2c8a4e7b1d3..." },
  { id:"E007", name:"SCA_Interview_Notes_2025-03-10.docx", type:"interview", controls:["CA-2","CA-2(1)"], uploadedBy:"ISSO", uploadDate:"2025-03-10", size:"0.2 MB", cui:"cui", notes:"Interview notes from SCA kick-off. Topics: boundary, data flows, CM process, IR capability.", hash:"sha256:a9d3f7c2e8b4..." },
  { id:"E008", name:"PaloAlto_Firewall_Rules_Export.xml", type:"config", controls:["SC-7","SC-7(5)","AC-4"], uploadedBy:"NA", uploadDate:"2025-02-28", size:"0.9 MB", cui:"none", notes:"Panorama policy export. All rules documented. Deny-all default verified.", hash:"sha256:b1e4a8c3f7d2..." },
  { id:"E009", name:"Security_Awareness_Training_Completion_Q1.xlsx", type:"cert", controls:["AT-2","AT-4"], uploadedBy:"ISSO", uploadDate:"2025-03-31", size:"0.1 MB", cui:"none", notes:"Q1 2025 training completion report. 98% completion rate. 3 accounts suspended pending completion.", hash:"sha256:c7f2d8b4a1e9..." },
  { id:"E010", name:"Splunk_AuditLog_Review_March2025.pdf", type:"log", controls:["AU-6","AU-6(1)","SI-4"], uploadedBy:"ISSO", uploadDate:"2025-03-31", size:"3.1 MB", cui:"none", notes:"Monthly audit log review documentation. No anomalies detected. Weekly review sign-offs included.", hash:"sha256:d3a9e1c8f4b7..." },
];
const ROLES = ["ISSO","SA","NA","ISSM","SCA","PM"];
// ── Sub-components ─────────────────────────────────────────────────────────
function StatusBadge({ status, color }) {
  const C = useColors();
  return (
    <span style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color, background:`${color}18`, border:`1px solid ${color}40`, borderRadius:3, padding:"2px 7px", whiteSpace:"nowrap" }}>
      {status}
    </span>
  );
}
function TypeBadge({ type }) {
  const C = useColors();
  const t = EVIDENCE_TYPES.find(e => e.id === type) || EVIDENCE_TYPES[EVIDENCE_TYPES.length-1];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontFamily:"monospace", fontSize:11, fontWeight:600, color:t.color, background:`${t.color}14`, border:`1px solid ${t.color}30`, borderRadius:3, padding:"2px 7px", whiteSpace:"nowrap" }}>
      <span style={{ fontSize:10 }}>{t.icon}</span> {t.label}
    </span>
  );
}
// ── Drop zone ──────────────────────────────────────────────────────────────
function DropZone({ onFileAdded, C }) {
  const C = useColors();
  const [dragging, setDragging] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newEvidence, setNewEvidence] = useState({
    name:"", type:"scan", controls:[], uploadedBy:"ISSO", cui:"none", notes:""
  });
  const fileRef = useRef(null);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setNewEvidence(p => ({ ...p, name:file.name }));
      setShowForm(true);
    }
  };
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewEvidence(p => ({ ...p, name:file.name }));
      setShowForm(true);
    }
  };
  const toggleControl = (ctrl) => {
    setNewEvidence(p => ({
      ...p,
      controls: p.controls.includes(ctrl)
        ? p.controls.filter(c => c !== ctrl)
        : [...p.controls, ctrl]
    }));
  };
  const submit = () => {
    if (!newEvidence.name || newEvidence.controls.length === 0) return;
    onFileAdded({
      id: `E${String(Date.now()).slice(-3)}`,
      ...newEvidence,
      uploadDate: new Date().toISOString().split("T")[0],
      size: "—",
      hash: `sha256:${Math.random().toString(36).slice(2)}...`,
    });
    setNewEvidence({ name:"", type:"scan", controls:[], uploadedBy:"ISSO", cui:"none", notes:"" });
    setShowForm(false);
  };
  if (showForm) return (
    <div style={{ background:C.panel, border:`2px solid ${C.teal}`, borderRadius:10, padding:20, marginBottom:16 }}>
      <div style={{ fontFamily:"monospace", fontSize:11, color:C.teal, letterSpacing:1, marginBottom:14 }}>NEW EVIDENCE — CHAIN OF CUSTODY REGISTRATION</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <div>
          <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:5 }}>FILE NAME</div>
          <input value={newEvidence.name} onChange={e=>setNewEvidence(p=>({...p,name:e.target.value}))}
            style={{ width:"100%", background:C.input, border:`1px solid ${C.inputBorder}`, borderRadius:5, color:C.text, padding:"6px 10px", fontSize:11, fontFamily:"inherit", outline:"none" }} />
        </div>
        <div>
          <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:5 }}>UPLOADED BY</div>
          <select value={newEvidence.uploadedBy} onChange={e=>setNewEvidence(p=>({...p,uploadedBy:e.target.value}))}
            style={{ width:"100%", background:C.input, border:`1px solid ${C.inputBorder}`, borderRadius:5, color:C.text, padding:"6px 10px", fontSize:11, fontFamily:"monospace", outline:"none", cursor:"pointer" }}>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
      {/* Evidence type */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:8 }}>EVIDENCE TYPE</div>
        <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
          {EVIDENCE_TYPES.map(t => (
            <div key={t.id} onClick={()=>setNewEvidence(p=>({...p,type:t.id}))}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:5, cursor:"pointer", background:newEvidence.type===t.id?`${t.color}14`:"transparent", border:`1px solid ${newEvidence.type===t.id?t.color:C.border}` }}>
              <span style={{ fontSize:12 }}>{t.icon}</span>
              <span style={{ fontFamily:"monospace", fontSize:11, color:newEvidence.type===t.id?t.color:C.textDim }}>{t.label}</span>
            </div>
          ))}
        </div>
        {newEvidence.type && (
          <div style={{ fontFamily:"monospace", fontSize:11, color:C.textMute, marginTop:5 }}>
            ⏱ Expires in: {EXPIRY_RULES[newEvidence.type]?.label} — {EXPIRY_RULES[newEvidence.type]?.reason}
          </div>
        )}
      </div>
      {/* Controls */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:8 }}>
          NIST CONTROLS SUPPORTED ({newEvidence.controls.length} selected)
        </div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {CONTROL_FAMILIES.map(f => (
            ["1","2","3","4","5","6","7","8"].map(n => {
              const ctrl = `${f}-${n}`;
              const sel = newEvidence.controls.includes(ctrl);
              return (
                <div key={ctrl} onClick={()=>toggleControl(ctrl)}
                  style={{ fontFamily:"monospace", fontSize:11, padding:"3px 7px", borderRadius:3, cursor:"pointer", background:sel?`${C.teal}14`:"transparent", border:`1px solid ${sel?C.teal:C.border}`, color:sel?C.teal:C.textMute }}>
                  {ctrl}
                </div>
              );
            })
          )).flat().slice(0, 40)}
          <div style={{ fontFamily:"monospace", fontSize:11, color:C.textMute, alignSelf:"center" }}>
            ...type any control ID:
          </div>
          <input placeholder="e.g. AC-2(12)" onKeyDown={e => {
            if (e.key === "Enter" && e.target.value.trim()) {
              toggleControl(e.target.value.trim().toUpperCase());
              e.target.value = "";
            }
          }}
            style={{ background:C.input, border:`1px solid ${C.inputBorder}`, borderRadius:4, color:C.text, padding:"3px 8px", fontSize:10, fontFamily:"monospace", outline:"none", width:100 }} />
        </div>
      </div>
      {/* CUI and Notes */}
      <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:12, marginBottom:14 }}>
        <div>
          <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:5 }}>CUI MARKING</div>
          <select value={newEvidence.cui} onChange={e=>setNewEvidence(p=>({...p,cui:e.target.value}))}
            style={{ width:"100%", background:C.input, border:`1px solid ${C.inputBorder}`, borderRadius:5, color:C.text, padding:"6px 10px", fontSize:11, fontFamily:"monospace", outline:"none" }}>
            {CUI_MARKINGS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:5 }}>NOTES FOR SCA / ASSESSOR</div>
          <textarea value={newEvidence.notes} onChange={e=>setNewEvidence(p=>({...p,notes:e.target.value}))}
            rows={2} placeholder="Describe what this evidence demonstrates, any caveats, and what controls it supports..."
            style={{ width:"100%", background:C.input, border:`1px solid ${C.inputBorder}`, borderRadius:5, color:C.text, padding:"6px 10px", fontSize:11, fontFamily:"inherit", outline:"none", resize:"none", lineHeight:1.6 }} />
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={submit}
          style={{ fontFamily:"monospace", background:C.teal, border:"none", color:C.bg, borderRadius:5, padding:"8px 20px", cursor:"pointer", fontSize:11, fontWeight:700 }}>
          ✓ REGISTER EVIDENCE
        </button>
        <button onClick={()=>{setShowForm(false); setNewEvidence({name:"",type:"scan",controls:[],uploadedBy:"ISSO",cui:"none",notes:""});}}
          style={{ fontFamily:"monospace", background:"transparent", border:`1px solid ${C.border}`, color:C.textMute, borderRadius:5, padding:"8px 14px", cursor:"pointer", fontSize:11 }}>
          CANCEL
        </button>
      </div>
    </div>
  );
  return (
    <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={handleDrop}
      onClick={()=>fileRef.current?.click()}
      style={{ background:dragging?`${C.teal}07`:C.panel, border:`2px dashed ${dragging?C.teal:C.border}`, borderRadius:10, padding:"28px 20px", textAlign:"center", cursor:"pointer", marginBottom:16, transition:"all 0.2s" }}>
      <input type="file" ref={fileRef} onChange={handleFileSelect} style={{ display:"none" }} />
      <div style={{ fontSize:32, marginBottom:10 }}>📎</div>
      <div style={{ fontSize:13, fontWeight:600, color:dragging?C.teal:C.white, marginBottom:5 }}>
        {dragging ? "Release to register evidence" : "Drop evidence file here or click to browse"}
      </div>
      <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute }}>
        .nessus · .pdf · .xlsx · .csv · .docx · .png · .xml · .ckl
      </div>
    </div>
  );
}
// ── Evidence detail panel ──────────────────────────────────────────────────
function EvidenceDetail({ ev, onClose, C }) {
  const C = useColors();
  const expiry = getExpiryStatus(ev.uploadDate, ev.type);
  const evType = EVIDENCE_TYPES.find(t => t.id === ev.type) || EVIDENCE_TYPES[EVIDENCE_TYPES.length-1];
  const cuiMark = CUI_MARKINGS.find(m => m.id === ev.cui) || CUI_MARKINGS[0];
  const rule = EXPIRY_RULES[ev.type] || EXPIRY_RULES.other;
  return (
    <div style={{ background:C.panel, border:`1px solid ${C.borderMd||C.border}`, borderRadius:10, overflow:"hidden", height:"100%", display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`, background:C.panel2||C.panel }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6, flexWrap:"wrap" }}>
              <span style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:evType.color }}>{evType.icon} {evType.label}</span>
              <StatusBadge status={expiry.status} color={expiry.color} />
              <StatusBadge status={cuiMark.label} color={cuiMark.color} />
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:C.white, lineHeight:1.4, wordBreak:"break-all" }}>{ev.name}</div>
            <div style={{ fontFamily:"monospace", fontSize:11, color:C.textMute, marginTop:3 }}>
              {ev.id} · Uploaded by {ev.uploadedBy} · {ev.uploadDate} · {ev.size}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMute, borderRadius:4, padding:"3px 9px", cursor:"pointer", fontSize:11, marginLeft:10 }}>✕</button>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:16 }}>
        {/* Expiry status */}
        <div style={{ background:`${expiry.color}0A`, border:`1px solid ${expiry.color}30`, borderRadius:8, padding:14, marginBottom:14 }}>
          <div style={{ fontFamily:"monospace", fontSize:11, color:expiry.color, fontWeight:700, marginBottom:6 }}>EVIDENCE VALIDITY</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            <div>
              <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, marginBottom:3 }}>UPLOADED</div>
              <div style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:C.white }}>{ev.uploadDate}</div>
            </div>
            <div>
              <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, marginBottom:3 }}>EXPIRES</div>
              <div style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:expiry.color }}>
                {expiry.expiry.toISOString().split("T")[0]}
              </div>
            </div>
            <div>
              <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, marginBottom:3 }}>
                {expiry.status === "Expired" ? "OVERDUE BY" : "DAYS REMAINING"}
              </div>
              <div style={{ fontFamily:"monospace", fontSize:18, fontWeight:900, color:expiry.color, lineHeight:1 }}>{expiry.days}</div>
            </div>
          </div>
          <div style={{ fontFamily:"monospace", fontSize:11, color:C.textMute, marginTop:8 }}>{rule.reason}</div>
        </div>
        {/* Controls supported */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:8 }}>NIST CONTROLS SUPPORTED</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {ev.controls.map(ctrl => (
              <span key={ctrl} style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:C.teal, background:`${C.teal}14`, border:`1px solid ${C.teal}30`, borderRadius:3, padding:"3px 8px" }}>
                {ctrl}
              </span>
            ))}
          </div>
        </div>
        {/* Chain of custody */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:8 }}>CHAIN OF CUSTODY</div>
          <div style={{ background:C.panel2||C.panel, border:`1px solid ${C.border}`, borderRadius:6, padding:12 }}>
            {[
              { event:"Evidence Registered", actor:ev.uploadedBy, date:ev.uploadDate, icon:"📤" },
              { event:"Integrity Hash Generated", actor:"System", date:ev.uploadDate, icon:"🔐" },
              { event:"Linked to SSP Assessment", actor:ev.uploadedBy, date:ev.uploadDate, icon:"🔗" },
            ].map((entry, i) => (
              <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:i<2?10:0 }}>
                <span style={{ fontSize:14 }}>{entry.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:500, color:C.white }}>{entry.event}</div>
                  <div style={{ fontFamily:"monospace", fontSize:11, color:C.textMute }}>{entry.actor} · {entry.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Integrity hash */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:5 }}>INTEGRITY HASH (SHA-256)</div>
          <div style={{ fontFamily:"monospace", fontSize:10, color:C.green, background:`${C.green}0A`, border:`1px solid ${C.green}20`, borderRadius:5, padding:"8px 12px", wordBreak:"break-all" }}>
            {ev.hash}
          </div>
        </div>
        {/* Notes */}
        {ev.notes && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:5 }}>ASSESSOR NOTES</div>
            <div style={{ fontSize:11, color:C.textDim, lineHeight:1.7, background:C.panel2||C.panel, border:`1px solid ${C.border}`, borderRadius:6, padding:12 }}>
              {ev.notes}
            </div>
          </div>
        )}
        {/* Actions */}
        <div style={{ display:"flex", gap:8 }}>
          <button style={{ fontFamily:"monospace", background:`${C.blue}0F`, border:`1px solid ${C.blue}30`, color:C.blue, borderRadius:5, padding:"7px 14px", cursor:"pointer", fontSize:10 }}>⬇ DOWNLOAD</button>
          <button style={{ fontFamily:"monospace", background:`${C.teal}0F`, border:`1px solid ${C.teal}30`, color:C.teal, borderRadius:5, padding:"7px 14px", cursor:"pointer", fontSize:10 }}>↗ SHARE WITH SCA</button>
          {expiry.status !== "Current" && (
            <button style={{ fontFamily:"monospace", background:`${C.orange}0F`, border:`1px solid ${C.orange}30`, color:C.orange, borderRadius:5, padding:"7px 14px", cursor:"pointer", fontSize:10 }}>🔄 REFRESH EVIDENCE</button>
          )}
        </div>
      </div>
    </div>
  );
}
// ── Main component ─────────────────────────────────────────────────────────
export default function EvidenceTracker() {
  const C = useColors();
  const theme = useTheme();
  const mono = { fontFamily:"'Courier New',monospace" };
  const [evidence, setEvidence] = useState(MOCK_EVIDENCE);
  const [selected, setSelected] = useState(null);
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterRole, setFilterRole] = useState("ALL");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid"); // grid | table | expiry
  const addEvidence = (newEv) => {
    setEvidence(prev => [newEv, ...prev]);
    setSelected(newEv);
  };
  const visible = useMemo(() => evidence
    .filter(e => filterType === "ALL" || e.type === filterType)
    .filter(e => {
      if (filterStatus === "ALL") return true;
      const s = getExpiryStatus(e.uploadDate, e.type).status;
      return s === filterStatus;
    })
    .filter(e => filterRole === "ALL" || e.uploadedBy === filterRole)
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.controls.some(c => c.toLowerCase().includes(search.toLowerCase())) ||
      e.notes.toLowerCase().includes(search.toLowerCase()))
  , [evidence, filterType, filterStatus, filterRole, search]);
  // KPIs
  const kpis = useMemo(() => {
    const statuses = evidence.map(e => getExpiryStatus(e.uploadDate, e.type).status);
    return {
      total: evidence.length,
      current: statuses.filter(s => s === "Current").length,
      expiringSoon: statuses.filter(s => s === "Expiring Soon").length,
      expired: statuses.filter(s => s === "Expired").length,
      controlsCovered: new Set(evidence.flatMap(e => e.controls)).size,
    };
  }, [evidence]);
  // Expiry timeline view
  const expiryData = useMemo(() =>
    [...evidence]
      .map(e => ({ ...e, expiry: getExpiryStatus(e.uploadDate, e.type) }))
      .sort((a, b) => a.expiry.days - b.expiry.days)
  , [evidence]);
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Helvetica Neue',Arial,sans-serif", display:"flex", flexDirection:"column",
      filter:theme==="light"?"invert(1) hue-rotate(180deg) saturate(0.7) brightness(1.05)":"none" }}>
      <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.scroll||C.inputBorder};border-radius:2px}`}</style>
      {/* Header */}
      <div style={{ background:C.headerBg||C.panel, borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:30, height:30, background:`linear-gradient(135deg,${C.teal},${C.blue})`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:14, fontWeight:900, color:C.bg }}>S</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.white }}>RiskRadar — Evidence Tracker</div>
            <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8 }}>CHAIN OF CUSTODY · ATO EVIDENCE LIBRARY · EXPIRY MONITORING</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {/* View toggle */}
          <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:5, padding:"3px 4px", display:"flex", gap:2 }}>
            {[["grid","⊞ Grid"],["table","≡ Table"],["expiry","⏱ Expiry"]].map(([v,l]) => (
              <button key={v} onClick={()=>setView(v)}
                style={{ ...mono, background:view===v?C.teal:"transparent", border:"none", borderRadius:4, padding:"4px 10px", cursor:"pointer", fontSize:11, fontWeight:700, color:view===v?C.bg:C.textMute }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ ...mono, fontSize:10, color:C.orange, background:`${C.orange}0A`, border:`1px solid ${C.orange}25`, borderRadius:4, padding:"4px 10px" }}>
            {kpis.expiringSoon > 0 && `⚠ ${kpis.expiringSoon} EXPIRING SOON`}
            {kpis.expired > 0 && ` ● ${kpis.expired} EXPIRED`}
          </div>
        </div>
      </div>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, padding:"12px 20px", borderBottom:`1px solid ${C.border}`, background:C.panel2||C.panel }}>
        {[
          { l:"Total Evidence",    v:kpis.total,          c:C.white  },
          { l:"Current",          v:kpis.current,        c:C.green  },
          { l:"Expiring Soon",    v:kpis.expiringSoon,   c:C.orange },
          { l:"Expired",          v:kpis.expired,        c:kpis.expired>0?C.red:C.green },
          { l:"Controls Covered", v:kpis.controlsCovered,c:C.teal   },
        ].map(k => (
          <div key={k.l} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:7, padding:"9px 14px" }}>
            <div style={{ ...mono, fontSize:22, fontWeight:900, color:k.c, lineHeight:1 }}>{k.v}</div>
            <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:1, marginTop:4, textTransform:"uppercase" }}>{k.l}</div>
          </div>
        ))}
      </div>
      {/* Main */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", height:"calc(100vh - 158px)" }}>
        {/* Left panel */}
        <div style={{ flex:selected?0.55:1, display:"flex", flexDirection:"column", overflow:"hidden", borderRight:selected?`1px solid ${C.border}`:"none" }}>
          {/* Filters */}
          <div style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}`, background:C.panel2||C.panel, display:"flex", gap:8, flexWrap:"wrap" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search files, controls, notes..."
              style={{ background:C.input, border:`1px solid ${C.inputBorder||C.border}`, borderRadius:5, color:C.text, padding:"5px 10px", fontSize:11, outline:"none", flex:1, minWidth:160 }} />
            <select value={filterType} onChange={e=>setFilterType(e.target.value)}
              style={{ background:C.input, border:`1px solid ${C.inputBorder||C.border}`, borderRadius:5, color:C.text, padding:"5px 8px", fontSize:10, ...mono, outline:"none", cursor:"pointer" }}>
              <option value="ALL">All Types</option>
              {EVIDENCE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
              style={{ background:C.input, border:`1px solid ${C.inputBorder||C.border}`, borderRadius:5, color:C.text, padding:"5px 8px", fontSize:10, ...mono, outline:"none", cursor:"pointer" }}>
              <option value="ALL">All Status</option>
              <option value="Current">Current</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Expired">Expired</option>
            </select>
            <select value={filterRole} onChange={e=>setFilterRole(e.target.value)}
              style={{ background:C.input, border:`1px solid ${C.inputBorder||C.border}`, borderRadius:5, color:C.text, padding:"5px 8px", fontSize:10, ...mono, outline:"none", cursor:"pointer" }}>
              <option value="ALL">All Uploaders</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span style={{ ...mono, fontSize:11, color:C.textMute, alignSelf:"center" }}>{visible.length} files</span>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:16 }}>
            {/* Drop zone */}
            <DropZone onFileAdded={addEvidence} C={C} />
            {/* Grid view */}
            {view === "grid" && (
              <div style={{ display:"grid", gridTemplateColumns:`repeat(${selected?2:3},1fr)`, gap:10 }}>
                {visible.map(ev => {
                  const expiry = getExpiryStatus(ev.uploadDate, ev.type);
                  const evType = EVIDENCE_TYPES.find(t => t.id === ev.type) || EVIDENCE_TYPES[EVIDENCE_TYPES.length-1];
                  const isSel = selected?.id === ev.id;
                  return (
                    <div key={ev.id} onClick={()=>setSelected(isSel?null:ev)}
                      style={{ background:isSel?`${C.teal}0A`:C.panel, border:`1px solid ${isSel?C.teal:C.border}`, borderRadius:8, padding:12, cursor:"pointer", transition:"all 0.15s" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                        <span style={{ fontSize:20 }}>{evType.icon}</span>
                        <StatusBadge status={expiry.status} color={expiry.color} />
                      </div>
                      <div style={{ fontSize:11, fontWeight:600, color:C.white, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ev.name}</div>
                      <div style={{ ...mono, fontSize:10, color:C.textMute, marginBottom:6 }}>{ev.uploadedBy} · {ev.uploadDate} · {ev.size}</div>
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                        {ev.controls.slice(0,3).map(c => (
                          <span key={c} style={{ ...mono, fontSize:10, color:evType.color, background:`${evType.color}14`, border:`1px solid ${evType.color}30`, borderRadius:2, padding:"1px 5px" }}>{c}</span>
                        ))}
                        {ev.controls.length > 3 && <span style={{ ...mono, fontSize:10, color:C.textMute }}>+{ev.controls.length-3}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Table view */}
            {view === "table" && (
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 100px 120px 60px 70px 80px", gap:0, padding:"8px 14px", borderBottom:`1px solid ${C.border}`, background:C.panel2||C.panel }}>
                  {["FILE","TYPE","CONTROLS","BY","SIZE","STATUS"].map(h => (
                    <div key={h} style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8 }}>{h}</div>
                  ))}
                </div>
                {visible.map((ev, i) => {
                  const expiry = getExpiryStatus(ev.uploadDate, ev.type);
                  const isSel = selected?.id === ev.id;
                  return (
                    <div key={ev.id} onClick={()=>setSelected(isSel?null:ev)}
                      style={{ display:"grid", gridTemplateColumns:"1fr 100px 120px 60px 70px 80px", gap:0, padding:"9px 14px", borderBottom:`1px solid ${C.border}`, cursor:"pointer", background:isSel?`${C.teal}0A`:i%2===0?C.panel:C.panel2||C.panel, borderLeft:isSel?`3px solid ${C.teal}`:"3px solid transparent" }}>
                      <div style={{ fontSize:11, color:C.textDim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingRight:8 }}>{ev.name}</div>
                      <div><TypeBadge type={ev.type} /></div>
                      <div style={{ ...mono, fontSize:11, color:C.teal }}>{ev.controls.slice(0,2).join(", ")}{ev.controls.length>2?` +${ev.controls.length-2}`:""}</div>
                      <div style={{ ...mono, fontSize:10, color:C.textDim }}>{ev.uploadedBy}</div>
                      <div style={{ ...mono, fontSize:11, color:C.textMute }}>{ev.size}</div>
                      <div><StatusBadge status={expiry.status} color={expiry.color} /></div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Expiry timeline view */}
            {view === "expiry" && (
              <div>
                <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:12 }}>EVIDENCE EXPIRY TIMELINE — SORTED BY URGENCY</div>
                {expiryData.map(ev => {
                  const evType = EVIDENCE_TYPES.find(t => t.id === ev.type) || EVIDENCE_TYPES[EVIDENCE_TYPES.length-1];
                  const pct = Math.max(0, Math.min(100, (ev.expiry.days / (EXPIRY_RULES[ev.type]?.days || 365)) * 100));
                  return (
                    <div key={ev.id} onClick={()=>setSelected(selected?.id===ev.id?null:ev)}
                      style={{ background:C.panel, border:`1px solid ${ev.expiry.status==="Expired"?`${C.red}40`:ev.expiry.status==="Expiring Soon"?`${C.orange}40`:C.border}`, borderRadius:8, padding:12, marginBottom:8, cursor:"pointer" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{ fontSize:14 }}>{evType.icon}</span>
                          <div>
                            <div style={{ fontSize:11, color:C.white, fontWeight:500 }}>{ev.name}</div>
                            <div style={{ ...mono, fontSize:10, color:C.textMute }}>{ev.controls.slice(0,3).join(", ")}</div>
                          </div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <StatusBadge status={ev.expiry.status} color={ev.expiry.color} />
                          <div style={{ ...mono, fontSize:11, color:ev.expiry.color, marginTop:3 }}>
                            {ev.expiry.status==="Expired"?`${ev.expiry.days}d overdue`:`${ev.expiry.days}d remaining`}
                          </div>
                        </div>
                      </div>
                      <div style={{ height:4, background:C.panel2||`${C.border}`, borderRadius:2, overflow:"hidden" }}>
                        <div style={{ width:`${pct}%`, height:"100%", background:ev.expiry.color, borderRadius:2, transition:"width 0.3s" }} />
                      </div>
                      <div style={{ ...mono, fontSize:10, color:C.textMute, marginTop:4 }}>
                        Expires: {ev.expiry.expiry.toISOString().split("T")[0]}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Detail panel */}
        {selected && (
          <div style={{ flex:0.45, overflow:"hidden", padding:12 }}>
            <EvidenceDetail ev={selected} onClose={()=>setSelected(null)} C={C} />
          </div>
        )}
      </div>
    </div>
  );
}