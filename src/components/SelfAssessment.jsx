import { useState, useMemo } from "react";
import { useColors } from "../theme.js";

const C = { bg:"#03080E", panel:"#060D16", panelAlt:"#08111C", panel2:"#08111C", border:"#0D1E2E", borderMd:"#152840", text:"#C8D8E8", textDim:"#7A9AB8", dim:"#7A9AB8", textMute:"#3A5570", mute:"#3A5570", white:"#F0F8FF", input:"#040C16", inputBorder:"#1A3A5C", rowA:"#050C14", rowB:"#040A12", scroll:"#1A3A5C", headerBg:"#02060C", teal:"#00D4AA", blue:"#1A7AFF", red:"#FF4444", orange:"#FF8C00", gold:"#FFD700", green:"#00CC88", purple:"#AA66FF" };


// ─── 800-53 Rev 5 Control Families + Representative Controls ────────────────
const CONTROL_FAMILIES = [
  {
    id:"AC", name:"Access Control", controls:[
      { id:"AC-1",    title:"Policy and Procedures",              req:"Develop, document, and disseminate access control policy.", cat:"II", inheritable:true  },
      { id:"AC-2",    title:"Account Management",                 req:"Manage system accounts including establishing, activating, modifying, reviewing, disabling, and removing accounts.", cat:"II", inheritable:false },
      { id:"AC-3",    title:"Access Enforcement",                 req:"Enforce approved authorizations for logical access to information and system resources.", cat:"II", inheritable:false },
      { id:"AC-6",    title:"Least Privilege",                    req:"Employ the principle of least privilege allowing only authorized access to accomplish assigned tasks.", cat:"II", inheritable:false },
      { id:"AC-7",    title:"Unsuccessful Logon Attempts",        req:"Enforce a limit of consecutive invalid logon attempts and automatically lock the account.", cat:"II", inheritable:false },
      { id:"AC-11",   title:"Device Lock",                        req:"Prevent access by initiating a session lock after a period of inactivity.", cat:"III",inheritable:false },
      { id:"AC-17",   title:"Remote Access",                      req:"Establish and document usage restrictions and implementation guidance for remote access.", cat:"II", inheritable:true  },
    ]
  },
  {
    id:"AU", name:"Audit and Accountability", controls:[
      { id:"AU-1",    title:"Policy and Procedures",              req:"Develop, document, and disseminate audit and accountability policy.", cat:"II", inheritable:true },
      { id:"AU-2",    title:"Event Logging",                      req:"Identify the types of events to be logged and coordinate the event logging function.", cat:"II", inheritable:false },
      { id:"AU-3",    title:"Content of Audit Records",           req:"Ensure audit records contain sufficient information to establish what events occurred.", cat:"II", inheritable:false },
      { id:"AU-6",    title:"Audit Record Review, Analysis, Reporting",req:"Review and analyze system audit records for indications of inappropriate activity.", cat:"II", inheritable:false },
      { id:"AU-9",    title:"Protection of Audit Information",    req:"Protect audit information and audit tools from unauthorized access, modification, and deletion.", cat:"II", inheritable:false },
      { id:"AU-11",   title:"Audit Record Retention",             req:"Retain audit records for a defined period to provide support for after-the-fact investigations.", cat:"III",inheritable:false },
      { id:"AU-12",   title:"Audit Record Generation",            req:"Provide audit record generation capability on the information system.", cat:"II", inheritable:false },
    ]
  },
  {
    id:"CA", name:"Assessment, Authorization, Monitoring", controls:[
      { id:"CA-1",    title:"Policy and Procedures",              req:"Develop, document, and disseminate assessment, authorization, and monitoring policy.", cat:"II", inheritable:true },
      { id:"CA-2",    title:"Control Assessments",                req:"Select and employ assessors or assessment teams to conduct control assessments.", cat:"II", inheritable:false },
      { id:"CA-5",    title:"Plan of Action and Milestones",      req:"Develop a plan of action and milestones for the information system.", cat:"II", inheritable:false },
      { id:"CA-6",    title:"Authorization",                      req:"Assign a senior official as the authorizing official for the system.", cat:"II", inheritable:true },
      { id:"CA-7",    title:"Continuous Monitoring",              req:"Implement a continuous monitoring program including defining a strategy and metrics.", cat:"II", inheritable:false },
    ]
  },
  {
    id:"CM", name:"Configuration Management", controls:[
      { id:"CM-1",    title:"Policy and Procedures",              req:"Develop, document, and disseminate configuration management policy.", cat:"II", inheritable:true },
      { id:"CM-2",    title:"Baseline Configuration",             req:"Develop, document, and maintain a current baseline configuration of the system.", cat:"II", inheritable:false },
      { id:"CM-6",    title:"Configuration Settings",             req:"Establish and document configuration settings using security configuration checklists (STIGs/SRGs).", cat:"II", inheritable:false },
      { id:"CM-7",    title:"Least Functionality",                req:"Configure the system to provide only essential capabilities and prohibit or restrict the use of functions and ports.", cat:"II", inheritable:false },
      { id:"CM-8",    title:"System Component Inventory",         req:"Develop and document an inventory of system components.", cat:"III",inheritable:false },
      { id:"CM-11",   title:"User-Installed Software",            req:"Establish policies governing the installation of software by users.", cat:"II", inheritable:false },
    ]
  },
  {
    id:"IA", name:"Identification and Authentication", controls:[
      { id:"IA-1",    title:"Policy and Procedures",              req:"Develop, document, and disseminate identification and authentication policy.", cat:"II", inheritable:true },
      { id:"IA-2",    title:"Identification and Auth (Organizational Users)", req:"Uniquely identify and authenticate organizational users including requiring MFA for network access.", cat:"I",  inheritable:false },
      { id:"IA-3",    title:"Device Identification and Authentication", req:"Uniquely identify and authenticate devices before establishing connections.", cat:"II", inheritable:false },
      { id:"IA-5",    title:"Authenticator Management",           req:"Manage system authenticators by verifying identity, establishing initial authenticator content, and enforcing restrictions.", cat:"II", inheritable:false },
      { id:"IA-8",    title:"Identification and Auth (Non-Org Users)",req:"Uniquely identify and authenticate non-organizational users or processes acting on behalf of non-organizational users.", cat:"II", inheritable:false },
    ]
  },
  {
    id:"IR", name:"Incident Response", controls:[
      { id:"IR-1",    title:"Policy and Procedures",              req:"Develop, document, and disseminate incident response policy.", cat:"II", inheritable:true },
      { id:"IR-4",    title:"Incident Handling",                  req:"Implement an incident handling capability including preparation, detection, analysis, containment, eradication, and recovery.", cat:"II", inheritable:false },
      { id:"IR-5",    title:"Incident Monitoring",                req:"Track and document incidents.", cat:"II", inheritable:false },
      { id:"IR-6",    title:"Incident Reporting",                 req:"Require personnel to report suspected incidents to the organizational incident response capability within a defined time period.", cat:"II", inheritable:false },
    ]
  },
  {
    id:"RA", name:"Risk Assessment", controls:[
      { id:"RA-1",    title:"Policy and Procedures",              req:"Develop, document, and disseminate risk assessment policy.", cat:"II", inheritable:true },
      { id:"RA-3",    title:"Risk Assessment",                    req:"Conduct a risk assessment, including the likelihood and magnitude of harm from unauthorized access, use, disclosure, disruption, modification, or destruction of the system.", cat:"II", inheritable:false },
      { id:"RA-5",    title:"Vulnerability Monitoring and Scanning", req:"Monitor and scan for vulnerabilities in the system and hosted applications. Conduct vulnerability scanning weekly for networks and operating systems.", cat:"II", inheritable:false },
      { id:"RA-9",    title:"Criticality Analysis",               req:"Identify critical system components and functions by performing a criticality analysis.", cat:"II", inheritable:false },
    ]
  },
  {
    id:"SC", name:"System and Communications Protection", controls:[
      { id:"SC-1",    title:"Policy and Procedures",              req:"Develop, document, and disseminate system and communications protection policy.", cat:"II", inheritable:true },
      { id:"SC-7",    title:"Boundary Protection",                req:"Monitor and control communications at the external boundary and at key internal boundaries.", cat:"I",  inheritable:false },
      { id:"SC-8",    title:"Transmission Confidentiality and Integrity", req:"Implement cryptographic mechanisms to prevent unauthorized disclosure of information during transmission.", cat:"II", inheritable:false },
      { id:"SC-12",   title:"Cryptographic Key Establishment and Management", req:"Establish and manage cryptographic keys when cryptography is employed.", cat:"II", inheritable:false },
      { id:"SC-13",   title:"Cryptographic Protection",           req:"Implement FIPS-validated or NSA-approved cryptographic controls.", cat:"I",  inheritable:false },
      { id:"SC-28",   title:"Protection of Information at Rest",  req:"Implement cryptographic mechanisms to prevent unauthorized disclosure and modification of information at rest.", cat:"II", inheritable:false },
    ]
  },
  {
    id:"SI", name:"System and Information Integrity", controls:[
      { id:"SI-1",    title:"Policy and Procedures",              req:"Develop, document, and disseminate system and information integrity policy.", cat:"II", inheritable:true },
      { id:"SI-2",    title:"Flaw Remediation",                   req:"Identify, report, and correct information system flaws. Install security patches within 30 days for critical and 90 days for others.", cat:"II", inheritable:false },
      { id:"SI-3",    title:"Malicious Code Protection",          req:"Employ malicious code protection mechanisms at entry and exit points as well as at workstations, servers, and mobile devices.", cat:"II", inheritable:false },
      { id:"SI-4",    title:"System Monitoring",                  req:"Monitor the system to detect attacks and indicators of potential attacks.", cat:"II", inheritable:false },
      { id:"SI-7",    title:"Software, Firmware, and Information Integrity", req:"Employ integrity verification mechanisms to detect unauthorized changes to software, firmware, and information.", cat:"II", inheritable:false },
    ]
  },
  {
    id:"SR", name:"Supply Chain Risk Management", controls:[
      { id:"SR-1",    title:"Policy and Procedures",              req:"Develop, document, and disseminate supply chain risk management policy.", cat:"II", inheritable:true },
      { id:"SR-2",    title:"Supply Chain Risk Management Plan",  req:"Develop an organization-level and system-level supply chain risk management plan.", cat:"II", inheritable:true },
      { id:"SR-11",   title:"Component Authenticity",            req:"Employ anti-counterfeit policies and procedures to detect counterfeit components and report findings.", cat:"II", inheritable:false },
    ]
  },
];

