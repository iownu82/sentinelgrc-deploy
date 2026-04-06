import { useState, useMemo, useContext } from "react";
import { ThemeContext, THEMES } from "../theme.js";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

const C_STATIC = { bg:"#03080E", panel:"#060D16", panelAlt:"#08111C", panel2:"#08111C", border:"#0D1E2E", borderMd:"#152840", text:"#C8D8E8", textDim:"#7A9AB8", dim:"#7A9AB8", textMute:"#3A5570", mute:"#3A5570", white:"#F0F8FF", input:"#040C16", inputBorder:"#1A3A5C", rowA:"#050C14", rowB:"#040A12", scroll:"#1A3A5C", headerBg:"#02060C", teal:"#00D4AA", blue:"#1A7AFF", red:"#FF4444", orange:"#FF8C00", gold:"#FFD700", green:"#00CC88", purple:"#AA66FF" };


// ─── Framework Definitions ────────────────────────────────────────────────────
const FRAMEWORKS = {
  n800_53:  { label:"NIST 800-53 Rev 5", short:"800-53", color:"#00D4AA", icon:"🏛",  audience:"DoD AO / CCRI",       env:"DoD Site",        totalControls:52  },
  n800_171: { label:"NIST 800-171 Rev 2", short:"800-171",color:"#1A7AFF", icon:"📋",  audience:"DCSA / Self-Assess",  env:"Contractor Site", totalControls:41  },
  cmmc_l1:  { label:"CMMC 2.0 Level 1",  short:"CMMC L1",color:"#00CC88", icon:"①",   audience:"FAR 52.204-21",       env:"All Contractors", totalControls:17  },
  cmmc_l2:  { label:"CMMC 2.0 Level 2",  short:"CMMC L2",color:"#FFD700", icon:"②",   audience:"C3PAO / DIBCAC",     env:"DIB Contractors", totalControls:110 },
  cmmc_l3:  { label:"CMMC 2.0 Level 3",  short:"CMMC L3",color:"#FF8C00", icon:"③",   audience:"DIBCAC (Gov't-led)", env:"Critical Programs",totalControls:134 },
  csrmc:    { label:"CSRMC (Sep 2025)",   short:"CSRMC",  color:"#AA66FF", icon:"⚡",  audience:"DoD CIO / CSSP",     env:"DoD + Contractors",totalControls:5   },
};

const CSRMC_PHASES = [
  { id:"P1", label:"Phase 1: Design",     score:72, icon:"🏗", color:"#9C27B0" },
  { id:"P2", label:"Phase 2: Build",      score:68, icon:"🔨", color:"#673AB7" },
  { id:"P3", label:"Phase 3: Test",       score:81, icon:"🧪", color:"#3F51B5" },
  { id:"P4", label:"Phase 4: Onboard",    score:65, icon:"🚀", color:"#2196F3" },
  { id:"P5", label:"Phase 5: Operations", score:58, icon:"⚙",  color:"#03A9F4" },
];

// ─── Mock assessment results ──────────────────────────────────────────────────
const MOCK_SCORES = {
  n800_53:  { score:83, compliant:44, total:52, trend:"+3% ↑"  },
  n800_171: { score:79, compliant:32, total:41, trend:"+2% ↑"  },
  cmmc_l1:  { score:94, compliant:16, total:17, trend:"0%"   },
  cmmc_l2:  { score:78, compliant:86, total:110,trend:"+5% ↑"  },
  cmmc_l3:  { score:52, compliant:70, total:134,trend:"+1% ↑"  },
  csrmc:    { score:69, compliant:null,total:null,trend:"+8%" },
};

