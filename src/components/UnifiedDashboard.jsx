import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";

const C = { bg:"#03080E", panel:"#060D16", panelAlt:"#08111C", panel2:"#08111C", border:"#0D1E2E", borderMd:"#152840", text:"#C8D8E8", textDim:"#7A9AB8", dim:"#7A9AB8", textMute:"#3A5570", mute:"#3A5570", white:"#F0F8FF", input:"#040C16", inputBorder:"#1A3A5C", rowA:"#050C14", rowB:"#040A12", scroll:"#1A3A5C", headerBg:"#02060C", teal:"#00D4AA", blue:"#1A7AFF", red:"#FF4444", orange:"#FF8C00", gold:"#FFD700", green:"#00CC88", purple:"#AA66FF" };


// ─── Mock Data representing normalized findings from all sources ───────────────
const SOURCES = {
  TENABLE_ACAS:   { label: "Tenable / ACAS",       icon: "🔍", color: "#00BCD4", controls: ["RA-5","SI-2","CM-6","CM-7","CA-7"],       status: "connected", last_sync: "4 min ago",   findings: 47, critical: 3  },
  CROWDSTRIKE:    { label: "CrowdStrike Falcon",    icon: "🦅", color: "#E91E63", controls: ["SI-3","IR-6","AU-6","RA-5","IA-3"],       status: "connected", last_sync: "2 min ago",   findings: 12, critical: 1  },
  TRELLIX_HBSS:   { label: "Trellix / HBSS",        icon: "🛡", color: "#FF9800", controls: ["SI-3","SC-7","CM-7","AU-6"],              status: "connected", last_sync: "8 min ago",   findings: 8,  critical: 0  },
  DEFENDER_MDE:   { label: "Microsoft Defender MDE",icon: "⊞",  color: "#2196F3", controls: ["SI-3","SI-2","RA-5"],                    status: "connected", last_sync: "6 min ago",   findings: 19, critical: 2  },
  STIG_SCAP:      { label: "STIG / SCAP",           icon: "📋", color: "#9C27B0", controls: ["CM-6","AC-2","AU-2","SC-7","IA-5","SC-13"], status: "connected", last_sync: "1 hr ago",   findings: 34, critical: 4  },
  AWS_SECURITYHUB:{ label: "AWS Security Hub",      icon: "☁",  color: "#00D4AA", controls: ["SC-7","SC-28","IA-2","AC-6","AU-2"],      status: "connected", last_sync: "1 min ago",   findings: 22, critical: 2  },
  SPLUNK_SIEM:    { label: "Splunk SIEM",            icon: "📊", color: "#FF5722", controls: ["AU-2","AU-3","AU-6","AU-9","IR-6"],       status: "warning",  last_sync: "3 hrs ago",   findings: 6,  critical: 0  },
  NETWORK_SCAN:   { label: "Network Scanner",        icon: "🌐", color: "#607D8B", controls: ["SC-7","CM-6","CM-7","AC-17"],             status: "pending",  last_sync: "Not run",      findings: 0,  critical: 0  },
};