// ─── Mock assessment state ────────────────────────────────────────────────────
const IMPL_STATUS = {
  Implemented:         { label:"Implemented",          color:"#00CC88", bg:"rgba(0,204,136,0.10)", score:1.0  },
  Partial:             { label:"Partially Implemented", color:"#FFD700", bg:"rgba(255,215,0,0.10)",  score:0.5  },
  "Not Implemented":   { label:"Not Implemented",       color:"#FF4444", bg:"rgba(255,68,68,0.10)",  score:0.0  },
  "Not Applicable":    { label:"Not Applicable",        color:"#778899", bg:"rgba(119,136,153,0.10)",score:1.0  },
  Inherited:           { label:"Inherited",             color:"#1A7AFF", bg:"rgba(26,122,255,0.10)", score:1.0  },
  Planned:             { label:"Planned",               color:"#FF8C00", bg:"rgba(255,140,0,0.10)",  score:0.0  },
  "Not Assessed":      { label:"Not Assessed",          color:"#3A5570", bg:"rgba(58,85,112,0.10)",  score:0.0  },
};

const CAT_COLOR = { "I":"#FF4444", "II":"#FF8C00", "III":"#FFD700" };

// Statement templates
const TEMPLATES = {
  "AC-2": "Account management for [SYSTEM NAME] is implemented through Active Directory group policies managed by [ORG NAME] system administrators. All accounts are reviewed quarterly, and inactive accounts are disabled after 30 days of inactivity. Account creation requires supervisor approval via the [TICKETING SYSTEM] workflow.",
  "AC-6": "[SYSTEM NAME] employs the principle of least privilege through role-based access control (RBAC). Users are granted only the minimum permissions necessary to perform their job functions. Administrative access is restricted to designated system administrators and requires a separate privileged account.",
  "AU-2": "[SYSTEM NAME] logs the following event types: successful and unsuccessful logon attempts, privilege escalation, object access, policy changes, account management events, process tracking, and system events. Event logs are forwarded to the centralized SIEM ([SPLUNK/SIEM NAME]) within 5 minutes of generation.",
  "CA-7": "Continuous monitoring for [SYSTEM NAME] is implemented through automated tools including ACAS (vulnerability scanning weekly), CrowdStrike Falcon (continuous EDR monitoring), AWS Security Hub (cloud posture monitoring), and STIG/SCAP compliance scanning quarterly. Monitoring results are reviewed by the ISSO weekly and reported to the ISSM monthly.",
  "IA-2": "[SYSTEM NAME] requires multi-factor authentication (MFA) using DoD-issued Common Access Card (CAC) with PIN for all organizational users accessing the system remotely or via network. Local console access to servers requires CAC authentication. Service accounts use certificate-based authentication.",
  "RA-5": "Vulnerability scanning for [SYSTEM NAME] is conducted using ACAS (Tenable.sc) on a weekly basis for all network-accessible assets and monthly for all systems including offline/air-gapped components. Scan results are reviewed by the ISSO within 5 business days. Critical (CAT I) vulnerabilities are remediated within 30 days; High (CAT II) within 90 days.",
  "SC-7": "Network boundary protection for [SYSTEM NAME] is implemented through [FIREWALL TYPE] firewalls enforcing deny-all/permit-by-exception policies. Perimeter security includes intrusion detection/prevention systems (IDPS), and all inbound/outbound traffic is logged and monitored. External connections are limited to approved ports/protocols documented in the approved ports and protocols list.",
  "SI-3": "Malicious code protection for [SYSTEM NAME] is implemented through Trellix (McAfee) Endpoint Security (ENS) deployed on all Windows endpoints via HBSS (McAfee ePO). Signature updates are applied automatically within 24 hours of availability. CrowdStrike Falcon is deployed as a secondary EDR solution providing behavioral analytics and threat prevention.",
};

