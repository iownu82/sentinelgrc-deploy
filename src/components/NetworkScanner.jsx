import { useState, useEffect, useRef } from "react";
import { useColors, useTheme } from "../theme.js";

// ── Device types and their STIG mappings ──────────────────────────────────
const DEVICE_TYPES = {
  juniper:  { label:"Juniper Router",      icon:"🌐", stig:"Network Infrastructure Router STIG",   color:"#FF8C00", vendor:"Juniper Networks" },
  cisco9300:{ label:"Cisco 9300 Switch",   icon:"🔄", stig:"Network Infrastructure Switch STIG",   color:"#00CC88", vendor:"Cisco Systems"    },
  paloalto: { label:"Palo Alto Firewall",  icon:"🔥", stig:"Palo Alto Networks STIG",              color:"#FF4444", vendor:"Palo Alto Networks"},
  windows:  { label:"Windows Server",      icon:"⊞",  stig:"Windows Server 2022 STIG",            color:"#1A7AFF", vendor:"Microsoft"         },
  rhel:     { label:"RHEL / Linux",        icon:"🐧", stig:"Red Hat Enterprise Linux 8 STIG",     color:"#FF6688", vendor:"Red Hat"            },
};

// ── STIG findings database (realistic DoD findings per device type) ────────
const STIG_CHECKS = {
  juniper: [
    { id:"V-214518", cat:"I",  control:"SC-8",  title:"Juniper router must use encryption for all access",                          check:"Is SSH v2 the only protocol for management access? Is Telnet disabled?",                   pass:false, finding:"Telnet service detected on mgmt interface ge-0/0/0 — plaintext admin access possible" },
    { id:"V-214519", cat:"II", control:"AC-17", title:"Juniper router must require authentication for all management access",       check:"Is RADIUS/TACACS+ configured for all admin authentication?",                              pass:true,  finding:null },
    { id:"V-214520", cat:"II", control:"AU-2",  title:"Juniper router must produce audit records",                                  check:"Is syslog configured to forward logs to an authorized log server?",                       pass:true,  finding:null },
    { id:"V-214521", cat:"II", control:"CM-6",  title:"Juniper router must be configured with DoD login banner",                   check:"Does the login banner contain the required DoD warning text?",                           pass:false, finding:"Login banner missing required DoD warning language — current banner: 'Unauthorized access prohibited'" },
    { id:"V-214522", cat:"II", control:"IA-3",  title:"Juniper router must authenticate all routing protocol neighbors",           check:"Is BGP/OSPF configured with MD5 or SHA authentication?",                                 pass:true,  finding:null },
    { id:"V-214523", cat:"III",control:"CM-7",  title:"Juniper router must have unnecessary services disabled",                    check:"Are CDP, LLDP, and other discovery protocols disabled where not required?",               pass:false, finding:"LLDP enabled on external-facing interfaces — device information exposed to adjacent networks" },
    { id:"V-214524", cat:"II", control:"SC-7",  title:"Juniper router must implement filters to block bogon addresses",            check:"Are bogon address filters applied to all external interfaces?",                          pass:true,  finding:null },
    { id:"V-214525", cat:"II", control:"CM-6",  title:"Juniper router must use SNMPv3 with authentication and encryption",        check:"Is SNMP configured with v3, auth-priv mode, and strong passwords?",                      pass:false, finding:"SNMPv2c community string 'public' detected — community string accessible without encryption" },
    { id:"V-214526", cat:"III",control:"AC-2",  title:"Juniper router must enforce session timeout for management sessions",       check:"Is idle session timeout set to 10 minutes or less?",                                     pass:true,  finding:null },
    { id:"V-214527", cat:"II", control:"SI-2",  title:"Juniper router must be running a supported OS version",                    check:"Is JunOS version current with no known critical vulnerabilities?",                       pass:true,  finding:null },
  ],
  cisco9300: [
    { id:"V-220521", cat:"I",  control:"IA-2",  title:"Cisco switch must enforce approved authentication for management",          check:"Is AAA authentication configured with RADIUS/TACACS+ for all access?",                   pass:true,  finding:null },
    { id:"V-220522", cat:"II", control:"AC-8",  title:"Cisco switch must display DoD-approved system use notification banner",    check:"Does login banner contain required DoD warning language?",                               pass:false, finding:"Banner text does not contain required DoD warning. Current: 'Switch01 - Authorized users only'" },
    { id:"V-220523", cat:"II", control:"AU-2",  title:"Cisco switch must log all authentication attempts",                        check:"Is logging enabled and forwarding to a syslog server on TCP 1514?",                      pass:true,  finding:null },
    { id:"V-220524", cat:"II", control:"CM-6",  title:"Cisco switch must use SSH v2 for all management access",                  check:"Is SSHv2 configured? Is Telnet disabled on all VTY lines?",                              pass:true,  finding:null },
    { id:"V-220525", cat:"II", control:"CM-7",  title:"Cisco switch must have unused switch ports disabled",                      check:"Are all unused switch ports in shutdown state and assigned to unused VLAN?",              pass:false, finding:"14 switch ports in active state with no connected devices — Gi1/0/18 through Gi1/0/31 should be shutdown" },
    { id:"V-220526", cat:"II", control:"SC-8",  title:"Cisco switch must enforce VLAN pruning on trunk links",                    check:"Are trunk links configured with explicit VLAN allow lists?",                             pass:false, finding:"Trunk port Gi1/0/48 allows all VLANs (1-4094) — VLAN hopping attack possible" },
    { id:"V-220527", cat:"III",control:"CM-6",  title:"Cisco switch must have spanning tree portfast only on access ports",       check:"Is PortFast restricted to access ports only? Is BPDU guard enabled?",                    pass:true,  finding:null },
    { id:"V-220528", cat:"II", control:"SC-7",  title:"Cisco switch must implement 802.1X port authentication",                  check:"Is 802.1X authentication configured on user-facing ports?",                              pass:false, finding:"802.1X not configured on access VLAN ports — unauthorized devices could connect to network" },
    { id:"V-220529", cat:"II", control:"IA-5",  title:"Cisco switch must use SNMPv3 with authentication and encryption",         check:"Is SNMPv2 disabled? Is SNMPv3 auth-priv configured?",                                   pass:true,  finding:null },
    { id:"V-220530", cat:"III",control:"AU-11", title:"Cisco switch must synchronize its clock using NTP",                       check:"Is NTP configured with an authenticated DoD-approved time source?",                      pass:false, finding:"NTP not configured — system clock unsynchronized, audit timestamps unreliable" },
  ],
  paloalto: [
    { id:"V-228826", cat:"I",  control:"SC-7",  title:"Palo Alto must deny traffic by default",                                  check:"Is the default security policy set to deny-all?",                                        pass:true,  finding:null },
    { id:"V-228827", cat:"II", control:"AU-12", title:"Palo Alto must log all traffic",                                          check:"Is logging enabled on all security policies including the default deny rule?",           pass:false, finding:"Default deny rule has logging disabled — traffic denied without audit trail" },
    { id:"V-228828", cat:"II", control:"AC-17", title:"Palo Alto must implement SSL/TLS inspection",                             check:"Is SSL decryption enabled for inspecting encrypted traffic?",                           pass:true,  finding:null },
    { id:"V-228829", cat:"II", control:"IA-3",  title:"Palo Alto must use certificate-based authentication for admin access",   check:"Is certificate-based admin authentication configured vs password-only?",               pass:false, finding:"Admin account 'admin' uses password-only authentication — certificate-based auth not configured" },
    { id:"V-228830", cat:"II", control:"CM-6",  title:"Palo Alto must have management interface on dedicated network",           check:"Is the management interface on a dedicated out-of-band management network?",           pass:true,  finding:null },
    { id:"V-228831", cat:"II", control:"SC-8",  title:"Palo Alto must use TLS 1.2 or higher for all management",                check:"Is TLS minimum version set to 1.2? Is SSLv3/TLS1.0/1.1 disabled?",                   pass:true,  finding:null },
    { id:"V-228832", cat:"II", control:"AU-2",  title:"Palo Alto must forward logs to an external syslog server",               check:"Is syslog forwarding configured to an authorized log aggregator?",                     pass:true,  finding:null },
    { id:"V-228833", cat:"III",control:"CM-7",  title:"Palo Alto must disable response pages for blocked URLs",                 check:"Are custom block pages configured without revealing internal architecture?",            pass:false, finding:"Default block page reveals Palo Alto vendor and version information to blocked users" },
    { id:"V-228834", cat:"II", control:"SI-3",  title:"Palo Alto must enable threat prevention profiles on all rules",          check:"Is antivirus, anti-spyware, and vulnerability protection applied to all rules?",       pass:false, finding:"Security rule 'Allow-Internal-Users' has no threat prevention profile assigned" },
    { id:"V-228835", cat:"II", control:"AC-4",  title:"Palo Alto must implement application-based policy enforcement",          check:"Is App-ID enabled for all security rules? Are port-based rules prohibited?",           pass:true,  finding:null },
  ],
};