const ALL_FINDINGS = [
  { id:"F-001", source:"TENABLE_ACAS",    control:"RA-5",    sev:"CRITICAL", title:"CVE-2024-21413 - Microsoft Outlook RCE",            asset:"WIN-DC01.acme.mil",       cve:"CVE-2024-21413", time:"2h ago"  },
  { id:"F-002", source:"STIG_SCAP",       control:"CM-6",    sev:"CRITICAL", title:"V-253263: Windows Defender Credential Guard off",    asset:"WIN-WS001.acme.mil",      cve:"",               time:"1h ago"  },
  { id:"F-003", source:"AWS_SECURITYHUB", control:"SC-7",    sev:"CRITICAL", title:"Security group allows unrestricted inbound 0.0.0.0", asset:"sg-0abc123456",           cve:"",               time:"5m ago"  },
  { id:"F-004", source:"CROWDSTRIKE",     control:"IR-6",    sev:"CRITICAL", title:"Threat Detection: Credential Access - LSASS Dump",  asset:"WIN-ADMIN01.acme.mil",    cve:"",               time:"12m ago" },
  { id:"F-005", source:"DEFENDER_MDE",    control:"SI-3",    sev:"CRITICAL", title:"Ransomware behavior blocked on endpoint",            asset:"WIN-WS034.acme.mil",      cve:"",               time:"35m ago" },
  { id:"F-006", source:"TENABLE_ACAS",    control:"SI-2",    sev:"HIGH",     title:"CVE-2024-38213 - Windows SmartScreen bypass",       asset:"WIN-WS012.acme.mil",      cve:"CVE-2024-38213", time:"4h ago"  },
  { id:"F-007", source:"STIG_SCAP",       control:"AC-2",    sev:"HIGH",     title:"V-220708: Local Guest account enabled",              asset:"WIN-WS002.acme.mil",      cve:"",               time:"1h ago"  },
  { id:"F-008", source:"STIG_SCAP",       control:"SC-13",   sev:"HIGH",     title:"V-254239: RHEL FIPS mode not enabled",               asset:"RHEL-APP01.acme.mil",     cve:"",               time:"1h ago"  },
  { id:"F-009", source:"AWS_SECURITYHUB", control:"SC-28",   sev:"HIGH",     title:"EBS volume not encrypted at rest",                   asset:"vol-0def789012345",       cve:"",               time:"5m ago"  },
  { id:"F-010", source:"CROWDSTRIKE",     control:"RA-5",    sev:"HIGH",     title:"CVE-2024-6387 - OpenSSH RegreSSHion",                asset:"RHEL-APP02.acme.mil",     cve:"CVE-2024-6387",  time:"20m ago" },
  { id:"F-011", source:"TRELLIX_HBSS",    control:"SI-3",    sev:"HIGH",     title:"Malware signature DAT file out of date (>7 days)",   asset:"WIN-WS045.acme.mil",      cve:"",               time:"8m ago"  },
  { id:"F-012", source:"DEFENDER_MDE",    control:"RA-5",    sev:"HIGH",     title:"CVE-2024-43491 - Windows Update RCE",                asset:"WIN-SERVER02.acme.mil",   cve:"CVE-2024-43491", time:"6m ago"  },
  { id:"F-013", source:"TENABLE_ACAS",    control:"CM-7",    sev:"MEDIUM",   title:"Telnet service enabled on host",                     asset:"WIN-WS023.acme.mil",      cve:"",               time:"4h ago"  },
  { id:"F-014", source:"STIG_SCAP",       control:"AU-2",    sev:"MEDIUM",   title:"V-220706: Audit logging for Logon/Logoff disabled",  asset:"WIN-WS003.acme.mil",      cve:"",               time:"1h ago"  },
  { id:"F-015", source:"AWS_SECURITYHUB", control:"IA-2",    sev:"HIGH",     title:"IAM user with console access has no MFA",            asset:"gap-user-no-mfa",         cve:"",               time:"5m ago"  },
  { id:"F-016", source:"SPLUNK_SIEM",     control:"AU-6",    sev:"MEDIUM",   title:"Anomalous authentication failures (>50 in 1hr)",     asset:"AUTH-SVCS.acme.mil",      cve:"",               time:"3h ago"  },
  { id:"F-017", source:"TENABLE_ACAS",    control:"RA-5",    sev:"MEDIUM",   title:"CVE-2024-20399 - Cisco IOS XE auth bypass",         asset:"RTR-CORE-01.acme.mil",    cve:"CVE-2024-20399", time:"4h ago"  },
  { id:"F-018", source:"STIG_SCAP",       control:"IA-5",    sev:"MEDIUM",   title:"V-220709: Windows password complexity not enforced",  asset:"WIN-WS004.acme.mil",      cve:"",               time:"1h ago"  },
];

