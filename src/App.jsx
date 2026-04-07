import { useState } from "react";
import { BallardLogo } from './components/BallardLogo';
import MultiFramework from "./components/MultiFramework.jsx";
import SelfAssessment from "./components/SelfAssessment.jsx";
import ATOGenerator from "./components/ATOGenerator.jsx";
import UnifiedDashboard from "./components/UnifiedDashboard.jsx";
import POAMTracker from "./components/POAMTracker.jsx";
import DeploymentArch from "./components/DeploymentArch.jsx";
import ProductRoadmap from "./components/ProductRoadmap.jsx";
import { ThemeContext, THEMES, A } from "./theme.js";
import ControlTemplates from "./components/ControlTemplates.jsx";
import EvidenceTracker from "./components/EvidenceTracker.jsx";
import NetworkScanner from "./components/NetworkScanner.jsx";
import SPRSCalculator from "./components/SPRSCalculator.jsx";
import NessusImporter from "./components/NessusImporter.jsx";
import { AuthProvider, UserMenu, useAuth } from "./components/Auth.jsx";
import RulesOfBehaviorModal, { useROBAccepted } from "./components/RulesOfBehavior.jsx";
import SetupPage from "./components/SetupPage.jsx";
import ISSODesignation from "./components/ISSODesignation.jsx";
import ISSOInviteAcceptance from "./components/ISSOInviteAcceptance.jsx";
import YubiKeyTest from "./components/YubiKeyTest.jsx";
import AdminConsole from "./components/AdminConsole.jsx";
import UpdatesFeed from "./components/UpdatesFeed.jsx";

const mono = { fontFamily:"'Courier New',monospace" };

const NAV = [
  { id:"multi",     label:"Multi-Framework",   icon:"🌐", desc:"800-53 · CMMC · CSRMC · SPRS" },
  { id:"assess",    label:"Self-Assessment",    icon:"📋", desc:"800-53 Rev 5 control assessment" },
  { id:"ato",       label:"ATO Generator",      icon:"🏛", desc:"eMASS · DIBCAC · SPRS · SAV" },
  { id:"unified",   label:"Security Dashboard", icon:"🔍", desc:"All tool feeds in one screen" },
  { id:"poam",      label:"POAM Tracker",       icon:"📊", desc:"POAM management + eMASS export" },
  { id:"deploy",    label:"Deployment Guide",   icon:"☁",  desc:"LM / F-35 deployment architecture" },
  { id:"roadmap",   label:"Product Roadmap",    icon:"🚀", desc:"Cloud SaaS → Classified → SAP" },
  { id:"templates", label:"Control Templates",  icon:"📝", desc:"800-53 Rev 5 — all families" },
  { id:"evidence",  label:"Evidence Tracker",   icon:"🗂", desc:"Chain of custody · ATO evidence library" },
  { id:"scanner",   label:"Network Scanner",    icon:"📡", desc:"Nmap · SSH config · STIG compliance · POAM" },
  { id:"sprs",      label:"SPRS Calculator",    icon:"🎯", desc:"NIST 800-171 · Live score · DoD SPRS submission" },
  { id:"nessus",    label:"Nessus Importer",    icon:"📥", desc:"ACAS · .nessus XML · DoD CAT I/II/III · POAM export" },
  { id:"updates",   label:"Security Updates",    icon:"🔄", desc:"NIST NVD · CISA KEV · DISA STIG/IAVA · DVD ISO transfer" },
  { id:"admin",     label:"Admin Console",       icon:"🛡",  desc:"Org management · Bootstrap tokens · User oversight" },
  { id:"yubikey",   label:"YubiKey / MFA Test",   icon:"🔐", desc:"FIDO2 enrollment · WebAuthn test · Hardware MFA" },
];

