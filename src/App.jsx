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
import { AuthProvider, AuthModal, UserMenu, useAuth } from "./components/Auth.jsx";
import { SUPABASE_CONFIGURED, signOut } from "./supabase.js";

const mono = { fontFamily:"'Courier New',monospace" };

const NAV = [
  { id:"multi",   label:"Multi-Framework",   icon:"Ã°ÂÂÂ", desc:"800-53 ÃÂ· CMMC ÃÂ· CSRMC ÃÂ· SPRS" },
  { id:"assess",  label:"Self-Assessment",    icon:"Ã°ÂÂÂ", desc:"800-53 Rev 5 control assessment" },
  { id:"ato",     label:"ATO Generator",      icon:"Ã°ÂÂÂ", desc:"eMASS ÃÂ· DIBCAC ÃÂ· SPRS ÃÂ· SAV" },
  { id:"unified", label:"Security Dashboard", icon:"Ã°ÂÂÂ", desc:"All tool feeds in one screen" },
  { id:"poam",    label:"POAM Tracker",       icon:"Ã°ÂÂÂ", desc:"POAM management + eMASS export" },
  { id:"deploy",  label:"Deployment Guide",   icon:"Ã¢ÂÂ",  desc:"LM / F-35 deployment architecture" },
  { id:"roadmap", label:"Product Roadmap",    icon:"Ã°ÂÂÂ", desc:"Cloud SaaS Ã¢ÂÂ Classified Ã¢ÂÂ SAP" },
  { id:"templates", label:"Control Templates", icon:"Ã°ÂÂÂ", desc:"800-53 Rev 5 Ã¢ÂÂ all families + enhancements" },
  { id:"evidence",   label:"Evidence Tracker",    icon:"Ã°ÂÂÂ", desc:"Chain of custody ÃÂ· ATO evidence library" },
  { id:"scanner",   label:"Network Scanner",     icon:"Ã°ÂÂÂ¡", desc:"Nmap ÃÂ· SSH config ÃÂ· STIG compliance ÃÂ· POAM" },
  { id:"sprs",      label:"SPRS Calculator",     icon:"Ã°ÂÂÂ¯", desc:"NIST 800-171 ÃÂ· Live score ÃÂ· DoD SPRS submission" },
  { id:"nessus",    label:"Nessus Importer",     icon:"Ã°ÂÂÂ¥", desc:"ACAS ÃÂ· .nessus XML ÃÂ· DoD CAT I/II/III ÃÂ· POAM export" },
];