// ── Open ports by device type ──────────────────────────────────────────────
const APPROVED_PORTS = {
  juniper:   [22, 161, 179, 514],
  cisco9300: [22, 161, 514, 49],
  paloalto:  [22, 443, 161, 514, 3978],
};

const SCAN_RESULTS_MOCK = {
  juniper:   [22, 23, 161, 179, 514],           // 23 = Telnet — NOT APPROVED
  cisco9300: [22, 80, 161, 514, 49],             // 80 = HTTP — NOT APPROVED
  paloalto:  [22, 443, 161, 514, 3978, 8080],    // 8080 — NOT APPROVED
};

// ── Scan log messages ──────────────────────────────────────────────────────
const SCAN_STEPS = [
  { pct:5,  msg:(ip, type) => `[NMAP] Starting scan against ${ip} (${DEVICE_TYPES[type]?.label})...` },
  { pct:12, msg:(ip)       => `[NMAP] Host ${ip} is up (0.003s latency)` },
  { pct:20, msg:(ip, type) => `[NMAP] Scanning ${ip} — 1000 common ports...` },
  { pct:32, msg:(ip, type) => `[NMAP] Discovered open ports on ${ip}` },
  { pct:40, msg:(ip, type) => `[SSH]  Initiating SSH connection to ${ip} port 22...` },
  { pct:48, msg:(ip, type) => `[SSH]  Authentication successful (key-based)` },
  { pct:55, msg:(ip, type) => `[SSH]  Running show commands — pulling running-config...` },
  { pct:62, msg:(ip, type) => `[STIG] Parsing configuration against ${DEVICE_TYPES[type]?.stig}...` },
  { pct:70, msg:(ip, type) => `[STIG] Checking authentication controls...` },
  { pct:76, msg:(ip, type) => `[STIG] Checking encryption settings...` },
  { pct:82, msg:(ip, type) => `[STIG] Checking logging and audit configuration...` },
  { pct:88, msg:(ip, type) => `[STIG] Checking banner and session controls...` },
  { pct:94, msg:(ip, type) => `[STIG] Analyzing port compliance...` },
  { pct:100,msg:(ip, type) => `[DONE] Scan complete — generating findings report` },
];

