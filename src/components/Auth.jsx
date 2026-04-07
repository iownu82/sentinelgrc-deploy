import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { useColors } from '../theme.js';
import { supabase, SUPABASE_CONFIGURED } from '../supabase.js';
import { pbkdf2Stretch, generateSessionId, constantTimeEqual } from '../auth/crypto.js';

// ═══ SECURITY CONSTANTS — Matches Security Architecture Spec ═════════════════
const MAX_ATTEMPTS       = 3;                    // AC-7: lockout after 3 failures
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;      // AC-11: 15-min inactivity
const S = {                                       // Storage keys (namespaced)
  BANNER:   'rr_banner_v1',
  ATTEMPTS: 'rr_atm_',                            // + email suffix
  LOCKED:   'rr_lck_',                            // + email suffix
  RULES:    'rr_rules_v1',
  SID:      'rr_sid',
};

// ═══ DEMO MODE — Active when Supabase is not configured ══════════════════════
const DEMO = {
  email: 'admin@ballardis3.com',
  pass:  'DemoAdmin2026RR',
  mfa:   '000000',
  role:  'issm',
  name:  'Fredrick Ballard',
  org:   'Ballard IS3 — Test Org',
  slug:  'ballard-is3',
  cyber: '2026-03-15',
};

// ═══ AUTH CONTEXT ════════════════════════════════════════════════════════════
export const AuthContext = createContext({ user:null, member:null, org:null, isDemo:true });
export const useAuth = () => useContext(AuthContext);