const INITIAL_ASSESSMENTS = {
  "AC-1":  { status:"Inherited",       statement:"Inherited from organizational-level policy maintained by the ISSM. See [ORG] Access Control Policy v2.3, dated [DATE].", evidence:["AC-Policy-v2.3.pdf"], poam:null, stigLinks:[], lastUpdated:"2025-03-15", updatedBy:"J. Doe (ISSO)" },
  "AC-2":  { status:"Implemented",     statement:TEMPLATES["AC-2"], evidence:["AD-Account-Audit-Q1-2025.xlsx","Account-Mgmt-SOP.pdf"], poam:null, stigLinks:["V-253263"], lastUpdated:"2025-03-20", updatedBy:"J. Doe (ISSO)" },
  "AC-3":  { status:"Implemented",     statement:"Access enforcement is implemented through RBAC in Active Directory. File system NTFS permissions are configured to enforce least privilege. Database access controls restrict access to authorized roles only.", evidence:["RBAC-Matrix.xlsx"], poam:null, stigLinks:[], lastUpdated:"2025-03-18", updatedBy:"J. Doe (ISSO)" },
  "AC-6":  { status:"Partial",         statement:TEMPLATES["AC-6"], evidence:["Admin-Account-Audit.xlsx"], poam:"POAM-014", stigLinks:["V-220706"], lastUpdated:"2025-03-22", updatedBy:"J. Doe (ISSO)" },
  "AC-7":  { status:"Implemented",     statement:"Account lockout is configured via GPO: 5 invalid attempts → 15-minute lockout. CAC authentication limits are enforced by DoD PKI infrastructure.", evidence:["GPO-Lockout-Config.png"], poam:null, stigLinks:["V-220708"], lastUpdated:"2025-03-19", updatedBy:"J. Doe (ISSO)" },
  "AC-11": { status:"Not Implemented", statement:"", evidence:[], poam:"POAM-015", stigLinks:["V-220711"], lastUpdated:"2025-03-10", updatedBy:"J. Doe (ISSO)" },
  "AC-17": { status:"Inherited",       statement:"Remote access policy inherited from DoD Enterprise Remote Access Service. VPN connectivity provided through DoD-approved solution.", evidence:[], poam:null, stigLinks:[], lastUpdated:"2025-02-28", updatedBy:"J. Doe (ISSO)" },
  "AU-2":  { status:"Implemented",     statement:TEMPLATES["AU-2"], evidence:["SIEM-Config.pdf","Audit-Policy-GPO.png"], poam:null, stigLinks:[], lastUpdated:"2025-03-21", updatedBy:"J. Doe (ISSO)" },
  "AU-3":  { status:"Implemented",     statement:"Audit records include: date/time, event type, user/subject identity, outcome, and source IP. Windows Event Forwarding (WEF) sends events to Splunk within 5 minutes.", evidence:["WEF-Config.xml"], poam:null, stigLinks:[], lastUpdated:"2025-03-21", updatedBy:"J. Doe (ISSO)" },
  "AU-6":  { status:"Partial",         statement:"Audit records are reviewed via Splunk dashboards. Automated alerting is configured for high-priority events. Full review of all logs is not yet implemented.", evidence:["Splunk-Dashboard.png"], poam:"POAM-016", stigLinks:[], lastUpdated:"2025-03-22", updatedBy:"J. Doe (ISSO)" },
  "AU-9":  { status:"Implemented",     statement:"Audit logs are forwarded to Splunk within 5 minutes and protected from modification by unprivileged users. Log integrity is verified via SHA-256 hashing.", evidence:["Splunk-Integrity-Config.pdf"], poam:null, stigLinks:[], lastUpdated:"2025-03-18", updatedBy:"J. Doe (ISSO)" },
  "AU-11": { status:"Implemented",     statement:"Audit records are retained for 3 years in compliance with NARA requirements. Online retention is 1 year in Splunk; archived to encrypted S3 for 2 additional years.", evidence:["Retention-Policy.pdf"], poam:null, stigLinks:[], lastUpdated:"2025-03-15", updatedBy:"J. Doe (ISSO)" },
  "AU-12": { status:"Partial",         statement:"Audit record generation is implemented for Windows systems via GPO and for Linux via auditd. Network devices are not yet fully configured for syslog forwarding.", evidence:["Auditd-Config.txt"], poam:"POAM-017", stigLinks:["RHEL-09-020040"], lastUpdated:"2025-03-20", updatedBy:"J. Doe (ISSO)" },
  "CA-2":  { status:"Not Assessed",    statement:"", evidence:[], poam:null, stigLinks:[], lastUpdated:"", updatedBy:"" },
  "CA-5":  { status:"Implemented",     statement:"The POAM for this system is maintained in SentinelGRC and reviewed/updated monthly by the ISSO. The ISSM reviews the POAM quarterly. The AO is notified of significant changes within 5 business days.", evidence:["POAM-Current.xlsx"], poam:null, stigLinks:[], lastUpdated:"2025-03-22", updatedBy:"J. Doe (ISSO)" },
  "CA-6":  { status:"Inherited",       statement:"System authorization authority is delegated by the DoD Component AO. The current ATO was granted [DATE] and expires [DATE]. The AO designation letter is on file.", evidence:["ATO-Letter.pdf"], poam:null, stigLinks:[], lastUpdated:"2025-01-15", updatedBy:"J. Doe (ISSO)" },
  "CA-7":  { status:"Partial",         statement:TEMPLATES["CA-7"], evidence:["ConMon-Plan.pdf"], poam:"POAM-018", stigLinks:[], lastUpdated:"2025-03-22", updatedBy:"J. Doe (ISSO)" },
  "IA-2":  { status:"Implemented",     statement:TEMPLATES["IA-2"], evidence:["CAC-Auth-Config.pdf","MFA-Policy.pdf"], poam:null, stigLinks:[], lastUpdated:"2025-03-20", updatedBy:"J. Doe (ISSO)" },
  "RA-5":  { status:"Implemented",     statement:TEMPLATES["RA-5"], evidence:["ACAS-Schedule.pdf","Scan-Report-Mar2025.pdf"], poam:null, stigLinks:[], lastUpdated:"2025-03-22", updatedBy:"J. Doe (ISSO)" },
  "SC-7":  { status:"Implemented",     statement:TEMPLATES["SC-7"], evidence:["Firewall-Rules.pdf","Network-Diagram.vsdx"], poam:null, stigLinks:[], lastUpdated:"2025-03-19", updatedBy:"J. Doe (ISSO)" },
  "SC-13": { status:"Not Implemented", statement:"", evidence:[], poam:"POAM-019", stigLinks:["V-254239"], lastUpdated:"2025-03-10", updatedBy:"J. Doe (ISSO)" },
  "SC-28": { status:"Partial",         statement:"Data at rest encryption is implemented for databases using TDE and for workstations using BitLocker. Server EBS volumes are not yet encrypted.", evidence:["BitLocker-Policy.pdf"], poam:"POAM-020", stigLinks:[], lastUpdated:"2025-03-21", updatedBy:"J. Doe (ISSO)" },
  "SI-2":  { status:"Implemented",     statement:"Flaw remediation is managed through ACAS vulnerability scanning and WSUS/SCCM for patch management. Critical patches are applied within 30 days; High within 90 days. Patch compliance is reviewed by the ISSO weekly.", evidence:["Patch-Compliance-Report.xlsx"], poam:null, stigLinks:[], lastUpdated:"2025-03-20", updatedBy:"J. Doe (ISSO)" },
  "SI-3":  { status:"Implemented",     statement:TEMPLATES["SI-3"], evidence:["HBSS-Config.pdf","ENS-Policy.pdf"], poam:null, stigLinks:[], lastUpdated:"2025-03-18", updatedBy:"J. Doe (ISSO)" },
};