function AppInner() {
  const [theme, setTheme] = useState("dark");
  const [active, setActive] = useState("multi");
  const [showAuth, setShowAuth] = useState(false);
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const t = THEMES[theme];

  const renderView = () => {
    switch(active) {
      case "multi":   return <MultiFramework />;
      case "assess":  return <SelfAssessment />;
      case "ato":     return <ATOGenerator />;
      case "unified": return <UnifiedDashboard />;
      case "poam":    return <POAMTracker />;
      case "deploy":  return <DeploymentArch />;
      case "roadmap": return <ProductRoadmap />;
      case "templates": return <ControlTemplates />;
      case "evidence":  return <EvidenceTracker />;
      case "scanner":  return <NetworkScanner />;
      case "sprs":     return <SPRSCalculator />;
      case "nessus":  return <NessusImporter />;
      default:        return <MultiFramework />;
    }
  };

  const current = NAV.find(n => n.id === active);

  return (
    <ThemeContext.Provider value={theme}>
      <div style={{ display:"flex", minHeight:"100vh", background:t.bg, color:t.text }}>
        <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${t.bg}}::-webkit-scrollbar-thumb{background:${t.scroll};border-radius:2px}*{box-sizing:border-box;margin:0;padding:0;transition:background-color 0.2s,border-color 0.2s,color 0.2s}`}</style>

        {/* Sidebar */}
        <div style={{ width:sidebarOpen?220:60, background:t.headerBg, borderRight:`1px solid ${t.border}`, display:"flex", flexDirection:"column", flexShrink:0 }}>

          {/* Logo */}
          <div style={{ padding:"14px 12px", borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", gap:10, overflow:"hidden" }}>
            <BallardLogo />
            {sidebarOpen && (
              <div>
                
                
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <div style={{ padding:"10px 10px 4px", borderBottom:`1px solid ${t.border}` }}>
            {sidebarOpen ? (
              <div style={{ background:t.panel, border:`1px solid ${t.border}`, borderRadius:20, padding:"3px 4px", display:"flex", gap:2 }}>
                {["dark","light"].map(m => (
                  <button key={m} onClick={() => setTheme(m)}
                    style={{ flex:1, background:theme===m?A.teal:"transparent", border:"none", borderRadius:16, padding:"5px 0", cursor:"pointer", ...mono, fontSize:11, fontWeight:700, color:theme===m?"#020A10":t.mute }}>
                    {m === "dark" ? "Ã°ÂÂÂ DARK" : "Ã¢ÂÂ LIGHT"}
                  </button>
                ))}
              </div>
            ) : (
              <button onClick={() => setTheme(theme==="dark"?"light":"dark")}
                style={{ width:"100%", background:"transparent", border:`1px solid ${t.border}`, borderRadius:6, padding:"5px 0", cursor:"pointer", fontSize:14 }}>
                {theme === "dark" ? "Ã¢ÂÂ" : "Ã°ÂÂÂ"}
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
                      <div style={{ fontSize:11, fontWeight:isActive?600:400, color:isActive?A.teal:t.dim, whiteSpace:"nowrap" }}>{n.label}</div>
                      <div style={{ ...mono, fontSize:10, color:t.mute, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{n.desc}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Auth / persistence status */}
          {sidebarOpen && (
            <div style={{ padding:"10px 14px", borderTop:`1px solid ${t.border}` }}>
              {SUPABASE_CONFIGURED ? (
                user ? (
                  <div>
                    <div style={{ ...mono, fontSize:9, color:A.green, marginBottom:4, fontWeight:700 }}>Ã¢ÂÂ CLOUD SYNC ACTIVE</div>
                    <div style={{ fontSize:10, color:t.textDim, marginBottom:8, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {user.user_metadata?.org_name || user.email}
                    </div>
                    <button onClick={()=>signOut()}
                      style={{ ...mono, fontSize:10, background:"transparent", border:`1px solid ${t.border}`, color:t.mute, borderRadius:4, padding:"4px 10px", cursor:"pointer", width:"100%" }}>
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button onClick={()=>setShowAuth(true)}
                    style={{ ...mono, fontSize:10, background:`${A.teal}14`, border:`1px solid ${A.teal}40`, color:A.teal, borderRadius:5, padding:"8px 0", cursor:"pointer", width:"100%", fontWeight:700 }}>
                    Ã°ÂÂÂ SIGN IN TO SAVE DATA
                  </button>
                )
              ) : (
                <div style={{ ...mono, fontSize:9, color:t.mute, textAlign:"center", lineHeight:1.6 }}>
                  LOCAL MODE<br/>
                  <span style={{ fontSize:8 }}>Add .env to enable cloud sync</span>
                </div>
              )}
            </div>
          )}

          {/* Collapse */}
          <div onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ padding:"11px 12px", borderTop:`1px solid ${t.border}`, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:13, color:t.mute }}>{sidebarOpen ? "Ã¢ÂÂ" : "Ã¢ÂÂ¶"}</span>
            {sidebarOpen && <span style={{ ...mono, fontSize:11, color:t.mute }}>COLLAPSE</span>}
          </div>
        </div>

      {/* Auth modal */}
      {showAuth && <AuthModal onClose={()=>setShowAuth(false)} />}

        {/* Main */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", filter:theme==="light"?"invert(1) hue-rotate(180deg) saturate(0.7) brightness(1.05)":"none" }}>

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
              <div style={{ ...mono, fontSize:10, color:t.mute, background:`${A.teal}0A`, border:`1px solid ${A.teal}20`, borderRadius:4, padding:"4px 10px" }}>
                Ã¢ÂÂ DEMO MODE Ã¢ÂÂ GOVCLOUD BACKEND PENDING
              </div>
              <div style={{ ...mono, fontSize:10, color:A.green, background:`${A.green}0A`, border:`1px solid ${A.green}20`, borderRadius:4, padding:"4px 10px" }}>
                Ã¢ÂÂ ACME DEFENSE CORP
              </div>
            </div>
          </div>

          {/* View */}
          <div style={{ flex:1, overflowY:"auto" }}>
            {renderView()}
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  );

}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
