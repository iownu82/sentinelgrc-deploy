import { useState } from "react";

const C = { bg:"#03080E", panel:"#060D16", panelAlt:"#08111C", panel2:"#08111C", border:"#0D1E2E", borderMd:"#152840", text:"#C8D8E8", textDim:"#7A9AB8", dim:"#7A9AB8", textMute:"#3A5570", mute:"#3A5570", white:"#F0F8FF", input:"#040C16", inputBorder:"#1A3A5C", rowA:"#050C14", rowB:"#040A12", scroll:"#1A3A5C", headerBg:"#02060C", teal:"#00D4AA", blue:"#1A7AFF", red:"#FF4444", orange:"#FF8C00", gold:"#FFD700", green:"#00CC88", purple:"#AA66FF" };


const mono = { fontFamily:"'Courier New',monospace" };

// ── Tool definitions ───────────────────────────────────────────────────────────
const TOOLS = {
  // LM-Managed (outside F-35 boundary)
  crowdstrike:  { label:"CrowdStrike Falcon",   icon:"🦅", zone:"lm",       method:"cloud_api",   color:"#E91E63", controls:["SI-3","IR-6","RA-5"],  detail:"Cloud SaaS — LM provides read-only API key. Direct cloud-to-cloud. No agent needed." },
  tenable:      { label:"Tenable.sc (ACAS)",    icon:"🔍", zone:"lm",       method:"agent_or_file",color:"#00BCD4", controls:["RA-5","SI-2","CM-6"],  detail:"On-prem in LM network. Option A: LM admin exports .nessus → ISSO uploads. Option B: Collector calls Tenable.sc API if network path exists." },
  paloalto:     { label:"Palo Alto (Panorama)", icon:"🔥", zone:"lm",       method:"api_request",  color:"#FF5722", controls:["SC-7","AU-2"],          detail:"LM submits API credentials request. PAN-OS API pulls firewall rules vs SC-7 baseline. Panorama preferred over individual FWs." },
  zscaler:      { label:"Zscaler ZIA",          icon:"☁",  zone:"lm",       method:"cloud_api",   color:"#2196F3", controls:["SC-7","AU-6"],          detail:"Cloud SaaS — ZIA API key from LM. Pulls web proxy policy compliance and threat events." },
  // F-35 Boundary (program-managed)
  ad:           { label:"Active Directory",     icon:"🏢", zone:"f35",      method:"collector",   color:"#9C27B0", controls:["AC-2","AC-6","IA-2"],   detail:"Collector agent makes LDAP queries — account inventory, privileged groups, password policy. Read-only service account." },
  windows:      { label:"Windows Systems",      icon:"⊞",  zone:"f35",      method:"collector",   color:"#1A7AFF", controls:["CM-6","SI-2","AU-2"],   detail:"WMI/PowerShell remoting for patch compliance, GPO settings, event logs. Collector queries; never modifies." },
  juniper:      { label:"Juniper Edge Routers", icon:"🌐", zone:"f35",      method:"collector",   color:"#FF8C00", controls:["SC-7","CM-6"],          detail:"SSH to pull running-config. SentinelGRC compares vs Network Infrastructure STIG. Read-only SSH key, no enable/write access." },
  cisco9300:    { label:"Cisco 9300 Switches",  icon:"🔄", zone:"f35",      method:"collector",   color:"#00CC88", controls:["CM-6","CM-7"],          detail:"SSH config collection or SNMP polling. Cisco IOS-XE STIG compliance check against baseline." },
  awssechub:    { label:"AWS Security Hub",     icon:"☁",  zone:"govcloud", method:"native",      color:"#FF9800", controls:["SC-7","SC-28","IA-2"],  detail:"Same AWS GovCloud region — native service integration. No credentials needed, IAM role-based." },
};

const METHODS = {
  cloud_api:    { label:"Cloud API",      color:"#00D4AA", icon:"⚡", desc:"Direct cloud-to-cloud. No agent. API key only." },
  collector:    { label:"Collector Agent",color:"#1A7AFF", icon:"📦", desc:"Lightweight agent inside boundary. Outbound-only HTTPS." },
  agent_or_file:{ label:"API or File",   color:"#FFD700", icon:"📂", desc:"API connector OR manual .nessus file upload." },
  api_request:  { label:"API Request",   color:"#FF8C00", icon:"🔑", desc:"Requires LM to provide read-only API credentials." },
  native:       { label:"Native",        color:"#AA66FF", icon:"☁",  desc:"Same cloud — IAM role, no external call." },
};

