import { useState } from "react";
import { useColors } from "../theme.js";

const C = { bg:"var(--rr-bg)", panel:"var(--rr-panel)", panelAlt:"var(--rr-panel-alt)", panel2:"var(--rr-panel-alt)", border:"var(--rr-border)", borderMd:"var(--rr-border-md)", text:"var(--rr-text)", textDim:"var(--rr-text-dim)", dim:"var(--rr-text-dim)", textMute:"var(--rr-mute)", mute:"var(--rr-mute)", white:"var(--rr-white)", input:"var(--rr-input)", inputBorder:"var(--rr-input-bdr)", rowA:"var(--rr-row-a)", rowB:"var(--rr-row-b)", scroll:"var(--rr-scroll)", headerBg:"var(--rr-header)", teal:"var(--rr-teal)", blue:"var(--rr-blue)", red:"var(--rr-red)", orange:"var(--rr-orange)", gold:"var(--rr-gold)", green:"var(--rr-green)", purple:"var(--rr-purple)" };

const mono = { fontFamily:"'Courier New',monospace" };
// ─── Version comparison data ───────────────────────────────────────────────────
const COMPONENTS = [
  {
    category:"Authentication",
    cloud:    { impl:"CAC + OCSP (live DoD PKI lookup) → JWT httpOnly cookie", status:"done",   note:"Real-time cert validation via DISA OCSP" },
    onprem:   { impl:"CAC + CRL (cached, no internet) → JWT, locally signed",  status:"delta",  note:"Must cache CRL — no internet for OCSP in air-gap" },
    sap:      { impl:"CAC + CRL + compartment indoctrination check",             status:"future", note:"SSO-managed access list integrated into auth flow" },
  },
  {
    category:"AI / Analysis Engine",
    cloud:    { impl:"AWS Bedrock — Claude 3.7 Sonnet (IL4/IL5 authorized)",    status:"done",   note:"FIPS endpoint: bedrock-runtime-fips.us-gov-west-1" },
    onprem:   { impl:"Ollama — Llama 3 / Mistral 7B running locally on GPU",    status:"delta",  note:"Model weights shipped with install package. No external calls." },
    sap:      { impl:"Ollama — same, but on SAP-enclave hardware",               status:"future", note:"Model must be reviewed and approved by program security" },
  },
  {
    category:"Database",
    cloud:    { impl:"AWS RDS PostgreSQL (managed, multi-AZ, encrypted)",        status:"done",   note:"Automated backups, patching, failover — fully managed" },
    onprem:   { impl:"Self-hosted PostgreSQL on enclave VM",                      status:"delta",  note:"Customer DBA manages. Same schema. Same RLS policies." },
    sap:      { impl:"Same, but on SAP network segment",                          status:"future", note:"Backup media must follow classified media handling procedures" },
  },
  {
    category:"Secrets Management",
    cloud:    { impl:"AWS Secrets Manager + KMS per-org encryption keys",         status:"done",   note:"IAM role-based access, automatic rotation" },
    onprem:   { impl:"HashiCorp Vault (air-gapped mode) + local KMS",             status:"delta",  note:"Vault initialized in enclave, no cloud dependency" },
    sap:      { impl:"HashiCorp Vault Enterprise + FIPS HSM integration",         status:"future", note:"May require NSA-approved hardware security module" },
  },
  {
    category:"STIG Library",
    cloud:    { impl:"Auto-polled from public.cyber.mil every 24 hours",           status:"done",   note:"Always current — DISA STIG poller Lambda runs nightly" },
    onprem:   { impl:"Bundled with release package, quarterly update archive",     status:"delta",  note:"ISSO submits classified update media through normal patch process" },
    sap:      { impl:"Same as on-prem + program-specific STIG content",            status:"future", note:"SAP programs may have additional classified STIGs for weapons systems" },
  },
  {
    category:"Report Classification",
    cloud:    { impl:"CUI / FOUO banners, standard handling caveats",              status:"done",   note:"CUI//SP-CTI, CUI//ITAR markings supported" },
    onprem:   { impl:"SECRET header/footer, configurable classification string",   status:"delta",  note:"Must support SECRET // NOFORN // RELIDO etc." },
    sap:      { impl:"SAP-specific markings — configurable program compartment",   status:"future", note:"e.g. SECRET // SAR-XX // NOFORN. PSO configures in admin." },
  },
  {
    category:"Updates / Patches",
    cloud:    { impl:"Container registry pull, zero-downtime rolling deploy",      status:"done",   note:"CI/CD pipeline with SLSA provenance, supply chain security" },
    onprem:   { impl:"Signed encrypted archive via classified portable media",     status:"delta",  note:"SHA-256 manifest + digital sig verified before install" },
    sap:      { impl:"Same + PSO approval workflow before installation",           status:"future", note:"Update manifest must be approved by cognizant security authority" },
  },
  {
    category:"Connectors / Integrations",
    cloud:    { impl:"CrowdStrike, Tenable.sc, Trellix, Defender, AWS, Splunk",   status:"done",   note:"API-based, cloud-to-cloud or collector agent" },
    onprem:   { impl:"ACAS, HBSS, OpenSCAP (built-in), network scanner",          status:"delta",  note:"On-prem tools only. Cloud connectors disabled." },
    sap:      { impl:"Program-specific tools only — whatever is in the enclave",  status:"future", note:"Custom connectors may be needed for SAP-specific tooling" },
  },
  {
    category:"User Roles",
    cloud:    { impl:"7 roles: platform_admin → viewer (RBAC + RLS)",             status:"done",   note:"ISSO, ISSM, SCA, System Owner, Auditor, Viewer" },
    onprem:   { impl:"Same + ISSM approval workflow for all access grants",        status:"delta",  note:"Classified environments require ISSM/AO to approve all accounts" },
    sap:      { impl:"Same + PSO / SSO roles, compartment indoc tracking",         status:"future", note:"SSO must be able to pull full access report at any time" },
  },
  {
    category:"Audit Trail",
    cloud:    { impl:"Immutable PostgreSQL append-only tables + CloudWatch logs",  status:"done",   note:"Every access logged — report_access_log, data_access_log" },
    onprem:   { impl:"Same PostgreSQL + local SIEM (Splunk, ArcSight) syslog",    status:"delta",  note:"Syslog format for on-prem SIEM integration" },
    sap:      { impl:"Same + SSO-accessible audit reports on demand",              status:"future", note:"SAP OPSEC requires complete access accounting" },
  },
];
const ROADMAP = [
  {
    phase:"Q2–Q3 2025", label:"Phase 1", title:"Cloud SaaS Foundation",
    version:"cloud", color:"#00D4AA",
    milestones:[
      "AWS GovCloud account + VPC architecture",
      "Core platform: auth, RBAC, multi-tenant DB",
      "CAC authentication (mTLS + EDIPI extraction)",
      "NIST 800-53 control assessment module",
      "Tenable.sc / ACAS file import + parser",
      "CrowdStrike + AWS Security Hub connectors",
      "POAM generator (eMASS format)",
      "Basic SSP generator",
    ],
    target:"First 3 DIB contractor customers",
    revenue:"$0 → MRR",
  },
  {
    phase:"Q4 2025–Q1 2026", label:"Phase 2", title:"Cloud SaaS — Full Feature",
    version:"cloud", color:"#00D4AA",
    milestones:[
      "Multi-framework dashboard (800-53, 800-171, CMMC, CSRMC)",
      "ATO package generator (eMASS, DIBCAC, SPRS)",
      "SAV preparation package",
      "Full connector framework (Trellix/HBSS, Defender MDE, Splunk)",
      "Network device scanner (Nmap + SSH + STIG compare)",
      "Cross-framework SPRS score calculator",
      "C3PAO assessor portal (read-only)",
      "FedRAMP Ready designation pursuit begins",
    ],
    target:"10–25 DIB customers, SBIR Phase I application",
    revenue:"$50–150K ARR",
  },
  {
    phase:"Q2–Q3 2026", label:"Phase 3", title:"FedRAMP + DoD IL4 Authorization",
    version:"cloud", color:"#1A7AFF",
    milestones:[
      "Engage 3PAO for FedRAMP Moderate assessment",
      "Complete RiskRadar's own SSP (dogfooding)",
      "FedRAMP Ready designation",
      "DoD IL4 Provisional Authorization (DISA)",
      "DISA APL application",
      "GSA IT Schedule 70 contract vehicle",
      "First direct DoD component customer",
    ],
    target:"Direct DoD agency customers, SBIR Phase II",
    revenue:"$500K–1.5M ARR",
  },
  {
    phase:"Q4 2026–Q2 2027", label:"Phase 4", title:"On-Prem Classified Build",
    version:"onprem", color:"#AA66FF",
    milestones:[
      "Infrastructure abstraction layer (swap AWS → local equivalents)",
      "Ollama local LLM integration (replace Bedrock)",
      "HashiCorp Vault integration (replace Secrets Manager)",
      "CRL-based cert validation (replace OCSP)",
      "Offline STIG library + update archive mechanism",
      "SECRET classification markings on all outputs",
      "Classified installation package (Docker Compose + Helm)",
      "ACAS + HBSS + OpenSCAP built-in connectors",
    ],
    target:"First SECRET-level program pilot",
    revenue:"Per-program licensing (higher price point)",
  },
  {
    phase:"Q3 2027+", label:"Phase 5", title:"SAP / Classified Special Programs",
    version:"sap", color:"#FFD700",
    milestones:[
      "PSO / SSO role integration",
      "Program-specific compartment marking configuration",
      "Compartment indoctrination tracking per user",
      "SSO-accessible audit and access reports",
      "HSM integration for NSA-approved cryptography",
      "Program-specific STIG content support",
      "Custom SAP update approval workflow",
      "F-35 JSF program pilot (internal validation)",
    ],
    target:"SAP program certifications, classified contracts",
    revenue:"High-value sole-source program contracts",
  },
];
const StatusDot = ({ s }) => {
  const cfg = { done:{c:"#00CC88",l:"BUILT"}, delta:{c:"#FFD700",l:"DELTA"}, future:{c:"var(--rr-mute)",l:"FUTURE"} };
  const d = cfg[s]||cfg.future;
  return <span style={{ ...mono, fontSize:9, color:d.c, background:`${d.c}14`, border:`1px solid ${d.c}30`, borderRadius:3, padding:"1px 5px" }}>{d.l}</span>;
};
const VersionPill = ({ v }) => {
  const cfg = { cloud:{c:"#00D4AA",l:"☁ CLOUD"}, onprem:{c:"#AA66FF",l:"🔒 ON-PREM"}, sap:{c:"#FFD700",l:"⬛ SAP"} };
  const d = cfg[v]||cfg.cloud;
  return <span style={{ ...mono, fontSize:10, color:d.c, background:`${d.c}10`, border:`1px solid ${d.c}25`, borderRadius:4, padding:"2px 7px" }}>{d.l}</span>;
};
export default function ProductRoadmap() {
  const [tab, setTab] = useState("roadmap");
  const [activePhase, setActivePhase] = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);
  const phase = ROADMAP[activePhase];
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Helvetica Neue',Arial,sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`* { box-sizing:border-box; margin:0; padding:0; } ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:#03080E; } ::-webkit-scrollbar-thumb { background:#1A3A5C; }`}</style>
      {/* Header */}
      <div style={{ background:C.headerBg, borderBottom:`1px solid ${C.border}`, padding:"11px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:30, height:30, background:`linear-gradient(135deg,${C.teal},${C.blue})`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:14, fontWeight:900, color:C.panelAlt }}>S</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.white }}>RiskRadar — Product Strategy</div>
            <div style={{ ...mono, fontSize:10, color:C.mute, letterSpacing:0.8 }}>CLOUD SAAS · CLASSIFIED ON-PREM · SAP PROGRAMS</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {["roadmap","comparison","sap"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ ...mono, background:tab===t?"rgba(0,212,170,0.08)":"transparent", border:`1px solid ${tab===t?"rgba(0,212,170,0.3)":C.border}`, color:tab===t?C.teal:C.mute, borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:10, fontWeight:tab===t?700:400, textTransform:"capitalize" }}>
              {t === "sap" ? "SAP Deep Dive" : t}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:22 }}>
        {/* ── ROADMAP TAB ─────────────────────────────────────────────────── */}
        {tab === "roadmap" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* Version pills */}
            <div style={{ display:"flex", gap:12, alignItems:"center" }}>
              <div style={{ ...mono, fontSize:11, color:C.mute }}>PRODUCT VERSIONS:</div>
              <VersionPill v="cloud" />
              <VersionPill v="onprem" />
              <VersionPill v="sap" />
              <div style={{ marginLeft:"auto", ...mono, fontSize:11, color:C.mute }}>80% shared codebase across all versions</div>
            </div>
            {/* Timeline strip */}
            <div style={{ display:"flex", gap:0, overflowX:"auto" }}>
              {ROADMAP.map((p, i) => {
                const vColor = p.version==="cloud"?C.teal:p.version==="onprem"?C.purple:C.gold;
                const isActive = activePhase === i;
                return (
                  <div key={i} onClick={() => setActivePhase(i)} style={{ flex:1, minWidth:160, cursor:"pointer", position:"relative" }}>
                    {/* Connector line */}
                    <div style={{ background:isActive?`${vColor}0C`:C.panel, border:`2px solid ${isActive?vColor:C.border}`, borderRadius:8, margin:"0 6px", padding:"12px 14px", transition:"all 0.2s" }}>
                      <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6, position:"relative", zIndex:2 }}>
                        <div style={{ width:12, height:12, borderRadius:"50%", background:isActive?vColor:`${vColor}40`, border:`2px solid ${vColor}`, flexShrink:0 }} />
                        <span style={{ ...mono, fontSize:11, color:vColor }}>{p.phase}</span>
                      </div>
                      <div style={{ ...mono, fontSize:11, fontWeight:700, color:isActive?C.white:C.dim, marginBottom:4 }}>{p.label}</div>
                      <div style={{ fontSize:10, color:isActive?C.dim:C.mute, lineHeight:1.4 }}>{p.title}</div>
                      <div style={{ marginTop:8 }}><VersionPill v={p.version} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Active phase detail */}
            {phase && (
              <div style={{ background:C.panel, border:`1px solid ${phase.version==="cloud"?C.teal:phase.version==="onprem"?C.purple:C.gold}30`, borderRadius:10, padding:20 }}>
                <div style={{ display:"flex", gap:16, alignItems:"flex-start", marginBottom:16 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:6 }}>
                      <VersionPill v={phase.version} />
                      <span style={{ ...mono, fontSize:11, fontWeight:700, color:phase.color }}>{phase.label}: {phase.title}</span>
                    </div>
                    <div style={{ ...mono, fontSize:11, color:C.mute }}>{phase.phase}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ ...mono, fontSize:10, color:C.mute, marginBottom:3 }}>TARGET REVENUE</div>
                    <div style={{ ...mono, fontSize:12, fontWeight:700, color:phase.color }}>{phase.revenue}</div>
                    <div style={{ fontSize:10, color:C.mute, marginTop:3 }}>{phase.target}</div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {phase.milestones.map((m, i) => (
                    <div key={i} style={{ display:"flex", gap:8, padding:"8px 12px", background:C.panel2, borderRadius:6, border:`1px solid ${C.border}` }}>
                      <span style={{ color:phase.color, fontSize:12 }}>◆</span>
                      <span style={{ fontSize:11, color:C.dim, lineHeight:1.5 }}>{m}</span>
                    </div>
                  ))}
                </div>
                {/* Code reuse note */}
                {phase.version !== "cloud" && (
                  <div style={{ marginTop:14, padding:"10px 14px", background:"rgba(170,102,255,0.06)", border:"1px solid rgba(170,102,255,0.2)", borderRadius:6 }}>
                    <div style={{ ...mono, fontSize:11, color:C.purple, marginBottom:4 }}>♻ CODE REUSE FROM CLOUD VERSION</div>
                    <div style={{ fontSize:11, color:C.dim, lineHeight:1.6 }}>
                      ~80% of code is shared. Frontend, database schema, RBAC, POAM logic, control assessment, cross-framework mapping, and ATO package generation are identical. 
                      Only the infrastructure layer (AI engine, secrets, storage, cert validation, update mechanism) differs. 
                      The infrastructure abstraction layer built in Phase 1-2 makes this possible.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* ── COMPARISON TAB ──────────────────────────────────────────────── */}
        {tab === "comparison" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr 1fr", gap:0, padding:"10px 14px", background:C.input, borderRadius:"8px 8px 0 0", position:"sticky", top:0, zIndex:10, borderBottom:`1px solid ${C.border}` }}>
              <div style={{ ...mono, fontSize:10, color:C.mute, letterSpacing:0.8 }}>COMPONENT</div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}><span>☁</span><span style={{ ...mono, fontSize:11, color:C.teal, fontWeight:700 }}>CLOUD SAAS</span></div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}><span>🔒</span><span style={{ ...mono, fontSize:11, color:C.purple, fontWeight:700 }}>CLASSIFIED ON-PREM</span></div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}><span>⬛</span><span style={{ ...mono, fontSize:11, color:C.gold, fontWeight:700 }}>SAP PROGRAMS</span></div>
            </div>
            {COMPONENTS.map((row, i) => (
              <div key={i}>
                <div onClick={() => setExpandedRow(expandedRow===i?null:i)}
                  style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr 1fr", gap:0, padding:"12px 14px", borderBottom:`1px solid #0A1828`, cursor:"pointer", background:expandedRow===i?"rgba(26,90,140,0.12)":i%2===0?"transparent":"rgba(8,15,26,0.5)", transition:"background 0.15s" }}>
                  <div style={{ ...mono, fontSize:10, fontWeight:700, color:C.dim, paddingRight:10 }}>{row.category}</div>
                  {[{d:row.cloud,c:C.teal},{d:row.onprem,c:C.purple},{d:row.sap,c:C.gold}].map(({d,c},j) => (
                    <div key={j} style={{ paddingRight:12 }}>
                      <div style={{ display:"flex", gap:6, alignItems:"flex-start", marginBottom:4 }}>
                        <StatusDot s={d.status} />
                      </div>
                      <div style={{ fontSize:10, color:C.dim, lineHeight:1.5 }}>{d.impl}</div>
                    </div>
                  ))}
                </div>
                {expandedRow === i && (
                  <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr 1fr", gap:0, padding:"10px 14px", background:"rgba(26,90,140,0.07)", borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ ...mono, fontSize:10, color:C.mute }}>NOTES</div>
                    {[row.cloud, row.onprem, row.sap].map((d,j) => (
                      <div key={j} style={{ paddingRight:12 }}>
                        <div style={{ ...mono, fontSize:11, color:C.mute, fontStyle:"italic", lineHeight:1.5 }}>💡 {d.note}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {/* Legend */}
            <div style={{ display:"flex", gap:16, padding:"12px 14px", background:C.panel, borderRadius:"0 0 8px 8px", borderTop:`1px solid ${C.border}` }}>
              {[["BUILT","Built in cloud version, identical in all versions",C.green],["DELTA","Exists in cloud, different implementation needed",C.gold],["FUTURE","Not yet built, planned for that version",C.mute]].map(([l,d,c])=>(
                <div key={l} style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <span style={{ ...mono, fontSize:9, color:c, background:`${c}14`, border:`1px solid ${c}30`, borderRadius:3, padding:"1px 5px" }}>{l}</span>
                  <span style={{ fontSize:10, color:C.mute }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ── SAP DEEP DIVE TAB ───────────────────────────────────────────── */}
        {tab === "sap" && (
          <div style={{ maxWidth:820 }}>
            <div style={{ background:"rgba(255,215,0,0.05)", border:`1px solid rgba(255,215,0,0.2)`, borderRadius:10, padding:18, marginBottom:18 }}>
              <div style={{ ...mono, fontSize:10, fontWeight:700, color:C.gold, marginBottom:8 }}>⬛ SAP PROGRAMS — WHAT MAKES THEM DIFFERENT</div>
              <div style={{ fontSize:12, color:C.dim, lineHeight:1.8 }}>
                Special Access Programs (SAP) are the most sensitive DoD programs — F-35 weapons system data, nuclear systems, ISR collection, special operations programs. 
                SAP compliance is identical in framework to standard RMF (still 800-53) but the operating environment, personnel access model, and output handling are fundamentally different. 
                Your LM / F-35 background is direct experience with this world.
              </div>
            </div>
            {[
              {
                title:"Personnel Access Model",
                icon:"🔐",
                color:C.gold,
                items:[
                  { heading:"Read-in requirement", body:"Every user of RiskRadar in a SAP environment must be specifically 'read into' the program — not just cleared at the right level. The Special Security Officer (SSO) maintains the access roster. RiskRadar must query or maintain that roster as part of authentication." },
                  { heading:"PSO / SSO roles in RiskRadar", body:"The Program Security Officer needs a read-only compliance posture view. The SSO needs full audit log access and user access reports. Neither has POAM write access — that's the ISSO's domain." },
                  { heading:"Access accounting", body:"SAP programs require periodic certification of access needs — typically every 6 months. RiskRadar's audit trail needs to support this: who accessed what, when, for how long, what actions they took." },
                ]
              },
              {
                title:"Classification Markings on Outputs",
                icon:"📋",
                color:C.red,
                items:[
                  { heading:"Program-specific compartment markings", body:"A POAM in a SAP program doesn't just say 'SECRET.' It has the full classification string: 'SECRET // SAR-XX // NOFORN // RELIDO' where SAR-XX is the Special Access Required indicator for that specific program. RiskRadar needs an admin-configurable classification string field." },
                  { heading:"Vulnerability data classification", body:"The vulnerability findings themselves may be classified above SECRET if they reveal capabilities or limitations of the weapons system. The CVSS score of a vulnerability in the F-35 fire control system is not unclassified data." },
                  { heading:"Document control", body:"ATO packages and POAMs generated in a SAP environment must go through classified document control — tracked, numbered, distributed by need-to-know. RiskRadar's report download function needs to interface with or log to whatever document tracking system the program uses." },
                ]
              },
              {
                title:"Isolated Toolchain",
                icon:"🔌",
                color:C.blue,
                items:[
                  { heading:"No standard tool connectors", body:"There's no CrowdStrike Falcon in a SAP enclave. There's no Zscaler. The tools that exist in a SAP environment are approved specifically for that program and may be unique. RiskRadar's connector framework needs to be extensible — custom connectors that a program's admin can configure." },
                  { heading:"ACAS will exist", body:"ACAS (Tenable.sc) is almost universal even in classified environments. The file import model works fine — ACAS operator exports .nessus, transfers via approved media if networks are separate, ISSO imports into RiskRadar." },
                  { heading:"Built-in SCAP/OpenSCAP runner", body:"In environments without an ACAS, the built-in OpenSCAP runner we're building for Phase 2 becomes critical. It provides vulnerability and STIG compliance scanning without any external tool dependency." },
                ]
              },
              {
                title:"Update and Patch Process",
                icon:"📦",
                color:C.purple,
                items:[
                  { heading:"No internet-based updates ever", body:"RiskRadar on-prem updates for SAP environments are delivered via program-specific classified media handling procedures. This means packaging updates as signed, hash-verified archives that a classified sysadmin transfers via approved removable media." },
                  { heading:"PSO approval required", body:"Unlike a standard classified update process (ISSM + AO approve), SAP updates require PSO involvement. The update manifest — listing every changed file, new capability, and security fix — must be reviewed before installation." },
                  { heading:"LLM model updates", body:"If the AI model is updated (e.g., Llama 3 → Llama 3.1), the model weights themselves must go through the same approval process. Model weights are large (7–70GB) — this needs an efficient media transfer process for the classified context." },
                ]
              },
              {
                title:"F-35 JSF Specific Context",
                icon:"✈",
                color:C.orange,
                items:[
                  { heading:"Dual classification levels", body:"F-35 data exists at multiple levels — unclassified, CUI, Secret, and TS/SAP depending on what system and what data. A single ISSO often has to move between these environments. RiskRadar should eventually support separate instances for each level, each with appropriate controls." },
                  { heading:"Your competitive moat", body:"You've operated in this environment. Most GRC vendors haven't been within 100 miles of a SAP program. Your ability to design RiskRadar correctly for this context — classification markings, PSO roles, document control, compartment tracking — is a genuine moat that no Vanta, Drata, or Tugboat Logic can claim." },
                  { heading:"The sales path", body:"SAP program contracts are almost always sole-source after initial qualification. If you become the tool of record for one F-35 SAP environment, that contract has a very long tail and very low competitive pressure. These programs don't re-compete their security tools every year." },
                ]
              },
            ].map((section, si) => (
              <div key={si} style={{ background:C.panel, border:`1px solid ${section.color}20`, borderRadius:8, padding:18, marginBottom:12 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14 }}>
                  <span style={{ fontSize:20 }}>{section.icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:C.white }}>{section.title}</span>
                </div>
                {section.items.map((item, ii) => (
                  <div key={ii} style={{ marginBottom:12, paddingBottom:12, borderBottom: ii < section.items.length-1?`1px solid ${C.border}`:"none" }}>
                    <div style={{ ...mono, fontSize:10, fontWeight:700, color:section.color, marginBottom:4 }}>{item.heading}</div>
                    <div style={{ fontSize:11, color:C.dim, lineHeight:1.7 }}>{item.body}</div>
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