// ─── Cross-framework control examples ─────────────────────────────────────────
const CROSS_MAP_EXAMPLES = [
  {
    n800_53: "AC-3",   title:"Access Enforcement",
    n800_171:["3.1.1"],"cmmc_l1":["AC.L1-3.1.1"],"cmmc_l2":["AC.L1-3.1.1","AC.L2-3.1.3"],
    csrmc_phases:["Phase 1: Design","Phase 4: Onboard"],
    csrmc_tenets:["Critical Controls","Zero Trust Architecture"],
    status:"Implemented", dfars:true,
  },
  {
    n800_53: "IA-2",   title:"Identification & Auth (MFA)",
    n800_171:["3.5.3"],"cmmc_l1":[],"cmmc_l2":["IA.L2-3.5.3"],
    csrmc_phases:["Phase 1: Design","Phase 4: Onboard"],
    csrmc_tenets:["Critical Controls","Zero Trust Architecture"],
    status:"Implemented", dfars:true,
  },
  {
    n800_53: "RA-5",   title:"Vulnerability Scanning (ACAS)",
    n800_171:["3.11.2","3.11.3"],"cmmc_l1":[],"cmmc_l2":["RA.L2-3.11.2","RA.L2-3.11.3"],
    csrmc_phases:["Phase 3: Test","Phase 5: Operations"],
    csrmc_tenets:["Automation","Continuous Monitoring / cATO"],
    status:"Implemented", dfars:true,
  },
  {
    n800_53: "SC-7",   title:"Boundary Protection",
    n800_171:["3.13.1","3.13.5","3.13.6","3.13.7"],"cmmc_l1":[],"cmmc_l2":["SC.L2-3.13.1","SC.L2-3.13.5","SC.L2-3.13.6","SC.L2-3.13.7"],
    csrmc_phases:["Phase 1: Design","Phase 5: Operations"],
    csrmc_tenets:["Critical Controls","Cyber Survivability","Zero Trust Architecture"],
    status:"Implemented", dfars:true,
  },
  {
    n800_53: "SI-3",   title:"Malicious Code Protection (HBSS/ENS)",
    n800_171:["3.14.2","3.14.4","3.14.5"],"cmmc_l1":["SI.L1-3.14.2"],"cmmc_l2":["SI.L1-3.14.2","SI.L2-3.14.4","SI.L2-3.14.5"],
    csrmc_phases:["Phase 2: Build","Phase 5: Operations"],
    csrmc_tenets:["Critical Controls","Cyber Survivability"],
    status:"Implemented", dfars:true, is_cmmc_l1:true,
  },
  {
    n800_53: "IR-6",   title:"Incident Reporting (72-hr DFARS)",
    n800_171:["3.6.2"],"cmmc_l1":[],"cmmc_l2":["IR.L2-3.6.2"],
    csrmc_phases:["Phase 5: Operations"],
    csrmc_tenets:["Cyber Survivability"],
    status:"Implemented", dfars:true, dfars_critical:true,
    dfars_note:"DFARS 252.204-7012 requires 72-hr cyber incident reporting to DoD",
  },
  {
    n800_53: "SC-13",  title:"Cryptographic Protection (FIPS)",
    n800_171:["3.13.10"],"cmmc_l1":[],"cmmc_l2":["SC.L2-3.13.10"],
    csrmc_phases:["Phase 1: Design","Phase 2: Build"],
    csrmc_tenets:["Critical Controls","Cyber Survivability"],
    status:"Not Implemented", dfars:true,
  },
  {
    n800_53: "CA-7",   title:"Continuous Monitoring (cATO)",
    n800_171:["3.12.3"],"cmmc_l1":[],"cmmc_l2":["CA.L2-3.12.3"],
    csrmc_phases:["Phase 4: Onboard","Phase 5: Operations"],
    csrmc_tenets:["Continuous Monitoring / cATO","Automation"],
    status:"Partial", dfars:true,
  },
  {
    n800_53: "AU-2",   title:"Event Logging",
    n800_171:["3.3.1","3.3.2"],"cmmc_l1":[],"cmmc_l2":["AU.L2-3.3.1","AU.L2-3.3.2"],
    csrmc_phases:["Phase 4: Onboard","Phase 5: Operations"],
    csrmc_tenets:["Continuous Monitoring / cATO","Automation"],
    status:"Partial", dfars:true,
  },
  {
    n800_53: "CM-6",   title:"Configuration Settings (STIGs)",
    n800_171:["3.4.1","3.4.2"],"cmmc_l1":[],"cmmc_l2":["CM.L2-3.4.1","CM.L2-3.4.2"],
    csrmc_phases:["Phase 2: Build","Phase 3: Test"],
    csrmc_tenets:["Critical Controls","Automation","DevSecOps"],
    status:"Partial", dfars:true,
  },
];