// ── Connection line data ──────────────────────────────────────────────────────
const STEPS = [
  {
    id:"s1", step:1, title:"Cloud-to-Cloud Connectors (Zero Footprint)",
    color:"#00D4AA",
    tools:["crowdstrike","zscaler"],
    desc:"For tools that are already SaaS (CrowdStrike, Zscaler), SentinelGRC connects directly via their APIs. The ISSO submits a request to LM for a read-only API key. LM creates the key, ISSO enters it in SentinelGRC. No network changes, no agents, no on-site work.",
    actions:[
      "ISSO submits ticket to LM: 'Request read-only CrowdStrike Falcon API key for SentinelGRC integration'",
      "LM creates API client_id + client_secret in Falcon console with read-only scope",
      "ISSO enters credentials in SentinelGRC Connector Settings (stored in AWS Secrets Manager)",
      "SentinelGRC polls CrowdStrike every 5 minutes — Spotlight CVEs + Detections flow in automatically",
    ],
    effort:"1–2 days",
  },
  {
    id:"s2", step:2, title:"On-Premises LM Tools (File Export or API Bridge)",
    color:"#FFD700",
    tools:["tenable","paloalto"],
    desc:"Tenable.sc lives inside LM's network infrastructure — it's on-prem, not cloud. SentinelGRC can't reach it directly over the internet. Two options: file export (ISSO or LM admin exports .nessus → ISSO uploads) or an API bridge if a network path can be established through LM.",
    actions:[
      "RECOMMENDED — File Import: LM Tenable.sc admin exports scan as .nessus → sends to ISSO via secure means → ISSO drags file into SentinelGRC",
      "AUTOMATED — If LM allows: Submit change request for firewall rule allowing Collector → Tenable.sc API (port 443) across boundary",
      "For Palo Alto: Request PAN-OS API read-only credentials from LM network team",
      "Palo Alto log forwarding to Syslog → Collector ingests → maps to SC-7 / AU-2 controls",
    ],
    effort:"1–2 weeks (requires LM coordination)",
  },
  {
    id:"s3", step:3, title:"F-35 Boundary Systems (Collector Agent)",
    color:"#1A7AFF",
    tools:["ad","windows","juniper","cisco9300"],
    desc:"Systems inside the F-35 program boundary — AD, Windows machines, Juniper/Cisco network devices — cannot be reached from GovCloud directly. A lightweight Collector Agent runs inside the boundary, makes read-only queries to these systems, and pushes encrypted results to SentinelGRC over outbound HTTPS. The ISSO or program admin deploys this via a change request.",
    actions:[
      "Submit Change Request: Deploy SentinelGRC Collector Agent on a dedicated VM inside the F-35 boundary",
      "Admin runs ONE command: docker run -e TOKEN=xxx -e ORG=xxx sentinelgrc/collector:latest",
      "Submit Firewall Change Request: Allow collector VM → SentinelGRC GovCloud IPs on 443/TCP outbound ONLY",
      "Collector polls AD (LDAP), Windows (WMI), Switches (SSH/SNMP) — all READ-ONLY",
      "Data encrypted with AES-256 before leaving boundary, TLS 1.3 in transit",
    ],
    effort:"2–3 weeks (change approval process)",
  },
  {
    id:"s4", step:4, title:"AWS Security Hub (Native — Already Done)",
    color:"#AA66FF",
    tools:["awssechub"],
    desc:"If the program has an AWS GovCloud presence, Security Hub is already in the same region as SentinelGRC. IAM role-based access — no credentials to manage, no firewall rules, no agents.",
    actions:[
      "Create IAM role in customer's GovCloud account with SecurityHub:GetFindings permission",
      "SentinelGRC assumes the role via cross-account trust relationship",
      "All Security Hub findings flow in automatically — zero configuration after initial setup",
    ],
    effort:"1 hour",
  },
];