// ─── NIST control families and which source covers them ───────────────────────
const CONTROL_COVERAGE = [
  { family:"AC",  name:"Access Control",        covered: ["STIG_SCAP","AWS_SECURITYHUB","TRELLIX_HBSS"],                   score: 72 },
  { family:"AU",  name:"Audit & Accountability",covered: ["SPLUNK_SIEM","AWS_SECURITYHUB","STIG_SCAP","TRELLIX_HBSS"],     score: 85 },
  { family:"CA",  name:"Assessment & Auth",     covered: ["TENABLE_ACAS"],                                                  score: 45 },
  { family:"CM",  name:"Config Management",     covered: ["STIG_SCAP","TENABLE_ACAS","TRELLIX_HBSS","NETWORK_SCAN"],       score: 68 },
  { family:"IA",  name:"Identification & Auth", covered: ["STIG_SCAP","AWS_SECURITYHUB","TRELLIX_HBSS"],                   score: 76 },
  { family:"IR",  name:"Incident Response",     covered: ["CROWDSTRIKE","SPLUNK_SIEM","DEFENDER_MDE"],                     score: 62 },
  { family:"RA",  name:"Risk Assessment",       covered: ["TENABLE_ACAS","CROWDSTRIKE","DEFENDER_MDE"],                    score: 78 },
  { family:"SC",  name:"System & Comms Prot",   covered: ["AWS_SECURITYHUB","STIG_SCAP","TENABLE_ACAS","TRELLIX_HBSS"],    score: 71 },
  { family:"SI",  name:"System & Info Integrity",covered: ["CROWDSTRIKE","DEFENDER_MDE","TRELLIX_HBSS","TENABLE_ACAS"],    score: 80 },
];

// ─── Colors ───────────────────────────────────────────────────────────────────
const SEV = { CRITICAL:{fg:"#FF4444",bg:"rgba(255,68,68,0.12)"}, HIGH:{fg:"#FF8C00",bg:"rgba(255,140,0,0.12)"}, MEDIUM:{fg:"#FFD700",bg:"rgba(255,215,0,0.10)"}, LOW:{fg:"#00CC88",bg:"rgba(0,204,136,0.10)"} };
const mono = { fontFamily:"'Courier New', monospace" };

const Badge = ({ label, color, bg }) => (
  <span style={{ ...mono, background:bg||`${color}14`, color, border:`1px solid ${color}40`, borderRadius:3, padding:"2px 7px", fontSize:10, fontWeight:700, letterSpacing:0.5, whiteSpace:"nowrap" }}>{label}</span>
);

const StatusDot = ({ status }) => {
  const c = status==="connected"?"#00CC88":status==="warning"?"#FFD700":"#556677";
  return <div style={{ width:7, height:7, borderRadius:"50%", background:c, boxShadow:`0 0 6px ${c}` }} />;
};