// ── Port risk assessment ───────────────────────────────────────────────────
function assessPorts(type, openPorts) {
  const approved = APPROVED_PORTS[type] || [];
  const findings = [];
  openPorts.forEach(port => {
    if (!approved.includes(port)) {
      const portNames = { 23:"Telnet (plaintext)", 80:"HTTP (plaintext)", 8080:"HTTP-alt", 21:"FTP (plaintext)", 25:"SMTP", 8443:"HTTPS-alt" };
      findings.push({
        id:`PORT-${port}`, cat:"I", control:"CM-7",
        title:`Unauthorized port ${port} (${portNames[port]||"Unknown Service"}) detected`,
        finding:`Port ${port}/${portNames[port]||"unknown"} is open and not on the approved ports/protocols/services list. This port must be disabled or justified.`,
        pass:false,
      });
    }
  });
  return findings;
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function NetworkScanner() {
  const C = useColors();
  const theme = useTheme();
  const mono = { fontFamily:"'Courier New',monospace" };
  const logRef = useRef(null);

  const [targets, setTargets] = useState([
    { id:1, ip:"10.1.10.1",   type:"juniper",   label:"RTR-CORE-01",   enabled:true  },
    { id:2, ip:"10.1.20.1",   type:"cisco9300", label:"SW-DIST-01",    enabled:true  },
    { id:3, ip:"10.1.20.2",   type:"cisco9300", label:"SW-DIST-02",    enabled:true  },
    { id:4, ip:"10.0.0.1",    type:"paloalto",  label:"FW-PERIMETER",  enabled:true  },
    { id:5, ip:"10.1.10.5",   type:"juniper",   label:"RTR-EDGE-01",   enabled:false },
    { id:6, ip:"10.0.0.2",    type:"paloalto",  label:"FW-DMZ",        enabled:false },
  ]);
  const [newTarget, setNewTarget] = useState({ ip:"", type:"cisco9300", label:"" });
  const [scanning, setScanning]   = useState(false);
  const [progress, setProgress]   = useState(0);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [scanLog, setScanLog]     = useState([]);
  const [results, setResults]     = useState(null);
  const [selected, setSelected]   = useState(null);
  const [activeTab, setActiveTab] = useState("targets");

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [scanLog]);

  const addTarget = () => {
    if (!newTarget.ip || !newTarget.label) return;
    setTargets(prev => [...prev, { id:Date.now(), ...newTarget, enabled:true }]);
    setNewTarget({ ip:"", type:"cisco9300", label:"" });
  };

  const toggleTarget = (id) => setTargets(prev => prev.map(t => t.id===id?{...t,enabled:!t.enabled}:t));

  const runScan = async () => {
    const active = targets.filter(t => t.enabled);
    if (!active.length) return;

    setScanning(true);
    setResults(null);
    setScanLog([]);
    setProgress(0);
    setActiveTab("scan");

    const allFindings = [];

    for (let di = 0; di < active.length; di++) {
      const dev = active[di];
      setCurrentDevice(dev);

      for (let si = 0; si < SCAN_STEPS.length; si++) {
        const step = SCAN_STEPS[si];
        const overallPct = Math.round(((di / active.length) + (step.pct / 100 / active.length)) * 100);
        setProgress(overallPct);

        const msg = step.msg(dev.ip, dev.type);
        setScanLog(prev => [...prev, { time:new Date().toLocaleTimeString(), msg, dev:dev.label }]);

        // Show port results after discovery step
        if (si === 3) {
          const openPorts = SCAN_RESULTS_MOCK[dev.type] || [];
          const approved = APPROVED_PORTS[dev.type] || [];
          const unauthorized = openPorts.filter(p => !approved.includes(p));
          setScanLog(prev => [...prev,
            { time:new Date().toLocaleTimeString(), msg:`[NMAP] Open ports: ${openPorts.join(", ")}`, dev:dev.label, highlight:true },
            ...unauthorized.map(p => ({
              time:new Date().toLocaleTimeString(),
              msg:`[WARN] Port ${p} — NOT on approved list for ${DEVICE_TYPES[dev.type]?.label}`,
              dev:dev.label, warn:true
            }))
          ]);
        }

        await new Promise(r => setTimeout(r, 180 + Math.random()*120));
      }

      // Collect findings
      const openPorts = SCAN_RESULTS_MOCK[dev.type] || [];
      const portFindings = assessPorts(dev.type, openPorts);
      const stigFindings = (STIG_CHECKS[dev.type] || []).filter(f => !f.pass);
      const stigPassed   = (STIG_CHECKS[dev.type] || []).filter(f => f.pass);

      allFindings.push({
        device: dev,
        openPorts,
        portFindings,
        stigFindings,
        stigPassed,
        totalChecks: (STIG_CHECKS[dev.type]||[]).length + portFindings.length,
        failedChecks: stigFindings.length + portFindings.length,
      });
    }

    // Summary
    const catI  = allFindings.flatMap(d => [...d.portFindings,...d.stigFindings]).filter(f=>f.cat==="I").length;
    const catII = allFindings.flatMap(d => [...d.stigFindings]).filter(f=>f.cat==="II").length;
    const catIII= allFindings.flatMap(d => [...d.stigFindings]).filter(f=>f.cat==="III").length;

    setScanLog(prev => [...prev,
      { time:new Date().toLocaleTimeString(), msg:"━━━━━━━━━━ SCAN COMPLETE ━━━━━━━━━━", dev:"", highlight:true },
      { time:new Date().toLocaleTimeString(), msg:`Devices scanned: ${active.length}`, dev:"" },
      { time:new Date().toLocaleTimeString(), msg:`CAT I findings: ${catI}`, dev:"", warn:catI>0 },
      { time:new Date().toLocaleTimeString(), msg:`CAT II findings: ${catII}`, dev:"" },
      { time:new Date().toLocaleTimeString(), msg:`CAT III findings: ${catIII}`, dev:"" },
    ]);

    setResults({ devices:allFindings, catI, catII, catIII });
    setScanning(false);
    setCurrentDevice(null);
    setProgress(100);
    setActiveTab("results");
  };

  const allFindings = results
    ? results.devices.flatMap(d => [
        ...d.portFindings.map(f => ({ ...f, device:d.device })),
        ...d.stigFindings.map(f => ({ ...f, device:d.device })),
      ])
    : [];

  const catColor = { "I":C.red, "II":C.orange, "III":C.gold };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Helvetica Neue',Arial,sans-serif", display:"flex", flexDirection:"column",
      filter:theme==="light"?"invert(1) hue-rotate(180deg) saturate(0.7) brightness(1.05)":"none" }}>
      <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.scroll||C.inputBorder};border-radius:2px}`}</style>

      {/* Header */}
      <div style={{ background:C.headerBg||C.panel, borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:30, height:30, background:`linear-gradient(135deg,${C.teal},${C.blue})`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:14, fontWeight:900, color:C.bg }}>S</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.white }}>SentinelGRC — Network Device Scanner</div>
            <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8 }}>NMAP PORT SCAN · SSH CONFIG COLLECTION · STIG COMPLIANCE · AUTO-POAM GENERATION</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {results && (
            <>
              {results.catI > 0 && <span style={{ ...mono, fontSize:11, color:C.red, background:`${C.red}14`, border:`1px solid ${C.red}40`, borderRadius:4, padding:"4px 10px" }}>● {results.catI} CAT I</span>}
              {results.catII > 0 && <span style={{ ...mono, fontSize:11, color:C.orange, background:`${C.orange}14`, border:`1px solid ${C.orange}40`, borderRadius:4, padding:"4px 10px" }}>● {results.catII} CAT II</span>}
            </>
          )}
          <button onClick={runScan} disabled={scanning || !targets.some(t=>t.enabled)}
            style={{ ...mono, background:scanning?"transparent":C.teal, border:`1px solid ${scanning?C.border:C.teal}`, color:scanning?C.textMute:C.bg, borderRadius:5, padding:"7px 18px", cursor:scanning?"not-allowed":"pointer", fontSize:11, fontWeight:700 }}>
            {scanning ? `⟳ SCANNING... ${progress}%` : "▶ RUN SCAN"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:C.panel2||C.panel, padding:"0 20px" }}>
        {[["targets","🎯 Targets"],["scan","📡 Scan Console"],["results","📊 Results"],["findings","🔍 Findings"]].map(([id,label]) => (
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{ background:"none", border:"none", borderBottom:`2px solid ${activeTab===id?C.teal:"transparent"}`, color:activeTab===id?C.teal:C.textMute, padding:"10px 16px", cursor:"pointer", ...mono, fontSize:10, fontWeight:activeTab===id?700:400 }}>
            {label}
            {id==="findings" && allFindings.length > 0 && <span style={{ marginLeft:6, background:C.red, color:C.bg, borderRadius:10, padding:"1px 6px", fontSize:10 }}>{allFindings.length}</span>}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflow:"hidden", display:"flex" }}>

        {/* ── TARGETS TAB ──────────────────────────────────────────── */}
        {activeTab === "targets" && (
          <div style={{ flex:1, overflowY:"auto", padding:20 }}>
            {/* Add target */}
            <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:16, marginBottom:16 }}>
              <div style={{ ...mono, fontSize:11, color:C.teal, fontWeight:700, marginBottom:12 }}>+ ADD SCAN TARGET</div>
              <div style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:120 }}>
                  <div style={{ ...mono, fontSize:10, color:C.textMute, marginBottom:4 }}>IP ADDRESS</div>
                  <input value={newTarget.ip} onChange={e=>setNewTarget(p=>({...p,ip:e.target.value}))}
                    placeholder="10.1.10.1"
                    style={{ width:"100%", background:C.input, border:`1px solid ${C.inputBorder||C.border}`, borderRadius:5, color:C.text, padding:"6px 10px", fontSize:11, ...mono, outline:"none" }} />
                </div>
                <div style={{ flex:1, minWidth:120 }}>
                  <div style={{ ...mono, fontSize:10, color:C.textMute, marginBottom:4 }}>HOSTNAME / LABEL</div>
                  <input value={newTarget.label} onChange={e=>setNewTarget(p=>({...p,label:e.target.value}))}
                    placeholder="RTR-CORE-01"
                    style={{ width:"100%", background:C.input, border:`1px solid ${C.inputBorder||C.border}`, borderRadius:5, color:C.text, padding:"6px 10px", fontSize:11, ...mono, outline:"none" }} />
                </div>
                <div style={{ minWidth:160 }}>
                  <div style={{ ...mono, fontSize:10, color:C.textMute, marginBottom:4 }}>DEVICE TYPE</div>
                  <select value={newTarget.type} onChange={e=>setNewTarget(p=>({...p,type:e.target.value}))}
                    style={{ width:"100%", background:C.input, border:`1px solid ${C.inputBorder||C.border}`, borderRadius:5, color:C.text, padding:"6px 10px", fontSize:11, ...mono, outline:"none", cursor:"pointer" }}>
                    {Object.entries(DEVICE_TYPES).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <button onClick={addTarget}
                  style={{ ...mono, background:C.teal, border:"none", color:C.bg, borderRadius:5, padding:"7px 16px", cursor:"pointer", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
                  + ADD
                </button>
              </div>
            </div>

            {/* Target list */}
            <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:10 }}>
              SCAN TARGETS — {targets.filter(t=>t.enabled).length} ENABLED / {targets.length} TOTAL
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:10 }}>
              {targets.map(t => {
                const dt = DEVICE_TYPES[t.type];
                return (
                  <div key={t.id} style={{ background:C.panel, border:`1px solid ${t.enabled?dt.color+"40":C.border}`, borderRadius:8, padding:14, opacity:t.enabled?1:0.5, transition:"all 0.2s" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{ fontSize:20 }}>{dt.icon}</span>
                        <div>
                          <div style={{ fontSize:12, fontWeight:600, color:C.white }}>{t.label}</div>
                          <div style={{ ...mono, fontSize:11, color:dt.color }}>{t.ip}</div>
                        </div>
                      </div>
                      <div onClick={()=>toggleTarget(t.id)}
                        style={{ width:36, height:20, borderRadius:10, background:t.enabled?C.teal:C.border, cursor:"pointer", position:"relative", flexShrink:0, transition:"background 0.2s" }}>
                        <div style={{ width:16, height:16, borderRadius:"50%", background:C.white, position:"absolute", top:2, left:t.enabled?18:2, transition:"left 0.2s" }} />
                      </div>
                    </div>
                    <div style={{ ...mono, fontSize:10, color:C.textMute }}>STIG: {dt.stig}</div>
                    <div style={{ ...mono, fontSize:10, color:C.textMute, marginTop:3 }}>
                      Approved ports: {(APPROVED_PORTS[t.type]||[]).join(", ")}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop:16, padding:"12px 16px", background:`${C.blue}0A`, border:`1px solid ${C.blue}25`, borderRadius:8 }}>
              <div style={{ ...mono, fontSize:11, color:C.blue, fontWeight:700, marginBottom:6 }}>ℹ IMPORTANT — SCAN AUTHORIZATION</div>
              <div style={{ fontSize:11, color:C.textDim, lineHeight:1.7 }}>
                Network scanning requires authorization from the system owner and ISSM before execution. Ensure this scan is covered under your ATO, CCP (Continuous Compliance Program), or an authorized penetration testing engagement. Unauthorized scanning of DoD networks violates 18 U.S.C. § 1030 (Computer Fraud and Abuse Act).
              </div>
            </div>
          </div>
        )}

        {/* ── SCAN CONSOLE TAB ──────────────────────────────────────── */}
        {activeTab === "scan" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", padding:20, gap:12 }}>
            {/* Progress */}
            {(scanning || progress > 0) && (
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ ...mono, fontSize:10, color:C.teal, fontWeight:700 }}>
                    {scanning ? `SCANNING: ${currentDevice?.label} (${currentDevice?.ip})` : "SCAN COMPLETE"}
                  </div>
                  <div style={{ ...mono, fontSize:11, fontWeight:800, color:scanning?C.teal:C.green }}>{progress}%</div>
                </div>
                <div style={{ height:6, background:C.panel2||C.border, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${progress}%`, height:"100%", background:`linear-gradient(90deg,${C.teal},${C.blue})`, borderRadius:3, transition:"width 0.4s ease" }} />
                </div>
              </div>
            )}

            {/* Terminal log */}
            <div ref={logRef} style={{ flex:1, background:C.bg, border:`1px solid #0D2030`, borderRadius:8, padding:14, overflowY:"auto", fontFamily:"'Courier New',monospace", fontSize:11, lineHeight:1.8 }}>
              {scanLog.length === 0 ? (
                <div style={{ color:"#3A5570", textAlign:"center", marginTop:40 }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>📡</div>
                  <div>Select targets and click RUN SCAN to begin</div>
                </div>
              ) : (
                scanLog.map((entry, i) => (
                  <div key={i} style={{ display:"flex", gap:10 }}>
                    <span style={{ color:"#3A5570", flexShrink:0 }}>{entry.time}</span>
                    {entry.dev && <span style={{ color:"#1A7AFF", flexShrink:0 }}>[{entry.dev}]</span>}
                    <span style={{ color:entry.warn?"#FF8C00":entry.highlight?"#00D4AA":"#7AB8D8" }}>{entry.msg}</span>
                  </div>
                ))
              )}
              {scanning && <div style={{ color:"#00D4AA" }}>█</div>}
            </div>
          </div>
        )}

        {/* ── RESULTS TAB ───────────────────────────────────────────── */}
        {activeTab === "results" && !results && (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:C.textMute, fontSize:13 }}>
            No scan results yet — run a scan first
          </div>
        )}
        {activeTab === "results" && results && (
          <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
            {/* Device list */}
            <div style={{ width:280, borderRight:`1px solid ${C.border}`, overflowY:"auto" }}>
              <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ ...mono, fontSize:11, color:C.teal, fontWeight:700 }}>DEVICES SCANNED</div>
              </div>
              {results.devices.map(d => {
                const dt = DEVICE_TYPES[d.device.type];
                const isSel = selected?.device.id === d.device.id;
                const catI = [...d.portFindings,...d.stigFindings].filter(f=>f.cat==="I").length;
                return (
                  <div key={d.device.id} onClick={()=>setSelected(isSel?null:d)}
                    style={{ padding:"12px 14px", borderBottom:`1px solid ${C.border}`, cursor:"pointer", background:isSel?`${C.teal}0A`:"transparent", borderLeft:isSel?`3px solid ${C.teal}`:"3px solid transparent" }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                      <span style={{ fontSize:16 }}>{dt.icon}</span>
                      <div>
                        <div style={{ fontSize:11, fontWeight:600, color:C.white }}>{d.device.label}</div>
                        <div style={{ ...mono, fontSize:11, color:C.textMute }}>{d.device.ip}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      {catI > 0 && <span style={{ ...mono, fontSize:10, color:C.red, background:`${C.red}14`, border:`1px solid ${C.red}30`, borderRadius:3, padding:"1px 5px" }}>CAT I: {catI}</span>}
                      <span style={{ ...mono, fontSize:10, color:C.orange, background:`${C.orange}14`, border:`1px solid ${C.orange}30`, borderRadius:3, padding:"1px 5px" }}>{d.failedChecks} FAILED</span>
                      <span style={{ ...mono, fontSize:10, color:C.green, background:`${C.green}14`, border:`1px solid ${C.green}30`, borderRadius:3, padding:"1px 5px" }}>{d.stigPassed.length} PASSED</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Device detail */}
            {selected ? (
              <div style={{ flex:1, overflowY:"auto", padding:20 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16 }}>
                  <span style={{ fontSize:24 }}>{DEVICE_TYPES[selected.device.type]?.icon}</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.white }}>{selected.device.label}</div>
                    <div style={{ ...mono, fontSize:11, color:C.textMute }}>{selected.device.ip} · {DEVICE_TYPES[selected.device.type]?.stig}</div>
                  </div>
                </div>

                {/* Port scan results */}
                <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:14, marginBottom:14 }}>
                  <div style={{ ...mono, fontSize:11, color:C.teal, fontWeight:700, marginBottom:10 }}>NMAP PORT SCAN RESULTS</div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {selected.openPorts.map(port => {
                      const approved = (APPROVED_PORTS[selected.device.type]||[]).includes(port);
                      return (
                        <div key={port} style={{ padding:"5px 12px", borderRadius:5, background:approved?`${C.green}0F`:`${C.red}0F`, border:`1px solid ${approved?C.green:C.red}40` }}>
                          <span style={{ ...mono, fontSize:11, fontWeight:700, color:approved?C.green:C.red }}>{port}</span>
                          <span style={{ ...mono, fontSize:10, color:C.textMute, marginLeft:6 }}>{approved?"✓ APPROVED":"✗ UNAUTHORIZED"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* STIG findings */}
                {[...selected.portFindings,...selected.stigFindings].map((f,i) => (
                  <div key={i} style={{ background:C.panel, border:`1px solid ${catColor[f.cat]||C.border}30`, borderRadius:8, padding:14, marginBottom:8 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:6 }}>
                      <span style={{ ...mono, fontSize:10, fontWeight:700, color:catColor[f.cat]||C.orange, flexShrink:0 }}>CAT {f.cat}</span>
                      <span style={{ ...mono, fontSize:11, color:C.textMute }}>{f.id}</span>
                      <span style={{ ...mono, fontSize:11, color:C.blue }}>{f.control}</span>
                    </div>
                    <div style={{ fontSize:11, fontWeight:600, color:C.white, marginBottom:5 }}>{f.title}</div>
                    <div style={{ fontSize:11, color:C.textDim, lineHeight:1.6, background:`${catColor[f.cat]||C.orange}08`, borderRadius:5, padding:"8px 10px" }}>
                      {f.finding}
                    </div>
                  </div>
                ))}

                {/* Passed checks */}
                <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, margin:"14px 0 8px" }}>PASSED CHECKS ({selected.stigPassed.length})</div>
                {selected.stigPassed.map((f,i) => (
                  <div key={i} style={{ display:"flex", gap:10, padding:"7px 12px", background:C.panel, border:`1px solid ${C.green}20`, borderRadius:6, marginBottom:5 }}>
                    <span style={{ color:C.green }}>✓</span>
                    <span style={{ ...mono, fontSize:11, color:C.textMute }}>{f.id}</span>
                    <span style={{ fontSize:10, color:C.textDim }}>{f.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:C.textMute }}>
                Select a device to view detailed results
              </div>
            )}
          </div>
        )}

        {/* ── FINDINGS TAB ──────────────────────────────────────────── */}
        {activeTab === "findings" && (
          <div style={{ flex:1, overflowY:"auto", padding:20 }}>
            {!results ? (
              <div style={{ textAlign:"center", color:C.textMute, marginTop:60, fontSize:13 }}>No findings yet — run a scan first</div>
            ) : (
              <>
                {/* Summary KPIs */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
                  {[
                    { l:"CAT I (Critical)", v:results.catI,   c:C.red,    sub:"30-day remediation" },
                    { l:"CAT II (High)",    v:results.catII,  c:C.orange, sub:"90-day remediation" },
                    { l:"CAT III (Med)",    v:results.catIII, c:C.gold,   sub:"180-day remediation" },
                    { l:"Total Findings",  v:allFindings.length, c:C.white, sub:"across all devices" },
                  ].map(k => (
                    <div key={k.l} style={{ background:C.panel, border:`1px solid ${k.c}30`, borderRadius:8, padding:"12px 14px" }}>
                      <div style={{ ...mono, fontSize:24, fontWeight:900, color:k.c, lineHeight:1 }}>{k.v}</div>
                      <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:1, margin:"4px 0 2px", textTransform:"uppercase" }}>{k.l}</div>
                      <div style={{ fontSize:10, color:C.textMute }}>{k.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Findings list */}
                {allFindings.map((f,i) => {
                  const dt = DEVICE_TYPES[f.device.type];
                  return (
                    <div key={i} style={{ background:C.panel, border:`1px solid ${catColor[f.cat]||C.border}30`, borderRadius:8, padding:14, marginBottom:10 }}>
                      <div style={{ display:"flex", gap:10, alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                          <span style={{ ...mono, fontSize:10, fontWeight:700, color:catColor[f.cat] }}>CAT {f.cat}</span>
                          <span style={{ ...mono, fontSize:11, color:C.textMute }}>{f.id}</span>
                          <span style={{ ...mono, fontSize:11, color:C.blue }}>{f.control}</span>
                          <span style={{ fontSize:10, color:dt?.color }}>{dt?.icon} {f.device.label} ({f.device.ip})</span>
                        </div>
                        <button style={{ ...mono, fontSize:11, background:`${C.orange}0F`, border:`1px solid ${C.orange}30`, color:C.orange, borderRadius:4, padding:"3px 10px", cursor:"pointer", whiteSpace:"nowrap" }}>
                          + POAM
                        </button>
                      </div>
                      <div style={{ fontSize:11, fontWeight:600, color:C.white, marginBottom:5 }}>{f.title}</div>
                      <div style={{ fontSize:11, color:C.textDim, lineHeight:1.6 }}>{f.finding}</div>
                    </div>
                  );
                })}

                {/* Export button */}
                <div style={{ display:"flex", gap:10, marginTop:16 }}>
                  <button style={{ ...mono, background:C.teal, border:"none", color:C.bg, borderRadius:5, padding:"8px 20px", cursor:"pointer", fontSize:11, fontWeight:700 }}>
                    ↓ EXPORT ALL TO POAM (eMASS FORMAT)
                  </button>
                  <button style={{ ...mono, background:"transparent", border:`1px solid ${C.border}`, color:C.textDim, borderRadius:5, padding:"8px 16px", cursor:"pointer", fontSize:11 }}>
                    ↓ EXPORT SCAN REPORT (PDF)
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