// ─── Dashboard (shown after auth) ────────────────────────────────────────────
function Dashboard() {
  const [theme, setTheme] = useState("dark");
  const [active, setActive] = useState("multi");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { member, org, role, isDemo } = useAuth();
  const robAccepted = useROBAccepted(member?.id);
  const [showROB, setShowROB] = useState(!robAccepted);

  const t = THEMES[theme];

  const renderView = () => {
    switch(active) {
      case "multi":     return <MultiFramework />;
      case "assess":    return <SelfAssessment />;
      case "ato":       return <ATOGenerator />;
      case "unified":   return <UnifiedDashboard />;
      case "poam":      return <POAMTracker />;
      case "deploy":    return <DeploymentArch />;
      case "roadmap":   return <ProductRoadmap />;
      case "templates": return <ControlTemplates />;
      case "evidence":  return <EvidenceTracker />;
      case "scanner":   return <NetworkScanner />;
      case "sprs":      return <SPRSCalculator />;
      case "nessus":    return <NessusImporter />;
      case "updates":   return <UpdatesFeed />;
      case "admin":     return <AdminConsole />;
      case "yubikey":   return <YubiKeyTest />;
      default:          return <MultiFramework />;
    }
  };

  const current = NAV.find(n => n.id === active);
  const roleLabel = { issm:'ISSM', isso:'ISSO', assessor:'ASSESSOR',
                       auditor:'AUDITOR', readonly:'READ-ONLY' }[role] || role?.toUpperCase();

  return (
    <>
      {showROB && <RulesOfBehaviorModal onAccept={()=>setShowROB(false)} />}
      <ThemeContext.Provider value={theme}>
      <div style={{ display:"flex", minHeight:"100vh", background:t.bg, color:t.text }}>
        <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${t.bg}}::-webkit-scrollbar-thumb{background:${t.scroll};border-radius:2px}*{box-sizing:border-box;margin:0;padding:0;transition:background-color 0.2s,border-color 0.2s,color 0.2s}`}</style>

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <div style={{ width:sidebarOpen?220:60, background:t.headerBg, borderRight:`1px solid ${t.border}`, display:"flex", flexDirection:"column", flexShrink:0 }}>

          {/* Logo */}
          <div style={{ padding:"14px 12px", borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", gap:10, overflow:"hidden" }}>
            <BallardLogo />
          </div>

          {/* Theme toggle */}
          <div style={{ padding:"10px 10px 4px", borderBottom:`1px solid ${t.border}` }}>
            {sidebarOpen ? (
              <div style={{ background:t.panel, border:`1px solid ${t.border}`, borderRadius:20, padding:"3px 4px", display:"flex", gap:2 }}>
                {["dark","light"].map(m => (
                  <button key={m} onClick={() => setTheme(m)}
                    style={{ flex:1, background:theme===m?A.teal:"transparent", border:"none", borderRadius:16, padding:"5px 0", cursor:"pointer", ...mono, fontSize:11, fontWeight:700, color:theme===m?"#020A10":t.mute }}>
                    {m === "dark" ? "🌙 DARK" : "☀ LIGHT"}
                  </button>
                ))}
              </div>
            ) : (
              <button onClick={() => setTheme(theme==="dark"?"light":"dark")}
                style={{ width:"100%", background:"transparent", border:`1px solid ${t.border}`, borderRadius:6, padding:"5px 0", cursor:"pointer", fontSize:14 }}>
                {theme === "dark" ? "☀" : "🌙"}
              </button>
            )}
          </div>

          {/* Nav */}
          <nav style={{ flex:1, padding:"8px 8px", overflowY:"auto" }}>
            {NAV.map(n => {
              const isActive = active === n.id;
              return (
                <div key={n.id} onClick={() => setActive(n.id)}
                  title={!sidebarOpen ? n.label : ""}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:7, marginBottom:3, cursor:"pointer", background:isActive?`${A.teal}14`:"transparent", border:isActive?`1px solid ${A.teal}30`:"1px solid transparent", overflow:"hidden" }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>{n.icon}</span>
                  {sidebarOpen && (
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:isActive?A.teal:(theme==="light"?"#111111":t.dim), whiteSpace:"nowrap" }}>{n.label}</div>
                      <div style={{ ...mono, fontSize:10, color:theme==="light"?"#444444":t.mute, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{n.desc}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Org / Role status */}
          {sidebarOpen && (
            <div style={{ padding:"10px 14px", borderTop:`1px solid ${t.border}` }}>
              <div style={{ ...mono, fontSize:9, color:A.green, marginBottom:4, fontWeight:700 }}>
                ● SESSION ACTIVE
              </div>
              <div style={{ fontSize:10, color:t.textDim, marginBottom:4, ...mono }}>
                {org?.name || (isDemo ? 'Ballard IS3 (Demo)' : 'No Org')}
              </div>
              <div style={{ fontSize:9, color:'#4a7a9b', ...mono, letterSpacing:1 }}>
                ROLE: {roleLabel || 'UNKNOWN'}{isDemo ? ' · DEMO' : ''}
              </div>
            </div>
          )}

          {/* Collapse toggle */}
          <div onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ padding:"11px 12px", borderTop:`1px solid ${t.border}`, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:13, color:t.mute }}>{sidebarOpen ? "◀" : "▶"}</span>
            {sidebarOpen && <span style={{ ...mono, fontSize:11, color:t.mute }}>COLLAPSE</span>}
          </div>
        </div>

        {/* ── Main panel ──────────────────────────────────────────────── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Top bar */}
          <div style={{ background:t.headerBg, borderBottom:`1px solid ${t.border}`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:18 }}>{current?.icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:t.white }}>{current?.label}</div>
                <div style={{ ...mono, fontSize:11, color:t.mute }}>{current?.desc}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {isDemo && (
                <div style={{ ...mono, fontSize:10, color:t.mute, background:`${A.teal}0A`, border:`1px solid ${A.teal}20`, borderRadius:4, padding:"4px 10px" }}>
                  ● DEMO MODE — GOVCLOUD BACKEND PENDING
                </div>
              )}
              <div style={{ ...mono, fontSize:10, color:A.green, background:`${A.green}0A`, border:`1px solid ${A.green}20`, borderRadius:4, padding:"4px 10px" }}>
                ● {org?.name || 'BALLARD IS3'}
              </div>
              <UserMenu />
            </div>
          </div>

          {/* Active view */}
          <div style={{ flex:1, overflowY:"auto" }}>
            {renderView()}
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
    </>
  );
}

// ─── Root — Auth gates everything ────────────────────────────────────────────
export default function App() {
  // Detect setup/invite URL params BEFORE auth gate renders
  const params = new URLSearchParams(window.location.search);
  const setupToken  = params.get('setup');
  const issoToken   = params.get('isso');
  const orgSlug     = params.get('org') || '';

  // ISSM bootstrap setup flow
  if (setupToken) {
    return <SetupPage token={setupToken} orgSlug={orgSlug}
      onComplete={(next) => {
        if (next === 'isso_designation') {
          window.history.replaceState({}, '', '/');
          window.location.reload();
        }
      }} />;
  }

  // ISSO invite acceptance flow
  if (issoToken) {
    return <ISSOInviteAcceptance token={issoToken} orgSlug={orgSlug}
      onComplete={() => {
        window.history.replaceState({}, '', '/');
        window.location.reload();
      }} />;
  }

  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