export default function UnifiedDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [filterSource, setFilterSource] = useState("ALL");
  const [filterSev, setFilterSev] = useState("ALL");
  const [selectedFinding, setSelectedFinding] = useState(null);

  const totalFindings = Object.values(SOURCES).reduce((s, src) => s + src.findings, 0);
  const totalCritical = Object.values(SOURCES).reduce((s, src) => s + src.critical, 0);
  const connectedSources = Object.values(SOURCES).filter(s => s.status === "connected").length;

  const visibleFindings = useMemo(() => ALL_FINDINGS
    .filter(f => filterSource === "ALL" || f.source === filterSource)
    .filter(f => filterSev === "ALL" || f.severity === filterSev)
  , [filterSource, filterSev]);

  const bySource = useMemo(() => Object.entries(SOURCES).map(([k, s]) => ({
    name: s.label.split(" ")[0], value: s.findings, color: s.color
  })), []);

  const NAV = [
    { id:"overview",  label:"Overview" },
    { id:"findings",  label:`All Findings (${totalFindings})` },
    { id:"sources",   label:"Data Sources" },
    { id:"coverage",  label:"Control Coverage" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Helvetica Neue', Arial, sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`* { box-sizing:border-box; margin:0; padding:0; } ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:#050D15; } ::-webkit-scrollbar-thumb { background:#1A3A5C; } .row-hover:hover { background:rgba(26,90,140,0.14) !important; cursor:pointer; } .btn-hover:hover { opacity:0.8; }`}</style>

      {/* Header */}
      <div style={{ background:"#020810", borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:30, height:30, background:`linear-gradient(135deg, ${C.teal}, ${C.blue})`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:14, fontWeight:900, color:"#060E18" }}>S</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.white }}>SentinelGRC</div>
            <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8 }}>UNIFIED SECURITY OPERATIONS CENTER · cATO DASHBOARD</div>
          </div>
          <div style={{ width:1, height:24, background:C.border, margin:"0 8px" }} />
          {NAV.map(n => (
            <button key={n.id} onClick={() => setActiveTab(n.id)}
              style={{ background: activeTab===n.id?"rgba(0,212,170,0.08)":"none", border:`1px solid ${activeTab===n.id?"rgba(0,212,170,0.3)":"transparent"}`, color: activeTab===n.id?C.teal:C.textMute, borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:11, fontWeight: activeTab===n.id?600:400 }}>{n.label}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <StatusDot status="connected" />
            <span style={{ ...mono, fontSize:11, color:C.textMute }}>{connectedSources}/{Object.keys(SOURCES).length} SOURCES ACTIVE</span>
          </div>
          <div style={{ ...mono, background:"rgba(0,212,170,0.06)", border:"1px solid rgba(0,212,170,0.2)", borderRadius:4, padding:"4px 10px", fontSize:11, color:C.teal }}>● GOVCLOUD IL4 · FIPS · CAC</div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:20 }}>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* KPIs */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
              {[
                { l:"Total Findings",    v:totalFindings, c:C.white,    sub:`${connectedSources} active sources` },
                { l:"Critical",          v:totalCritical, c:C.red,      sub:"Requires immediate action" },
                { l:"High",              v:ALL_FINDINGS.filter(f=>f.severity==="HIGH").length, c:C.orange, sub:"45-day POAM required" },
                { l:"Sources Online",    v:connectedSources, c:C.green, sub:`${Object.keys(SOURCES).length} total configured` },
                { l:"Controls Covered",  v:"78%",         c:C.teal,     sub:"Avg coverage across 9 families" },
              ].map(s => (
                <div key={s.l} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:"14px 16px" }}>
                  <div style={{ ...mono, fontSize:26, fontWeight:800, color:s.c, lineHeight:1 }}>{s.v}</div>
                  <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:0.8, margin:"4px 0 2px", textTransform:"uppercase" }}>{s.l}</div>
                  <div style={{ fontSize:10, color:C.textMute }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Charts + Critical findings */}
            <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:12 }}>
              {/* Findings by source bar */}
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:16 }}>
                <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:12 }}>FINDINGS BY SOURCE</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={bySource} layout="vertical" margin={{top:0,right:8,left:0,bottom:0}}>
                    <XAxis type="number" tick={{fill:C.textMute,fontSize:11}} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{fill:C.textDim,fontSize:11,...mono}} axisLine={false} tickLine={false} width={70} />
                    <Tooltip contentStyle={{background:"#0A1828",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,color:C.text}} />
                    <Bar dataKey="value" radius={[0,3,3,0]}>
                      {bySource.map((e,i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Recent critical findings */}
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:16 }}>
                <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:12 }}>CRITICAL FINDINGS — REQUIRES IMMEDIATE ACTION</div>
                {ALL_FINDINGS.filter(f=>f.severity==="CRITICAL").map((f,i) => (
                  <div key={f.id} className="row-hover" onClick={() => { setSelectedFinding(f); setActiveTab("findings"); }}
                    style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 10px", borderBottom:`1px solid #0A1828`, borderRadius:4, background: i%2===0?"transparent":"rgba(255,68,68,0.03)" }}>
                    <div style={{ width:26, height:26, borderRadius:"50%", background:"rgba(255,68,68,0.1)", border:"1px solid #FF4444", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>
                      {SOURCES[f.source]?.icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11.5, color:C.white, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.title}</div>
                      <div style={{ ...mono, fontSize:11, color:C.textMute }}>{SOURCES[f.source]?.label} · {f.asset} · {f.time}</div>
                    </div>
                    <Badge label={f.control} color={C.teal} />
                  </div>
                ))}
              </div>
            </div>

            {/* Source status strip */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
              {Object.entries(SOURCES).map(([key, src]) => (
                <div key={key} style={{ background:C.panel, border:`1px solid ${src.status==="connected"?"rgba(0,204,136,0.2)":src.status==="warning"?"rgba(255,215,0,0.2)":C.border}`, borderRadius:8, padding:"12px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:16 }}>{src.icon}</span>
                    <StatusDot status={src.status} />
                    <span style={{ fontSize:11, color:C.white, fontWeight:500 }}>{src.label}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <span style={{ ...mono, fontSize:16, fontWeight:800, color:src.critical>0?C.red:C.text }}>{src.findings}</span>
                      <span style={{ ...mono, fontSize:11, color:C.textMute }}> findings</span>
                      {src.critical > 0 && <span style={{ ...mono, fontSize:11, color:C.red }}> · {src.critical} CRIT</span>}
                    </div>
                    <span style={{ ...mono, fontSize:10, color:C.textMute }}>{src.last_sync}</span>
                  </div>
                  <div style={{ marginTop:6, display:"flex", gap:3, flexWrap:"wrap" }}>
                    {src.controls.slice(0,3).map(c => (
                      <span key={c} style={{ ...mono, fontSize:10, color:src.color, background:`${src.color}14`, borderRadius:2, padding:"1px 5px" }}>{c}</span>
                    ))}
                    {src.controls.length > 3 && <span style={{ ...mono, fontSize:10, color:C.textMute }}>+{src.controls.length-3}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALL FINDINGS */}
        {activeTab === "findings" && (
          <div style={{ display:"flex", gap:16, height:"calc(100vh - 130px)", overflow:"hidden" }}>
            {/* Finding list */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
              {/* Filters */}
              <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
                <select value={filterSource} onChange={e=>setFilterSource(e.target.value)}
                  style={{ ...mono, background:"#0A1828", border:`1px solid ${C.border}`, color:C.textDim, borderRadius:4, padding:"5px 10px", fontSize:10, cursor:"pointer", outline:"none" }}>
                  <option value="ALL">All Sources</option>
                  {Object.entries(SOURCES).map(([k,s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
                {["ALL","CRITICAL","HIGH","MEDIUM","LOW"].map(s => (
                  <button key={s} onClick={()=>setFilterSev(s)}
                    style={{ ...mono, background: filterSev===s?"rgba(0,212,170,0.08)":"none", border:`1px solid ${filterSev===s?"rgba(0,212,170,0.3)":C.border}`, color: filterSev===s?C.teal:C.textMute, borderRadius:4, padding:"4px 9px", cursor:"pointer", fontSize:11 }}>{s}</button>
                ))}
                <span style={{ ...mono, fontSize:11, color:C.textMute, marginLeft:"auto", alignSelf:"center" }}>{visibleFindings.length} findings</span>
              </div>

              {/* Table */}
              <div style={{ overflowY:"auto", flex:1 }}>
                <div style={{ display:"grid", gridTemplateColumns:"26px 80px 1fr 120px 80px 80px 70px", padding:"6px 10px", borderBottom:`1px solid ${C.border}` }}>
                  {["","CONTROL","FINDING","ASSET","SOURCE","SEVERITY","TIME"].map(h => (
                    <div key={h} style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8 }}>{h}</div>
                  ))}
                </div>
                {visibleFindings.map((f,i) => {
                  const src = SOURCES[f.source];
                  const isSelected = selectedFinding?.id === f.id;
                  return (
                    <div key={f.id} className="row-hover" onClick={() => setSelectedFinding(f)}
                      style={{ display:"grid", gridTemplateColumns:"26px 80px 1fr 120px 80px 80px 70px", padding:"9px 10px", borderBottom:`1px solid #0A1828`,
                        background: isSelected?"rgba(26,90,140,0.2)":i%2===0?"transparent":"rgba(10,24,40,0.3)",
                        borderLeft: isSelected?`3px solid ${SEV[f.severity]?.fg}`:"3px solid transparent" }}>
                      <div style={{ fontSize:14 }}>{src?.icon}</div>
                      <div style={{ ...mono, fontWeight:700, fontSize:11, color:C.teal }}>{f.control}</div>
                      <div>
                        <div style={{ fontSize:11, color:C.textDim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingRight:8 }}>{f.title}</div>
                        {f.cve && <span style={{ ...mono, fontSize:11, color:C.orange }}>{f.cve}</span>}
                      </div>
                      <div style={{ ...mono, fontSize:11, color:C.textMute, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.asset}</div>
                      <div style={{ fontSize:11, color:src?.color, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{src?.label.split(" ")[0]}</div>
                      <div><Badge label={f.severity} color={SEV[f.severity]?.fg} bg={SEV[f.severity]?.bg} /></div>
                      <div style={{ ...mono, fontSize:11, color:C.textMute }}>{f.time}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detail panel */}
            {selectedFinding && (
              <div style={{ width:340, background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, overflowY:"auto", padding:16 }}>
                <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:1, marginBottom:12 }}>FINDING DETAIL</div>
                <div style={{ fontSize:14 }}>{SOURCES[selectedFinding.source]?.icon}</div>
                <div style={{ fontSize:13, color:C.white, fontWeight:600, margin:"8px 0 6px", lineHeight:1.4 }}>{selectedFinding.title}</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                  <Badge label={selectedFinding.severity} color={SEV[selectedFinding.severity]?.fg} bg={SEV[selectedFinding.severity]?.bg} />
                  <Badge label={selectedFinding.control} color={C.teal} />
                  {selectedFinding.cve && <Badge label={selectedFinding.cve} color={C.orange} />}
                </div>
                {[
                  ["Source",  SOURCES[selectedFinding.source]?.label],
                  ["Asset",   selectedFinding.asset],
                  ["Detected",selectedFinding.time],
                ].map(([k,v]) => (
                  <div key={k} style={{ marginBottom:8 }}>
                    <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:1 }}>{k}</div>
                    <div style={{ fontSize:11, color:C.textDim }}>{v}</div>
                  </div>
                ))}
                <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, marginTop:10 }}>
                  <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:1, marginBottom:8 }}>NIST MAPPING</div>
                  <div style={{ ...mono, fontSize:11, color:C.teal, marginBottom:6 }}>{selectedFinding.control}</div>
                  <button style={{ width:"100%", padding:"9px 0", background:C.teal, border:"none", color:"#020A10", borderRadius:5, cursor:"pointer", ...mono, fontSize:11, fontWeight:700, marginBottom:8 }}>
                    + CREATE POAM ENTRY
                  </button>
                  <button style={{ width:"100%", padding:"9px 0", background:"transparent", border:`1px solid ${C.border}`, color:C.textDim, borderRadius:5, cursor:"pointer", ...mono, fontSize:11 }}>
                    ↓ EXPORT FINDING
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DATA SOURCES */}
        {activeTab === "sources" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:4 }}>CONFIGURED DATA SOURCES — CLICK TO CONFIGURE CREDENTIALS</div>
            {Object.entries(SOURCES).map(([key, src]) => (
              <div key={key} style={{ background:C.panel, border:`1px solid ${src.status==="connected"?"rgba(0,204,136,0.2)":src.status==="warning"?"rgba(255,215,0,0.2)":C.border}`, borderRadius:8, padding:"16px 20px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                  <div style={{ width:40, height:40, borderRadius:8, background:`${src.color}14`, border:`1px solid ${src.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{src.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:C.white, fontWeight:600 }}>{src.label}</div>
                    <div style={{ ...mono, fontSize:11, color:C.textMute }}>
                      NIST Controls: {src.controls.join(", ")}
                    </div>
                  </div>
                  <StatusDot status={src.status} />
                  <Badge label={src.status.toUpperCase()} color={src.status==="connected"?C.green:src.status==="warning"?C.gold:C.textMute} />
                  <div style={{ textAlign:"right" }}>
                    <div style={{ ...mono, fontSize:18, fontWeight:800, color:src.critical>0?C.red:C.text }}>{src.findings}</div>
                    <div style={{ ...mono, fontSize:10, color:C.textMute }}>FINDINGS</div>
                  </div>
                  <button style={{ ...mono, background:"rgba(26,122,255,0.08)", border:`1px solid rgba(26,122,255,0.2)`, color:C.blue, borderRadius:4, padding:"6px 14px", cursor:"pointer", fontSize:10, whiteSpace:"nowrap" }}>
                    {src.status==="pending" ? "▶ CONFIGURE" : "⚙ SETTINGS"}
                  </button>
                </div>
                <div style={{ ...mono, fontSize:11, color:C.textMute }}>
                  Last sync: {src.last_sync} · Credentials stored in AWS Secrets Manager · API polling every 5 minutes
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CONTROL COVERAGE */}
        {activeTab === "coverage" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:4 }}>NIST 800-53 CONTROL FAMILY COVERAGE — SOURCES MAPPED PER FAMILY</div>
            {CONTROL_COVERAGE.map((cf, i) => (
              <div key={cf.family} style={{ background: i%2===0?C.panel:"#0A1425", border:`1px solid ${C.border}`, borderRadius:8, padding:"14px 18px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                  <div style={{ ...mono, fontWeight:700, fontSize:14, color:C.teal, minWidth:32 }}>{cf.family}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:C.white, marginBottom:4 }}>{cf.name}</div>
                    <div style={{ height:6, background:"#0A1828", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ width:`${cf.score}%`, height:"100%", background:cf.score>=80?C.green:cf.score>=60?C.teal:cf.score>=40?C.orange:C.red, borderRadius:3, transition:"width 0.8s ease" }} />
                    </div>
                  </div>
                  <div style={{ ...mono, fontSize:14, fontWeight:800, color:cf.score>=80?C.green:cf.score>=60?C.teal:cf.score>=40?C.orange:C.red, minWidth:40, textAlign:"right" }}>{cf.score}%</div>
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {cf.covered.map(src => (
                    <div key={src} style={{ display:"flex", alignItems:"center", gap:5, background:`${SOURCES[src]?.color}14`, border:`1px solid ${SOURCES[src]?.color}30`, borderRadius:4, padding:"3px 8px" }}>
                      <span style={{ fontSize:12 }}>{SOURCES[src]?.icon}</span>
                      <span style={{ fontSize:10, color:SOURCES[src]?.color }}>{SOURCES[src]?.label.split("/")[0].trim()}</span>
                    </div>
                  ))}
                  {!cf.covered.some(s => s === "NETWORK_SCAN") && (
                    <div style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(96,125,139,0.1)", border:"1px dashed #556677", borderRadius:4, padding:"3px 8px" }}>
                      <span style={{ fontSize:10, color:C.textMute }}>+ Add network scanner for better coverage</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