// ═══ AUTH PROVIDER ════════════════════════════════════════════════════════════
export function AuthProvider({ children }) {
  const [phase, setPhase]         = useState('init');
  const [user,  setUser]          = useState(null);
  const [member,setMember]        = useState(null);
  const [org,   setOrg]           = useState(null);
  const [tmpEmail, setTmpEmail]   = useState('');
  const [lockEmail,setLockEmail]  = useState('');
  const [err,   setErr]           = useState('');
  const timer   = useRef(null);
  const sid     = useRef(generateSessionId());

  // ── Startup ────────────────────────────────────────────────────────────
  useEffect(() => {
    const bannerOk = sessionStorage.getItem(S.BANNER);
    if (!bannerOk) { setPhase('banner'); return; }
    if (!SUPABASE_CONFIGURED) {
      if (email.toLowerCase() === DEMO.email && password === DEMO.pass) {
        success = true; setTmpEmail(email); setPhase('mfa');
      }
    } else { setPhase('login'); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) { setPhase('login'); setUser(null); setMember(null); setOrg(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Org member loader ──────────────────────────────────────────────────
  const loadMember = async (uid) => {
    if (!supabase) return false;
    const { data, error } = await supabase
      .from('org_members')
      .select('*, organizations(*)')
      .eq('user_id', uid).eq('status','active').single();
    if (error || !data) return false;
    if (data.account_expires_at && new Date(data.account_expires_at) < new Date()) {
      setPhase('cyber_expired'); return false;
    }
    setMember(data); setOrg(data.organizations); return true;
  };

  // ── Inactivity timer (AC-11) ───────────────────────────────────────────
  const resetTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPhase('session_expired');
      setUser(null); setMember(null); setOrg(null);
      sessionStorage.clear();
      if (supabase) supabase.auth.signOut();
    }, SESSION_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (phase !== 'active') return;
    const evts = ['mousedown','keydown','touchstart','click','scroll'];
    evts.forEach(e => window.addEventListener(e, resetTimer, { passive:true }));
    resetTimer();
    return () => {
      evts.forEach(e => window.removeEventListener(e, resetTimer));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [phase, resetTimer]);

  // ── Banner accept ──────────────────────────────────────────────────────
  const acceptBanner = () => {
    sessionStorage.setItem(S.BANNER, Date.now().toString());
    sessionStorage.setItem(S.RULES,  new Date().toISOString());
    setPhase('login');
  };

  // ── Login (IA-5, AC-7) ─────────────────────────────────────────────────
  const doLogin = async (email, password) => {
    setErr('');
    const atmKey = S.ATTEMPTS + btoa(email).slice(0,16);
    const lckKey = S.LOCKED   + btoa(email).slice(0,16);
    if (localStorage.getItem(lckKey)) { setLockEmail(email); setPhase('locked'); return; }
    const atms = parseInt(localStorage.getItem(atmKey) || '0');

    // PBKDF2 client-side stretch — raw password NEVER transmitted
    let dk;
    try { dk = await pbkdf2Stretch(password, email, 'default'); }
    catch { setErr('Security init failed. Retry.'); return; }

    let ok = false;
    if (!SUPABASE_CONFIGURED) {
      const ek = await pbkdf2Stretch(DEMO.pass, DEMO.email, 'default');
      ok = constantTimeEqual(email.toLowerCase(), DEMO.email) && constantTimeEqual(dk, ek);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: dk });
      if (!error && data.user) { setUser(data.user); ok = true; }
    }
    dk = null; // zero derived key immediately

    if (ok) {
      localStorage.removeItem(atmKey);
      setTmpEmail(email);
      setPhase('mfa');
    } else {
      const next = atms + 1;
      localStorage.setItem(atmKey, next.toString());
      if (next >= MAX_ATTEMPTS) {
        localStorage.setItem(lckKey, Date.now().toString());
        setLockEmail(email); setPhase('locked');
        // TODO: Supabase → notify ISSM + write audit log event ACCOUNT_LOCKED
      } else {
        setErr(`Invalid credentials. ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next === 1 ? '' : 's'} remaining before lockout.`);
      }
    }
  };

  // ── MFA verify ─────────────────────────────────────────────────────────
  const doMFA = (code) => {
    setErr('');
    // Phase 1: TOTP stub. Phase 3: Hardware CAC + PIN re-challenge
    const valid = !SUPABASE_CONFIGURED ? code === DEMO.mfa : code.length === 6;
    if (valid) {
      if (!SUPABASE_CONFIGURED) {
        setUser({ id:'demo', email: DEMO.email });
        setMember({ id:'dm', role:DEMO.role, status:'active', display_name:DEMO.name, cyber_awareness_date:DEMO.cyber });
        setOrg({ id:'do', name:DEMO.org, slug:DEMO.slug, status:'active' });
      } else {
        if (user) loadMember(user.id);
      }
      setTmpEmail('');
      setPhase('active');
    } else {
      setErr('Invalid MFA code. Please try again.');
    }
  };

  // ── Sign out ───────────────────────────────────────────────────────────
  const doSignOut = () => {
    setUser(null); setMember(null); setOrg(null);
    sessionStorage.clear();
    if (timer.current) clearTimeout(timer.current);
    if (supabase) supabase.auth.signOut();
    setPhase('banner');
  };

  const ctx = { user, member, org, role:member?.role, isDemo:!SUPABASE_CONFIGURED,
                signOut:doSignOut, sessionId:sid.current };

  if (phase === 'init')            return <LoadingScreen />;
  if (phase === 'banner')          return <LoginBanner onAccept={acceptBanner} />;
  if (phase === 'login')           return <LoginForm onLogin={doLogin} err={err} sessionExpired={false} />;
  if (phase === 'mfa')             return <MFAChallenge onVerify={doMFA} err={err} onBack={()=>setPhase('login')} />;
  if (phase === 'locked')          return <AccountLocked email={lockEmail} />;
  if (phase === 'session_expired') return <SessionExpired onReauth={()=>setPhase('banner')} />;
  if (phase === 'cyber_expired')   return <CyberAwarenessExpired />;
  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}

// ═══ SHARED STYLES ════════════════════════════════════════════════════════════
const mono = { fontFamily:"'Courier New',monospace" };

function Screen({ children }) {
  return (
    <div style={{ minHeight:'100vh', background:'#0a0e1a', display:'flex',
      alignItems:'center', justifyContent:'center', padding:24, ...mono }}>
      {children}
    </div>
  );
}

function Card({ children, width=480 }) {
  return (
    <div style={{ width, maxWidth:'100%', background:'#0d1b2e', border:'1px solid #1e3a5f',
      borderRadius:8, padding:32, boxShadow:'0 0 40px rgba(0,150,255,0.08)' }}>
      {children}
    </div>
  );
}

function Logo() {
  return (
    <div style={{ textAlign:'center', marginBottom:24 }}>
      <div style={{ fontSize:28, fontWeight:900, letterSpacing:2, color:'#e0e8f0' }}>
        <span style={{ color:'#cc2222' }}>RISK</span>RADAR
      </div>

    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0', color:'#2a4a6b' }}>
      <div style={{ flex:1, height:1, background:'#1e3a5f' }} />
      {label && <span style={{ fontSize:10, letterSpacing:2 }}>{label}</span>}
      <div style={{ flex:1, height:1, background:'#1e3a5f' }} />
    </div>
  );
}

function Btn({ onClick, children, variant='primary', disabled, fullWidth, type='button' }) {
  const base = { padding:'10px 20px', borderRadius:4, border:'none', cursor:disabled?'not-allowed':'pointer',
    fontSize:12, fontWeight:700, letterSpacing:1.5, fontFamily:"'Courier New',monospace",
    width:fullWidth?'100%':undefined, opacity:disabled?0.5:1, transition:'all 0.2s' };
  const styles = {
    primary: { ...base, background:'#0066cc', color:'#fff' },
    danger:  { ...base, background:'#660000', color:'#ff9999' },
    ghost:   { ...base, background:'transparent', color:'#4a8ab0', border:'1px solid #1e4a6e' },
  };
  return <button type={type} onClick={onClick} style={styles[variant] || styles.primary} disabled={disabled}>{children}</button>;
}

function Input({ label, type='text', value, onChange, placeholder, autoComplete='off', maxLength }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:10, color:'#4a7a9b', letterSpacing:2,
        marginBottom:6, textTransform:'uppercase' }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        autoComplete={autoComplete} maxLength={maxLength}
        style={{ width:'100%', background:'#061224', border:'1px solid #1e3a5f', borderRadius:4,
          padding:'10px 12px', color:'#c0d8f0', fontSize:13, fontFamily:"'Courier New',monospace",
          boxSizing:'border-box', outline:'none' }} />
    </div>
  );
}

function ErrBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background:'rgba(180,0,0,0.15)', border:'1px solid #660000',
      borderRadius:4, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#ff9999' }}>
      ⚠ {msg}
    </div>
  );
}

// ═══ LOGIN BANNER (AC-8, PL-4, PS-6) ═════════════════════════════════════════
function LoginBanner({ onAccept }) {
  const [checked, setChecked] = useState(false);
  return (
    <Screen>
      <div style={{ width:680, maxWidth:'100%', ...mono }}>
        <Logo />
        <div style={{ background:'#0d1b2e', border:'2px solid #cc2222',
          borderRadius:8, padding:32 }}>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <div style={{ fontSize:11, letterSpacing:3, color:'#cc4444', marginBottom:8 }}>
              ⚠ U.S. GOVERNMENT INFORMATION SYSTEM ⚠
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:'#e0e8f0', letterSpacing:1 }}>
              SYSTEM USE NOTIFICATION
            </div>
          </div>
          <div style={{ background:'#061224', borderRadius:4, padding:20, fontSize:12,
            lineHeight:1.9, color:'#a0b8d0', marginBottom:24 }}>
            <p><strong style={{ color:'#e0e8f0' }}>WARNING:</strong> This is a U.S. Government information system. Unauthorized access or use of this system constitutes a federal crime and may subject violators to criminal prosecution under 18 U.S.C. §§ 1030 and 2511, and civil penalties.</p>
            <p style={{ marginTop:12 }}>This system processes <strong style={{ color:'#ffaa44' }}>Controlled Unclassified Information (CUI)</strong> in accordance with DoD policy guidelines. All information is subject to applicable federal laws and regulations.</p>
            <p style={{ marginTop:12 }}>By accessing this system, you <strong style={{ color:'#e0e8f0' }}>explicitly consent</strong> to monitoring, recording, auditing, and inspection of all activity. There is no expectation of privacy.</p>
            <p style={{ marginTop:12 }}>Access is restricted to <strong style={{ color:'#e0e8f0' }}>authorized personnel only</strong>. All authentication events, user actions, and data access are logged and retained for a minimum of <strong style={{ color:'#e0e8f0' }}>3 years</strong> per NIST 800-53 AU-11.</p>
            <p style={{ marginTop:12 }}>Unauthorized disclosure of CUI may result in criminal prosecution, loss of security clearance, and civil liability.</p>
          </div>
        </div>

      </div>
    </Screen>
  );
}