// ─── Colors ───────────────────────────────────────────────────────────────────
const mono = { fontFamily:"'Courier New', monospace" };

const Badge = ({ label, color, bg }) => (
  <span style={{ ...mono, background:bg||`${color}14`, color, border:`1px solid ${color}40`, borderRadius:3, padding:"2px 7px", fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>{label}</span>
);

// ─── Family Progress Bar ──────────────────────────────────────────────────────
const FamilyProgress = ({ family, assessments, isSelected, onClick }) => {
  const controls = family.controls;
  const assessed = controls.filter(c => assessments[c.id]?.status && assessments[c.id].status !== "Not Assessed");
  const implemented = controls.filter(c => {
    const s = assessments[c.id]?.status;
    return s === "Implemented" || s === "Inherited" || s === "Not Applicable";
  });
  const hasPoam = controls.some(c => assessments[c.id]?.poam);
  const pct = Math.round((implemented.length / controls.length) * 100);
  const color = pct >= 80 ? "#00CC88" : pct >= 50 ? "#00D4AA" : pct >= 30 ? "#FF8C00" : "#FF4444";

  return (
    <div onClick={onClick} style={{ padding:"10px 14px", borderBottom:`1px solid #0A1828`, cursor:"pointer", background: isSelected?"rgba(26,90,140,0.2)":"transparent", borderLeft: isSelected?`3px solid ${"#00D4AA"}`:"3px solid transparent" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ ...mono, fontWeight:700, fontSize:12, color:"#00D4AA" }}>{family.id}</span>
          {hasPoam && <span style={{ ...mono, fontSize:11, color:"#FF4444" }}>◉ POAM</span>}
        </div>
        <span style={{ ...mono, fontSize:11, fontWeight:700, color }}>{pct}%</span>
      </div>
      <div style={{ fontSize:10, color:"#7A9AB8", marginBottom:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{family.name}</div>
      <div style={{ height:4, background:C.input, borderRadius:2, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:2, transition:"width 0.6s ease" }} />
      </div>
      <div style={{ ...mono, fontSize:10, color:"#3A5570", marginTop:4 }}>{assessed.length}/{controls.length} assessed · {implemented.length} compliant</div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SelfAssessment() {
  const C = useColors();
  const [assessments, setAssessments] = useState(INITIAL_ASSESSMENTS);
  const [selectedFamily, setSelectedFamily] = useState("AC");
  const [selectedControl, setSelectedControl] = useState("AC-2");
  const [activeTab, setActiveTab] = useState("statement");
  const [editStatement, setEditStatement] = useState(false);
  const [draftStatement, setDraftStatement] = useState("");
  const [view, setView] = useState("assessment"); // assessment | poam | summary

  const family = CONTROL_FAMILIES.find(f => f.id === selectedFamily);
  const control = family?.controls.find(c => c.id === selectedControl);
  const assessment = assessments[selectedControl] || { status:"Not Assessed", statement:"", evidence:[], poam:null, stigLinks:[] };

  // Overall stats
  const allControls = CONTROL_FAMILIES.flatMap(f => f.controls);
  const stats = useMemo(() => {
    const counts = { Implemented:0, Partial:0, "Not Implemented":0, "Not Applicable":0, Inherited:0, Planned:0, "Not Assessed":0 };
    allControls.forEach(c => {
      const s = assessments[c.id]?.status || "Not Assessed";
      counts[s] = (counts[s] || 0) + 1;
    });
    const compliant = (counts.Implemented + counts.Inherited + counts["Not Applicable"]);
    const total = allControls.length;
    const score = Math.round((compliant / total) * 100);
    const poams = allControls.filter(c => assessments[c.id]?.poam).length;
    return { ...counts, score, total, compliant, poams };
  }, [assessments, allControls]);

  const updateStatus = (controlId, status) => {
    setAssessments(prev => {
      const current = prev[controlId] || {};
      const needsPoam = ["Not Implemented","Partial","Planned"].includes(status) && !current.poam;
      return {
        ...prev,
        [controlId]: {
          ...current,
          status,
          poam: needsPoam ? `POAM-${Date.now().toString().slice(-4)}` : current.poam,
          lastUpdated: new Date().toISOString().split("T")[0],
          updatedBy: "Current User (ISSO)",
        }
      };
    });
  };

  const saveStatement = () => {
    setAssessments(prev => ({
      ...prev,
      [selectedControl]: { ...(prev[selectedControl]||{}), statement:draftStatement, lastUpdated: new Date().toISOString().split("T")[0] }
    }));
    setEditStatement(false);
  };

  const autoPoams = allControls.filter(c => assessments[c.id]?.poam).map(c => ({
    control_id: c.id,
    title: c.title,
    status: assessments[c.id].status,
    cat: c.cat,
    poam_id: assessments[c.id].poam,
    family: CONTROL_FAMILIES.find(f=>f.controls.some(ct=>ct.id===c.id))?.id,
  }));

  const scoreColor = stats.score >= 80 ? C.green : stats.score >= 60 ? C.teal : stats.score >= 40 ? C.orange : C.red;
  const circ = 2*Math.PI*30;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Helvetica Neue', Arial, sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`* { box-sizing:border-box; margin:0; padding:0; } ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:#050D15; } ::-webkit-scrollbar-thumb { background:#1A3A5C; } .ctrl-row:hover { background:rgba(26,90,140,0.14) !important; cursor:pointer; } .btn-ghost:hover { opacity:0.8; }`}</style>

      {/* Header */}
      <div style={{ background:C.headerBg, borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:30, height:30, background:`linear-gradient(135deg, ${C.teal}, ${C.blue})`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:14, fontWeight:900, color:C.panelAlt }}>S</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.white }}>SentinelGRC — Self-Assessment</div>
            <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8 }}>NIST SP 800-53 REV 5 · SAV PREPARATION · CSRMC PHASE 3</div>
          </div>
          <div style={{ width:1, height:24, background:C.border, margin:"0 8px" }} />
          {["assessment","poam","summary"].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ background:view===v?"rgba(0,212,170,0.08)":"none", border:`1px solid ${view===v?"rgba(0,212,170,0.3)":"transparent"}`, color:view===v?C.teal:C.textMute, borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:11, fontWeight:view===v?600:400, textTransform:"capitalize" }}>{v==="poam"?"POAM Queue":v==="assessment"?"Control Assessment":v}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {/* Score gauge */}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <svg width="66" height="66" viewBox="0 0 66 66">
              <circle cx="33" cy="33" r="30" fill="none" stroke={C.borderMd} strokeWidth="6" />
              <circle cx="33" cy="33" r="30" fill="none" stroke={scoreColor} strokeWidth="6"
                strokeDasharray={circ} strokeDashoffset={circ - (stats.score/100)*circ}
                strokeLinecap="round" transform="rotate(-90 33 33)" />
              <text x="33" y="37" textAnchor="middle" fill={scoreColor} fontSize="13" fontWeight="800" fontFamily="monospace">{stats.score}%</text>
            </svg>
            <div>
              <div style={{ ...mono, fontSize:11, color:scoreColor, fontWeight:700 }}>ATO POSTURE</div>
              <div style={{ ...mono, fontSize:10, color:C.textMute }}>{stats.compliant}/{stats.total} controls</div>
              <div style={{ ...mono, fontSize:10, color:C.red }}>{stats.poams} open POAMs</div>
            </div>
          </div>
          <button style={{ ...mono, background:C.teal, border:"none", color:C.headerBg, borderRadius:5, padding:"7px 14px", cursor:"pointer", fontSize:10, fontWeight:700 }}>↓ EXPORT SSP + POAM</button>
        </div>
      </div>

      {/* Status strip */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, padding:"6px 20px", gap:16, background:C.rowA }}>
        {Object.entries(IMPL_STATUS).map(([key, s]) => {
          const count = allControls.filter(c => (assessments[c.id]?.status || "Not Assessed") === key).length;
          return (
            <div key={key} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:s.color }} />
              <span style={{ ...mono, fontSize:11, color:s.color }}>{count}</span>
              <span style={{ ...mono, fontSize:11, color:C.textMute }}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {view === "poam" ? (
        /* POAM Queue */
        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:16 }}>
            AUTO-GENERATED POAM ENTRIES — {autoPoams.length} ITEMS FROM CONTROL GAPS
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"80px 80px 1fr 120px 100px 80px", gap:0, padding:"6px 12px", borderBottom:`1px solid ${C.border}` }}>
            {["POAM ID","CONTROL","WEAKNESS","FAMILY","STATUS","CAT"].map(h => (
              <div key={h} style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8 }}>{h}</div>
            ))}
          </div>
          {autoPoams.map((p,i) => (
            <div key={p.poam_id} style={{ display:"grid", gridTemplateColumns:"80px 80px 1fr 120px 100px 80px", gap:0, padding:"10px 12px", borderBottom:`1px solid #0A1828`, background:i%2===0?"transparent":"rgba(10,24,40,0.4)" }}>
              <div style={{ ...mono, fontSize:10, color:C.teal }}>{p.poam_id}</div>
              <div style={{ ...mono, fontWeight:700, fontSize:11, color:CAT_COLOR[p.cat] }}>{p.control_id}</div>
              <div style={{ fontSize:11, color:C.textDim }}>{p.title}</div>
              <div style={{ ...mono, fontSize:10, color:C.textMute }}>{p.family}</div>
              <Badge label={p.status} color={IMPL_STATUS[p.status]?.color||"#888"} bg={IMPL_STATUS[p.status]?.bg} />
              <div>
                <span style={{ ...mono, fontSize:10, color:CAT_COLOR[p.cat], fontWeight:700 }}>CAT {p.cat}</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop:16, display:"flex", gap:10 }}>
            <button style={{ ...mono, background:C.teal, border:"none", color:C.headerBg, borderRadius:5, padding:"8px 18px", cursor:"pointer", fontSize:11, fontWeight:700 }}>↓ EXPORT eMASS-COMPATIBLE POAM</button>
            <button style={{ ...mono, background:"transparent", border:`1px solid ${C.border}`, color:C.textDim, borderRadius:5, padding:"8px 14px", cursor:"pointer", fontSize:11 }}>+ ADD MANUAL ENTRY</button>
          </div>
        </div>

      ) : view === "summary" ? (
        /* Summary View */
        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:16 }}>ASSESSMENT SUMMARY — SAV READINESS</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14, maxWidth:800, marginBottom:24 }}>
            {CONTROL_FAMILIES.map(f => {
              const impl = f.controls.filter(c => ["Implemented","Inherited","Not Applicable"].includes(assessments[c.id]?.status)).length;
              const pct = Math.round((impl/f.controls.length)*100);
              const color = pct>=80?C.green:pct>=60?C.teal:pct>=40?C.orange:C.red;
              const hasGap = f.controls.some(c => ["Not Implemented","Planned"].includes(assessments[c.id]?.status));
              return (
                <div key={f.id} style={{ background:C.panel, border:`1px solid ${hasGap?"rgba(255,68,68,0.2)":C.border}`, borderRadius:8, padding:"14px 16px", cursor:"pointer" }} onClick={()=>{setSelectedFamily(f.id);setView("assessment");}}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <div>
                      <span style={{ ...mono, fontWeight:700, fontSize:13, color:C.teal }}>{f.id}</span>
                      <span style={{ fontSize:11, color:C.textDim, marginLeft:8 }}>{f.name}</span>
                    </div>
                    <span style={{ ...mono, fontSize:14, fontWeight:800, color }}>{pct}%</span>
                  </div>
                  <div style={{ height:5, background:C.input, borderRadius:3, marginBottom:6, overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:3 }} />
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <span style={{ ...mono, fontSize:11, color:C.green }}>{impl} compliant</span>
                    <span style={{ ...mono, fontSize:11, color:C.red }}>{f.controls.length-impl} gaps</span>
                    {hasGap && <span style={{ ...mono, fontSize:11, color:C.red }}>⚠ POAM REQUIRED</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      ) : (
        /* Main Assessment View: 3-column layout */
        <div style={{ flex:1, display:"flex", overflow:"hidden", height:"calc(100vh - 107px)" }}>

          {/* Col 1: Family list */}
          <div style={{ width:200, borderRight:`1px solid ${C.border}`, overflowY:"auto", background:C.panelAlt }}>
            <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:1 }}>CONTROL FAMILIES</div>
            </div>
            {CONTROL_FAMILIES.map(f => (
              <FamilyProgress key={f.id} family={f} assessments={assessments}
                isSelected={selectedFamily===f.id}
                onClick={() => { setSelectedFamily(f.id); setSelectedControl(f.controls[0].id); setEditStatement(false); }} />
            ))}
          </div>

          {/* Col 2: Control list */}
          <div style={{ width:260, borderRight:`1px solid ${C.border}`, overflowY:"auto", background:C.panelAlt }}>
            <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ ...mono, fontSize:10, fontWeight:700, color:C.teal }}>{family?.id} — {family?.name}</div>
            </div>
            {family?.controls.map(c => {
              const a = assessments[c.id];
              const s = IMPL_STATUS[a?.status || "Not Assessed"];
              const isSelected = selectedControl === c.id;
              return (
                <div key={c.id} className="ctrl-row" onClick={() => { setSelectedControl(c.id); setEditStatement(false); }}
                  style={{ padding:"10px 14px", borderBottom:`1px solid #0A1828`, background: isSelected?"rgba(26,90,140,0.2)":"transparent", borderLeft: isSelected?`3px solid ${C.teal}`:"3px solid transparent" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ ...mono, fontWeight:700, fontSize:11, color: isSelected?C.teal:CAT_COLOR[c.cat]||C.textDim }}>{c.id}</span>
                    <div style={{ display:"flex", gap:4 }}>
                      {a?.poam && <span style={{ ...mono, fontSize:10, color:C.red }}>POAM</span>}
                      <span style={{ width:8, height:8, borderRadius:"50%", background:s.color, display:"inline-block", marginTop:2 }} />
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:C.textDim, lineHeight:1.4 }}>{c.title}</div>
                  {a?.status && a.status !== "Not Assessed" && (
                    <div style={{ ...mono, fontSize:10, color:s.color, marginTop:4 }}>{s.label}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Col 3: Control detail */}
          <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
            {control ? (
              <>
                {/* Control header */}
                <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, background:C.rowA, position:"sticky", top:0, zIndex:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                        <span style={{ ...mono, fontWeight:700, fontSize:16, color:C.teal }}>{control.id}</span>
                        <Badge label={`CAT ${control.cat}`} color={CAT_COLOR[control.cat]||"#888"} />
                        {control.inheritable && <Badge label="INHERITABLE" color={C.blue} />}
                        {assessment.poam && <Badge label={assessment.poam} color={C.red} />}
                      </div>
                      <div style={{ fontSize:14, color:C.white, fontWeight:500, marginBottom:6 }}>{control.title}</div>
                      <div style={{ fontSize:11, color:C.textDim, lineHeight:1.6, maxWidth:600 }}>{control.req}</div>
                    </div>
                    {/* Status selector */}
                    <div style={{ display:"flex", flexDirection:"column", gap:4, minWidth:180 }}>
                      <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:1 }}>IMPLEMENTATION STATUS</div>
                      <select value={assessment.status || "Not Assessed"} onChange={e => updateStatus(selectedControl, e.target.value)}
                        style={{ background:C.input, border:`1px solid ${IMPL_STATUS[assessment.status||"Not Assessed"]?.color||C.border}`, color:IMPL_STATUS[assessment.status||"Not Assessed"]?.color||C.textDim, borderRadius:5, padding:"6px 10px", ...mono, fontSize:11, cursor:"pointer", outline:"none" }}>
                        {Object.entries(IMPL_STATUS).map(([k,s]) => (
                          <option key={k} value={k}>{s.label}</option>
                        ))}
                      </select>
                      {assessment.lastUpdated && (
                        <div style={{ ...mono, fontSize:10, color:C.textMute }}>Updated {assessment.lastUpdated} by {assessment.updatedBy}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, padding:"0 20px", background:C.rowA }}>
                  {["statement","evidence","stigs","ai_analysis"].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                      style={{ ...mono, background:"none", border:"none", borderBottom:`2px solid ${activeTab===t?C.teal:"transparent"}`, color:activeTab===t?C.teal:C.textMute, padding:"10px 14px", cursor:"pointer", fontSize:10, fontWeight:activeTab===t?700:400, letterSpacing:0.5, textTransform:"uppercase" }}>
                      {t==="ai_analysis"?"AI Assist":t==="stigs"?"STIG Links":t}
                    </button>
                  ))}
                </div>

                <div style={{ padding:20, flex:1 }}>

                  {activeTab === "statement" && (
                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                        <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1 }}>IMPLEMENTATION STATEMENT</div>
                        <div style={{ display:"flex", gap:8 }}>
                          {!editStatement ? (
                            <>
                              <button className="btn-ghost" onClick={() => { setDraftStatement(assessment.statement || TEMPLATES[selectedControl] || ""); setEditStatement(true); }}
                                style={{ ...mono, background:"rgba(26,122,255,0.08)", border:`1px solid rgba(26,122,255,0.25)`, color:C.blue, borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:10 }}>
                                {assessment.statement ? "✏ Edit" : "+ Add Statement"}
                              </button>
                              {!assessment.statement && TEMPLATES[selectedControl] && (
                                <button className="btn-ghost" onClick={() => { setDraftStatement(TEMPLATES[selectedControl]); setEditStatement(true); }}
                                  style={{ ...mono, background:"rgba(0,212,170,0.08)", border:`1px solid rgba(0,212,170,0.2)`, color:C.teal, borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:10 }}>
                                  ⚡ Use Template
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button className="btn-ghost" onClick={saveStatement}
                                style={{ ...mono, background:C.teal, border:"none", color:C.headerBg, borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:10, fontWeight:700 }}>
                                ✓ Save
                              </button>
                              <button className="btn-ghost" onClick={() => setEditStatement(false)}
                                style={{ ...mono, background:"transparent", border:`1px solid ${C.border}`, color:C.textMute, borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:10 }}>
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {editStatement ? (
                        <textarea value={draftStatement} onChange={e => setDraftStatement(e.target.value)}
                          style={{ width:"100%", minHeight:160, background:C.input, border:`1px solid ${C.teal}`, borderRadius:6, color:C.text, padding:14, fontSize:12, lineHeight:1.7, resize:"vertical", outline:"none", fontFamily:"inherit" }}
                          placeholder="Describe how this control is implemented, who is responsible, what tools/systems are used, and where additional documentation exists..." />
                      ) : assessment.statement ? (
                        <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:16 }}>
                          <p style={{ fontSize:12, color:C.textDim, lineHeight:1.8, whiteSpace:"pre-wrap" }}>{assessment.statement}</p>
                        </div>
                      ) : (
                        <div style={{ background:"rgba(255,68,68,0.05)", border:`1px dashed rgba(255,68,68,0.3)`, borderRadius:8, padding:20, textAlign:"center" }}>
                          <div style={{ fontSize:20, marginBottom:8 }}>📝</div>
                          <div style={{ ...mono, fontSize:11, color:C.red, marginBottom:4 }}>No implementation statement</div>
                          <div style={{ fontSize:11, color:C.textMute }}>An implementation statement is required for ATO. Click "Add Statement" or use a template.</div>
                        </div>
                      )}

                      {/* Status warning */}
                      {(assessment.status === "Not Implemented" || assessment.status === "Planned") && (
                        <div style={{ marginTop:12, background:"rgba(255,68,68,0.07)", border:`1px solid rgba(255,68,68,0.25)`, borderRadius:6, padding:"10px 14px", display:"flex", gap:10, alignItems:"flex-start" }}>
                          <span>⚠️</span>
                          <div>
                            <div style={{ ...mono, fontSize:10, fontWeight:700, color:C.red, marginBottom:3 }}>POAM REQUIRED</div>
                            <div style={{ fontSize:11, color:C.textDim }}>This control is {assessment.status.toLowerCase()}. A POAM entry ({assessment.poam}) has been auto-generated. Provide a milestone description and scheduled completion date in the POAM Queue.</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "evidence" && (
                    <div>
                      <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:12 }}>EVIDENCE ATTACHED TO THIS CONTROL</div>
                      {assessment.evidence?.length > 0 ? assessment.evidence.map((ev,i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:C.panel, border:`1px solid ${C.border}`, borderRadius:6, marginBottom:8 }}>
                          <span style={{ fontSize:18 }}>📄</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, color:C.white }}>{ev}</div>
                            <div style={{ ...mono, fontSize:11, color:C.textMute }}>Uploaded 2025-03-20 · Expires 2026-03-20</div>
                          </div>
                          <button style={{ ...mono, background:"transparent", border:`1px solid ${C.border}`, color:C.textMute, borderRadius:4, padding:"4px 10px", cursor:"pointer", fontSize:11 }}>↓ View</button>
                        </div>
                      )) : (
                        <div style={{ textAlign:"center", padding:30, color:C.textMute }}>
                          <div style={{ fontSize:24, marginBottom:8 }}>📎</div>
                          <div style={{ fontSize:12 }}>No evidence attached. Upload screenshots, scan results, or configuration exports.</div>
                        </div>
                      )}
                      <button style={{ ...mono, background:"rgba(26,122,255,0.08)", border:`1px solid rgba(26,122,255,0.25)`, color:C.blue, borderRadius:5, padding:"8px 16px", cursor:"pointer", fontSize:11, marginTop:8 }}>+ Upload Evidence</button>
                    </div>
                  )}

                  {activeTab === "stigs" && (
                    <div>
                      <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:12 }}>LINKED STIG / SCAP FINDINGS</div>
                      {assessment.stigLinks?.length > 0 ? assessment.stigLinks.map(s => (
                        <div key={s} style={{ padding:"10px 14px", background:C.panel, border:`1px solid rgba(255,140,0,0.3)`, borderRadius:6, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div>
                            <span style={{ ...mono, fontWeight:700, color:C.orange, fontSize:12 }}>{s}</span>
                            <div style={{ fontSize:11, color:C.textDim, marginTop:3 }}>STIG finding — verify remediation and update POAM status</div>
                          </div>
                          <Badge label="CAT II OPEN" color={C.orange} />
                        </div>
                      )) : (
                        <div style={{ fontSize:12, color:C.textMute, padding:20, textAlign:"center" }}>No STIG findings linked. Import STIG/SCAP results to auto-populate.</div>
                      )}
                      <button style={{ ...mono, background:"rgba(0,212,170,0.08)", border:`1px solid rgba(0,212,170,0.2)`, color:C.teal, borderRadius:5, padding:"8px 16px", cursor:"pointer", fontSize:11, marginTop:8 }}>↓ Import STIG/SCAP Results</button>
                    </div>
                  )}

                  {activeTab === "ai_analysis" && (
                    <div>
                      <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:12 }}>AI-ASSISTED STATEMENT GENERATION</div>
                      <div style={{ background:"rgba(0,212,170,0.05)", border:`1px solid rgba(0,212,170,0.2)`, borderRadius:8, padding:16, marginBottom:14 }}>
                        <div style={{ fontSize:12, color:C.textDim, lineHeight:1.7 }}>
                          Claude AI (IL4/IL5 authorized via AWS Bedrock GovCloud) can help you:
                        </div>
                        <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:8 }}>
                          {["Draft an implementation statement based on your system description","Identify gaps between your current statement and assessment objectives","Suggest evidence you should collect to support this control","Map this control to CMMC 2.0 and 800-171 requirements"].map((item,i) => (
                            <div key={i} style={{ display:"flex", gap:8 }}>
                              <span style={{ color:C.teal, fontSize:10 }}>✓</span>
                              <span style={{ fontSize:11, color:C.textDim }}>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button style={{ ...mono, background:C.teal, border:"none", color:C.headerBg, borderRadius:5, padding:"10px 20px", cursor:"pointer", fontSize:11, fontWeight:700, width:"100%" }}>
                        ⚡ Generate Statement with AI (Bedrock Claude)
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:C.textMute }}>Select a control</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
