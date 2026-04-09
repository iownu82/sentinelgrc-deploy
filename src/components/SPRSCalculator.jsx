import { useState, useMemo, useCallback, useEffect } from "react";
import { loadSprsAssessment, saveSprsAssessment } from "../supabase.js";
import { useAuth } from "./Auth.jsx";
import { useColors, useTheme } from "../theme.js";

const C = { bg:"var(--rr-bg)", panel:"var(--rr-panel)", panelAlt:"var(--rr-panel-alt)", panel2:"var(--rr-panel-alt)", border:"var(--rr-border)", borderMd:"var(--rr-border-md)", text:"var(--rr-text)", textDim:"var(--rr-text-dim)", dim:"var(--rr-text-dim)", textMute:"var(--rr-mute)", mute:"var(--rr-mute)", white:"var(--rr-white)", input:"var(--rr-input)", inputBorder:"var(--rr-input-bdr)", rowA:"var(--rr-row-a)", rowB:"var(--rr-row-b)", scroll:"var(--rr-scroll)", headerBg:"var(--rr-header)", teal:"var(--rr-teal)", blue:"var(--rr-blue)", red:"var(--rr-red)", orange:"var(--rr-orange)", gold:"var(--rr-gold)", green:"var(--rr-green)", purple:"var(--rr-purple)" };