// ═══ LOGIN FORM (IA-2, IA-5, AC-7) ═══════════════════════════════════════════
function LoginForm({ onLogin, err, sessionExpired }) {
  const [email, setEmail]   = useState('');
  const [pass,  setPass]    = useState('');
  const [busy,  setBusy]    = useState(false);
  const isDemo = !SUPABASE_CONFIGURED;

  const submit = async () => {
    if (!email || !pass || busy) return;
    setBusy(true);
    await onLogin(email.trim().toLowerCase(), pass);
    setBusy(false);
    // Clear password from memory immediately after submit
    setPass('');
  };

  return (
    <Screen>
      <Card>
        <Logo />
        {sessionExpired && (
          <div style={{ background:'rgba(180,100,0,0.15)', border:'1px solid #664400',
            borderRadius:4, padding:'10px 14px', marginBottom:16, fontSize:11,
            color:'#ffaa44', textAlign:'center' }}>
            ⏱ SESSION EXPIRED — 15-MINUTE INACTIVITY TIMEOUT<br/>
            <span style={{ color:'#886622', fontSize:10 }}>Full re-authentication required (AC-11)</span>
          </div>
        )}
        {isDemo && (
          <div style={{ background:'rgba(0,100,180,0.1)', border:'1px solid #003366',
            borderRadius:4, padding:12, marginBottom:16, textAlign:'center' }}>
            <div style={{ fontSize:10, color:'#4a7a9b', marginBottom:8 }}>DEMO MODE</div>
            <button onClick={()=>onLogin(DEMO.email, DEMO.pass)}
              style={{ fontFamily:"'Courier New',monospace", background:'#0044aa',
                border:'none', color:'#fff', borderRadius:4, padding:'8px 20px',
                cursor:'pointer', fontSize:11, fontWeight:700, width:'100%' }}>
              ⚡ QUICK DEMO LOGIN
            </button>
          </div>
        )}
        <ErrBox msg={err} />
        <Input label='Email Address' type='email' value={email}
          onChange={e=>setEmail(e.target.value)} placeholder='user@organization.mil'
          autoComplete='username' />
        <Input label='Password' type='password' value={pass}
          onChange={e=>setPass(e.target.value)} placeholder='••••••••••••••••'
          autoComplete='current-password' maxLength={128} />

        <Btn fullWidth onClick={submit} disabled={!email || !pass || busy}>
          {busy ? 'AUTHENTICATING…' : 'SECURE LOGIN →'}
        </Btn>

      </Card>
    </Screen>
  );
}

// ═══ MFA CHALLENGE (IA-2(1), IA-2(2)) ════════════════════════════════════════
function MFAChallenge({ onVerify, err, onBack }) {
  const [code, setCode] = useState('');
  const isDemo = !SUPABASE_CONFIGURED;

  const submit = () => {
    if (code.length !== 6) return;
    onVerify(code);
    setCode('');
  };

  return (
    <Screen>
      <Card width={400}>
        <Logo />
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🔐</div>
          <div style={{ fontSize:13, color:'#e0e8f0', fontWeight:700, letterSpacing:1 }}>
            MULTI-FACTOR AUTHENTICATION
          </div>

        </div>
        {isDemo && (
          <div style={{ background:'rgba(0,100,180,0.1)', border:'1px solid #003366',
            borderRadius:4, padding:8, marginBottom:16, fontSize:10, color:'#4a7a9b', textAlign:'center' }}>
            DEMO MFA CODE: <strong style={{color:'#6a9ab0'}}>{DEMO.mfa}</strong>
          </div>
        )}
        <ErrBox msg={err} />
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:10, color:'#4a7a9b', letterSpacing:2,
            marginBottom:6, textTransform:'uppercase' }}>6-Digit Authentication Code</label>
          <input
            type='text' inputMode='numeric' pattern='[0-9]*'
            value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
            placeholder='000000' maxLength={6}
            style={{ width:'100%', textAlign:'center', letterSpacing:8, fontSize:24,
              background:'#061224', border:'1px solid #1e3a5f', borderRadius:4,
              padding:'14px 12px', color:'#c0d8f0', fontFamily:"'Courier New',monospace",
              boxSizing:'border-box' }}
            autoFocus />
        </div>
        <Btn fullWidth onClick={submit} disabled={code.length !== 6}>
          VERIFY CODE →
        </Btn>
        <div style={{ textAlign:'center', marginTop:16 }}>
          <span style={{ fontSize:11, color:'#2a4a6b', cursor:'pointer' }} onClick={onBack}>
            ← Back to login
          </span>
        </div>
      </Card>
    </Screen>
  );
}

