import { useState, useMemo } from "react";
import { useColors } from "../theme.js";

const C = { bg:"var(--rr-bg)", panel:"var(--rr-panel)", panelAlt:"var(--rr-panel-alt)", panel2:"var(--rr-panel-alt)", border:"var(--rr-border)", borderMd:"var(--rr-border-md)", text:"var(--rr-text)", textDim:"var(--rr-text-dim)", dim:"var(--rr-text-dim)", textMute:"var(--rr-mute)", mute:"var(--rr-mute)", white:"var(--rr-white)", input:"var(--rr-input)", inputBorder:"var(--rr-input-bdr)", rowA:"var(--rr-row-a)", rowB:"var(--rr-row-b)", scroll:"var(--rr-scroll)", headerBg:"var(--rr-header)", teal:"var(--rr-teal)", blue:"var(--rr-blue)", red:"var(--rr-red)", orange:"var(--rr-orange)", gold:"var(--rr-gold)", green:"var(--rr-green)", purple:"var(--rr-purple)" };

// ─── Package Definitions ──────────────────────────────────────────────────────
const PACKAGES = {
  emass: {
    id: "emass",
    label: "DoD ATO Package",
    subtitle: "eMASS Submission",
    icon: "🏛",
    color: "#00D4AA",
    audience: "Authorizing Official / CCRI",
    deliverables: [
      { name:"System Security Plan (SSP)",         format:"DOCX",  pages:"~80-120",  required:true,  desc:"Control-by-control implementation statements, system boundary, architecture" },
      { name:"Plan of Action & Milestones (POAM)", format:"XLSX",  pages:"eMASS fmt",required:true,  desc:"All open findings with CAT, scheduled completion, milestone, POC" },
      { name:"Security Assessment Report (SAR)",   format:"DOCX",  pages:"~40-60",   required:true,  desc:"Assessment findings, methodology, test results, risk ratings" },
      { name:"Continuous Monitoring Plan (CMP)",   format:"DOCX",  pages:"~20",      required:true,  desc:"Monitoring strategy, frequency, tools, metrics, reporting cadence" },
      { name:"Hardware/Software Inventory",        format:"XLSX",  pages:"N/A",      required:true,  desc:"Complete system component inventory with version info" },
      { name:"Network/Data Flow Diagrams",         format:"VSDX",  pages:"N/A",      required:true,  desc:"System boundary, data flows, external connections, ports/protocols" },
      { name:"ATO Authorization Letter Template",  format:"DOCX",  pages:"2",        required:false, desc:"Template AO authorization letter with risk acceptance language" },
      { name:"Risk Executive Summary",             format:"DOCX",  pages:"4",        required:false, desc:"One-pager for AO — current risk posture, open POAMs, residual risk" },
    ],
    frameworks: ["NIST 800-53 Rev 5", "CSRMC", "DISA STIGs/SRGs"],
    system_info_fields: ["system_name","system_type","impact_level","authorization_status","ao_name","isso_name","issm_name","operating_environment","ato_expiration"],
  },
  cmmc: {
    id: "cmmc",
    label: "CMMC Assessment Package",
    subtitle: "C3PAO / DIBCAC Submission",
    icon: "🛡",
    color: "#FFD700",
    audience: "C3PAO (Level 2) / DIBCAC (Level 3)",
    deliverables: [
      { name:"CMMC Assessment Scope",              format:"DOCX",  pages:"~10-15",   required:true,  desc:"System boundary, CUI categories, in-scope assets, out-of-scope justifications" },
      { name:"System Security Plan (800-171)",     format:"DOCX",  pages:"~60-80",   required:true,  desc:"800-171 practice-by-practice implementation, aligned to CMMC practices" },
      { name:"Self-Assessment Report",             format:"DOCX",  pages:"~30-40",   required:true,  desc:"MET/NOT MET/NOT APPLICABLE per practice with objective evidence" },
      { name:"Evidence Package Manifest",          format:"XLSX",  pages:"N/A",      required:true,  desc:"Evidence artifacts per CMMC practice with location and date" },
      { name:"Asset Inventory (CMMC Scope)",       format:"XLSX",  pages:"N/A",      required:true,  desc:"CUI assets, contractor risk managed assets, specialized assets" },
      { name:"CUI Flow Diagram",                   format:"VSDX",  pages:"N/A",      required:true,  desc:"How CUI enters, flows through, and exits your environment" },
      { name:"Subcontractor Flow-Down Plan",       format:"DOCX",  pages:"~8",       required:false, desc:"How CMMC requirements flow to subcontractors handling CUI" },
      { name:"Conditional POAM (if applicable)",   format:"XLSX",  pages:"eMASS fmt",required:false, desc:"Required if score ≥ 80% — must close within 180 days" },
    ],
    frameworks: ["CMMC 2.0 Level 2/3", "NIST 800-171 Rev 2", "NIST 800-172 (L3)"],
    system_info_fields: ["org_name","cage_code","contract_numbers","cmmc_level","c3pao_name","assessment_date","scoping_boundary"],
  },
  sprs: {
    id: "sprs",
    label: "SPRS Self-Assessment",
    subtitle: "DFARS 252.204-7019 Submission",
    icon: "📊",
    color: "#1A7AFF",
    audience: "DoD Contracting Officers / SPRS Portal",
    deliverables: [
      { name:"SPRS Score Report",                  format:"PDF",   pages:"~6-8",     required:true,  desc:"Calculated score (-203 to 110), confidence level, methodology used" },
      { name:"DoD Assessment Summary",             format:"DOCX",  pages:"~15-20",   required:true,  desc:"Practice-by-practice assessment with scoring rationale" },
      { name:"SPRS Portal Upload Data",            format:"XML",   pages:"N/A",      required:true,  desc:"Machine-readable format for direct SPRS portal submission" },
      { name:"Affirmation Statement",              format:"DOCX",  pages:"1",        required:true,  desc:"Annual affirmation that security requirements remain implemented" },
      { name:"Supporting Evidence Summary",        format:"XLSX",  pages:"N/A",      required:false, desc:"Evidence artifacts supporting the self-assessment score" },
    ],
    frameworks: ["NIST 800-171 Rev 2", "DFARS 252.204-7012/7019/7020/7021"],
    system_info_fields: ["org_name","cage_code","sprs_system_name","assessment_date","confidence_level","assessor_name"],
    sprs_score: 96,
  },
  sav: {
    id: "sav",
    label: "SAV Preparation Package",
    subtitle: "Security Assessment Visit",
    icon: "🔍",
    color: "#FF8C00",
    audience: "SCA / CCRI Assessors",
    deliverables: [
      { name:"SAV Readiness Checklist",            format:"XLSX",  pages:"N/A",      required:true,  desc:"Control-by-control readiness status with evidence location and last tested date" },
      { name:"Assessor Walkthrough Guide",         format:"DOCX",  pages:"~25",      required:true,  desc:"Step-by-step guide for assessor: where to look, what to ask, how to verify" },
      { name:"Evidence Binder (by control family)",format:"DOCX",  pages:"~150+",    required:true,  desc:"All evidence organized by NIST control family — screenshots, configs, policies" },
      { name:"Pre-SAV Gap Analysis",               format:"DOCX",  pages:"~20",      required:true,  desc:"Known gaps, accepted risks, and mitigation strategies" },
      { name:"Open POAM Status Report",            format:"XLSX",  pages:"N/A",      required:true,  desc:"All open POAMs with current status, upcoming due dates, milestone progress" },
      { name:"Interview Question Preparation",     format:"DOCX",  pages:"~30",      required:false, desc:"Anticipated assessor questions per control with recommended responses" },
      { name:"Quick Reference Card",               format:"PDF",   pages:"2",        required:false, desc:"One-pager: system overview, key contacts, assessment POCs, critical controls" },
    ],
    frameworks: ["NIST 800-53 Rev 5", "DISA STIGs", "CMMC 2.0"],
    system_info_fields: ["system_name","assessment_date","lead_assessor","isso_name","issm_name","ao_name","location"],
  },
};
// ─── Mock system data ─────────────────────────────────────────────────────────
const SYSTEM_DATA = {
  system_name: "F-35 Mission Data Repository System",
  system_type: "Major Application",
  impact_level: "IL4",
  authorization_status: "ATO",
  ao_name: "Brig Gen J. Smith, USAF",
  isso_name: "Current User (ISSO)",
  issm_name: "Sr. Technical SME (ISSM)",
  operating_environment: "AWS GovCloud + On-Prem",
  ato_expiration: "2026-09-15",
  org_name: "Lockheed Martin Corporation",
  cage_code: "52406",
  contract_numbers: ["N00019-23-C-0001", "FA8611-23-C-0005"],
  cmmc_level: "Level 3",
  c3pao_name: "TBD - DIBCAC (Government-led for L3)",
  assessment_date: new Date().toISOString().split("T")[0],
  scoping_boundary: "CUI processing environment including AWS GovCloud and on-premises F-35 data systems",
  sprs_system_name: "F-35 Mission Data Repository",
  confidence_level: "High",
  assessor_name: "Current User / Authorized ISSM",
};
// ─── Mock posture data ────────────────────────────────────────────────────────
const POSTURE = {
  total_controls: 52, implemented: 44, partial: 5, not_impl: 3,
  open_poams: 8, critical_poams: 2, overdue_poams: 0,
  n800_53_score: 83, n800_171_score: 79, cmmc_l2_score: 78, cmmc_l3_score: 52, sprs_score: 96,
  stig_findings: { cat_i: 2, cat_ii: 12, cat_iii: 31 },
  last_acas_scan: "2025-04-01",
  last_stig_scan: "2025-03-28",
  ato_status: "ATO",
  csrmc_score: 69,
};
// ─── Colors ───────────────────────────────────────────────────────────────────
const mono = { fontFamily:"'Courier New', monospace" };
const FormatBadge = ({ format }) => {
  const colors = { DOCX:"#2196F3", XLSX:"#4CAF50", PDF:"#F44336", XML:"#FF9800", VSDX:"#9C27B0" };
  const c = colors[format] || "#888";
  return <span style={{ ...mono, fontSize:11, color:c, background:`${c}14`, border:`1px solid ${c}30`, borderRadius:3, padding:"1px 5px" }}>{format}</span>;
};
const StatusBar = ({ label, score, color }) => (
  <div style={{ marginBottom:8 }}>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
      <span style={{ ...mono, fontSize:11, color:"var(--rr-mute)" }}>{label}</span>
      <span style={{ ...mono, fontSize:11, fontWeight:700, color }}>{score}%</span>
    </div>
    <div style={{ height:4, background:C.input, borderRadius:2, overflow:"hidden" }}>
      <div style={{ width:`${score}%`, height:"100%", background:color, borderRadius:2, transition:"width 0.8s ease" }} />
    </div>
  </div>
);
// ─── Package Selector Card ────────────────────────────────────────────────────
const PackageCard = ({ pkg, selected, onToggle }) => {
  return (
  <div onClick={onToggle} style={{ background:selected?`${pkg.color}0A`:C.panel, border:`2px solid ${selected?pkg.color:C.border}`, borderRadius:10, padding:18, cursor:"pointer", transition:"all 0.2s", position:"relative" }}>
    {selected && <div style={{ position:"absolute", top:10, right:12, ...mono, fontSize:10, color:pkg.color, fontWeight:700 }}>✓ SELECTED</div>}
    <div style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:12 }}>
      <div style={{ fontSize:28 }}>{pkg.icon}</div>
      <div>
        <div style={{ fontSize:14, fontWeight:700, color:C.white }}>{pkg.label}</div>
        <div style={{ ...mono, fontSize:10, color:pkg.color, marginTop:2 }}>{pkg.subtitle}</div>
        <div style={{ fontSize:10, color:"var(--rr-mute)", marginTop:2 }}>For: {pkg.audience}</div>
      </div>
    </div>
    <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
      {pkg.frameworks.map(f => (
        <span key={f} style={{ ...mono, fontSize:10, color:pkg.color, background:`${pkg.color}10`, border:`1px solid ${pkg.color}25`, borderRadius:3, padding:"2px 6px" }}>{f}</span>
      ))}
    </div>
    <div style={{ ...mono, fontSize:10, color:"var(--rr-mute)" }}>{pkg.deliverables.length} deliverables · {pkg.deliverables.filter(d=>d.required).length} required</div>
  </div>
);
};
// ─── Deliverable Preview ──────────────────────────────────────────────────────
const DeliverableRow = ({ d, pkgColor, included }) => (
  <div style={{ display:"flex", gap:10, padding:"10px 0", borderBottom:`1px solid #0A1828`, alignItems:"flex-start", opacity:included?1:0.4 }}>
    <div style={{ width:24, height:24, borderRadius:"50%", background:included?`${pkgColor}14`:C.borderMd, border:`1px solid ${included?pkgColor:C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, minWidth:24 }}>
      {included ? "✓" : "—"}
    </div>
    <div style={{ flex:1 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
        <span style={{ fontSize:12, color:C.white, fontWeight:500 }}>{d.name}</span>
        <FormatBadge format={d.format} />
        {d.required && <span style={{ ...mono, fontSize:10, color:"#FF4444" }}>REQUIRED</span>}
        {d.pages && <span style={{ ...mono, fontSize:10, color:"var(--rr-mute)" }}>{d.pages} pages</span>}
      </div>
      <div style={{ fontSize:11, color:"var(--rr-text-dim)" }}>{d.desc}</div>
    </div>
  </div>
);
// ─── Generation Progress ──────────────────────────────────────────────────────
const GenerationStep = ({ label, status, detail }) => {
  const cfg = { done:{color:"#00CC88",icon:"✓"}, running:{color:"#00D4AA",icon:"⟳"}, pending:{color:"var(--rr-mute)",icon:"○"} };
  const s = cfg[status] || cfg.pending;
  return (
    <div style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"8px 0" }}>
      <div style={{ ...mono, fontSize:14, color:s.color, minWidth:20, animation:status==="running"?"spin 1s linear infinite":"none" }}>{s.icon}</div>
      <div>
        <div style={{ fontSize:12, color:status==="pending"?"var(--rr-mute)":C.white }}>{label}</div>
        {detail && status !== "pending" && <div style={{ ...mono, fontSize:11, color:"var(--rr-mute)", marginTop:2 }}>{detail}</div>}
      </div>
    </div>
  );
};
// ─── Download Button ──────────────────────────────────────────────────────────
const DownloadBtn = ({ label, format, size, color, pkg }) => (
  <button style={{ background:`${color}10`, border:`1px solid ${color}30`, borderRadius:6, padding:"10px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, width:"100%", marginBottom:8 }}
    onClick={() => {
      // In production: triggers actual file download from RiskRadar API
      alert(`Downloading: ${label}\n\nIn production, this downloads an encrypted ${format} file from the RiskRadar API.\n\nThe file is:\n• Encrypted with your org's KMS key\n• Watermarked with your EDIPI\n• Logged to the immutable audit trail`);
    }}>
    <span style={{ fontSize:18 }}>{format==="DOCX"?"📄":format==="XLSX"?"📊":format==="PDF"?"📋":format==="XML"?"📝":"📁"}</span>
    <div style={{ flex:1, textAlign:"left" }}>
      <div style={{ fontSize:12, color:C.white, fontWeight:500 }}>{label}</div>
      <div style={{ ...mono, fontSize:11, color:"var(--rr-mute)" }}>{format} · {size}</div>
    </div>
    <span style={{ color, fontSize:14, fontWeight:700 }}>↓</span>
  </button>
);
// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ATOGenerator() {
  const [selected, setSelected] = useState(new Set(["emass"]));
  const [step, setStep] = useState("configure"); // configure | review | generating | complete
  const [genProgress, setGenProgress] = useState({});
  const [activePackage, setActivePackage] = useState("emass");
  const [includeAll, setIncludeAll] = useState(false);
  const togglePkg = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const totalDeliverables = useMemo(() =>
    [...selected].reduce((sum, id) => sum + PACKAGES[id].deliverables.length, 0)
  , [selected]);
  const startGeneration = async () => {
    setStep("generating");
    const steps = [
      { id:"data",    label:"Collecting control assessment data",          detail:"Reading 44 implemented controls, 8 open POAMs, STIG findings..." },
      { id:"map",     label:"Cross-framework mapping",                     detail:"Mapping 800-53 → 800-171 → CMMC → CSRMC for all assessed controls..." },
      { id:"ssp",     label:"Generating System Security Plan (SSP)",       detail:"Writing control statements, system description, boundary info..." },
      { id:"poam",    label:"Generating POAM (eMASS format)",              detail:"Formatting 8 open POAMs with CAT, schedule, milestones, POC..." },
      { id:"sprs",    label:"Calculating SPRS score",                      detail:"Applying DoD Assessment Methodology... Score: 96/110..." },
      { id:"cmmc",    label:"Building CMMC assessment scope",              detail:"Identifying in-scope CUI assets and practices..." },
      { id:"encrypt", label:"Encrypting packages with org KMS key",       detail:"AES-256-GCM encryption with key alias/sentinelgrc-packages..." },
      { id:"audit",   label:"Writing to immutable audit log",              detail:"Recording package generation event with EDIPI and timestamp..." },
      { id:"done",    label:"Packages ready for download",                 detail:"All packages generated successfully." },
    ];
    for (const s of steps) {
      setGenProgress(prev => ({ ...prev, [s.id]: { status:"running", detail:s.detail, label:s.label } }));
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      setGenProgress(prev => ({ ...prev, [s.id]: { ...prev[s.id], status:"done" } }));
    }
    setTimeout(() => setStep("complete"), 300);
  };
  const scoreColor = (s) => s>=85?C.green:s>=70?C.teal:s>=50?C.orange:C.red;
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Helvetica Neue', Arial, sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`* { box-sizing:border-box; margin:0; padding:0; } ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:#050D15; } ::-webkit-scrollbar-thumb { background:#1A3A5C; } @keyframes spin { to { transform:rotate(360deg); } } .spin { animation:spin 1s linear infinite; display:inline-block; } .btn-h:hover { opacity:0.85; }`}</style>
      {/* Header */}
      <div style={{ background:C.headerBg, borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:30, height:30, background:`linear-gradient(135deg, ${C.teal}, ${C.blue})`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:14, fontWeight:900, color:C.panelAlt }}>S</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.white }}>RiskRadar — ATO Package Generator</div>
            <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8 }}>EMASS · DIBCAC · SPRS · SAV · F-35 JSF PROGRAM</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {/* Step indicator */}
          {["configure","review","generating","complete"].map((s, i, arr) => (
            <div key={s} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:step===s?"rgba(0,212,170,0.15)":arr.indexOf(step)>i?C.green:C.borderMd, border:`2px solid ${step===s?C.teal:arr.indexOf(step)>i?C.green:C.border}`, display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:10, fontWeight:700, color:step===s?C.teal:arr.indexOf(step)>i?C.green:C.textMute }}>
                {arr.indexOf(step) > i ? "✓" : i+1}
              </div>
              <span style={{ ...mono, fontSize:11, color:step===s?C.teal:C.textMute, textTransform:"uppercase" }}>{s}</span>
              {i < arr.length-1 && <div style={{ width:20, height:1, background:C.border }} />}
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:24 }}>
        {/* STEP 1: CONFIGURE */}
        {step === "configure" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20, maxWidth:1100 }}>
            <div>
              <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:16 }}>SELECT PACKAGES TO GENERATE</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
                {Object.values(PACKAGES).map(pkg => (
                  <PackageCard key={pkg.id} pkg={pkg} selected={selected.has(pkg.id)} onToggle={() => togglePkg(pkg.id)} />
                ))}
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button className="btn-h" onClick={() => setSelected(new Set(Object.keys(PACKAGES)))}
                  style={{ ...mono, background:"rgba(0,212,170,0.06)", border:`1px solid rgba(0,212,170,0.2)`, color:C.teal, borderRadius:5, padding:"8px 16px", cursor:"pointer", fontSize:10 }}>
                  ☑ Select All Packages
                </button>
                <button className="btn-h" onClick={() => setSelected(new Set())}
                  style={{ ...mono, background:"transparent", border:`1px solid ${C.border}`, color:C.textMute, borderRadius:5, padding:"8px 16px", cursor:"pointer", fontSize:10 }}>
                  ☐ Clear All
                </button>
              </div>
            </div>
            {/* Right sidebar — system summary */}
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:16 }}>
                <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:12 }}>SYSTEM INFORMATION</div>
                {[
                  ["System",       SYSTEM_DATA.system_name],
                  ["Impact Level", SYSTEM_DATA.impact_level],
                  ["ATO Status",   SYSTEM_DATA.authorization_status],
                  ["ISSO",         SYSTEM_DATA.isso_name],
                  ["Org / CAGE",   `${SYSTEM_DATA.org_name.split(" ").slice(0,2).join(" ")} / ${SYSTEM_DATA.cage_code}`],
                  ["ATO Expires",  SYSTEM_DATA.ato_expiration],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:7, paddingBottom:7, borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ ...mono, fontSize:11, color:C.textMute }}>{k}</span>
                    <span style={{ ...mono, fontSize:11, color:C.teal, maxWidth:160, textAlign:"right", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:16 }}>
                <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:12 }}>CURRENT POSTURE</div>
                <StatusBar label="NIST 800-53 Rev 5" score={POSTURE.n800_53_score} color={scoreColor(POSTURE.n800_53_score)} />
                <StatusBar label="NIST 800-171" score={POSTURE.n800_171_score} color={scoreColor(POSTURE.n800_171_score)} />
                <StatusBar label="CMMC Level 2" score={POSTURE.cmmc_l2_score} color={scoreColor(POSTURE.cmmc_l2_score)} />
                <StatusBar label="CSRMC" score={POSTURE.csrmc_score} color={scoreColor(POSTURE.csrmc_score)} />
                <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, marginTop:6, display:"flex", flexDirection:"column", gap:5 }}>
                  {[
                    [`Open POAMs`,       `${POSTURE.open_poams} (${POSTURE.critical_poams} critical)`,C.orange],
                    [`STIG CAT I`,       `${POSTURE.stig_findings.cat_i} findings`,               C.red],
                    [`STIG CAT II`,      `${POSTURE.stig_findings.cat_ii} findings`,               C.orange],
                    [`SPRS Score`,       `${POSTURE.sprs_score}/110`,                               C.green],
                    [`Last ACAS Scan`,   POSTURE.last_acas_scan,                                    C.textDim],
                  ].map(([k,v,c]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ ...mono, fontSize:11, color:C.textMute }}>{k}</span>
                      <span style={{ ...mono, fontSize:11, color:c, fontWeight:700 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button className="btn-h" disabled={selected.size === 0} onClick={() => setStep("review")}
                style={{ background:selected.size>0?C.teal:C.borderMd, border:"none", color:selected.size>0?C.headerBg:C.textMute, borderRadius:6, padding:"11px 0", cursor:selected.size>0?"pointer":"not-allowed", ...mono, fontSize:12, fontWeight:700, transition:"all 0.2s" }}>
                {selected.size > 0 ? `REVIEW ${totalDeliverables} DELIVERABLES →` : "SELECT AT LEAST ONE PACKAGE"}
              </button>
            </div>
          </div>
        )}
        {/* STEP 2: REVIEW */}
        {step === "review" && (
          <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:20, maxWidth:1100 }}>
            {/* Package nav */}
            <div>
              <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:12 }}>SELECTED PACKAGES</div>
              {[...selected].map(id => {
                const pkg = PACKAGES[id];
                return (
                  <div key={id} onClick={() => setActivePackage(id)}
                    style={{ padding:"10px 14px", borderRadius:6, marginBottom:8, cursor:"pointer", background:activePackage===id?`${pkg.color}10`:C.panel, border:`1px solid ${activePackage===id?pkg.color:C.border}` }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontSize:16 }}>{pkg.icon}</span>
                      <div>
                        <div style={{ fontSize:11, color:C.white, fontWeight:500 }}>{pkg.label}</div>
                        <div style={{ ...mono, fontSize:10, color:pkg.color }}>{pkg.deliverables.length} deliverables</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, marginTop:12 }}>
                <div style={{ ...mono, fontSize:11, color:C.textMute, marginBottom:6 }}>TOTAL DELIVERABLES</div>
                <div style={{ ...mono, fontSize:24, fontWeight:800, color:C.teal }}>{totalDeliverables}</div>
                <div style={{ fontSize:10, color:C.textMute, marginTop:4 }}>
                  {[...selected].reduce((s,id) => s + PACKAGES[id].deliverables.filter(d=>d.required).length, 0)} required · {[...selected].reduce((s,id) => s + PACKAGES[id].deliverables.filter(d=>!d.required).length, 0)} optional
                </div>
              </div>
            </div>
            {/* Deliverable list */}
            <div>
              {activePackage && selected.has(activePackage) && (() => {
                const pkg = PACKAGES[activePackage];
                return (
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                      <div>
                        <div style={{ fontSize:15, fontWeight:700, color:C.white }}>{pkg.icon} {pkg.label}</div>
                        <div style={{ ...mono, fontSize:11, color:pkg.color }}>{pkg.subtitle} · For: {pkg.audience}</div>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        {pkg.frameworks.map(f => (
                          <span key={f} style={{ ...mono, fontSize:10, color:pkg.color, background:`${pkg.color}10`, border:`1px solid ${pkg.color}25`, borderRadius:3, padding:"2px 6px" }}>{f}</span>
                        ))}
                      </div>
                    </div>
                    {pkg.deliverables.map((d, i) => (
                      <DeliverableRow key={i} d={d} pkgColor={pkg.color} included={true} />
                    ))}
                    <div style={{ marginTop:12, padding:"10px 14px", background:"rgba(0,212,170,0.05)", border:`1px solid rgba(0,212,170,0.15)`, borderRadius:6 }}>
                      <div style={{ fontSize:11, color:C.textDim, lineHeight:1.7 }}>
                        💡 All documents are auto-populated from your RiskRadar assessment data — control statements, POAM entries, scan results, and evidence links. You review and approve before final submission to the AO or C3PAO.
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
        {step === "review" && (
          <div style={{ display:"flex", gap:10, marginTop:20, maxWidth:1100 }}>
            <button className="btn-h" onClick={() => setStep("configure")}
              style={{ ...mono, background:"transparent", border:`1px solid ${C.border}`, color:C.textMute, borderRadius:5, padding:"9px 18px", cursor:"pointer", fontSize:11 }}>
              ← Back
            </button>
            <button className="btn-h" onClick={startGeneration}
              style={{ background:`linear-gradient(90deg, ${C.teal}, ${C.blue})`, border:"none", color:C.headerBg, borderRadius:5, padding:"9px 24px", cursor:"pointer", ...mono, fontSize:12, fontWeight:700 }}>
              ⚡ GENERATE {totalDeliverables} DELIVERABLES →
            </button>
          </div>
        )}
        {/* STEP 3: GENERATING */}
        {step === "generating" && (
          <div style={{ maxWidth:600, margin:"0 auto" }}>
            <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:20 }}>GENERATING ATO PACKAGE — DO NOT CLOSE</div>
            <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:24 }}>
              {Object.entries(genProgress).map(([id, step]) => (
                <GenerationStep key={id} label={step.label} status={step.status} detail={step.detail} />
              ))}
            </div>
          </div>
        )}
        {/* STEP 4: COMPLETE — DOWNLOADS */}
        {step === "complete" && (
          <div style={{ maxWidth:1100 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ fontSize:32 }}>✅</div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:C.green }}>ATO Package Generated Successfully</div>
                <div style={{ ...mono, fontSize:10, color:C.textMute }}>All packages encrypted with org KMS key · Access logged to immutable audit trail · Packages expire in 30 days</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14 }}>
              {[...selected].map(id => {
                const pkg = PACKAGES[id];
                const downloadSets = {
                  emass:  [["System Security Plan (SSP)","DOCX","~2.4 MB"],["POAM — eMASS Format","XLSX","~380 KB"],["Security Assessment Report","DOCX","~1.8 MB"],["Continuous Monitoring Plan","DOCX","~640 KB"],["Full ATO Package (ZIP)","ZIP","~8.2 MB"]],
                  cmmc:   [["CMMC Assessment Scope","DOCX","~480 KB"],["SSP — 800-171 Aligned","DOCX","~1.6 MB"],["Self-Assessment Report","DOCX","~920 KB"],["Evidence Package Manifest","XLSX","~240 KB"],["Full CMMC Package (ZIP)","ZIP","~5.1 MB"]],
                  sprs:   [["SPRS Score Report (Score: 96/110)","PDF","~320 KB"],["DoD Assessment Summary","DOCX","~640 KB"],["SPRS Portal Upload Data","XML","~18 KB"],["Full SPRS Package (ZIP)","ZIP","~1.2 MB"]],
                  sav:    [["SAV Readiness Checklist","XLSX","~480 KB"],["Assessor Walkthrough Guide","DOCX","~1.2 MB"],["Evidence Binder (by family)","PDF","~12 MB"],["Open POAM Status Report","XLSX","~280 KB"],["Full SAV Package (ZIP)","ZIP","~15 MB"]],
                };
                return (
                  <div key={id} style={{ background:C.panel, border:`1px solid ${pkg.color}30`, borderRadius:8, padding:16 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:14 }}>
                      <span style={{ fontSize:18 }}>{pkg.icon}</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:C.white }}>{pkg.label}</div>
                        <div style={{ ...mono, fontSize:11, color:pkg.color }}>{pkg.subtitle}</div>
                      </div>
                    </div>
                    {(downloadSets[id] || []).map(([name, fmt, size]) => (
                      <DownloadBtn key={name} label={name} format={fmt} size={size} color={pkg.color} pkg={id} />
                    ))}
                  </div>
                );
              })}
            </div>
            {/* SPRS submission callout */}
            {selected.has("sprs") && (
              <div style={{ marginTop:16, background:"rgba(26,122,255,0.06)", border:`1px solid rgba(26,122,255,0.2)`, borderRadius:8, padding:16, display:"flex", gap:12, alignItems:"flex-start" }}>
                <span style={{ fontSize:20 }}>📋</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.white, marginBottom:4 }}>Next Step: Submit SPRS Score to DoD Portal</div>
                  <div style={{ fontSize:11, color:C.textDim, lineHeight:1.7 }}>
                    Your SPRS score of <strong style={{ color:C.green }}>96/110</strong> must be submitted to the SPRS portal at <span style={{ ...mono, color:C.blue }}>https://www.sprs.csd.disa.mil</span> — login with your CAC. 
                    Under DFARS 252.204-7019, this is required before contract award for any contract with a DoD cybersecurity requirement. 
                    Use the XML upload file from your download package for direct submission.
                  </div>
                </div>
              </div>
            )}
            <div style={{ marginTop:12, display:"flex", gap:10 }}>
              <button className="btn-h" onClick={() => { setStep("configure"); setGenProgress({}); }}
                style={{ ...mono, background:"transparent", border:`1px solid ${C.border}`, color:C.textMute, borderRadius:5, padding:"8px 16px", cursor:"pointer", fontSize:10 }}>
                ← Generate Another Package
              </button>
              <button className="btn-h"
                style={{ ...mono, background:"rgba(0,212,170,0.08)", border:`1px solid rgba(0,212,170,0.2)`, color:C.teal, borderRadius:5, padding:"8px 16px", cursor:"pointer", fontSize:10 }}>
                📋 View Access Audit Log
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}