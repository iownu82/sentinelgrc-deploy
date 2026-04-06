import { useState, useEffect, createContext, useContext } from "react";
import { supabase, SUPABASE_CONFIGURED, signIn, signUp, signOut, getUser } from "../supabase.js";
import { useColors } from "../theme.js";

// ── Auth Context ──────────────────────────────────────────────────────────
export const AuthContext = createContext({ user: null, loading: true, systemId: "default" });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) { setLoading(false); return; }

    // Check current session
    getUser().then(u => { setUser(u); setLoading(false); });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const systemId = user?.user_metadata?.system_id || user?.id?.slice(0,8) || "default";

  return (
    <AuthContext.Provider value={{ user, loading, systemId }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Auth Modal ────────────────────────────────────────────────────────────
export function AuthModal({ onClose }) {
  const C = useColors();
  const mono = { fontFamily:"'Courier New',monospace" };
  const [mode, setMode]         = useState("signin"); // signin | signup
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);

    if (mode === "signin") {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
      else { setSuccess("Signed in!"); setTimeout(onClose, 800); }
    } else {
      if (!orgName) { setError("Organization name is required"); setLoading(false); return; }
      const { error } = await signUp(email, password, orgName);
      if (error) setError(error.message);
      else setSuccess("Account created! Check your email to confirm, then sign in.");
    }
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#060D16", border:`1px solid #1A3A5C`, borderRadius:12, padding:32, width:380, maxWidth:"90vw" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
          <div style={{ width:28, height:28, background:"linear-gradient(135deg,#00D4AA,#1A7AFF)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", ...mono, fontSize:13, fontWeight:900, color:"#060E18" }}>S</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#F0F8FF" }}>RiskRadar</div>
            <div style={{ ...mono, fontSize:9, color:"#3A5570", letterSpacing:0.8 }}>SECURE YOUR AUTHORIZATION</div>
          </div>
          <button onClick={onClose} style={{ marginLeft:"auto", background:"transparent", border:"none", color:"#3A5570", cursor:"pointer", fontSize:18 }}>✕</button>
        </div>

        {/* Mode tabs */}
        <div style={{ display:"flex", gap:2, background:"#040C16", borderRadius:6, padding:3, marginBottom:20 }}>
          {[["signin","Sign In"],["signup","Create Account"]].map(([m,l]) => (
            <button key={m} onClick={()=>{ setMode(m); setError(""); setSuccess(""); }}
              style={{ flex:1, ...mono, fontSize:11, background:mode===m?"#00D4AA":"transparent", color:mode===m?"#020A10":"#6A8FAA", border:"none", borderRadius:4, padding:"7px 0", cursor:"pointer", fontWeight:mode===m?700:400 }}>
              {l}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div style={{ marginBottom:14 }}>
              <div style={{ ...mono, fontSize:10, color:"#6A8FAA", marginBottom:5, fontWeight:600 }}>ORGANIZATION NAME</div>
              <input value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="Acme Defense Systems LLC"
                style={{ width:"100%", background:"#040C16", border:`1px solid #1A3A5C`, borderRadius:5, color:"#C8D8E8", padding:"8px 12px", fontSize:12, outline:"none" }} />
            </div>
          )}
          <div style={{ marginBottom:14 }}>
            <div style={{ ...mono, fontSize:10, color:"#6A8FAA", marginBottom:5, fontWeight:600 }}>EMAIL</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="isso@yourcompany.com" required
              style={{ width:"100%", background:"#040C16", border:`1px solid #1A3A5C`, borderRadius:5, color:"#C8D8E8", padding:"8px 12px", fontSize:12, outline:"none" }} />
          </div>
          <div style={{ marginBottom:20 }}>
            <div style={{ ...mono, fontSize:10, color:"#6A8FAA", marginBottom:5, fontWeight:600 }}>PASSWORD</div>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 8 characters" required minLength={8}
              style={{ width:"100%", background:"#040C16", border:`1px solid #1A3A5C`, borderRadius:5, color:"#C8D8E8", padding:"8px 12px", fontSize:12, outline:"none" }} />
          </div>

          {error   && <div style={{ ...mono, fontSize:11, color:"#FF4444", background:"rgba(255,68,68,0.08)", border:"1px solid rgba(255,68,68,0.2)", borderRadius:5, padding:"8px 12px", marginBottom:14 }}>⚠ {error}</div>}
          {success && <div style={{ ...mono, fontSize:11, color:"#00CC88", background:"rgba(0,204,136,0.08)", border:"1px solid rgba(0,204,136,0.2)", borderRadius:5, padding:"8px 12px", marginBottom:14 }}>✓ {success}</div>}

          <button type="submit" disabled={loading}
            style={{ width:"100%", background:loading?"#1A3A5C":"#00D4AA", border:"none", color:loading?"#6A8FAA":"#020A10", borderRadius:6, padding:"10px 0", cursor:loading?"not-allowed":"pointer", ...mono, fontSize:12, fontWeight:700 }}>
            {loading ? "..." : mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>
        </form>

        <div style={{ ...mono, fontSize:10, color:"#3A5570", textAlign:"center", marginTop:16, lineHeight:1.6 }}>
          Your data is encrypted at rest and in transit.<br/>
          Row-level security ensures only you see your assessments.
        </div>
      </div>
    </div>
  );
}

// ── User menu (shown in sidebar when logged in) ───────────────────────────
export function UserMenu({ onSignOut }) {
  const { user } = useAuth();
  const C = useColors();
  const mono = { fontFamily:"'Courier New',monospace" };

  if (!user) return null;
  const email = user.email || "";
  const org   = user.user_metadata?.org_name || "";

  return (
    <div style={{ padding:"10px 14px", borderTop:`1px solid ${C.border}`, marginTop:"auto" }}>
      <div style={{ fontSize:11, color:C.textDim, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        {org || email}
      </div>
      <div style={{ ...mono, fontSize:10, color:C.textMute, marginBottom:8, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        {org ? email : ""}
      </div>
      <button onClick={onSignOut}
        style={{ ...mono, fontSize:10, background:"transparent", border:`1px solid ${C.border}`, color:C.textMute, borderRadius:4, padding:"4px 10px", cursor:"pointer", width:"100%" }}>
        Sign Out
      </button>
    </div>
  );
}