// ═══ ACCOUNT LOCKED (AC-7) ════════════════════════════════════════════════════
function AccountLocked({ email }) {
  return (
    <Screen>
      <Card width={520}>
        <Logo />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
          <div style={{ fontSize:14, color:'#cc4444', fontWeight:700, letterSpacing:2, marginBottom:12 }}>
            ACCOUNT LOCKED
          </div>
          <div style={{ fontSize:12, color:'#a0b8d0', lineHeight:1.8, marginBottom:24 }}>
            <strong style={{color:'#e0e8f0'}}>{email}</strong><br/>
            Account locked after {MAX_ATTEMPTS} failed login attempts.<br/>
            <span style={{color:'#cc4444'}}>Unauthorized access attempts are logged and reported.</span>
          </div>
          <div style={{ background:'#061224', border:'1px solid #1e3a5f',
            borderRadius:4, padding:20, marginBottom:24, textAlign:'left' }}>
            <div style={{ fontSize:11, color:'#6a9ab0', letterSpacing:2, marginBottom:12,
              fontWeight:700 }}>ACCOUNT RECOVERY PROCEDURE</div>
            <div style={{ fontSize:11, color:'#4a7a9b', lineHeight:2 }}>
              1. Contact your <strong style={{color:'#a0b8d0'}}>ISSM (Information System Security Manager)</strong><br/>
              2. ISSM will verify your identity and review the lockout event<br/>
              3. ISSM manually re-enables your account from the Admin Console<br/>
              4. All lockout and recovery events are logged in the audit trail<br/>
              <br/>
              <span style={{color:'#cc6600'}}>⚠ Self-service account unlock is not permitted (NIST AC-7)</span>
            </div>
          </div>
          <div style={{ fontSize:10, color:'#2a4a6b', lineHeight:1.8 }}>
            This lockout event has been logged and your ISSM has been notified.
          </div>
        </div>
      </Card>
    </Screen>
  );
}

// ═══ SESSION EXPIRED (AC-11) ══════════════════════════════════════════════════
function SessionExpired({ onReauth }) {
  return (
    <Screen>
      <Card width={440}>
        <Logo />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>⏱</div>
          <div style={{ fontSize:14, color:'#ffaa44', fontWeight:700, letterSpacing:2, marginBottom:12 }}>
            SESSION EXPIRED
          </div>
          <div style={{ fontSize:12, color:'#a0b8d0', lineHeight:1.8, marginBottom:24 }}>
            Your session was terminated after <strong style={{color:'#e0e8f0'}}>15 minutes</strong> of inactivity.<br/>
            All session tokens have been invalidated.<br/>
            Full re-authentication is required to continue.
          </div>

          <Btn fullWidth onClick={onReauth}>
            RE-AUTHENTICATE →
          </Btn>
        </div>
      </Card>
    </Screen>
  );
}

// ═══ CYBER AWARENESS EXPIRED (AT-2, AT-4) ════════════════════════════════════
function CyberAwarenessExpired() {
  return (
    <Screen>
      <Card width={520}>
        <Logo />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
          <div style={{ fontSize:14, color:'#cc4444', fontWeight:700, letterSpacing:2, marginBottom:12 }}>
            CYBER AWARENESS TRAINING EXPIRED
          </div>
          <div style={{ fontSize:12, color:'#a0b8d0', lineHeight:1.8, marginBottom:24 }}>
            Your annual DoD Cyber Awareness certification has expired.<br/>
            Account access is suspended until certification is renewed.<br/>
            This is required for all DoD system users.
          </div>
          <div style={{ background:'#061224', border:'1px solid #1e3a5f',
            borderRadius:4, padding:20, marginBottom:24, textAlign:'left' }}>
            <div style={{ fontSize:11, color:'#6a9ab0', letterSpacing:2, marginBottom:12, fontWeight:700 }}>
              RENEWAL PROCEDURE
            </div>
            <div style={{ fontSize:11, color:'#4a7a9b', lineHeight:2 }}>
              1. Complete annual <strong style={{color:'#a0b8d0'}}>DoD Cyber Awareness Challenge</strong> at JKO<br/>
              2. Download your completion certificate (PDF preferred)<br/>
              3. Provide certificate and completion date to your <strong style={{color:'#a0b8d0'}}>ISSM</strong><br/>
              4. ISSM uploads certificate and re-enables your account<br/>
              5. Account expiry is automatically reset to cert date + 365 days
            </div>
          </div>
          <div style={{ fontSize:10, color:'#2a4a6b', lineHeight:1.8 }}>
            JKO: <span style={{color:'#4a7a9b'}}>jko.jten.mil</span>
          </div>
        </div>
      </Card>
    </Screen>
  );
}