// ── NIST SP 800-171 Rev 2 — 110 practices with SPRS point values ──────────
// DoD Assessment Methodology v1.2.1 — total = 110 practices, max deduction = 203 points
// Starting score: 110, deductions per practice not met
// Final SPRS score = 110 - sum(deductions for not-met practices)
const NIST_171_PRACTICES = [
  // 3.1 ACCESS CONTROL (22 practices)
  { id:"3.1.1",  family:"AC", title:"Limit system access to authorized users",                         pts:1, cmmc:"L1", baseline:true  },
  { id:"3.1.2",  family:"AC", title:"Limit system access to authorized transactions and functions",    pts:1, cmmc:"L1", baseline:true  },
  { id:"3.1.3",  family:"AC", title:"Control CUI flow in accordance with approved authorizations",     pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.4",  family:"AC", title:"Separate duties of individuals to reduce risk of malfeasance",    pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.5",  family:"AC", title:"Employ least privilege",                                          pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.6",  family:"AC", title:"Use non-privileged accounts for non-security functions",          pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.7",  family:"AC", title:"Prevent non-privileged users from executing privileged functions",pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.8",  family:"AC", title:"Limit unsuccessful logon attempts",                               pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.9",  family:"AC", title:"Provide privacy and security notices",                            pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.10", family:"AC", title:"Use session lock with pattern-hiding after period of inactivity", pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.11", family:"AC", title:"Terminate sessions after defined conditions",                     pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.12", family:"AC", title:"Monitor and control remote access sessions",                      pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.13", family:"AC", title:"Employ cryptographic mechanisms to protect remote access",        pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.14", family:"AC", title:"Route remote access via managed access control points",           pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.15", family:"AC", title:"Authorize remote execution of privileged commands via remote access",pts:1,cmmc:"L2",baseline:false},
  { id:"3.1.16", family:"AC", title:"Authorize wireless access prior to allowing connections",         pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.17", family:"AC", title:"Protect wireless access using authentication and encryption",     pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.18", family:"AC", title:"Control connection of mobile devices",                            pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.19", family:"AC", title:"Encrypt CUI on mobile devices and mobile computing platforms",    pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.20", family:"AC", title:"Verify and control connections to external systems",              pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.21", family:"AC", title:"Limit use of portable storage devices on external systems",       pts:1, cmmc:"L2", baseline:false },
  { id:"3.1.22", family:"AC", title:"Control CUI posted or processed on publicly accessible systems",  pts:1, cmmc:"L2", baseline:false },
  // 3.2 AWARENESS AND TRAINING (3 practices)
  { id:"3.2.1",  family:"AT", title:"Ensure personnel are aware of security risks",                    pts:1, cmmc:"L2", baseline:false },
  { id:"3.2.2",  family:"AT", title:"Ensure personnel are trained to carry out assigned responsibilities",pts:1,cmmc:"L2",baseline:false},
  { id:"3.2.3",  family:"AT", title:"Provide security awareness training on recognizing threats",       pts:1, cmmc:"L2", baseline:false },
  // 3.3 AUDIT AND ACCOUNTABILITY (9 practices)
  { id:"3.3.1",  family:"AU", title:"Create and retain system audit logs",                             pts:1, cmmc:"L2", baseline:false },
  { id:"3.3.2",  family:"AU", title:"Ensure actions of users can be traced",                           pts:1, cmmc:"L2", baseline:false },
  { id:"3.3.3",  family:"AU", title:"Review and update logged events",                                 pts:1, cmmc:"L2", baseline:false },
  { id:"3.3.4",  family:"AU", title:"Alert in event of audit logging process failure",                 pts:1, cmmc:"L2", baseline:false },
  { id:"3.3.5",  family:"AU", title:"Correlate audit record review, analysis, and reporting processes",pts:1, cmmc:"L2", baseline:false },
  { id:"3.3.6",  family:"AU", title:"Provide audit record reduction and report generation",            pts:1, cmmc:"L2", baseline:false },
  { id:"3.3.7",  family:"AU", title:"Provide system capability that compares and synchronizes clocks", pts:1, cmmc:"L2", baseline:false },
  { id:"3.3.8",  family:"AU", title:"Protect audit information and tools from unauthorized access",    pts:1, cmmc:"L2", baseline:false },
  { id:"3.3.9",  family:"AU", title:"Limit management of audit logging to subset of privileged users", pts:1, cmmc:"L2", baseline:false },
  // 3.4 CONFIGURATION MANAGEMENT (9 practices)
  { id:"3.4.1",  family:"CM", title:"Establish and maintain baseline configurations",                  pts:1, cmmc:"L2", baseline:false },
  { id:"3.4.2",  family:"CM", title:"Establish and enforce security configuration settings",           pts:1, cmmc:"L2", baseline:false },
  { id:"3.4.3",  family:"CM", title:"Track, review, approve, and log changes to systems",             pts:1, cmmc:"L2", baseline:false },
  { id:"3.4.4",  family:"CM", title:"Analyze security impact of changes prior to implementation",      pts:1, cmmc:"L2", baseline:false },
  { id:"3.4.5",  family:"CM", title:"Define, document, approve, and enforce physical access restrictions",pts:1,cmmc:"L2",baseline:false},
  { id:"3.4.6",  family:"CM", title:"Employ principle of least functionality",                         pts:1, cmmc:"L2", baseline:false },
  { id:"3.4.7",  family:"CM", title:"Restrict, disable, or prevent use of nonessential programs",     pts:1, cmmc:"L2", baseline:false },
  { id:"3.4.8",  family:"CM", title:"Apply deny-by-exception policy to prevent use of unauthorized software",pts:1,cmmc:"L2",baseline:false},
  { id:"3.4.9",  family:"CM", title:"Control and monitor user-installed software",                     pts:1, cmmc:"L2", baseline:false },
  // 3.5 IDENTIFICATION AND AUTHENTICATION (11 practices)
  { id:"3.5.1",  family:"IA", title:"Identify system users, processes, and devices",                   pts:1, cmmc:"L1", baseline:true  },
  { id:"3.5.2",  family:"IA", title:"Authenticate identities before allowing access",                  pts:1, cmmc:"L1", baseline:true  },
  { id:"3.5.3",  family:"IA", title:"Use multifactor authentication for local and network access",     pts:5, cmmc:"L2", baseline:false },
  { id:"3.5.4",  family:"IA", title:"Employ replay-resistant authentication mechanisms",               pts:1, cmmc:"L2", baseline:false },
  { id:"3.5.5",  family:"IA", title:"Employ identifier management",                                    pts:1, cmmc:"L2", baseline:false },
  { id:"3.5.6",  family:"IA", title:"Employ authenticator management",                                 pts:1, cmmc:"L2", baseline:false },
  { id:"3.5.7",  family:"IA", title:"Enforce minimum password complexity and change requirements",     pts:1, cmmc:"L2", baseline:false },
  { id:"3.5.8",  family:"IA", title:"Prohibit password reuse for specified number of generations",     pts:1, cmmc:"L2", baseline:false },
  { id:"3.5.9",  family:"IA", title:"Allow temporary password use with immediate change requirement",  pts:1, cmmc:"L2", baseline:false },
  { id:"3.5.10", family:"IA", title:"Store and transmit only cryptographically protected passwords",   pts:1, cmmc:"L2", baseline:false },
  { id:"3.5.11", family:"IA", title:"Obscure feedback of authentication information",                  pts:1, cmmc:"L2", baseline:false },
  // 3.6 INCIDENT RESPONSE (3 practices)
  { id:"3.6.1",  family:"IR", title:"Establish operational incident response capability",              pts:1, cmmc:"L2", baseline:false },
  { id:"3.6.2",  family:"IR", title:"Track, document, and report incidents to appropriate officials",  pts:1, cmmc:"L2", baseline:false },
  { id:"3.6.3",  family:"IR", title:"Test incident response capability",                               pts:1, cmmc:"L2", baseline:false },
  // 3.7 MAINTENANCE (6 practices)
  { id:"3.7.1",  family:"MA", title:"Perform maintenance on organizational systems",                   pts:1, cmmc:"L2", baseline:false },
  { id:"3.7.2",  family:"MA", title:"Provide controls on tools, techniques, and personnel for maintenance",pts:1,cmmc:"L2",baseline:false},
  { id:"3.7.3",  family:"MA", title:"Ensure equipment removed for maintenance is sanitized",           pts:1, cmmc:"L2", baseline:false },
  { id:"3.7.4",  family:"MA", title:"Check media containing diagnostic programs for malicious code",   pts:1, cmmc:"L2", baseline:false },
  { id:"3.7.5",  family:"MA", title:"Require MFA for remote maintenance sessions",                     pts:3, cmmc:"L2", baseline:false },
  { id:"3.7.6",  family:"MA", title:"Supervise maintenance activities of personnel without required access",pts:1,cmmc:"L2",baseline:false},
  // 3.8 MEDIA PROTECTION (9 practices)
  { id:"3.8.1",  family:"MP", title:"Protect system media containing CUI",                             pts:1, cmmc:"L1", baseline:true  },
  { id:"3.8.2",  family:"MP", title:"Limit access to CUI on system media to authorized users",         pts:1, cmmc:"L1", baseline:true  },
  { id:"3.8.3",  family:"MP", title:"Sanitize or destroy system media before disposal or reuse",       pts:1, cmmc:"L1", baseline:true  },
  { id:"3.8.4",  family:"MP", title:"Mark media with necessary CUI markings and distribution limitations",pts:1,cmmc:"L2",baseline:false},
  { id:"3.8.5",  family:"MP", title:"Control access to media containing CUI",                          pts:1, cmmc:"L2", baseline:false },
  { id:"3.8.6",  family:"MP", title:"Implement cryptographic mechanisms to protect CUI during transport",pts:1,cmmc:"L2",baseline:false},
  { id:"3.8.7",  family:"MP", title:"Control use of removable media on system components",             pts:1, cmmc:"L2", baseline:false },
  { id:"3.8.8",  family:"MP", title:"Prohibit use of portable storage without identifiable owner",     pts:1, cmmc:"L2", baseline:false },
  { id:"3.8.9",  family:"MP", title:"Protect backups of CUI",                                          pts:1, cmmc:"L2", baseline:false },
  // 3.9 PERSONNEL SECURITY (2 practices)
  { id:"3.9.1",  family:"PS", title:"Screen individuals prior to authorizing access to systems",       pts:1, cmmc:"L2", baseline:false },
  { id:"3.9.2",  family:"PS", title:"Ensure CUI is protected during and after personnel actions",      pts:1, cmmc:"L2", baseline:false },
  // 3.10 PHYSICAL PROTECTION (6 practices)
  { id:"3.10.1", family:"PE", title:"Limit physical access to authorized individuals",                 pts:1, cmmc:"L1", baseline:true  },
  { id:"3.10.2", family:"PE", title:"Protect and monitor the physical facility and support infrastructure",pts:1,cmmc:"L2",baseline:false},
  { id:"3.10.3", family:"PE", title:"Escort visitors and monitor visitor activity",                    pts:1, cmmc:"L2", baseline:false },
  { id:"3.10.4", family:"PE", title:"Maintain audit logs of physical access",                          pts:1, cmmc:"L2", baseline:false },
  { id:"3.10.5", family:"PE", title:"Control and manage physical access devices",                      pts:1, cmmc:"L2", baseline:false },
  { id:"3.10.6", family:"PE", title:"Enforce safeguarding measures for CUI at alternate work sites",   pts:1, cmmc:"L2", baseline:false },
  // 3.11 RISK ASSESSMENT (3 practices)
  { id:"3.11.1", family:"RA", title:"Periodically assess risk to operations, assets, and individuals", pts:1, cmmc:"L2", baseline:false },
  { id:"3.11.2", family:"RA", title:"Scan for vulnerabilities in systems periodically",                pts:3, cmmc:"L2", baseline:false },
  { id:"3.11.3", family:"RA", title:"Remediate vulnerabilities in accordance with risk assessments",   pts:3, cmmc:"L2", baseline:false },
  // 3.12 SECURITY ASSESSMENT (4 practices)
  { id:"3.12.1", family:"CA", title:"Periodically assess security controls",                           pts:1, cmmc:"L2", baseline:false },
  { id:"3.12.2", family:"CA", title:"Develop and implement plans of action to correct deficiencies",   pts:1, cmmc:"L2", baseline:false },
  { id:"3.12.3", family:"CA", title:"Monitor security controls on an ongoing basis",                   pts:1, cmmc:"L2", baseline:false },
  { id:"3.12.4", family:"CA", title:"Develop, document, and periodically update system security plans",pts:1, cmmc:"L2", baseline:false },
  // 3.13 SYSTEM AND COMMUNICATIONS PROTECTION (16 practices)
  { id:"3.13.1", family:"SC", title:"Monitor, control, and protect communications at external boundaries",pts:1,cmmc:"L1",baseline:true },
  { id:"3.13.2", family:"SC", title:"Employ architectural designs, software development techniques",    pts:1, cmmc:"L2", baseline:false },
  { id:"3.13.3", family:"SC", title:"Separate user functionality from system management functionality", pts:1, cmmc:"L2", baseline:false },
  { id:"3.13.4", family:"SC", title:"Prevent unauthorized and unintended information transfer",        pts:1, cmmc:"L2", baseline:false },
  { id:"3.13.5", family:"SC", title:"Implement subnetworks for publicly accessible system components", pts:1, cmmc:"L1", baseline:true  },
  { id:"3.13.6", family:"SC", title:"Deny network communications traffic by default",                  pts:1, cmmc:"L2", baseline:false },
  { id:"3.13.7", family:"SC", title:"Prevent remote devices from simultaneously connecting to both system and other resources",pts:1,cmmc:"L2",baseline:false},
  { id:"3.13.8", family:"SC", title:"Implement cryptographic mechanisms to prevent unauthorized disclosure during transmission",pts:5,cmmc:"L2",baseline:false},
  { id:"3.13.9", family:"SC", title:"Terminate network connections after defined period of inactivity", pts:1, cmmc:"L2", baseline:false },
  { id:"3.13.10",family:"SC", title:"Establish and manage cryptographic keys",                         pts:1, cmmc:"L2", baseline:false },
  { id:"3.13.11",family:"SC", title:"Employ FIPS-validated cryptography",                              pts:3, cmmc:"L2", baseline:false },
  { id:"3.13.12",family:"SC", title:"Prohibit remote activation of collaborative computing devices",   pts:1, cmmc:"L2", baseline:false },
  { id:"3.13.13",family:"SC", title:"Control and monitor the use of mobile code",                      pts:1, cmmc:"L2", baseline:false },
  { id:"3.13.14",family:"SC", title:"Control and monitor the use of VoIP technologies",               pts:1, cmmc:"L2", baseline:false },
  { id:"3.13.15",family:"SC", title:"Protect the authenticity of communications sessions",             pts:1, cmmc:"L2", baseline:false },
  { id:"3.13.16",family:"SC", title:"Protect CUI at rest",                                             pts:1, cmmc:"L2", baseline:false },
  // 3.14 SYSTEM AND INFORMATION INTEGRITY (7 practices)
  { id:"3.14.1", family:"SI", title:"Identify, report, and correct system flaws in a timely manner",   pts:1, cmmc:"L1", baseline:true  },
  { id:"3.14.2", family:"SI", title:"Provide protection from malicious code at appropriate locations", pts:1, cmmc:"L1", baseline:true  },
  { id:"3.14.3", family:"SI", title:"Monitor system security alerts and advisories",                   pts:1, cmmc:"L2", baseline:false },
  { id:"3.14.4", family:"SI", title:"Update malicious code protection mechanisms",                     pts:1, cmmc:"L1", baseline:true  },
  { id:"3.14.5", family:"SI", title:"Perform periodic scans and real-time scans of files",             pts:1, cmmc:"L1", baseline:true  },
  { id:"3.14.6", family:"SI", title:"Monitor systems to detect attacks and indicators of potential attacks",pts:1,cmmc:"L2",baseline:false},
  { id:"3.14.7", family:"SI", title:"Identify unauthorized use of systems",                            pts:1, cmmc:"L2", baseline:false },
];
const MAX_SCORE = 110;
const FAMILIES = [...new Set(NIST_171_PRACTICES.map(p => p.family))];
const FAMILY_NAMES = { AC:"Access Control", AT:"Awareness & Training", AU:"Audit & Accountability", CM:"Configuration Mgmt", IA:"Identification & Auth", IR:"Incident Response", MA:"Maintenance", MP:"Media Protection", PS:"Personnel Security", PE:"Physical Protection", RA:"Risk Assessment", CA:"Security Assessment", SC:"System & Comms Protection", SI:"System & Info Integrity" };
// Score color based on SPRS value
function scoreColor(score, C) {
  if (score >= 88)  return "#00CC88";
  if (score >= 70)  return "#88CC00";
  if (score >= 50)  return C.gold;
  if (score >= 0)   return C.orange;
  return C.red;
}
// Status labels
const STATUS_OPTS = [
  { id:"met",        label:"Met",         color:"#00CC88", icon:"✓" },
  { id:"partial",    label:"Partial",     color:"#FF8C00", icon:"◑" },
  { id:"not_met",    label:"Not Met",     color:"#FF4444", icon:"✗" },
  { id:"na",         label:"N/A",         color:"#7A9AB8", icon:"—" },
  { id:"not_assessed",label:"Not Assessed",color:"#4A6080",icon:"?" },
];
// ── CMMC Level 3 — 24 enhanced practices from NIST SP 800-172 ─────────────
// Source: CMMC 2.0 Level 3 Assessment Guide | DIBCAC assessment required
const CMMC_L3_PRACTICES = [
  { id:"AC.L3-3.1.2e",  family:"AC", title:"Employ dynamic access control approaches that can be rapidly adapted to respond to evolving threats", nist172:"3.1.2e" },
  { id:"AC.L3-3.1.3e",  family:"AC", title:"Control CUI flow using approved authorizations including additional restrictions for high-value assets", nist172:"3.1.3e" },
  { id:"AT.L3-3.2.1e",  family:"AT", title:"Provide awareness training focused on recognizing and responding to threats including social engineering and APTs", nist172:"3.2.1e" },
  { id:"AT.L3-3.2.2e",  family:"AT", title:"Train personnel on organizational policies and procedures relevant to advanced cybersecurity threats", nist172:"3.2.2e" },
  { id:"IA.L3-3.5.1e",  family:"IA", title:"Employ hardware-based MFA for accounts using FIPS-validated cryptographic modules for advanced threats", nist172:"3.5.1e" },
  { id:"IA.L3-3.5.4e",  family:"IA", title:"Employ replay-resistant authentication mechanisms for network access to privileged accounts and CUI systems", nist172:"3.5.4e" },
  { id:"IR.L3-3.6.1e",  family:"IR", title:"Establish and maintain an incident handling capability that includes coordination with external cyber threat response providers", nist172:"3.6.1e" },
  { id:"IR.L3-3.6.2e",  family:"IR", title:"Track and document incidents to ensure preservation of evidence for APT-level incident analysis and reporting", nist172:"3.6.2e" },
  { id:"RA.L3-3.11.1e", family:"RA", title:"Use threat intelligence information to assess risks including threat actors, techniques, and relevant threat events", nist172:"3.11.1e" },
  { id:"RA.L3-3.11.2e", family:"RA", title:"Assess the effectiveness of security solutions using red team exercises or APT-focused assessments", nist172:"3.11.2e" },
  { id:"RA.L3-3.11.3e", family:"RA", title:"Employ advanced automated vulnerability scanning tools including network and host-based discovery and analysis", nist172:"3.11.3e" },
  { id:"RA.L3-3.11.4e", family:"RA", title:"Conduct penetration testing periodically utilizing red team exercises to simulate APT capabilities and tactics", nist172:"3.11.4e" },
  { id:"RA.L3-3.11.5e", family:"RA", title:"Monitor cyber threat activity relevant to the organization and its systems including feeds from threat intelligence providers", nist172:"3.11.5e" },
  { id:"RA.L3-3.11.6e", family:"RA", title:"Employ cyber threat hunting to proactively search for indicators of compromise and undetected adversary activity", nist172:"3.11.6e" },
  { id:"CA.L3-3.12.1e", family:"CA", title:"Conduct security assessments at defined frequency using approved assessment procedures from SP 800-171A", nist172:"3.12.1e" },
  { id:"SC.L3-3.13.4e", family:"SC", title:"Employ physical or logical isolation techniques in organizational systems to limit lateral movement by adversaries", nist172:"3.13.4e" },
  { id:"SC.L3-3.13.6e", family:"SC", title:"Implement alternative physical or logical mechanisms to protect CUI communications from interception by APTs", nist172:"3.13.6e" },
  { id:"SI.L3-3.14.1e", family:"SI", title:"Use threat indicator information relevant to the information and systems being protected along with effective mitigations", nist172:"3.14.1e" },
  { id:"SI.L3-3.14.2e", family:"SI", title:"Implement a system capability that compares and synchronizes internal system clocks to authoritative time source continuously", nist172:"3.14.2e" },
  { id:"SI.L3-3.14.3e", family:"SI", title:"Employ advanced or automated tools and capabilities to detect, identify, and remove malicious code and indicators of compromise", nist172:"3.14.3e" },
  { id:"SI.L3-3.14.4e", family:"SI", title:"Establish and maintain a cyber threat hunting capability to detect, track, and disrupt APT-level threats in the environment", nist172:"3.14.4e" },
  { id:"SI.L3-3.14.5e", family:"SI", title:"Analyze system behavior in real-time or near real-time to detect and mitigate use of legitimate tools for malicious purposes", nist172:"3.14.5e" },
  { id:"SI.L3-3.14.6e", family:"SI", title:"Use threat intelligence to proactively identify, block, or remediate indicators of compromise from external systems and networks", nist172:"3.14.6e" },
  { id:"SI.L3-3.14.7e", family:"SI", title:"Employ deception technologies and techniques to identify and understand attacker techniques, tactics, and procedures", nist172:"3.14.7e" },
];
// ── 800-171 Rev 3 Preview — 97 requirements (not yet mandated) ─────────────
// Source: NIST SP 800-171 Rev 3 (May 2024) | DoD Class Deviation 2024-O0013 requires Rev 2
// Key changes: 110→97 (consolidation), adds Planning (PL) and Supply Chain (SR) families,
//              422 determination statements vs 320 in Rev 2
const REV3_CHANGES = [
  { type:"new_family", id:"PL", title:"Planning — New family added in Rev 3, derived from SP 800-53 PL controls" },
  { type:"new_family", id:"SR", title:"Supply Chain Risk Management — New family added in Rev 3, derived from SP 800-53 SR controls" },
  { type:"consolidated", id:"3.1.18+3.1.19", title:"Mobile device access + CUI encryption on mobile → merged into single requirement" },
  { type:"consolidated", id:"3.1.16+3.1.17", title:"Wireless access authorization + wireless protection → merged" },
  { type:"consolidated", id:"3.3.8+3.3.9",   title:"Protect audit tools + limit audit management → merged" },
  { type:"enhanced",    id:"ODP",  title:"Organization-Defined Parameters added — Rev 3 allows organizations to specify values (e.g., exact lockout thresholds)" },
  { type:"enhanced",    id:"STMTS",title:"422 determination statements in Rev 3 vs 320 in Rev 2 — more granular assessment criteria" },
  { type:"increased",   id:"SCOPES",title:"Rev 3 derives from 156 of 287 SP 800-53 Rev 5 moderate baseline controls — tighter alignment with 800-53" },
];
// ── CSRMC Tenets — RiskRadar readiness ─────────────────────────────────────
// Source: DoD CIO CSRMC announcement September 24, 2025
// Note: CSRMC has no control catalog — it's a framework construct
const CSRMC_TENETS = [
  { id:1,  name:"Automation",                    desc:"Automate risk management to drive efficiency and scale",                          aligned:true,  impl:"Automated POAM tracking, evidence expiry alerts, SPRS live scoring",       phase:"Phase 5: Operations" },
  { id:2,  name:"Critical Controls",             desc:"Adhere to identified critical controls with priority focus",                     aligned:true,  impl:"SPRS score highlights high-point practices (MFA=5pts, encryption=5pts)",   phase:"All phases" },
  { id:3,  name:"Continuous Monitoring & cATO",  desc:"Real-time visibility replacing snapshot-in-time authorizations",                aligned:true,  impl:"Evidence Tracker expiry monitoring + Network Scanner continuous checks",   phase:"Phase 5: Operations" },
  { id:4,  name:"DevSecOps",                     desc:"Integrate security into agile development and deployment pipelines",             aligned:false, impl:"Roadmap: CI/CD security gates, SBOM integration, software factory hooks",  phase:"Phase 2: Build" },
  { id:5,  name:"Cyber Survivability",            desc:"Maintain operations under cyber attack through encryption and resilience",       aligned:true,  impl:"SC/SI family templates cover encryption, resilience, and survivability",    phase:"All phases" },
  { id:6,  name:"Training",                       desc:"Role-based training ensuring cybersecurity knowledge at operational speed",     aligned:true,  impl:"AT family control templates + awareness training tracking in Evidence",     phase:"All phases" },
  { id:7,  name:"Enterprise Services & Inherit",  desc:"Share security controls and risk assessments across systems to reduce burden",  aligned:false, impl:"Roadmap: Control inheritance mapping and shared service documentation",     phase:"Phase 1: Design" },
  { id:8,  name:"Operationalization",             desc:"Near real-time risk posture visibility for operational commanders",             aligned:true,  impl:"Unified Dashboard + SPRS live score + Network Scanner findings",           phase:"Phase 5: Operations" },
  { id:9,  name:"Reciprocity",                    desc:"Accept mutual assessments to reuse security packages across programs",          aligned:false, impl:"Roadmap: ATO package import/export and assessment sharing module",         phase:"Phase 4: Onboard" },
  { id:10, name:"Threat-Informed Assessments",    desc:"Validate security through active testing against realistic adversary techniques",aligned:true, impl:"Network Scanner STIG checks + pentest finding integration in POAM",        phase:"Phase 3: Test" },
];
export default function SPRSCalculator() {
  const theme = useTheme();
  const mono = { fontFamily:"'Courier New',monospace" };
  // Each practice status
  const [statuses, setStatuses] = useState(() => {
    const init = {};
    NIST_171_PRACTICES.forEach(p => { init[p.id] = "not_assessed"; });
    return init;
  });
  const [activeFamily, setActiveFamily] = useState("AC");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showInfo, setShowInfo] = useState(false);
  const [orgName, setOrgName] = useState("[Organization Name]");
  const [systemName, setSystemName] = useState("[System Name]");
  const [assessDate, setAssessDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState("assess"); // assess | summary | submit
  const { systemId } = useAuth();
  // ── Persistence ──────────────────────────────────────────────────────
  useEffect(() => {
    loadSprsAssessment(systemId).then(saved => {
      if (saved && Object.keys(saved).length > 0) {
        setStatuses(prev => ({ ...prev, ...saved }));
      }
    });
  }, [systemId]);
  // Debounced save on status changes
  useEffect(() => {
    const timer = setTimeout(() => {
      saveSprsAssessment(statuses, { orgName, systemName, assessDate }, systemId);
    }, 1500);
    return () => clearTimeout(timer);
  }, [statuses, orgName, systemName, assessDate, systemId]);
  const setStatus = useCallback((id, status) => {
    setStatuses(prev => ({ ...prev, [id]: status }));
  }, []);
  // ── Score computation ────────────────────────────────────────────────────
  const score = useMemo(() => {
    let total = MAX_SCORE;
    let metCount = 0, partialCount = 0, notMetCount = 0, naCount = 0, notAssessedCount = 0;
    let metPts = 0, deductPts = 0;
    NIST_171_PRACTICES.forEach(p => {
      const s = statuses[p.id];
      if (s === "met") { metCount++; metPts += p.pts; }
      else if (s === "partial") { partialCount++; total -= Math.ceil(p.pts * 0.5); deductPts += Math.ceil(p.pts * 0.5); }
      else if (s === "not_met") { notMetCount++; total -= p.pts; deductPts += p.pts; }
      else if (s === "na") naCount++;
      else notAssessedCount++;
    });
    const assessed = NIST_171_PRACTICES.length - notAssessedCount;
    const pct = assessed > 0 ? Math.round((metCount / (assessed - naCount || 1)) * 100) : 0;
    return { total, metCount, partialCount, notMetCount, naCount, notAssessedCount, metPts, deductPts, pct, assessed };
  }, [statuses]);
  // Family scores
  const familyScores = useMemo(() => {
    const result = {};
    FAMILIES.forEach(fam => {
      const practices = NIST_171_PRACTICES.filter(p => p.family === fam);
      let deduct = 0, met = 0;
      practices.forEach(p => {
        const s = statuses[p.id];
        if (s === "not_met") deduct += p.pts;
        else if (s === "partial") deduct += Math.ceil(p.pts * 0.5);
        else if (s === "met") met++;
      });
      result[fam] = { deduct, met, total: practices.length };
    });
    return result;
  }, [statuses]);
  const sc = scoreColor(score.total, C);
  const visiblePractices = NIST_171_PRACTICES
    .filter(p => p.family === activeFamily)
    .filter(p => filterStatus === "ALL" || statuses[p.id] === filterStatus);
  // Quick-set all in current family
  const setAllInFamily = (status) => {
    const ids = NIST_171_PRACTICES.filter(p => p.family === activeFamily).map(p => p.id);
    setStatuses(prev => { const n={...prev}; ids.forEach(id=>n[id]=status); return n; });
  };
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Helvetica Neue',Arial,sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.scroll||C.inputBorder};border-radius:2px}`}</style>
      {/* Header */}
      <div style={{ background:C.headerBg||C.panel, borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:30, height:30, background:`linear-gradient(135deg,${C.teal},${C.blue})`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:14, fontWeight:900, color:C.bg }}>S</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.white }}>RiskRadar — SPRS Score Calculator</div>
            <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8 }}>NIST SP 800-171 Rev 2 · 110 PRACTICES · DoD ASSESSMENT METHODOLOGY v1.2.1</div>
          </div>
        </div>
        {/* Live score display */}
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8 }}>SPRS SCORE</div>
            <div style={{ ...mono, fontSize:36, fontWeight:900, color:sc, lineHeight:1 }}>{score.total}</div>
            <div style={{ ...mono, fontSize:10, color:C.textMute }}>of {MAX_SCORE} max</div>
          </div>
          <div style={{ width:64, height:64, borderRadius:"50%", background:C.panel2||C.panel, border:`3px solid ${sc}`, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
            <div style={{ ...mono, fontSize:14, fontWeight:900, color:sc }}>{score.pct}%</div>
            <div style={{ ...mono, fontSize:9, color:C.textMute }}>MET</div>
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:C.panel2||C.panel, padding:"0 20px" }}>
        {[["assess","📋 Assess Practices"],["summary","📊 Score Summary"],["submit","📤 SPRS Submission"],["l3","🎖 CMMC Level 3"],["rev3","🔮 Rev 3 Preview"],["csrmc","🛡 CSRMC"]].map(([id,label]) => (
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{ background:"none", border:"none", borderBottom:`2px solid ${activeTab===id?C.teal:"transparent"}`, color:activeTab===id?C.teal:C.textMute, padding:"10px 18px", cursor:"pointer", ...mono, fontSize:11, fontWeight:activeTab===id?700:400 }}>
            {label}
          </button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8, paddingRight:4 }}>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{ background:C.input, border:`1px solid ${C.inputBorder||C.border}`, borderRadius:5, color:C.text, padding:"4px 8px", fontSize:11, ...mono, outline:"none", cursor:"pointer" }}>
            <option value="ALL">All Practices</option>
            {STATUS_OPTS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
          </select>
        </div>
      </div>
      {/* ── ASSESS TAB ──────────────────────────────────────────────────── */}
      {activeTab === "assess" && (
        <div style={{ flex:1, display:"grid", gridTemplateColumns:"180px 1fr", overflow:"hidden", height:"calc(100vh - 130px)" }}>
          {/* Family sidebar */}
          <div style={{ borderRight:`1px solid ${C.border}`, overflowY:"auto", background:C.panel }}>
            <div style={{ padding:"10px 12px", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ ...mono, fontSize:10, color:C.textMute, fontWeight:600 }}>14 FAMILIES</div>
            </div>
            {FAMILIES.map(fam => {
              const fs = familyScores[fam];
              const isActive = activeFamily === fam;
              const hasIssues = fs.deduct > 0;
              return (
                <div key={fam} onClick={()=>setActiveFamily(fam)}
                  style={{ padding:"10px 12px", borderBottom:`1px solid ${C.border}`, cursor:"pointer", background:isActive?`${C.teal}0A`:"transparent", borderLeft:isActive?`3px solid ${C.teal}`:"3px solid transparent" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                    <span style={{ ...mono, fontWeight:700, fontSize:12, color:isActive?C.teal:C.textDim }}>{fam}</span>
                    {hasIssues && <span style={{ ...mono, fontSize:10, color:C.orange, fontWeight:700 }}>-{fs.deduct}</span>}
                  </div>
                  <div style={{ fontSize:10, color:C.textMute, lineHeight:1.3 }}>{FAMILY_NAMES[fam]}</div>
                  <div style={{ display:"flex", gap:4, marginTop:4 }}>
                    <div style={{ flex:fs.met, height:3, background:C.green, borderRadius:1 }} />
                    <div style={{ flex:fs.total-fs.met-fs.deduct>0?fs.total-fs.met-fs.deduct:0, height:3, background:C.border, borderRadius:1 }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Practices panel */}
          <div style={{ overflowY:"auto", padding:"16px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:C.white }}>{FAMILY_NAMES[activeFamily]}</div>
                <div style={{ ...mono, fontSize:10, color:C.textMute, marginTop:2 }}>
                  {NIST_171_PRACTICES.filter(p=>p.family===activeFamily).length} practices ·
                  Family deduction: <span style={{ color:familyScores[activeFamily]?.deduct>0?C.orange:C.green, fontWeight:700 }}>
                    {familyScores[activeFamily]?.deduct>0?`-${familyScores[activeFamily].deduct}`:"+0"}
                  </span> pts
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>setAllInFamily("met")}
                  style={{ ...mono, fontSize:10, background:`${C.green}14`, border:`1px solid ${C.green}30`, color:C.green, borderRadius:4, padding:"4px 10px", cursor:"pointer" }}>
                  ✓ All Met
                </button>
                <button onClick={()=>setAllInFamily("not_met")}
                  style={{ ...mono, fontSize:10, background:`${C.red}14`, border:`1px solid ${C.red}30`, color:C.red, borderRadius:4, padding:"4px 10px", cursor:"pointer" }}>
                  ✗ All Not Met
                </button>
                <button onClick={()=>setAllInFamily("not_assessed")}
                  style={{ ...mono, fontSize:10, background:C.panel, border:`1px solid ${C.border}`, color:C.textMute, borderRadius:4, padding:"4px 10px", cursor:"pointer" }}>
                  ? Reset
                </button>
              </div>
            </div>
            {visiblePractices.map(p => {
              const status = statuses[p.id];
              const sOpt = STATUS_OPTS.find(s => s.id === status) || STATUS_OPTS[4];
              return (
                <div key={p.id} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:14, marginBottom:8 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:5, flexWrap:"wrap" }}>
                        <span style={{ ...mono, fontWeight:700, fontSize:12, color:C.blue }}>{p.id}</span>
                        <span style={{ ...mono, fontSize:10, color:sOpt.color, background:`${sOpt.color}14`, border:`1px solid ${sOpt.color}30`, borderRadius:3, padding:"2px 7px" }}>
                          {sOpt.icon} {sOpt.label}
                        </span>
                        {p.pts > 1 && (
                          <span style={{ ...mono, fontSize:10, color:C.gold, background:`${C.gold}14`, border:`1px solid ${C.gold}30`, borderRadius:3, padding:"2px 7px" }}>
                            ⚡ {p.pts} pts
                          </span>
                        )}
                        <span style={{ ...mono, fontSize:10, color:p.cmmc==="L1"?C.teal:C.textMute, background:p.cmmc==="L1"?`${C.teal}0A`:"transparent", border:`1px solid ${p.cmmc==="L1"?C.teal:C.border}`, borderRadius:3, padding:"2px 7px" }}>
                          CMMC {p.cmmc}
                        </span>
                      </div>
                      <div style={{ fontSize:12, color:C.text, lineHeight:1.6 }}>{p.title}</div>
                    </div>
                    {/* Status selector */}
                    <div style={{ display:"flex", flexDirection:"column", gap:4, flexShrink:0 }}>
                      {STATUS_OPTS.map(s => (
                        <button key={s.id} onClick={()=>setStatus(p.id, s.id)}
                          style={{ ...mono, fontSize:10, fontWeight:status===s.id?700:400, background:status===s.id?`${s.color}20`:"transparent", border:`1px solid ${status===s.id?s.color:C.border}`, color:status===s.id?s.color:C.textMute, borderRadius:4, padding:"3px 10px", cursor:"pointer", textAlign:"left", whiteSpace:"nowrap" }}>
                          {s.icon} {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* ── SUMMARY TAB ─────────────────────────────────────────────────── */}
      {activeTab === "summary" && (
        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          {/* Score breakdown */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
            {/* Score gauge */}
            <div style={{ background:C.panel, border:`2px solid ${sc}40`, borderRadius:12, padding:24, display:"flex", flexDirection:"column", alignItems:"center" }}>
              <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:0.8, marginBottom:12 }}>YOUR SPRS SCORE</div>
              <div style={{ ...mono, fontSize:72, fontWeight:900, color:sc, lineHeight:1 }}>{score.total}</div>
              <div style={{ ...mono, fontSize:11, color:C.textMute, marginTop:6 }}>out of {MAX_SCORE} maximum</div>
              <div style={{ width:"100%", height:8, background:C.panel2||C.border, borderRadius:4, margin:"14px 0 8px", overflow:"hidden" }}>
                <div style={{ width:`${Math.max(0,(score.total/MAX_SCORE)*100)}%`, height:"100%", background:`linear-gradient(90deg,${sc},${C.teal})`, borderRadius:4, transition:"width 0.5s" }} />
              </div>
              <div style={{ fontSize:11, color:C.textDim, textAlign:"center", lineHeight:1.7 }}>
                {score.total >= 88 ? "✅ Meets DoD CMMC Level 2 assessment threshold" :
                 score.total >= 70 ? "⚠️ Below threshold — POAMs required before contract award" :
                 score.total >= 0  ? "⛔ Significant gaps — immediate remediation required" :
                 "🚨 Negative score — critical unimplemented controls"}
              </div>
            </div>
            {/* Practice breakdown */}
            <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
              <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:0.8, marginBottom:14 }}>PRACTICE BREAKDOWN</div>
              {[
                { l:"Met",          v:score.metCount,         c:C.green,  pct:Math.round((score.metCount/110)*100) },
                { l:"Partial",      v:score.partialCount,     c:C.orange, pct:Math.round((score.partialCount/110)*100) },
                { l:"Not Met",      v:score.notMetCount,      c:C.red,    pct:Math.round((score.notMetCount/110)*100) },
                { l:"N/A",          v:score.naCount,          c:C.textMute,pct:Math.round((score.naCount/110)*100) },
                { l:"Not Assessed", v:score.notAssessedCount, c:C.textMute,pct:Math.round((score.notAssessedCount/110)*100) },
              ].map(k => (
                <div key={k.l} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:11, color:k.c, fontWeight:600 }}>{k.l}</span>
                    <span style={{ ...mono, fontSize:11, fontWeight:700, color:k.c }}>{k.v} <span style={{ color:C.textMute, fontWeight:400 }}>({k.pct}%)</span></span>
                  </div>
                  <div style={{ height:5, background:C.panel2||C.border, borderRadius:3, overflow:"hidden" }}>
                    <div style={{ width:`${k.pct}%`, height:"100%", background:k.c, borderRadius:3 }} />
                  </div>
                </div>
              ))}
              <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, marginTop:10 }}>
                <div style={{ ...mono, fontSize:11, color:C.textMute }}>
                  Total deduction: <span style={{ color:C.red, fontWeight:700 }}>-{score.deductPts} pts</span>
                </div>
              </div>
            </div>
          </div>
          {/* Family-by-family breakdown */}
          <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:0.8, marginBottom:12 }}>SCORE BY DOMAIN</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
            {FAMILIES.map(fam => {
              const fs = familyScores[fam];
              const practices = NIST_171_PRACTICES.filter(p=>p.family===fam).length;
              const hasIssue = fs.deduct > 0;
              return (
                <div key={fam} onClick={()=>{setActiveFamily(fam);setActiveTab("assess");}}
                  style={{ background:C.panel, border:`1px solid ${hasIssue?`${C.orange}40`:C.border}`, borderRadius:8, padding:12, cursor:"pointer" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                    <div>
                      <div style={{ ...mono, fontWeight:700, fontSize:12, color:hasIssue?C.orange:C.green }}>{fam}</div>
                      <div style={{ fontSize:10, color:C.textMute, marginTop:1 }}>{FAMILY_NAMES[fam]}</div>
                    </div>
                    <div style={{ ...mono, fontSize:14, fontWeight:900, color:hasIssue?C.orange:C.green }}>
                      {hasIssue ? `-${fs.deduct}` : "✓"}
                    </div>
                  </div>
                  <div style={{ ...mono, fontSize:10, color:C.textMute }}>
                    {fs.met}/{practices} met
                  </div>
                  <div style={{ height:4, background:C.panel2||C.border, borderRadius:2, marginTop:6, overflow:"hidden" }}>
                    <div style={{ width:`${(fs.met/practices)*100}%`, height:"100%", background:hasIssue?C.orange:C.green, borderRadius:2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* ── SPRS SUBMISSION TAB ─────────────────────────────────────────── */}
      {activeTab === "submit" && (
        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          {/* Org fields */}
          <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:16, marginBottom:16 }}>
            <div style={{ ...mono, fontSize:11, color:C.teal, fontWeight:700, marginBottom:12 }}>ASSESSMENT INFORMATION</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              {[
                { label:"ORGANIZATION NAME", val:orgName, set:setOrgName },
                { label:"SYSTEM NAME", val:systemName, set:setSystemName },
                { label:"ASSESSMENT DATE", val:assessDate, set:setAssessDate, type:"date" },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ ...mono, fontSize:10, color:C.textMute, fontWeight:600, marginBottom:5 }}>{f.label}</div>
                  <input type={f.type||"text"} value={f.val} onChange={e=>f.set(e.target.value)}
                    style={{ width:"100%", background:C.input, border:`1px solid ${C.inputBorder||C.border}`, borderRadius:5, color:C.text, padding:"6px 10px", fontSize:11, ...mono, outline:"none" }} />
                </div>
              ))}
            </div>
          </div>
          {/* SPRS submission block */}
          <div style={{ background:C.panel, border:`2px solid ${sc}40`, borderRadius:10, padding:20, marginBottom:16 }}>
            <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:0.8, marginBottom:16 }}>SPRS PORTAL SUBMISSION DATA</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:16 }}>
              {[
                { label:"SPRS Score",        value:score.total,          color:sc,      desc:"Submit to DoD SPRS portal" },
                { label:"Assessment Type",    value:"Self-Assessment",    color:C.blue,  desc:"NIST SP 800-171 DoD Assessment" },
                { label:"Practices Assessed", value:`${score.assessed}/110`, color:C.teal, desc:"out of 110 total practices" },
              ].map(k => (
                <div key={k.label} style={{ background:C.panel2||C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:14 }}>
                  <div style={{ ...mono, fontSize:10, color:C.textMute, fontWeight:600, marginBottom:4 }}>{k.label}</div>
                  <div style={{ ...mono, fontSize:22, fontWeight:900, color:k.color, lineHeight:1.2 }}>{k.value}</div>
                  <div style={{ fontSize:10, color:C.textMute, marginTop:3 }}>{k.desc}</div>
                </div>
              ))}
            </div>
            {/* Formatted submission text */}
            <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:8 }}>SPRS ENTRY FIELDS (copy-paste to SPRS portal)</div>
            <div style={{ background:C.bg, border:`1px solid #0D2030`, borderRadius:8, padding:16, fontFamily:"'Courier New',monospace", fontSize:11, color:"#7AB8D8", lineHeight:2 }}>
              <div><span style={{ color:"#3A5570" }}>Assessment Type:</span>         <span style={{ color:"#C8D8E8" }}>NIST SP 800-171 DoD Assessment</span></div>
              <div><span style={{ color:"#3A5570" }}>Organization:</span>            <span style={{ color:"#C8D8E8" }}>{orgName}</span></div>
              <div><span style={{ color:"#3A5570" }}>System / Enclave:</span>        <span style={{ color:"#C8D8E8" }}>{systemName}</span></div>
              <div><span style={{ color:"#3A5570" }}>Assessment Date:</span>         <span style={{ color:"#C8D8E8" }}>{assessDate}</span></div>
              <div><span style={{ color:"#3A5570" }}>Total Score:</span>             <span style={{ color:sc, fontWeight:900, fontSize:14 }}>{score.total}</span></div>
              <div><span style={{ color:"#3A5570" }}>Practices Met:</span>           <span style={{ color:"#00CC88" }}>{score.metCount}</span></div>
              <div><span style={{ color:"#3A5570" }}>Practices Not Met:</span>       <span style={{ color:"#FF4444" }}>{score.notMetCount}</span></div>
              <div><span style={{ color:"#3A5570" }}>Practices Partial:</span>       <span style={{ color:"#FF8C00" }}>{score.partialCount}</span></div>
              <div><span style={{ color:"#3A5570" }}>Plan of Action Exists:</span>   <span style={{ color:"#C8D8E8" }}>{score.notMetCount + score.partialCount > 0 ? "Yes" : "No"}</span></div>
            </div>
          </div>
          {/* Guidance */}
          <div style={{ background:`${C.blue}0A`, border:`1px solid ${C.blue}25`, borderRadius:8, padding:14, marginBottom:14 }}>
            <div style={{ ...mono, fontSize:11, color:C.blue, fontWeight:700, marginBottom:8 }}>ℹ SPRS SUBMISSION GUIDANCE</div>
            <div style={{ fontSize:12, color:C.textDim, lineHeight:1.8 }}>
              <div>1. Log in to the SPRS portal at <span style={{ ...mono, color:C.teal }}>https://www.sprs.csd.disa.mil</span> using your CAC</div>
              <div>2. Navigate to <strong>My Assessments → Create Assessment → NIST SP 800-171 DoD Assessment</strong></div>
              <div>3. Enter the score above and upload your System Security Plan (SSP) as supporting documentation</div>
              <div>4. If score is below 110, a Plan of Action & Milestones (POAM) is required</div>
              <div>5. DFARS 252.204-7019 requires self-assessment results be posted within 30 days of contract award</div>
            </div>
          </div>
          {/* POAM summary if needed */}
          {(score.notMetCount + score.partialCount) > 0 && (
            <div style={{ background:`${C.orange}08`, border:`1px solid ${C.orange}30`, borderRadius:8, padding:14 }}>
              <div style={{ ...mono, fontSize:11, color:C.orange, fontWeight:700, marginBottom:8 }}>
                ⚠ PLAN OF ACTION REQUIRED — {score.notMetCount + score.partialCount} OPEN ITEMS
              </div>
              <div style={{ fontSize:12, color:C.textDim, marginBottom:10, lineHeight:1.7 }}>
                A POAM is required for all practices marked Not Met or Partial. Provide milestone dates and responsible parties for each open item before SPRS submission.
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button style={{ ...mono, fontSize:11, background:C.teal, border:"none", color:C.bg, borderRadius:5, padding:"7px 16px", cursor:"pointer", fontWeight:700 }}>
                  ↗ EXPORT OPEN ITEMS TO POAM
                </button>
                <button style={{ ...mono, fontSize:11, background:"transparent", border:`1px solid ${C.border}`, color:C.textDim, borderRadius:5, padding:"7px 16px", cursor:"pointer" }}>
                  ↓ DOWNLOAD SSP TEMPLATE
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* ── CMMC L3 TAB ────────────────────────────────────────────────── */}
      {activeTab === "l3" && (
        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          <div style={{ background:`${C.blue}0A`, border:`1px solid ${C.blue}25`, borderRadius:8, padding:14, marginBottom:16 }}>
            <div style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:C.blue, marginBottom:6 }}>🎖 CMMC LEVEL 3 — EXPERT TIER</div>
            <div style={{ fontSize:12, color:C.textDim, lineHeight:1.8 }}>
              Level 3 adds <strong>24 enhanced requirements</strong> from NIST SP 800-172 on top of all 110 Level 2 practices.
              Applies to contractors handling CUI associated with <strong>high-value assets or critical programs</strong> (F-35, nuclear, special programs).
              Assessment conducted exclusively by <strong>DIBCAC</strong> (government, not C3PAO). Must achieve Level 2 C3PAO first.
            </div>
          </div>
          <div style={{ fontFamily:"monospace", fontSize:11, color:C.textMute, fontWeight:600, letterSpacing:0.8, marginBottom:12 }}>
            24 ENHANCED PRACTICES FROM NIST SP 800-172 (Feb 2021)
          </div>
          {CMMC_L3_PRACTICES.map((p,i) => (
            <div key={p.id} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:13, marginBottom:8 }}>
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:5, flexWrap:"wrap" }}>
                <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:12, color:C.gold }}>{p.id}</span>
                <span style={{ fontFamily:"monospace", fontSize:10, color:C.purple, background:`${C.purple}14`, border:`1px solid ${C.purple}30`, borderRadius:3, padding:"2px 7px" }}>800-172 §{p.nist172}</span>
                <span style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, background:C.panel2||C.panel, border:`1px solid ${C.border}`, borderRadius:3, padding:"2px 7px" }}>{p.family} Domain</span>
              </div>
              <div style={{ fontSize:12, color:C.text, lineHeight:1.6 }}>{p.title}</div>
            </div>
          ))}
          <div style={{ marginTop:16, padding:"12px 16px", background:`${C.orange}08`, border:`1px solid ${C.orange}25`, borderRadius:8 }}>
            <div style={{ fontFamily:"monospace", fontSize:11, color:C.orange, fontWeight:700, marginBottom:4 }}>⚠ IMPORTANT</div>
            <div style={{ fontSize:11, color:C.textDim, lineHeight:1.7 }}>
              CMMC Level 3 assessments are performed by DCMA DIBCAC only — no self-assessment permitted. Organizations must have a finalized Level 2 C3PAO certification with zero open POAMs before requesting a Level 3 assessment. 800-172 Rev 3 was issued as Final Public Draft September 29, 2025 — it is not yet incorporated into CMMC requirements.
            </div>
          </div>
        </div>
      )}
      {/* ── REV 3 PREVIEW TAB ───────────────────────────────────────────── */}
      {activeTab === "rev3" && (
        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          <div style={{ background:`${C.teal}0A`, border:`1px solid ${C.teal}25`, borderRadius:8, padding:14, marginBottom:16 }}>
            <div style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:C.teal, marginBottom:6 }}>🔮 NIST SP 800-171 REV 3 — WHAT'S COMING</div>
            <div style={{ fontSize:12, color:C.textDim, lineHeight:1.8 }}>
              Rev 3 was published <strong>May 14, 2024</strong> and reduces from 110 → 97 requirements. However, <strong>DoD Class Deviation 2024-O0013</strong> requires contractors to continue using Rev 2 until further notice. Rev 3 adoption requires new DoD rulemaking — no firm timeline. RiskRadar will update automatically when mandated.
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
            {[
              { l:"Rev 2 Requirements", v:"110", c:C.blue,  sub:"Current mandatory standard" },
              { l:"Rev 3 Requirements", v:"97",  c:C.teal,  sub:"Consolidated — nothing removed" },
              { l:"Rev 3 Determination Stmts", v:"422", c:C.gold, sub:"vs 320 in Rev 2 (+32%)" },
            ].map(k => (
              <div key={k.l} style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:14 }}>
                <div style={{ fontFamily:"monospace", fontSize:24, fontWeight:900, color:k.c, lineHeight:1 }}>{k.v}</div>
                <div style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, margin:"4px 0 2px", textTransform:"uppercase", letterSpacing:0.8 }}>{k.l}</div>
                <div style={{ fontSize:10, color:C.textMute }}>{k.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily:"monospace", fontSize:11, color:C.textMute, fontWeight:600, letterSpacing:0.8, marginBottom:12 }}>KEY CHANGES IN REV 3</div>
          {REV3_CHANGES.map((c,i) => {
            const colors = { new_family:C.green, consolidated:C.orange, enhanced:C.blue, increased:C.teal };
            const labels = { new_family:"NEW FAMILY", consolidated:"CONSOLIDATED", enhanced:"ENHANCED", increased:"EXPANDED" };
            const col = colors[c.type] || C.textMute;
            return (
              <div key={i} style={{ background:C.panel, border:`1px solid ${col}25`, borderRadius:8, padding:12, marginBottom:8, display:"flex", gap:10 }}>
                <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:col, background:`${col}14`, border:`1px solid ${col}30`, borderRadius:3, padding:"3px 8px", whiteSpace:"nowrap", alignSelf:"flex-start" }}>
                  {labels[c.type]}
                </span>
                <div>
                  <div style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:C.white, marginBottom:3 }}>{c.id}</div>
                  <div style={{ fontSize:11, color:C.textDim, lineHeight:1.6 }}>{c.title}</div>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop:16, padding:"12px 16px", background:`${C.green}08`, border:`1px solid ${C.green}25`, borderRadius:8 }}>
            <div style={{ fontFamily:"monospace", fontSize:11, color:C.green, fontWeight:700, marginBottom:4 }}>✅ YOUR PREPARATION STRATEGY</div>
            <div style={{ fontSize:11, color:C.textDim, lineHeight:1.8 }}>
              <div>1. Keep scoring against Rev 2 (110 practices) — this is what DoD requires today</div>
              <div>2. Start gap analysis against the 2 new families (PL + SR) now — these are the biggest new additions</div>
              <div>3. Run <span style={{ fontFamily:"monospace", color:C.teal }}>poll_nist_updates.py</span> monthly — it will flag when NIST publishes Rev 3 in OSCAL format</div>
              <div>4. RiskRadar will add a Rev 3 toggle once DoD mandates the transition</div>
            </div>
          </div>
        </div>
      )}
      {/* ── CSRMC TAB ───────────────────────────────────────────────────── */}
      {activeTab === "csrmc" && (
        <div style={{ flex:1, overflowY:"auto", padding:20 }}>
          <div style={{ background:`${C.orange}0A`, border:`1px solid ${C.orange}25`, borderRadius:8, padding:14, marginBottom:16 }}>
            <div style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:C.orange, marginBottom:6 }}>🛡 CYBERSECURITY RISK MANAGEMENT CONSTRUCT (CSRMC)</div>
            <div style={{ fontSize:12, color:C.textDim, lineHeight:1.8 }}>
              Announced <strong>September 24, 2025</strong> — replaces the DoD RMF (DoDI 8510.01) as the Department's primary cybersecurity framework. 
              CSRMC shifts from snapshot-in-time assessments to dynamic, automated, continuous risk management. 
              <strong> CSRMC has no control catalog</strong> — it's a construct with 5 phases and 10 tenets. CMMC remains the operative compliance regime for DIB contractors.
            </div>
          </div>
          {/* 5 Phases */}
          <div style={{ fontFamily:"monospace", fontSize:11, color:C.textMute, fontWeight:600, letterSpacing:0.8, marginBottom:10 }}>5 PHASES</div>
          <div style={{ display:"flex", gap:6, marginBottom:20, overflowX:"auto" }}>
            {[
              { n:"1", label:"Design",    rmf:"Prepare/Categorize/Select", color:C.blue,   desc:"Security embedded from system inception" },
              { n:"2", label:"Build",     rmf:"Implement",                  color:C.teal,   desc:"DevSecOps — security alongside functionality" },
              { n:"3", label:"Test",      rmf:"Assess",                     color:C.green,  desc:"Threat-informed testing before FOC" },
              { n:"4", label:"Onboard",   rmf:"Authorize",                  color:C.gold,   desc:"Continuous monitoring begins — cATO" },
              { n:"5", label:"Operations",rmf:"Monitor",                    color:C.orange, desc:"Real-time dashboards and active defense" },
            ].map(p => (
              <div key={p.n} style={{ flex:1, minWidth:100, background:C.panel, border:`1px solid ${p.color}30`, borderRadius:8, padding:12, textAlign:"center" }}>
                <div style={{ fontFamily:"monospace", fontSize:20, fontWeight:900, color:p.color }}>{p.n}</div>
                <div style={{ fontFamily:"monospace", fontSize:11, fontWeight:700, color:C.white, margin:"4px 0 3px" }}>{p.label}</div>
                <div style={{ fontSize:10, color:C.textMute, marginBottom:5 }}>{p.desc}</div>
                <div style={{ fontFamily:"monospace", fontSize:9, color:p.color, background:`${p.color}0F`, borderRadius:3, padding:"2px 5px" }}>RMF: {p.rmf}</div>
              </div>
            ))}
          </div>
          {/* 10 Tenets */}
          <div style={{ fontFamily:"monospace", fontSize:11, color:C.textMute, fontWeight:600, letterSpacing:0.8, marginBottom:10 }}>
            10 TENETS — SENTINELGRC ALIGNMENT ({CSRMC_TENETS.filter(t=>t.aligned).length}/{CSRMC_TENETS.length})
          </div>
          {CSRMC_TENETS.map(t => (
            <div key={t.id} style={{ background:C.panel, border:`1px solid ${t.aligned?C.green:C.border}20`, borderRadius:8, padding:13, marginBottom:8 }}>
              <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                <span style={{ fontSize:16, flexShrink:0 }}>{t.aligned?"✅":"⭕"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:12, color:t.aligned?C.green:C.textMute }}>
                      {t.id}. {t.name}
                    </span>
                    <span style={{ fontFamily:"monospace", fontSize:10, color:C.textMute, background:C.panel2||C.panel, border:`1px solid ${C.border}`, borderRadius:3, padding:"2px 6px" }}>
                      {t.phase}
                    </span>
                  </div>
                  <div style={{ fontSize:11, color:C.text, marginBottom:4 }}>{t.desc}</div>
                  <div style={{ fontSize:11, color:t.aligned?C.green:C.orange, fontFamily:"monospace" }}>
                    RiskRadar: {t.impl}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop:16, padding:"12px 16px", background:`${C.blue}08`, border:`1px solid ${C.blue}25`, borderRadius:8 }}>
            <div style={{ fontFamily:"monospace", fontSize:11, color:C.blue, fontWeight:700, marginBottom:4 }}>ℹ CSRMC & DIB CONTRACTORS</div>
            <div style={{ fontSize:11, color:C.textDim, lineHeight:1.8 }}>
              CSRMC is directed at DoD internal systems — CMMC remains mandatory for DIB contractors handling FCI/CUI. However, CSRMC's emphasis on <strong>continuous monitoring, automation, and reciprocity</strong> is expected to filter into future contractual requirements. 
              Organizations implementing RiskRadar's cATO continuous monitoring approach are already aligned with CSRMC Phase 5 operations requirements — a first-mover advantage when CSRMC language appears in future solicitations.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}