const RADAR_DATA = [
  { subject:"AC",  A:83, B:80, fullMark:100 },
  { subject:"AU",  A:75, B:72, fullMark:100 },
  { subject:"CA",  A:65, B:60, fullMark:100 },
  { subject:"CM",  A:70, B:68, fullMark:100 },
  { subject:"IA",  A:90, B:85, fullMark:100 },
  { subject:"IR",  A:88, B:85, fullMark:100 },
  { subject:"RA",  A:82, B:79, fullMark:100 },
  { subject:"SC",  A:78, B:75, fullMark:100 },
  { subject:"SI",  A:88, B:83, fullMark:100 },
];

const mono = { fontFamily:"'Courier New', monospace" };

const StatusBadge = ({ status }) => {
  const cfg = { Implemented:{c:"#00CC88",b:"rgba(0,204,136,0.10)"}, "Not Implemented":{c:"#FF4444",b:"rgba(255,68,68,0.10)"}, Partial:{c:"#FFD700",b:"rgba(255,215,0,0.09)"}, Planned:{c:"#FF8C00",b:"rgba(255,140,0,0.10)"} };
  const s = cfg[status] || {c:"#556677",b:"rgba(85,102,119,0.10)"};
  return <span style={{ ...mono, background:s.b, color:s.c, border:`1px solid ${s.c}40`, borderRadius:3, padding:"2px 7px", fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>{status}</span>;
};

const GaugeArc = ({ score, color, size=90 }) => {
  const r = size/2 - 8;
  const circ = 2*Math.PI*r;
  return (
    <div style={{ position:"relative", width:size, height:size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#0E2030" strokeWidth="7" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={circ - (score/100)*circ}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition:"stroke-dashoffset 0.8s ease" }} />
        <text x={size/2} y={size/2+5} textAnchor="middle" fill={color} fontSize={size>80?"18":"13"} fontWeight="800" fontFamily="monospace">{score}%</text>
      </svg>
    </div>
  );
};

export default function MultiFramework() {
  const theme = useContext(ThemeContext);
  const C = THEMES[theme] || C_STATIC;
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedControl, setSelectedControl] = useState(null);
  const [deployMode, setDeployMode] = useState("dual");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const sprs = 96; // Mock SPRS score

  const visibleControls = useMemo(() =>
    CROSS_MAP_EXAMPLES.filter(c => filterStatus === "ALL" || c.status === filterStatus)
  , [filterStatus]);

  const NAV = [
    { id:"overview",   label:"Posture Overview" },
    { id:"mapping",    label:"Cross-Framework Map" },
    { id:"csrmc",      label:"CSRMC Phases" },
    { id:"sprs",       label:"SPRS + CMMC" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Helvetica Neue', Arial, sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`* { box-sizing:border-box; margin:0; padding:0; } ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:#050D15; } ::-webkit-scrollbar-thumb { background:#1A3A5C; } .row-h:hover { background:rgba(26,90,140,0.14) !important; cursor:pointer; }`}</style>

      {/* Header */}
      <div style={{ background:C.headerBg, borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:30, height:30, background:`linear-gradient(135deg, ${C.teal}, ${C.blue})`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:14, fontWeight:900, color:C.panelAlt }}>RR</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.white }}>Multi-Framework</div>
            <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8 }}>ASSESS ONCE · COMPLY WITH ALL</div>
          </div>
          <div style={{ width:1, height:24, background:C.border, margin:"0 8px" }} />
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActiveTab(n.id)}
              style={{ background:activeTab===n.id?"rgba(0,212,170,0.08)":"none", border:`1px solid ${activeTab===n.id?"rgba(0,212,170,0.3)":"transparent"}`, color:activeTab===n.id?C.teal:C.textMute, borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:11, fontWeight:activeTab===n.id?600:400 }}>{n.label}</button>
          ))}
        </div>
        {/* Deploy mode toggle */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ ...mono, fontSize:11, color:C.textMute }}>DEPLOY MODE:</span>
          {[["dod","🏛 DoD Site"],["contractor","🏢 Contractor Site"],["dual","⚡ Dual (LM/F-35)"]].map(([m,l]) => (
            <button key={m} onClick={() => setDeployMode(m)}
              style={{ ...mono, background:deployMode===m?"rgba(0,212,170,0.08)":"transparent", border:`1px solid ${deployMode===m?"rgba(0,212,170,0.3)":C.border}`, color:deployMode===m?C.teal:C.textMute, borderRadius:4, padding:"4px 10px", cursor:"pointer", fontSize:11, fontWeight:deployMode===m?700:400 }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Deploy mode banner */}
      <div style={{ background:deployMode==="dual"?"rgba(170,102,255,0.07)":deployMode==="dod"?"rgba(0,212,170,0.05)":"rgba(26,122,255,0.05)", borderBottom:`1px solid ${deployMode==="dual"?"rgba(170,102,255,0.2)":deployMode==="dod"?"rgba(0,212,170,0.2)":"rgba(26,122,255,0.2)"}`, padding:"8px 20px", display:"flex", gap:20, alignItems:"center" }}>
        {deployMode === "dual" && (
          <>
            
            <span style={{ fontSize:11, color:C.textDim }}>
              <strong style={{ color:"#AA66FF" }}>Dual Mode Active (LM / F-35 JSF)</strong> — One assessment satisfies: NIST 800-53 Rev 5 (DoD ATO) + NIST 800-171 (DFARS) + CMMC 2.0 Level 2/3 (LM contractor) + CSRMC (DoD Sep 2025) simultaneously.
            </span>
          </>
        )}
        {deployMode === "dod" && <span style={{ fontSize:11, color:C.textDim }}><strong style={{ color:C.teal }}>DoD Site Mode</strong> — Showing 800-53 Rev 5, CSRMC phases, and ATO package readiness. eMASS export available.</span>}
        {deployMode === "contractor" && <span style={{ fontSize:11, color:C.textDim }}><strong style={{ color:C.blue }}>Contractor Mode</strong> — Showing CMMC 2.0, 800-171, SPRS score, and C3PAO assessment package.</span>}
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:20 }}>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* Framework Score Cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10 }}>
              {Object.entries(FRAMEWORKS).map(([key, fw]) => {
                const data = MOCK_SCORES[key];
                const scoreColor = data.score>=85?C.green:data.score>=70?C.teal:data.score>=50?C.orange:C.red;
                const isActive = deployMode==="dual" || (deployMode==="dod" && ["n800_53","csrmc"].includes(key)) || (deployMode==="contractor" && ["n800_171","cmmc_l1","cmmc_l2","cmmc_l3"].includes(key));
                return (
                  <div key={key} style={{ background:C.panel, border:`2px solid ${isActive?`${fw.color}40`:C.border}`, borderRadius:10, padding:"14px 12px", textAlign:"center", opacity:isActive?1:0.35 }}>
                    <div style={{ fontSize:20, marginBottom:6 }}></div>
                    <GaugeArc score={data.score} color={fw.color} size={70} />
                    <div style={{ ...mono, fontSize:10, fontWeight:700, color:fw.color, marginTop:8 }}>{fw.short}</div>
                    <div style={{ fontSize:11, color:C.textMute, marginTop:2 }}>
                      {data.compliant ? `${data.compliant}/${data.total}` : "5 Phases"}
                    </div>
                    <div style={{ ...mono, fontSize:11, color:scoreColor, marginTop:2 }}>{data.trend} ↑</div>
                    <div style={{ ...mono, fontSize:10, color:C.textMute, marginTop:4, lineHeight:1.4 }}>{fw.audience}</div>
                  </div>
                );
              })}
            </div>

            {/* Radar + SPRS */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:12 }}>
              {/* Radar by control family */}
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:"16px" }}>
                <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:4 }}>CONTROL FAMILY COMPLIANCE — 800-53 vs 800-171</div>
                <div style={{ display:"flex", gap:12, marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:10, height:3, background:C.teal, borderRadius:2 }} /><span style={{ ...mono, fontSize:11, color:C.textMute }}>NIST 800-53</span></div>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:10, height:3, background:C.blue, borderRadius:2 }} /><span style={{ ...mono, fontSize:11, color:C.textMute }}>NIST 800-171</span></div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={RADAR_DATA}>
                    <PolarGrid stroke={C.border} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill:C.textDim, fontSize:10, fontFamily:"monospace" }} />
                    <Radar name="800-53" dataKey="A" stroke={C.teal} fill={C.teal} fillOpacity={0.15} strokeWidth={2} />
                    <Radar name="800-171" dataKey="B" stroke={C.blue} fill={C.blue} fillOpacity={0.10} strokeWidth={2} />
                    <Tooltip contentStyle={{ background:C.input, border:`1px solid ${C.border}`, borderRadius:6, fontSize:11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* SPRS Score Card */}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ background:C.panel, border:`1px solid ${sprs>=90?C.green:sprs>=70?C.teal:C.orange}`, borderRadius:8, padding:16, textAlign:"center" }}>
                  <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:10 }}>SPRS SCORE</div>
                  <div style={{ ...mono, fontSize:48, fontWeight:900, color:sprs>=90?C.green:sprs>=70?C.teal:C.orange, lineHeight:1 }}>{sprs}</div>
                  <div style={{ ...mono, fontSize:10, color:C.textMute, marginTop:4 }}>/ 110 maximum</div>
                  <div style={{ height:6, background:C.input, borderRadius:3, margin:"12px 0", overflow:"hidden" }}>
                    <div style={{ width:`${(sprs+203)/313*100}%`, height:"100%", background:C.green, borderRadius:3 }} />
                  </div>
                  <div style={{ fontSize:10, color:C.textDim, lineHeight:1.6 }}>
                    DFARS 252.204-7012 self-assessment score submitted to DoD SPRS portal.
                    Required for all DoD contracts handling CUI.
                  </div>
                </div>
                <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:14 }}>
                  <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:10 }}>CMMC READINESS</div>
                  {[["Level 1 (17 practices)",94,C.green],["Level 2 (110 practices)",78,C.teal],["Level 3 (134 practices)",52,C.orange]].map(([l,s,c]) => (
                    <div key={l} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:10, color:C.textDim }}>{l}</span>
                        <span style={{ ...mono, fontSize:10, fontWeight:700, color:c }}>{s}%</span>
                      </div>
                      <div style={{ height:4, background:C.input, borderRadius:2, overflow:"hidden" }}>
                        <div style={{ width:`${s}%`, height:"100%", background:c, borderRadius:2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CROSS-FRAMEWORK MAP */}
        {activeTab === "mapping" && (
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center" }}>
              <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1 }}>ASSESS ONCE — RESOLVES ACROSS ALL FRAMEWORKS</div>
              <div style={{ flex:1 }} />
              {["ALL","Implemented","Partial","Not Implemented"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  style={{ ...mono, background:filterStatus===s?"rgba(0,212,170,0.08)":"none", border:`1px solid ${filterStatus===s?"rgba(0,212,170,0.3)":C.border}`, color:filterStatus===s?C.teal:C.textMute, borderRadius:4, padding:"3px 9px", cursor:"pointer", fontSize:11 }}>{s}</button>
              ))}
            </div>

            {/* Table header */}
            <div style={{ display:"grid", gridTemplateColumns:"80px 140px 80px 90px 100px 100px 120px 80px", gap:0, padding:"7px 12px", background:C.rowA, borderBottom:`1px solid ${C.border}`, borderRadius:"6px 6px 0 0" }}>
              {["800-53","CONTROL","STATUS","800-171","CMMC L1","CMMC L2","CSRMC PHASES","DFARS"].map(h => (
                <div key={h} style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8 }}>{h}</div>
              ))}
            </div>

            {visibleControls.map((c, i) => {
              const isSelected = selectedControl?.n800_53 === c.n800_53;
              return (
                <div key={c.n800_53}>
                  <div className="row-h" onClick={() => setSelectedControl(isSelected ? null : c)}
                    style={{ display:"grid", gridTemplateColumns:"80px 140px 80px 90px 100px 100px 120px 80px", gap:0, padding:"10px 12px", borderBottom:`1px solid #0A1828`, background: isSelected?"rgba(26,90,140,0.18)":i%2===0?"transparent":"rgba(10,24,40,0.3)", borderLeft: isSelected?`3px solid ${C.teal}`:"3px solid transparent" }}>
                    <div style={{ ...mono, fontWeight:700, fontSize:11, color:C.teal }}>{c.n800_53}</div>
                    <div>
                      <div style={{ fontSize:11, color:C.textDim, lineHeight:1.3 }}>{c.title}</div>
                      {c.is_cmmc_l1 && <div style={{ ...mono, fontSize:10, color:C.green, marginTop:2 }}>★ L1 PRACTICE</div>}
                    </div>
                    <div><StatusBadge status={c.status} /></div>
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      {c.n800_171.map(p => <span key={p} style={{ ...mono, fontSize:11, color:C.blue }}>{p}</span>)}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      {c.cmmc_l1.map(p => <span key={p} style={{ ...mono, fontSize:10, color:C.green }}>{p}</span>)}
                      {!c.cmmc_l1.length && <span style={{ ...mono, fontSize:10, color:"#2A3A4A" }}>—</span>}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      {c.cmmc_l2.slice(0,2).map(p => <span key={p} style={{ ...mono, fontSize:10, color:C.gold }}>{p}</span>)}
                      {c.cmmc_l2.length > 2 && <span style={{ ...mono, fontSize:10, color:C.textMute }}>+{c.cmmc_l2.length-2} more</span>}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      {c.csrmc_phases.map(p => <span key={p} style={{ ...mono, fontSize:10, color:"#AA66FF" }}>{p.split(":")[0]}</span>)}
                    </div>
                    <div style={{ ...mono, fontSize:10, color:c.dfars_critical?C.red:c.dfars?C.orange:"#2A3A4A", fontWeight:c.dfars?700:400 }}>
                      {c.dfars ? (c.dfars_critical ? "⚠ CRITICAL" : "✓ DFARS") : "—"}
                    </div>
                  </div>
                  {isSelected && (
                    <div style={{ padding:"14px 20px", background:"rgba(26,90,140,0.08)", borderBottom:`1px solid ${C.border}` }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
                        <div>
                          <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:6 }}>CSRMC PHASES COVERED</div>
                          {c.csrmc_phases.map(p => <div key={p} style={{ ...mono, fontSize:10, color:"#AA66FF", marginBottom:3 }}>▸ {p}</div>)}
                        </div>
                        <div>
                          <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:6 }}>CSRMC TENETS</div>
                          {c.csrmc_tenets.map(t => <div key={t} style={{ fontSize:10, color:C.textDim, marginBottom:3 }}>• {t}</div>)}
                        </div>
                        <div>
                          <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:6 }}>FRAMEWORKS SATISFIED BY THIS CONTROL</div>
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                            <span style={{ ...mono, fontSize:11, color:C.teal, background:"rgba(0,212,170,0.08)", border:"1px solid rgba(0,212,170,0.2)", borderRadius:3, padding:"2px 7px" }}>NIST 800-53</span>
                            {c.n800_171.length > 0 && <span style={{ ...mono, fontSize:11, color:C.blue, background:"rgba(26,122,255,0.08)", border:"1px solid rgba(26,122,255,0.2)", borderRadius:3, padding:"2px 7px" }}>NIST 800-171</span>}
                            {c.cmmc_l1.length > 0 && <span style={{ ...mono, fontSize:11, color:C.green, background:"rgba(0,204,136,0.08)", border:"1px solid rgba(0,204,136,0.2)", borderRadius:3, padding:"2px 7px" }}>CMMC L1</span>}
                            {c.cmmc_l2.length > 0 && <span style={{ ...mono, fontSize:11, color:C.gold, background:"rgba(255,215,0,0.08)", border:"1px solid rgba(255,215,0,0.2)", borderRadius:3, padding:"2px 7px" }}>CMMC L2</span>}
                            {c.dfars && <span style={{ ...mono, fontSize:11, color:C.orange, background:"rgba(255,140,0,0.08)", border:"1px solid rgba(255,140,0,0.2)", borderRadius:3, padding:"2px 7px" }}>DFARS 7012</span>}
                          </div>
                          {c.dfars_note && <div style={{ fontSize:10, color:C.red, marginTop:8 }}>⚠ {c.dfars_note}</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ ...mono, fontSize:11, color:C.textMute, marginTop:12, padding:"10px 12px", background:C.panel, borderRadius:6, border:`1px solid ${C.border}` }}>
              💡 Every row above represents one assessment that simultaneously satisfies requirements across NIST 800-53, 800-171, CMMC, and CSRMC. For LM/F-35: your DoD site assessment and your contractor CMMC assessment draw from the same control database — no duplicate work.
            </div>
          </div>
        )}

        {/* CSRMC PHASES */}
        {activeTab === "csrmc" && (
          <div>
            <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:16 }}>CSRMC — 5 PHASE LIFECYCLE (Sep 2025 DoD CIO Framework)</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:20 }}>
              {CSRMC_PHASES.map(p => (
                <div key={p.id} style={{ background:C.panel, border:`1px solid ${p.color}40`, borderRadius:8, padding:16, textAlign:"center" }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>{p.icon}</div>
                  <GaugeArc score={p.score} color={p.color} size={80} />
                  <div style={{ ...mono, fontSize:10, fontWeight:700, color:p.color, marginTop:8 }}>{p.label}</div>
                  <div style={{ fontSize:11, color:C.textMute, marginTop:4 }}>
                    {p.score >= 80 ? "✓ Strong" : p.score >= 65 ? "⚠ Gaps" : "✗ Critical Gaps"}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                { phase:"Phase 1: Design", tenets:["Cyber-informed engineering from Day 1","Security requirements embedded in architecture","Supply chain risk management plan","System boundary and categorization"], controls:["CA-2","CA-6","RA-3","SA-8","SR-2","PM-9"], score:72 },
                { phase:"Phase 2: Build", tenets:["DevSecOps integration","Measurable survivability parameters","STIG/SRG configuration baselines","Supply chain component verification"], controls:["CM-2","CM-6","CM-7","SI-7","SR-11","SA-11"], score:68 },
                { phase:"Phase 3: Test", tenets:["Threat-informed validation","Penetration testing","Automated compliance checks","AI-assisted assessment (RiskRadar)"], controls:["CA-2","RA-5","SI-2","AU-2","CA-7"], score:81 },
                { phase:"Phase 4: Onboard", tenets:["cATO enrollment","ISCM pipeline activated","Real-time monitoring begins","Constant ATO posture established"], controls:["CA-7","AU-12","AC-2","IA-2","SC-7"], score:65 },
                { phase:"Phase 5: Operations", tenets:["Real-time dashboards and alerts","CSSP watch officer authority","Automated disconnect for high risk","Continuous risk management"], controls:["CA-7","IR-6","AU-6","SI-4","SC-7","CA-5"], score:58 },
              ].map(p => (
                <div key={p.phase} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div style={{ ...mono, fontSize:11, fontWeight:700, color:"#AA66FF" }}>{p.phase}</div>
                    <span style={{ ...mono, fontSize:12, fontWeight:800, color:p.score>=80?C.green:p.score>=65?C.teal:C.orange }}>{p.score}%</span>
                  </div>
                  <div style={{ marginBottom:10 }}>
                    {p.tenets.map(t => <div key={t} style={{ fontSize:10, color:C.textDim, marginBottom:3 }}>• {t}</div>)}
                  </div>
                  <div style={{ ...mono, fontSize:10, color:C.textMute, marginBottom:6 }}>KEY CONTROLS</div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {p.controls.map(c => <span key={c} style={{ ...mono, fontSize:11, color:C.teal, background:"rgba(0,212,170,0.08)", border:"1px solid rgba(0,212,170,0.2)", borderRadius:3, padding:"2px 6px" }}>{c}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SPRS + CMMC */}
        {activeTab === "sprs" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:20 }}>
              <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:16 }}>SPRS SCORE BREAKDOWN</div>
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <div style={{ ...mono, fontSize:56, fontWeight:900, color:C.green, lineHeight:1 }}>{sprs}</div>
                <div style={{ ...mono, fontSize:11, color:C.textMute, marginTop:4 }}>out of 110 maximum</div>
                <div style={{ fontSize:11, color:C.textDim, marginTop:8, lineHeight:1.7 }}>
                  This score is self-assessed and submitted by LM to the DoD Supplier Performance Risk System (SPRS) portal. 
                  Required under DFARS 252.204-7019. Contracting officers review before award.
                </div>
              </div>
              <div style={{ background:C.panelAlt, border:`1px solid ${C.border}`, borderRadius:6, padding:12 }}>
                <div style={{ ...mono, fontSize:11, color:C.textMute, marginBottom:8 }}>DFARS OBLIGATIONS FOR F-35/LM</div>
                {[
                  ["252.204-7012","Safeguarding Covered Defense Information","CRITICAL — 72hr incident report"],
                  ["252.204-7019","NIST SP 800-171 DoD Assessment Requirements","Required — SPRS score submission"],
                  ["252.204-7020","NIST SP 800-171 DoD Assessment Requirements","Required — allow assessments"],
                  ["252.204-7021","CMMC Requirements","Required by contract type"],
                ].map(([num,desc,note]) => (
                  <div key={num} style={{ marginBottom:8, paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ display:"flex", gap:8 }}>
                      <span style={{ ...mono, fontSize:11, color:C.orange, minWidth:90 }}>{num}</span>
                      <span style={{ fontSize:10, color:C.textDim }}>{desc}</span>
                    </div>
                    <div style={{ ...mono, fontSize:11, color:note.includes("CRITICAL")?C.red:C.green, marginTop:3, marginLeft:98 }}>{note}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:16 }}>
                <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:12 }}>CMMC LEVEL REQUIREMENTS FOR F-35</div>
                {[
                  { level:"Level 1", score:94, color:C.green, note:"17 basic practices. FAR 52.204-21. Annual self-assessment.", req:"All DoD contractors handling FCI" },
                  { level:"Level 2", score:78, color:C.teal, note:"110 practices (800-171). C3PAO assessment. Annual affirmation.", req:"Contractors handling CUI (most LM contracts)" },
                  { level:"Level 3", score:52, color:C.orange, note:"134 practices (800-171 + 800-172). DIBCAC (gov't-led). F-35 likely requires this.", req:"High-value/critical programs (JSF, nuclear, etc.)" },
                ].map(l => (
                  <div key={l.level} style={{ marginBottom:12, padding:"10px 12px", background:C.panelAlt, border:`1px solid ${l.color}30`, borderRadius:6 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ ...mono, fontWeight:700, fontSize:12, color:l.color }}>{l.level}</span>
                      <span style={{ ...mono, fontSize:14, fontWeight:800, color:l.color }}>{l.score}%</span>
                    </div>
                    <div style={{ height:5, background:C.input, borderRadius:3, marginBottom:6, overflow:"hidden" }}>
                      <div style={{ width:`${l.score}%`, height:"100%", background:l.color, borderRadius:3 }} />
                    </div>
                    <div style={{ fontSize:10, color:C.textDim, marginBottom:3 }}>{l.note}</div>
                    <div style={{ ...mono, fontSize:11, color:C.textMute }}>{l.req}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:C.panel, border:`2px solid rgba(170,102,255,0.3)`, borderRadius:8, padding:16 }}>
                <div style={{ ...mono, fontSize:11, color:"#AA66FF", letterSpacing:1, marginBottom:8 }}>WHY DUAL MODE MATTERS FOR F-35/LM</div>
                <div style={{ fontSize:11, color:C.textDim, lineHeight:1.8 }}>
                  Your F-35 work requires maintaining compliance with <strong style={{ color:C.teal }}>NIST 800-53 Rev 5 + CSRMC</strong> for the DoD network side AND <strong style={{ color:C.blue }}>CMMC Level 3 + 800-171</strong> for the LM contractor side. RiskRadar's dual mode means one control assessment automatically satisfies both. Your team doesn't run two parallel compliance programs — you run one and export two packages.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
