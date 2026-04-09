import { useState, useEffect, useCallback } from "react";
import { useColors, useTheme } from "../theme.js";
import { ALL_FAMILIES, loadFamily, prefetchFamily, isFamilyLoaded } from "./templates/index.js";

const C = { bg:"var(--rr-bg)", panel:"var(--rr-panel)", panelAlt:"var(--rr-panel-alt)", panel2:"var(--rr-panel-alt)", border:"var(--rr-border)", borderMd:"var(--rr-border-md)", text:"var(--rr-text)", textDim:"var(--rr-text-dim)", dim:"var(--rr-text-dim)", textMute:"var(--rr-mute)", mute:"var(--rr-mute)", white:"var(--rr-white)", input:"var(--rr-input)", inputBorder:"var(--rr-input-bdr)", rowA:"var(--rr-row-a)", rowB:"var(--rr-row-b)", scroll:"var(--rr-scroll)", headerBg:"var(--rr-header)", teal:"var(--rr-teal)", blue:"var(--rr-blue)", red:"var(--rr-red)", orange:"var(--rr-orange)", gold:"var(--rr-gold)", green:"var(--rr-green)", purple:"var(--rr-purple)" };

// ── Environment tools ─────────────────────────────────────────────────────────
const ALL_TOOLS = [
  { id:"juniper",    label:"Juniper Routers",         cat:"Network",   default:true  },
  { id:"cisco9300",  label:"Cisco 9300 Switches",     cat:"Network",   default:true  },
  { id:"paloalto",   label:"Palo Alto Firewalls",     cat:"Network",   default:true  },
  { id:"ivanti",     label:"Ivanti VPN",              cat:"Network",   default:true  },
  { id:"zscaler",    label:"Zscaler ZIA",             cat:"Network",   default:true  },
  { id:"dns",        label:"DNS Servers",             cat:"Network",   default:true  },
  { id:"dhcp",       label:"DHCP Servers",            cat:"Network",   default:true  },
  { id:"win11",      label:"Windows 11 Workstations", cat:"Endpoint",  default:true  },
  { id:"server2016", label:"Windows Server 2016",     cat:"Endpoint",  default:true  },
  { id:"server2019", label:"Windows Server 2019",     cat:"Endpoint",  default:true  },
  { id:"server2022", label:"Windows Server 2022",     cat:"Endpoint",  default:true  },
  { id:"rhel",       label:"RHEL / Linux Systems",    cat:"Endpoint",  default:false },
  { id:"ad",         label:"Active Directory",        cat:"Identity",  default:true  },
  { id:"cac",        label:"DoD CAC / PKI",           cat:"Identity",  default:true  },
  { id:"mfa",        label:"MFA (CAC-based)",         cat:"Identity",  default:true  },
  { id:"crowdstrike",label:"CrowdStrike Falcon",      cat:"Security",  default:true  },
  { id:"hbss",       label:"Trellix / HBSS",          cat:"Security",  default:true  },
  { id:"acas",       label:"ACAS / Nessus Scanner",   cat:"Security",  default:true  },
  { id:"tenablesc",  label:"Tenable.sc",              cat:"Security",  default:true  },
  { id:"stig",       label:"DISA STIG / SRG",         cat:"Security",  default:true  },
  { id:"scap",       label:"SCAP Compliance Checker", cat:"Security",  default:true  },
  { id:"splunk",     label:"Splunk SIEM",             cat:"Security",  default:true  },
  { id:"defender",   label:"Microsoft Defender MDE",  cat:"Security",  default:false },
  { id:"emass",      label:"eMASS",                   cat:"GRC",       default:true  },
  { id:"wsus",       label:"WSUS / SCCM Patch Mgmt",  cat:"GRC",       default:true  },
  { id:"gpo",        label:"Group Policy (GPO)",      cat:"GRC",       default:true  },
  { id:"aws",        label:"AWS GovCloud",            cat:"Cloud",     default:false },
  { id:"azure",      label:"Azure Government",        cat:"Cloud",     default:false },
];
// ── Render template with active tools ─────────────────────────────────────────
function renderTemplate(body, activeTools, orgFields) {
  let text = body;
  Object.entries(orgFields).forEach(([k,v]) => {
    text = text.replace(new RegExp(`\\[${k}\\]`, 'g'), v || `[${k}]`);
  });
  ALL_TOOLS.forEach(tool => {
    const regex = new RegExp(`\\[TOOL:${tool.id}\\]`, 'g');
    if (activeTools.has(tool.id)) {
      text = text.replace(regex, tool.label);
    } else {
      text = text.replace(regex, `__REMOVE_${tool.id}__`);
    }
  });
  // Clean up removed tool references
  text = text.replace(/[^.!?]*__REMOVE_\w+__[^.!?]*[.!?]\s*/g, '');
  text = text.replace(/__REMOVE_\w+__/g, '');
  text = text.replace(/\s{2,}/g, ' ').replace(/,\s*\./g, '.').replace(/\(\s*\)/g, '');
  return text.trim();
}
// ── Main component ────────────────────────────────────────────────────────────
export default function ControlTemplates() {
  const theme = useTheme();
  const mono = { fontFamily:"'Courier New',monospace" };
  const [activeFamily, setActiveFamily]   = useState("AC");
  const [activeControl, setActiveControl] = useState("AC-2");
  const [familyTemplates, setFamilyTemplates] = useState({});
  const [loading, setLoading]             = useState(false);
  const [activeTools, setActiveTools]     = useState(new Set(ALL_TOOLS.filter(t=>t.default).map(t=>t.id)));
  const [orgFields, setOrgFields]         = useState({ ORG:"[ORG NAME]", SYSTEM:"[SYSTEM NAME]", ISSO:"[ISSO Name]", ISSM:"[ISSM Name]", AO:"[AO Name]", SCA:"[SCA Name]" });
  const [editMode, setEditMode]           = useState(false);
  const [customText, setCustomText]       = useState("");
  const [savedStatements, setSavedStatements] = useState({});
  const [showTools, setShowTools]         = useState(false);
  const [copied, setCopied]               = useState(false);
  // Load family on selection
  useEffect(() => {
    setLoading(true);
    loadFamily(activeFamily).then(templates => {
      setFamilyTemplates(templates);
      const controls = Object.keys(templates);
      if (controls.length > 0 && !templates[activeControl]) {
        setActiveControl(controls[0]);
      }
      setLoading(false);
    });
  }, [activeFamily]);
  const family     = ALL_FAMILIES.find(f => f.id === activeFamily);
  const template   = familyTemplates[activeControl];
  const isSaved    = !!savedStatements[activeControl];
  const renderedText = template
    ? renderTemplate(template.body, activeTools, orgFields)
    : "";
  const displayText = editMode
    ? customText
    : (savedStatements[activeControl] || renderedText);
  const toggleTool = (id) => {
    setActiveTools(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
  };
  const saveStatement = () => {
    setSavedStatements(prev => ({ ...prev, [activeControl]: customText || renderedText }));
    setEditMode(false);
  };
  const copyToClipboard = () => {
    navigator.clipboard?.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleFamilyClick = (fid) => {
    setActiveFamily(fid);
    setEditMode(false);
  };
  const toolCategories = [...new Set(ALL_TOOLS.map(t => t.cat))];
  const familyControls = Object.keys(familyTemplates);
  // Count saved per family
  const savedCount = (fid) => {
    const fam = ALL_FAMILIES.find(f => f.id === fid);
    if (!fam) return 0;
    return Object.keys(savedStatements).filter(k => k.startsWith(fid + "-") || k.startsWith(fid)).length;
  };
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Helvetica Neue',Arial,sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.scroll||C.inputBorder};border-radius:2px}`}</style>
      {/* Header */}
      <div style={{ background:C.headerBg||C.panel, borderBottom:`1px solid ${C.border}`, padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:30, height:30, background:"linear-gradient(135deg,#00D4AA,#1A7AFF)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:14, fontWeight:900, color:C.bg }}>S</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.white }}>RiskRadar — Control Statement Templates</div>
            <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8 }}>800-53 REV 5 COMPLETE · 20 FAMILIES · ALL BASE CONTROLS + ENHANCEMENTS · LAZY-LOADED</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <button onClick={() => setShowTools(!showTools)}
            style={{ ...mono, background:showTools?`${C.teal}1A`:"transparent", border:`1px solid ${showTools?`${C.teal}4D`:C.border}`, color:showTools?C.teal:C.textDim, borderRadius:5, padding:"6px 14px", cursor:"pointer", fontSize:10 }}>
            ⚙ ENVIRONMENT TOOLS ({activeTools.size}/{ALL_TOOLS.length})
          </button>
          <div style={{ ...mono, fontSize:10, color:C.green, background:`${C.green}0F`, border:"1px solid rgba(0,204,136,0.2)", borderRadius:4, padding:"4px 10px" }}>
            {Object.keys(savedStatements).length} STATEMENTS SAVED
          </div>
        </div>
      </div>
      {/* Org field bar */}
      <div style={{ background:C.panel2||C.panel, borderBottom:`1px solid ${C.border}`, padding:"8px 20px", display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ ...mono, fontSize:11, color:C.textMute, whiteSpace:"nowrap" }}>YOUR ORG:</span>
        {Object.entries(orgFields).map(([k,v]) => (
          <div key={k} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ ...mono, fontSize:10, color:C.textMute }}>{k}:</span>
            <input value={v} onChange={e => setOrgFields(p=>({...p,[k]:e.target.value}))}
              style={{ background:C.input||C.panel, border:`1px solid ${C.inputBorder||C.border}`, borderRadius:4, color:C.text, padding:"3px 8px", fontSize:10, fontFamily:"monospace", outline:"none", width:140 }} />
          </div>
        ))}
      </div>
      {/* Tool panel */}
      {showTools && (
        <div style={{ background:C.panel, borderBottom:`1px solid ${C.border}`, padding:"14px 20px" }}>
          <div style={{ ...mono, fontSize:11, color:C.textMute, letterSpacing:1, marginBottom:12 }}>TOGGLE TOOLS ON/OFF — STATEMENTS AUTO-UPDATE TO MATCH YOUR ENVIRONMENT</div>
          <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
            {toolCategories.map(cat => (
              <div key={cat}>
                <div style={{ ...mono, fontSize:10, color:C.teal, marginBottom:8, fontWeight:700 }}>{cat.toUpperCase()}</div>
                {ALL_TOOLS.filter(t=>t.cat===cat).map(tool => {
                  const on = activeTools.has(tool.id);
                  return (
                    <div key={tool.id} onClick={() => toggleTool(tool.id)}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", borderRadius:5, marginBottom:3, cursor:"pointer", background:on?`${C.teal}14`:"transparent", border:`1px solid ${on?`${C.teal}40`:C.border}` }}>
                      <div style={{ width:14, height:14, borderRadius:3, border:`2px solid ${on?C.teal:C.textMute}`, background:on?C.teal:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {on && <span style={{ color:C.bg, fontSize:11, fontWeight:900 }}>✓</span>}
                      </div>
                      <span style={{ fontSize:11, color:on?C.white:C.textDim, whiteSpace:"nowrap" }}>{tool.label}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 3-column layout */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"160px 220px 1fr", overflow:"hidden", height:"calc(100vh - 120px)" }}>
        {/* Col 1: Families */}
        <div style={{ borderRight:`1px solid ${C.border}`, overflowY:"auto", background:C.panel }}>
          <div style={{ padding:"10px 12px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:1 }}>20 FAMILIES</div>
          </div>
          {ALL_FAMILIES.map(f => {
            const loaded = isFamilyLoaded(f.id);
            return (
              <div key={f.id}
                onClick={() => handleFamilyClick(f.id)}
                onMouseEnter={() => prefetchFamily(f.id)}
                style={{ padding:"10px 12px", borderBottom:`1px solid ${C.border}`, cursor:"pointer", background:activeFamily===f.id?`${C.teal}14`:"transparent", borderLeft:activeFamily===f.id?"3px solid #00D4AA":"3px solid transparent" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ ...mono, fontWeight:700, fontSize:12, color:activeFamily===f.id?C.teal:C.textDim }}>{f.id}</span>
                  <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                    {loaded && <span style={{ ...mono, fontSize:9, color:C.green }}>●</span>}
                    <span style={{ ...mono, fontSize:10, color:C.textMute }}>{f.baseCount + f.enhCount}</span>
                  </div>
                </div>
                <div style={{ fontSize:10, color:C.textMute, marginTop:2, lineHeight:1.3 }}>{f.name}</div>
              </div>
            );
          })}
        </div>
        {/* Col 2: Controls */}
        <div style={{ borderRight:`1px solid ${C.border}`, overflowY:"auto", background:C.panel2||C.panel }}>
          <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ ...mono, fontSize:11, fontWeight:700, color:C.teal }}>{family?.id} — {family?.name}</div>
            <div style={{ ...mono, fontSize:10, color:C.textMute, marginTop:2 }}>{family?.baseCount} base · {family?.enhCount} enhancements</div>
          </div>
          {loading ? (
            <div style={{ padding:"20px 14px", ...mono, fontSize:10, color:C.textMute }}>Loading {activeFamily} controls...</div>
          ) : (
            familyControls.map(ctrlId => {
              const tmpl = familyTemplates[ctrlId];
              const isEnh = ctrlId.includes("(");
              const saved = !!savedStatements[ctrlId];
              const isActive = activeControl === ctrlId;
              return (
                <div key={ctrlId} onClick={() => { setActiveControl(ctrlId); setEditMode(false); }}
                  style={{ padding:isEnh?"8px 14px 8px 24px":"11px 14px", borderBottom:`1px solid ${C.border}`, cursor:"pointer", background:isActive?`${C.teal}14`:"transparent", borderLeft:isActive?"3px solid #00D4AA":"3px solid transparent" }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:2 }}>
                    <span style={{ ...mono, fontWeight:700, fontSize:isEnh?10:11, color:isActive?C.teal:isEnh?C.textMute:C.blue }}>{ctrlId}</span>
                    {saved && <span style={{ ...mono, fontSize:9, color:C.green, background:`${C.green}1A`, border:"1px solid rgba(0,204,136,0.3)", borderRadius:3, padding:"1px 4px" }}>✓</span>}
                  </div>
                  <div style={{ fontSize:isEnh?9:10, color:isActive?C.text:C.textDim, lineHeight:1.4 }}>{tmpl?.title}</div>
                </div>
              );
            })
          )}
        </div>
        {/* Col 3: Statement editor */}
        <div style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {template ? (
            <>
              {/* Control header */}
              <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, background:C.panel, display:"flex", gap:12, alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                    <span style={{ ...mono, fontWeight:700, fontSize:14, color:C.teal }}>{activeControl}</span>
                    <span style={{ ...mono, fontSize:10, color:C.blue }}>{template.title}</span>
                    {isSaved && <span style={{ ...mono, fontSize:10, color:C.green, background:`${C.green}1A`, border:"1px solid rgba(0,204,136,0.3)", borderRadius:3, padding:"1px 6px" }}>SAVED</span>}
                  </div>
                  {template.tools.length > 0 && (
                    <div style={{ fontSize:10, color:C.textMute }}>
                      Tools: {template.tools.filter(id => activeTools.has(id)).map(id => ALL_TOOLS.find(t=>t.id===id)?.label).filter(Boolean).join(", ") || "None in current environment"}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {!editMode ? (
                    <>
                      <button onClick={copyToClipboard}
                        style={{ ...mono, background:"transparent", border:`1px solid ${C.border}`, color:copied?C.green:C.textDim, borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:10 }}>
                        {copied ? "✓ COPIED" : "⎘ COPY"}
                      </button>
                      <button onClick={() => { setCustomText(savedStatements[activeControl]||renderedText); setEditMode(true); }}
                        style={{ ...mono, background:`${C.blue}14`, border:"1px solid rgba(26,122,255,0.25)", color:C.blue, borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:10 }}>
                        ✏ EDIT
                      </button>
                      <button onClick={() => setSavedStatements(p=>({...p,[activeControl]:renderedText}))}
                        style={{ ...mono, background:`${C.teal}14`, border:"1px solid rgba(0,212,170,0.25)", color:C.teal, borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:10, fontWeight:700 }}>
                        ✓ SAVE
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditMode(false)}
                        style={{ ...mono, background:"transparent", border:`1px solid ${C.border}`, color:C.textMute, borderRadius:4, padding:"5px 12px", cursor:"pointer", fontSize:10 }}>CANCEL</button>
                      <button onClick={saveStatement}
                        style={{ ...mono, background:C.teal, border:"none", color:C.bg, borderRadius:4, padding:"5px 14px", cursor:"pointer", fontSize:10, fontWeight:700 }}>✓ SAVE</button>
                    </>
                  )}
                </div>
              </div>
              {/* Statement */}
              <div style={{ flex:1, overflowY:"auto", padding:20 }}>
                {editMode ? (
                  <div>
                    <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:8 }}>EDITING — CUSTOMIZE AS NEEDED</div>
                    <textarea value={customText} onChange={e=>setCustomText(e.target.value)}
                      style={{ width:"100%", minHeight:360, background:C.input||C.panel, border:"1px solid #00D4AA", borderRadius:8, color:C.text, padding:16, fontSize:12, fontFamily:"inherit", lineHeight:1.8, outline:"none", resize:"vertical" }} />
                    <div style={{ ...mono, fontSize:11, color:C.textMute, marginTop:8 }}>
                      Edit the statement above. Remove tool references that don't apply. Add site-specific details. Click SAVE when complete.
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:12 }}>
                      {isSaved ? "SAVED STATEMENT (customized)" : "AUTO-GENERATED (from your environment)"}
                    </div>
                    <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:20, marginBottom:14 }}>
                      <p style={{ fontSize:12, color:C.text, lineHeight:1.9, whiteSpace:"pre-wrap" }}>{displayText}</p>
                    </div>
                    {template.tools.length > 0 && (
                      <div style={{ background:C.panel2||C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:14 }}>
                        <div style={{ ...mono, fontSize:10, color:C.textMute, letterSpacing:0.8, marginBottom:10 }}>TOOL COVERAGE — CLICK TO TOGGLE</div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {template.tools.map(id => {
                            const tool = ALL_TOOLS.find(t=>t.id===id);
                            const inEnv = activeTools.has(id);
                            return (
                              <div key={id} onClick={() => toggleTool(id)}
                                style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:5, cursor:"pointer", background:inEnv?`${C.teal}14`:`${C.red}0F`, border:`1px solid ${inEnv?`${C.teal}40`:`${C.red}33`}` }}>
                                <span style={{ fontSize:11 }}>{inEnv?"✓":"✗"}</span>
                                <span style={{ fontSize:10, color:inEnv?C.teal:C.red }}>{tool?.label||id}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ ...mono, fontSize:11, color:C.textMute, marginTop:8 }}>
                          Red = not in your environment (removed from statement). Toggle on to add back.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : loading ? (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:C.textMute, fontSize:13 }}>
              Loading {activeFamily} templates...
            </div>
          ) : (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:C.textMute, fontSize:13 }}>
              Select a control to view its statement template
            </div>
          )}
        </div>
      </div>
    </div>
  );
}