export default function DeploymentArch() {
  const [activeStep, setActiveStep] = useState("s1");
  const [hoveredTool, setHoveredTool] = useState(null);
  const [activeTab, setActiveTab] = useState("diagram");

  const step = STEPS.find(s => s.id === activeStep);

  const Zone = ({ title, badge, color, children, width="30%", note }) => (
    <div style={{ width, background:`${color}07`, border:`1px solid ${color}25`, borderRadius:10, padding:16, display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ ...mono, fontSize:10, fontWeight:700, color, letterSpacing:1 }}>{title}</div>
        <span style={{ ...mono, fontSize:9, color, background:`${color}14`, border:`1px solid ${color}30`, borderRadius:3, padding:"2px 5px" }}>{badge}</span>
      </div>
      {note && <div style={{ ...mono, fontSize:10, color:C.mute, lineHeight:1.5 }}>{note}</div>}
      {children}
    </div>
  );

  const ToolBox = ({ tool }) => {
    const t = TOOLS[tool];
    const m = METHODS[t.method];
    const isHovered = hoveredTool === tool;
    const isStepTool = step?.tools.includes(tool);
    return (
      <div onMouseEnter={() => setHoveredTool(tool)} onMouseLeave={() => setHoveredTool(null)}
        style={{ background:isHovered||isStepTool?`${t.color}12`:C.panel, border:`1px solid ${isHovered||isStepTool?t.color:C.border}`, borderRadius:7, padding:"10px 12px", cursor:"pointer", transition:"all 0.2s", position:"relative" }}>
        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
          <span style={{ fontSize:16 }}>{t.icon}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:500, color:isHovered||isStepTool?C.white:C.dim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.label}</div>
            <div style={{ display:"flex", gap:4, alignItems:"center", marginTop:2 }}>
              <span style={{ ...mono, fontSize:10, color:m.color }}>{m.icon} {m.label}</span>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
          {t.controls.map(c => (
            <span key={c} style={{ ...mono, fontSize:9, color:t.color, background:`${t.color}10`, border:`1px solid ${t.color}25`, borderRadius:2, padding:"1px 4px" }}>{c}</span>
          ))}
        </div>
        {isHovered && (
          <div style={{ position:"absolute", left:0, right:0, bottom:"calc(100% + 6px)", background:"#0A1828", border:`1px solid ${t.color}`, borderRadius:6, padding:10, zIndex:50, boxShadow:`0 4px 20px rgba(0,0,0,0.5)` }}>
            <div style={{ fontSize:10, color:C.text, lineHeight:1.6 }}>{t.detail}</div>
          </div>
        )}
      </div>
    );
  };

  const Arrow = ({ label, color, direction="right" }) => (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 6px" }}>
      <div style={{ ...mono, fontSize:9, color, marginBottom:3, whiteSpace:"nowrap" }}>{label}</div>
      <div style={{ width:40, height:2, background:`linear-gradient(${direction==="right"?"90deg":"270deg"},${color}80,${color})`, position:"relative" }}>
        <div style={{ position:"absolute", right:-1, top:-3, width:0, height:0, borderLeft:`6px solid ${color}`, borderTop:"4px solid transparent", borderBottom:"4px solid transparent" }} />
      </div>
      <div style={{ ...mono, fontSize:9, color:C.mute, marginTop:3 }}>HTTPS/443</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Helvetica Neue',Arial,sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`* { box-sizing:border-box; margin:0; padding:0; } ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:#03080F; } ::-webkit-scrollbar-thumb { background:#1A3A5C; }`}</style>

      {/* Header */}
      <div style={{ background:"#02060E", borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:30, height:30, background:`linear-gradient(135deg,${C.teal},${C.blue})`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:14, fontWeight:900, color:"#060E18" }}>S</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.white }}>SentinelGRC — Deployment Architecture</div>
            <div style={{ ...mono, fontSize:10, color:C.mute, letterSpacing:0.8 }}>LM / F-35 JSF PROGRAM · UNCLASSIFIED CUI ENVIRONMENT</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {["diagram","steps","checklist"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ ...mono, background:activeTab===t?"rgba(0,212,170,0.08)":"transparent", border:`1px solid ${activeTab===t?"rgba(0,212,170,0.3)":C.border}`, color:activeTab===t?C.teal:C.mute, borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:10, fontWeight:activeTab===t?700:400, textTransform:"capitalize" }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:20 }}>

        {/* DIAGRAM TAB */}
        {activeTab === "diagram" && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            {/* Architecture diagram */}
            <div style={{ display:"flex", gap:12, alignItems:"stretch", minHeight:480 }}>

              {/* SentinelGRC GovCloud */}
              <Zone title="SENTINELGRC" badge="AWS GOVCLOUD IL4" color={C.teal} width="22%"
                note="SaaS platform. ISSO accesses via browser + CAC auth. No on-site presence. All data encrypted at rest with org KMS key.">
                <div style={{ background:`${C.teal}0A`, border:`1px solid ${C.teal}30`, borderRadius:7, padding:12 }}>
                  <div style={{ fontSize:10, color:C.white, fontWeight:600, marginBottom:8 }}>Core Services</div>
                  {["Connector Lambdas","AI Analysis (Bedrock)","POAM Generator","SSP Builder","eMASS Export","CAC Auth Gateway"].map(s => (
                    <div key={s} style={{ ...mono, fontSize:11, color:C.teal, marginBottom:4 }}>• {s}</div>
                  ))}
                </div>
                <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:7, padding:10 }}>
                  <div style={{ ...mono, fontSize:10, color:C.mute, marginBottom:4 }}>ISSO ACCESS</div>
                  <div style={{ fontSize:10, color:C.dim }}>Browser → CAC auth → JWT → SentinelGRC dashboard</div>
                  <div style={{ ...mono, fontSize:10, color:C.green, marginTop:6 }}>✓ No on-site required</div>
                </div>
                <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:7, padding:10 }}>
                  <div style={{ ...mono, fontSize:10, color:C.mute, marginBottom:4 }}>AWS SECURITY HUB</div>
                  <ToolBox tool="awssechub" />
                </div>
              </Zone>

              {/* Arrow 1 */}
              <div style={{ display:"flex", flexDirection:"column", justifyContent:"space-around", alignItems:"center", minWidth:60 }}>
                <Arrow label="Cloud API" color={C.teal} />
                <Arrow label="File Import" color={C.gold} />
                <Arrow label="Collector Push" color={C.blue} />
              </div>

              {/* LM-Managed Zone */}
              <Zone title="LM MANAGED TOOLS" badge="OUTSIDE F-35 BOUNDARY" color="#E91E63" width="26%"
                note="LM is the MSSP. ISSO submits service requests for API credentials or data exports. No direct admin access.">
                {["crowdstrike","zscaler","tenable","paloalto"].map(t => <ToolBox key={t} tool={t} />)}
                <div style={{ background:"rgba(255,100,100,0.06)", border:"1px solid rgba(255,100,100,0.2)", borderRadius:6, padding:8 }}>
                  <div style={{ ...mono, fontSize:10, color:"#FF6688" }}>⚠ ISSO ACTION REQUIRED</div>
                  <div style={{ fontSize:11, color:C.dim, marginTop:3, lineHeight:1.5 }}>Submit LM service desk tickets requesting read-only API access to each tool. LM security team reviews and approves.</div>
                </div>
              </Zone>

              {/* Arrow 2 */}
              <div style={{ display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", minWidth:60 }}>
                <Arrow label="Collector" color={C.blue} />
                <div style={{ ...mono, fontSize:10, color:C.mute, marginTop:8, textAlign:"center" }}>Outbound<br/>HTTPS only</div>
              </div>

              {/* F-35 Boundary */}
              <Zone title="F-35 PROGRAM BOUNDARY" badge="NIPR / IL4 BOUNDARY" color={C.blue} width="32%"
                note="Systems inside the accredited boundary. Collector Agent deployed here by program admins via change request. Never requires on-site visit from ISSO.">

                {/* Collector agent box */}
                <div style={{ background:"rgba(26,122,255,0.08)", border:"2px solid rgba(26,122,255,0.4)", borderRadius:8, padding:12, marginBottom:4 }}>
                  <div style={{ ...mono, fontSize:11, fontWeight:700, color:C.blue, marginBottom:6 }}>📦 SENTINELGRC COLLECTOR AGENT</div>
                  <div style={{ fontSize:10, color:C.dim, lineHeight:1.6, marginBottom:8 }}>
                    Docker container or Windows Service. Deployed by program admin on any VM inside boundary. Outbound HTTPS only — no inbound ports opened.
                  </div>
                  <div style={{ background:"#040C14", borderRadius:5, padding:8 }}>
                    <div style={{ ...mono, fontSize:11, color:C.teal }}>docker run -d \</div>
                    <div style={{ ...mono, fontSize:11, color:C.teal, paddingLeft:12 }}>-e TOKEN=&lt;your-token&gt; \</div>
                    <div style={{ ...mono, fontSize:11, color:C.teal, paddingLeft:12 }}>-e ORG=&lt;org-id&gt; \</div>
                    <div style={{ ...mono, fontSize:11, color:C.teal, paddingLeft:12 }}>sentinelgrc/collector</div>
                  </div>
                </div>

                {["ad","windows","juniper","cisco9300"].map(t => <ToolBox key={t} tool={t} />)}

                {/* Firewall rule */}
                <div style={{ background:"rgba(255,140,0,0.06)", border:"1px solid rgba(255,140,0,0.2)", borderRadius:6, padding:8 }}>
                  <div style={{ ...mono, fontSize:10, color:C.orange }}>🔥 FIREWALL CHANGE REQUIRED</div>
                  <div style={{ ...mono, fontSize:10, color:C.dim, marginTop:3, lineHeight:1.6 }}>
                    Collector VM → SentinelGRC GovCloud IPs<br/>
                    Port: 443/TCP outbound only<br/>
                    Protocol: HTTPS / TLS 1.3<br/>
                    Direction: OUTBOUND ONLY (no inbound)
                  </div>
                </div>
              </Zone>
            </div>

            {/* Step selector */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
              {STEPS.map(s => (
                <div key={s.id} onClick={() => setActiveStep(s.id)}
                  style={{ background:activeStep===s.id?`${s.color}0A`:C.panel, border:`2px solid ${activeStep===s.id?s.color:C.border}`, borderRadius:8, padding:"10px 14px", cursor:"pointer", transition:"all 0.2s" }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:5 }}>
                    <div style={{ ...mono, fontSize:18, fontWeight:900, color:s.color }}>{s.step}</div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:activeStep===s.id?C.white:C.dim, lineHeight:1.3 }}>{s.title.split("(")[0].trim()}</div>
                      <div style={{ ...mono, fontSize:10, color:s.color }}>{s.effort}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {s.tools.map(t => (
                      <span key={t} style={{ fontSize:11 }}>{TOOLS[t].icon}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Active step detail */}
            {step && (
              <div style={{ background:C.panel, border:`1px solid ${step.color}30`, borderRadius:8, padding:18 }}>
                <div style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:14 }}>
                  <div style={{ ...mono, fontSize:28, fontWeight:900, color:step.color }}>{step.step}</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.white }}>{step.title}</div>
                    <div style={{ ...mono, fontSize:11, color:step.color }}>Est. effort: {step.effort}</div>
                  </div>
                </div>
                <div style={{ fontSize:12, color:C.dim, lineHeight:1.7, marginBottom:14 }}>{step.desc}</div>
                <div style={{ ...mono, fontSize:10, color:C.mute, letterSpacing:1, marginBottom:10 }}>DEPLOYMENT ACTIONS</div>
                {step.actions.map((a, i) => (
                  <div key={i} style={{ display:"flex", gap:10, marginBottom:8 }}>
                    <div style={{ ...mono, fontSize:10, color:step.color, fontWeight:700, minWidth:18 }}>{i+1}.</div>
                    <div style={{ fontSize:11, color:C.dim, lineHeight:1.6 }}>{a}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEPS TAB */}
        {activeTab === "steps" && (
          <div style={{ maxWidth:800 }}>
            <div style={{ ...mono, fontSize:11, color:C.mute, letterSpacing:1, marginBottom:16 }}>DEPLOYMENT SEQUENCE — LM / F-35 SCENARIO</div>
            
            <div style={{ background:"rgba(0,212,170,0.06)", border:`1px solid rgba(0,212,170,0.2)`, borderRadius:8, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.teal, marginBottom:8 }}>The Core Principle: SentinelGRC Is SaaS — You Never Go On-Site</div>
              <div style={{ fontSize:11, color:C.dim, lineHeight:1.8 }}>
                SentinelGRC lives in AWS GovCloud. You access it from any browser with your CAC. The <strong style={{color:C.white}}>Collector Agent</strong> is the only software that touches the customer's network — and it's deployed by their own admins, not you. Your role as the ISSO is to configure the connectors and submit the right requests to the right teams.
              </div>
            </div>

            {[
              { week:"Week 1–2", title:"SentinelGRC SaaS Setup", color:C.teal, icon:"☁",
                steps:["Sign into SentinelGRC (browser + CAC — done)","Create your organization profile (org name, CAGE code, contract numbers)","Create the system profile (F-35 system name, IL4, impact level, boundary description)","Add your team: ISSM, System Owner, AO (role-based access, EDIPI-linked)","Set up your 800-53 control baseline (Moderate or High based on categorization)"] },
              { week:"Week 2–3", title:"Cloud Tool Connectors (No Admin Required)", color:C.blue, icon:"⚡",
                steps:["CrowdStrike: Submit LM service ticket — 'Request read-only Falcon API key for SentinelGRC GRC integration' (scope: spotlight:read, detects:read, hosts:read)","Enter client_id + client_secret in SentinelGRC → Settings → Connectors → CrowdStrike","Zscaler: Request ZIA API key from LM (admin:read scope) → enter in connectors","AWS Security Hub: If GovCloud account exists, configure IAM cross-account trust — 1 hour setup","These connectors start sending data immediately — no firewall changes, no agents"] },
              { week:"Week 3–5", title:"Tenable.sc / ACAS Integration", color:C.gold, icon:"🔍",
                steps:["Option A (Start Here): Request LM Tenable.sc admin to export latest scan as .nessus format. Upload to SentinelGRC. Takes 30 min. No change request needed.","Option B (Long Term): Submit change request to create SentinelGRC service account in Tenable.sc with 'read' permission","If Option B: Work with LM network team on firewall rule — does a path exist between the program boundary and LM's Tenable.sc? If yes, configure API connector. If not, stay with Option A (file export) on a recurring basis.","ACAS scans are typically weekly — weekly .nessus export is a reasonable workflow if API isn't available"] },
              { week:"Week 4–8", title:"Collector Agent Inside F-35 Boundary", color:C.blue, icon:"📦",
                steps:["Submit Configuration Change Board request: 'Deploy SentinelGRC Collector Agent on existing VM (SENTINELGRC-COLLECTOR-01) inside F-35 boundary for security data aggregation'","Include in CR: Architecture diagram, data flow description, firewall rule request, Security Impact Analysis","Firewall rule request: Collector VM (10.x.x.x) → SentinelGRC GovCloud IPs → 443/TCP outbound only — NO inbound","Once CR approved: Admin runs one Docker command or installs Windows Service","Configure collector: which systems to poll (AD hostname, SSH targets for network devices, Windows hosts for WMI)","Collector connects to SentinelGRC, registers, starts sending data — all automatic"] },
              { week:"Ongoing", title:"ISSO Daily Workflow After Deployment", color:C.green, icon:"📋",
                steps:["Morning: Check SentinelGRC dashboard — any new CAT I findings? (30-day timer)", "Weekly: Review POAM queue — any findings aging toward due dates?","When LM runs ACAS scan: Receive .nessus file → drag into SentinelGRC → new POAMs auto-generated","Before SAV: Generate SAV Preparation Package from SentinelGRC — everything organized for assessors","Monthly: Review control assessment completeness — any control statements not yet written?","Quarterly: Generate POAM report for AO review — eMASS-compatible export"] },
            ].map((phase, pi) => (
              <div key={pi} style={{ background:C.panel, border:`1px solid ${phase.color}25`, borderRadius:8, padding:18, marginBottom:12 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
                  <span style={{ fontSize:20 }}>{phase.icon}</span>
                  <div>
                    <div style={{ ...mono, fontSize:11, color:phase.color }}>{phase.week}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.white }}>{phase.title}</div>
                  </div>
                </div>
                {phase.steps.map((s, i) => (
                  <div key={i} style={{ display:"flex", gap:10, marginBottom:8 }}>
                    <div style={{ ...mono, fontSize:10, color:phase.color, fontWeight:700, minWidth:18 }}>{i+1}.</div>
                    <div style={{ fontSize:11, color:C.dim, lineHeight:1.6 }}>{s}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* CHECKLIST TAB */}
        {activeTab === "checklist" && (
          <div style={{ maxWidth:700 }}>
            <div style={{ ...mono, fontSize:11, color:C.mute, letterSpacing:1, marginBottom:16 }}>CHANGE REQUESTS & TICKETS YOU NEED TO SUBMIT</div>
            {[
              { to:"LM IT Service Desk", color:"#E91E63", items:[
                { task:"CrowdStrike Falcon read-only API key for SentinelGRC", detail:"Scope: spotlight:read, detects:read, hosts:read, vulnerabilities:read", urgent:true },
                { task:"Zscaler ZIA API key (read-only)", detail:"Scope: admin:read for policy and event log access", urgent:false },
                { task:"Tenable.sc service account (read-only)", detail:"OR: Request recurring .nessus export after each ACAS scan cycle", urgent:true },
                { task:"Palo Alto / Panorama API read-only key", detail:"For firewall rule baseline comparison vs SC-7 STIG", urgent:false },
              ]},
              { to:"Program Network/Firewall Admin", color:C.orange, items:[
                { task:"Firewall rule: Collector VM → SentinelGRC GovCloud", detail:"10.x.x.x → 52.61.0.0/16 (AWS GovCloud us-gov-west-1) → 443/TCP outbound ONLY", urgent:true },
                { task:"SNMP read community string for Juniper/Cisco", detail:"OR: Read-only SSH key for config collection on routers/switches", urgent:false },
              ]},
              { to:"Program System/Server Admin", color:C.blue, items:[
                { task:"Deploy SentinelGRC Collector Agent on dedicated VM", detail:"docker run sentinelgrc/collector OR Windows Service install — 30 minutes", urgent:true },
                { task:"Create read-only LDAP service account in Active Directory", detail:"For account inventory, privileged group enumeration, password policy audit", urgent:true },
                { task:"WMI read access for Windows hosts (specific IP range)", detail:"For patch compliance and GPO configuration checks", urgent:false },
              ]},
              { to:"Change Control Board", color:C.purple, items:[
                { task:"Security Impact Analysis for Collector Agent deployment", detail:"SIA: Read-only, outbound HTTPS, no new attack surface, no CUI leaves boundary unencrypted", urgent:true },
                { task:"System diagram update: Add Collector Agent to boundary diagram", detail:"Required SSP update — document as minor change or significant change per AO determination", urgent:true },
              ]},
            ].map((group, gi) => (
              <div key={gi} style={{ background:C.panel, border:`1px solid ${group.color}25`, borderRadius:8, padding:16, marginBottom:12 }}>
                <div style={{ ...mono, fontSize:11, fontWeight:700, color:group.color, marginBottom:12 }}>SUBMIT TO: {group.to}</div>
                {group.items.map((item, i) => (
                  <div key={i} style={{ display:"flex", gap:10, padding:"10px 0", borderBottom:`1px solid #0A1828`, alignItems:"flex-start" }}>
                    <div style={{ width:20, height:20, borderRadius:4, border:`2px solid ${group.color}`, flexShrink:0, marginTop:1 }} />
                    <div>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
                        <span style={{ fontSize:11, fontWeight:500, color:C.white }}>{item.task}</span>
                        {item.urgent && <span style={{ ...mono, fontSize:9, color:C.red, background:"rgba(255,68,68,0.1)", border:"1px solid rgba(255,68,68,0.3)", borderRadius:3, padding:"1px 4px" }}>CRITICAL PATH</span>}
                      </div>
                      <div style={{ fontSize:10, color:C.dim }}>{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