// ═══ LOADING SCREEN ════════════════════════════════════════════════════════════
function LoadingScreen() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(t);
  }, []);
  return (
    <Screen>
      <div style={{ textAlign:'center', ...mono }}>
        <div style={{ fontSize:28, fontWeight:900, letterSpacing:2, color:'#e0e8f0', marginBottom:8 }}>
          <span style={{ color:'#cc2222' }}>RISK</span>RADAR
        </div>
        <div style={{ fontSize:11, color:'#2a5a7b', letterSpacing:3 }}>
          INITIALIZING SECURE SESSION{dots}
        </div>
      </div>
    </Screen>
  );
}

// ═══ USER MENU (for App.jsx top bar) ══════════════════════════════════════════
export function UserMenu() {
  const { user, member, org, role, isDemo, signOut, sessionId } = useAuth();
  const [open, setOpen] = useState(false);
  const C = useColors();
  if (!user) return null;
  const name = member?.display_name || user?.email || 'USER';
  const roleLabel = { issm:'ISSM', isso:'ISSO', assessor:'ASSESSOR',
                       auditor:'AUDITOR', readonly:'READ-ONLY' }[role] || role?.toUpperCase();
  return (
    <div style={{ position:'relative' }}>
      <div onClick={()=>setOpen(!open)} style={{ cursor:'pointer', display:'flex',
        alignItems:'center', gap:10, padding:'6px 12px',
        background:open?'rgba(0,100,200,0.15)':'transparent',
        borderRadius:4, border:'1px solid', borderColor:open?'#1e4a8a':'transparent' }}>
        <div style={{ width:28, height:28, borderRadius:'50%',
          background:'#0a2a4a', border:'1px solid #1e4a8a',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, color:'#4a8ab0', fontWeight:700 }}>
          {name[0]?.toUpperCase()}
        </div>
        <div style={{ textAlign:'left' }}>
          <div style={{ fontSize:11, color:C.text, fontFamily:"'Courier New',monospace",
            fontWeight:700 }}>{name}</div>
          <div style={{ fontSize:9, color:'#4a7a9b', letterSpacing:1 }}>
            {roleLabel}{isDemo?' · DEMO':''}
          </div>
        </div>
        <span style={{ fontSize:9, color:'#2a4a6b' }}>▼</span>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'110%', right:0, zIndex:999, width:240,
          background:'#0d1b2e', border:'1px solid #1e3a5f', borderRadius:6,
          fontFamily:"'Courier New',monospace", fontSize:11 }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #1e3a5f' }}>
            <div style={{ color:'#e0e8f0', fontWeight:700, marginBottom:4 }}>{name}</div>
            <div style={{ color:'#4a7a9b', fontSize:10 }}>{user.email}</div>
            <div style={{ color:'#4a7a9b', fontSize:10 }}>Org: {org?.name || 'N/A'}</div>
            <div style={{ color:'#4a7a9b', fontSize:10 }}>Role: {roleLabel}</div>
          </div>
          <div style={{ padding:'8px 16px', borderBottom:'1px solid #1e3a5f' }}>
            <div style={{ color:'#2a5a7b', fontSize:9, lineHeight:1.8 }}>
              Session: {sessionId?.slice(0,12)}...<br/>
              Timeout: 15 min inactivity (AC-11)<br/>
              MFA: ✅ Active
            </div>
          </div>
          <div style={{ padding:8 }}>
            <div onClick={()=>{setOpen(false); signOut();}}
              style={{ padding:'8px 12px', cursor:'pointer', borderRadius:4, color:'#cc4444',
                fontWeight:700, letterSpacing:1 }}
              onMouseOver={e=>e.target.style.background='rgba(150,0,0,0.15)'}
              onMouseOut={e=>e.target.style.background='transparent'}>
              🔒 SIGN OUT
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
