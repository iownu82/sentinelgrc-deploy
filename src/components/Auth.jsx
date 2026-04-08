import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { useColors } from '../theme.js';
import { checkRateLimit, recordAttempt, resetRateLimit, formatResetTime } from '../security/rateLimiter.js';
import { auditLog, EVENTS } from '../security/auditLogger.js';
import { generateSessionId } from '../auth/crypto.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const MAX_ATTEMPTS       = 3;
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
const S = { BANNER:'rr_banner_v1', ATM:'rr_atm_', LCK:'rr_lck_' };
const DEMO = {
  email: 'admin@ballardis3.com',
  pass:  'DemoAdmin2026',
  mfa:   '000000',
  role:  'issm',
  name:  'Fredrick Ballard',
  org:   'Ballard IS3',
  slug:  'ballard-is3',
  cyber: '2027-01-15',
};
const DEMO_SA = {
  email: 'sysadmin@ballardis3.com',
  pass:  'DemoAdmin2026',
  mfa:   '000000',
  role:  'sysadmin',
  name:  'Demo SysAdmin',
  org:   'Ballard IS3',
  slug:  'ballard-is3',
  cyber: '2027-01-15',
};
const SUPABASE_CONFIGURED = !!(
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_SUPABASE_URL &&
  import.meta.env?.VITE_SUPABASE_ANON_KEY
);

// ─── Context ──────────────────────────────────────────────────────────────────
export const AuthContext = createContext({ user:null, member:null, org:null, isDemo:true });
export const useAuth = () => useContext(AuthContext);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [phase, setPhase]   = useState('init');
  const [user,  setUser]    = useState(null);
  const [member,setMember]  = useState(null);
  const [org,   setOrg]     = useState(null);
  const [tmpEmail,setTmp]   = useState('');
  const [lockEmail,setLock] = useState('');
  const [err, setErr]       = useState('');
  const timer = useRef(null);
  const sid   = useRef(generateSessionId());

  useEffect(() => {
    const ok = sessionStorage.getItem(S.BANNER);
    setPhase(ok ? 'login' : 'banner');
  }, []);

  const resetTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPhase('expired'); setUser(null); setMember(null); setOrg(null);
      sessionStorage.clear();
    }, SESSION_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (phase !== 'active') return;
    const evts = ['mousedown','keydown','touchstart','click'];
    evts.forEach(e => window.addEventListener(e, resetTimer, { passive:true }));
    resetTimer();
    return () => {
      evts.forEach(e => window.removeEventListener(e, resetTimer));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [phase, resetTimer]);

  const acceptBanner = () => {
    sessionStorage.setItem(S.BANNER, Date.now().toString());
    setPhase('login');
  };

  const doLogin = async (email, password) => {
    setErr('');
    // Rate limit check (AC-7, SC-5)
    const rl = checkRateLimit('login', email);
    if (!rl.allowed) {
      setErr('Too many attempts. Try again in ' + formatResetTime(rl.resetIn) + '.');
      await auditLog(EVENTS.LOGIN_FAIL, { actorId: email, details: { reason: 'rate_limited' } });
      return;
    }
    recordAttempt('login', email);
    const ak = S.ATM + btoa(email).slice(0,12);
    const lk = S.LCK + btoa(email).slice(0,12);
    if (localStorage.getItem(lk)) { setLock(email); setPhase('locked'); return; }
    const atm = parseInt(localStorage.getItem(ak) || '0');
    const demoUser = (email.toLowerCase() === DEMO_SA.email && password === DEMO_SA.pass) ? DEMO_SA : DEMO;
    const ok = (email.toLowerCase() === DEMO.email && password === DEMO.pass) || (email.toLowerCase() === DEMO_SA.email && password === DEMO_SA.pass);
    if (ok) {
      localStorage.removeItem(ak);
      setTmp(email); setPhase('mfa');
    } else {
      const next = atm + 1;
      localStorage.setItem(ak, next.toString());
      if (next >= MAX_ATTEMPTS) {
        localStorage.setItem(lk, Date.now().toString());
        setLock(email); setPhase('locked');
        auditLog(EVENTS.LOGIN_LOCKED, { actorId: email, details: { reason: 'max_attempts_exceeded' } });
      } else {
        setErr('Invalid credentials. ' + (MAX_ATTEMPTS - next) + ' attempt' + (MAX_ATTEMPTS-next===1?'':'s') + ' remaining.');
      }
    }
  };

  const doMFA = (code) => {
    setErr('');
    if (code === DEMO.mfa) {
      auditLog(EVENTS.MFA_SUCCESS, { actorId: demoUser.email, actorRole: demoUser.role, orgId: demoUser.slug });
      setUser({ id:'demo', email: demoUser.email });
      setMember({ id:'dm', role:DEMO.role, status:'active', display_name:DEMO.name, cyber_awareness_date:DEMO.cyber });
      setOrg({ id:'do', name:DEMO.org, slug:DEMO.slug, status:'active' });
      setTmp(''); setPhase('active');
    } else {
      setErr('Invalid code. Please try again.');
    }
  };

  const doSignOut = () => {
    setUser(null); setMember(null); setOrg(null);
    sessionStorage.clear();
    if (timer.current) clearTimeout(timer.current);
    setPhase('banner');
  };

  const ctx = { user, member, org, role:member?.role, isDemo:true, signOut:doSignOut, sessionId:sid.current };

  if (phase==='init')    return <LoadingScreen />;
  if (phase==='banner')  return <Banner onAccept={acceptBanner} />;
  if (phase==='login')   return <LoginForm onLogin={doLogin} err={err} />;
  if (phase==='mfa')     return <MFAScreen onVerify={doMFA} err={err} onBack={()=>setPhase('login')} />;
  if (phase==='locked')  return <LockedScreen email={lockEmail} />;
  if (phase==='expired') return <ExpiredScreen onReauth={()=>setPhase('banner')} />;
  if (phase==='cyber')   return <CyberExpired />;
  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
const mono = { fontFamily:"'Courier New',monospace" };

function Screen({ children }) {
  return (
    <div style={{ minHeight:'100vh', background:'#070d1a', display:'flex',
      alignItems:'center', justifyContent:'center', padding:20, ...mono }}>
      {children}
    </div>
  );
}
function Card({ children, width=460 }) {
  return (
    <div style={{ width, maxWidth:'100%', background:'#0d1b2e',
      border:'1px solid #1e3a5f', borderRadius:8, padding:32,
      boxShadow:'0 0 40px rgba(0,100,200,0.06)' }}>
      {children}
    </div>
  );
}
function Logo() {
  return (
    <div style={{ textAlign:'center', marginBottom:24 }}>
      <div style={{ fontSize:26, fontWeight:900, letterSpacing:3, color:'#e0e8f0' }}>
        <span style={{ color:'#cc2222' }}>RISK</span>RADAR
      </div>
    </div>
  );
}
function ErrMsg({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background:'rgba(160,0,0,0.15)', border:'1px solid #660000',
      borderRadius:4, padding:'9px 14px', marginBottom:14, fontSize:11, color:'#ff9999' }}>
      ⚠ {msg}
    </div>
  );
}
function PrimaryBtn({ onClick, children, disabled, fullWidth }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...mono, background:disabled?'#1a2a3a':'#0055cc', border:'none', color:'#fff',
        borderRadius:4, padding:'10px 20px', cursor:disabled?'not-allowed':'pointer',
        fontWeight:700, fontSize:11, letterSpacing:1.5, opacity:disabled?0.5:1,
        width:fullWidth?'100%':undefined }}>
      {children}
    </button>
  );
}
function TextInput({ label, type='text', value, onChange, placeholder, maxLength }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:10, color:'#4a7a9b',
        letterSpacing:2, marginBottom:5, textTransform:'uppercase' }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        maxLength={maxLength} autoComplete='off'
        style={{ width:'100%', background:'#061224', border:'1px solid #1e3a5f',
          borderRadius:4, padding:'9px 12px', color:'#c0d8f0', fontSize:13,
          ...mono, boxSizing:'border-box', outline:'none' }} />
    </div>
  );
}

// ─── Banner (AC-8) ────────────────────────────────────────────────────────────
function Banner({ onAccept }) {
  const [checked, setChecked] = useState(false);
  return (
    <Screen>
      <div style={{ width:660, maxWidth:'100%', ...mono }}>
        <Logo />
        <div style={{ background:'#0d1b2e', border:'2px solid #aa2222',
          borderRadius:8, padding:28 }}>
          <div style={{ textAlign:'center', marginBottom:20 }}>
            <div style={{ fontSize:11, color:'#cc4444', letterSpacing:3, marginBottom:6 }}>
              ⚠ U.S. GOVERNMENT INFORMATION SYSTEM ⚠
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:'#e0e8f0', letterSpacing:1 }}>
              SYSTEM USE NOTIFICATION
            </div>
          </div>
          <div style={{ background:'#061224', borderRadius:4, padding:18,
            fontSize:12, lineHeight:1.9, color:'#9ab0c8', marginBottom:20 }}>
            <p><strong style={{color:'#e0e8f0'}}>WARNING:</strong> This is a U.S. Government
            information system. Unauthorized access or use constitutes a federal crime and
            may subject violators to criminal prosecution.</p>
            <p style={{marginTop:10}}>This system processes <strong style={{color:'#ffaa44'}}>
            Controlled Unclassified Information (CUI)</strong> in accordance with DoD policy
            guidelines. All information is subject to applicable federal laws and regulations.</p>
            <p style={{marginTop:10}}>By accessing this system, you <strong style={{color:'#e0e8f0'}}>
            explicitly consent</strong> to monitoring, recording, and auditing of all activity.
            There is no expectation of privacy on this system.</p>
            <p style={{marginTop:10}}>Access is restricted to <strong style={{color:'#e0e8f0'}}>
            authorized personnel only.</strong></p>
          </div>
          <label style={{ display:'flex', alignItems:'flex-start', gap:10,
            cursor:'pointer', marginBottom:20, fontSize:11, color:'#9ab0c8' }}>
            <input type='checkbox' checked={checked}
              onChange={e=>setChecked(e.target.checked)}
              style={{ marginTop:2, accentColor:'#0066cc', flexShrink:0 }} />
            <span>I have read and understand the above conditions. I acknowledge that
            my use of this system is subject to monitoring and that unauthorized use
            may result in criminal prosecution.</span>
          </label>
          <PrimaryBtn onClick={onAccept} disabled={!checked} fullWidth>
            ACKNOWLEDGE AND PROCEED TO LOGIN
          </PrimaryBtn>
        </div>
      </div>
    </Screen>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({ onLogin, err }) {
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [busy,  setBusy]  = useState(false);

  const submit = async () => {
    if (!email || !pass || busy) return;
    setBusy(true);
    await onLogin(email.trim().toLowerCase(), pass);
    setBusy(false);
    setPass('');
  };

  return (
    <Screen>
      <Card>
        <Logo />
        <div style={{ background:'rgba(0,80,160,0.1)', border:'1px solid #003366',
          borderRadius:4, padding:12, marginBottom:16, textAlign:'center' }}>
          <div style={{ fontSize:10, color:'#4a7a9b', marginBottom:8 }}>DEMO MODE</div>
          <PrimaryBtn onClick={()=>onLogin(DEMO.email, DEMO.pass)} fullWidth>
            ⚡ QUICK DEMO LOGIN (ISSM)
          </PrimaryBtn>
          <div style={{marginTop:6}}>
            <button
              onClick={()=>onLogin(DEMO_SA.email, DEMO_SA.pass)}
              style={{width:'100%',background:'#1a3a6b',border:'1px solid #2a5a9b',borderRadius:4,
                padding:'10px 0',cursor:'pointer',color:'#a0c8f0',fontSize:13,fontWeight:700,
                fontFamily:"'Courier New',monospace",letterSpacing:1}}>
              🔒 DEMO LOGIN — SYSTEM ADMIN
            </button>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div style={{ flex:1, height:1, background:'#1e3a5f' }}/>
          <span style={{ fontSize:9, color:'#2a4a6b', letterSpacing:2 }}>OR ENTER CREDENTIALS</span>
          <div style={{ flex:1, height:1, background:'#1e3a5f' }}/>
        </div>
        <ErrMsg msg={err} />
        <TextInput label='Email Address' type='email' value={email}
          onChange={e=>setEmail(e.target.value)} placeholder='user@organization.mil' />
        <TextInput label='Password' type='password' value={pass}
          onChange={e=>setPass(e.target.value)} placeholder='••••••••••••••••' maxLength={128} />
        <PrimaryBtn onClick={submit} disabled={!email||!pass||busy} fullWidth>
          {busy ? 'AUTHENTICATING…' : 'LOGIN →'}
        </PrimaryBtn>
      </Card>
    </Screen>
  );
}

// ─── MFA Screen ───────────────────────────────────────────────────────────────
function MFAScreen({ onVerify, err, onBack }) {
  const [code, setCode] = useState('');
  return (
    <Screen>
      <Card width={380}>
        <Logo />
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:30, marginBottom:8 }}>🔐</div>
          <div style={{ fontSize:13, color:'#e0e8f0', fontWeight:700, letterSpacing:1 }}>
            AUTHENTICATION CODE
          </div>
          <div style={{ fontSize:10, color:'#4a7a9b', marginTop:4 }}>
            DEMO CODE: 000000
          </div>
        </div>
        <ErrMsg msg={err} />
        <div style={{ marginBottom:14 }}>
          <input type='text' inputMode='numeric' value={code}
            onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
            placeholder='000000' maxLength={6} autoFocus
            style={{ width:'100%', textAlign:'center', letterSpacing:10, fontSize:22,
              background:'#061224', border:'1px solid #1e3a5f', borderRadius:4,
              padding:'12px', color:'#c0d8f0', ...mono, boxSizing:'border-box' }} />
        </div>
        <PrimaryBtn onClick={()=>onVerify(code)} disabled={code.length!==6} fullWidth>
          VERIFY →
        </PrimaryBtn>
        <div style={{ textAlign:'center', marginTop:12 }}>
          <span onClick={onBack}
            style={{ fontSize:11, color:'#2a4a6b', cursor:'pointer' }}>← Back</span>
        </div>
      </Card>
    </Screen>
  );
}

// ─── Locked Screen ────────────────────────────────────────────────────────────
function LockedScreen({ email }) {
  return (
    <Screen>
      <Card width={500}>
        <Logo />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:44, marginBottom:14 }}>🔒</div>
          <div style={{ fontSize:14, color:'#cc4444', fontWeight:700, letterSpacing:2, marginBottom:10 }}>
            ACCOUNT LOCKED
          </div>
          <div style={{ fontSize:12, color:'#9ab0c8', lineHeight:1.8, marginBottom:20 }}>
            <strong style={{color:'#e0e8f0'}}>{email}</strong><br/>
            Account locked after {MAX_ATTEMPTS} failed login attempts.<br/>
            Unauthorized access attempts are logged and reported.
          </div>
          <div style={{ background:'#061224', border:'1px solid #1e3a5f',
            borderRadius:4, padding:18, textAlign:'left', marginBottom:18 }}>
            <div style={{ fontSize:10, color:'#6a9ab0', letterSpacing:2,
              fontWeight:700, marginBottom:10 }}>ACCOUNT RECOVERY PROCEDURE</div>
            <div style={{ fontSize:11, color:'#4a7a9b', lineHeight:2 }}>
              1. Contact your <strong style={{color:'#a0b8d0'}}>ISSM</strong><br/>
              2. ISSM will verify your identity and review the lockout<br/>
              3. ISSM manually re-enables your account from the Admin Console<br/>
              4. All lockout and recovery events are logged in the audit trail
            </div>
          </div>
          <div style={{ fontSize:10, color:'#2a4a6b' }}>
            This lockout event has been logged and your ISSM has been notified.
          </div>
        </div>
      </Card>
    </Screen>
  );
}

// ─── Session Expired Screen ───────────────────────────────────────────────────
function ExpiredScreen({ onReauth }) {
  return (
    <Screen>
      <Card width={420}>
        <Logo />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:44, marginBottom:14 }}>⏱</div>
          <div style={{ fontSize:14, color:'#ffaa44', fontWeight:700, letterSpacing:2, marginBottom:10 }}>
            SESSION EXPIRED
          </div>
          <div style={{ fontSize:12, color:'#9ab0c8', lineHeight:1.8, marginBottom:20 }}>
            Your session was terminated after 15 minutes of inactivity.<br/>
            All session tokens have been invalidated.<br/>
            Full re-authentication is required to continue.
          </div>
          <PrimaryBtn onClick={onReauth} fullWidth>RE-AUTHENTICATE →</PrimaryBtn>
        </div>
      </Card>
    </Screen>
  );
}

// ─── Cyber Awareness Expired ──────────────────────────────────────────────────
function CyberExpired() {
  return (
    <Screen>
      <Card width={500}>
        <Logo />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:44, marginBottom:14 }}>📋</div>
          <div style={{ fontSize:14, color:'#cc4444', fontWeight:700, letterSpacing:2, marginBottom:10 }}>
            CYBER AWARENESS TRAINING EXPIRED
          </div>
          <div style={{ fontSize:12, color:'#9ab0c8', lineHeight:1.8, marginBottom:20 }}>
            Your annual DoD Cyber Awareness certification has expired.<br/>
            Account access is suspended until certification is renewed.
          </div>
          <div style={{ background:'#061224', border:'1px solid #1e3a5f',
            borderRadius:4, padding:18, textAlign:'left', marginBottom:18 }}>
            <div style={{ fontSize:11, color:'#4a7a9b', lineHeight:2 }}>
              1. Complete the DoD Cyber Awareness Challenge at JKO<br/>
              2. Download your completion certificate<br/>
              3. Provide certificate to your <strong style={{color:'#a0b8d0'}}>ISSM</strong><br/>
              4. ISSM uploads certificate and re-enables your account
            </div>
          </div>
          <div style={{ fontSize:10, color:'#2a4a6b' }}>
            JKO: <span style={{color:'#4a7a9b'}}>jko.jten.mil</span>
          </div>
        </div>
      </Card>
    </Screen>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t = setInterval(()=>setDots(d=>d.length>=3?'':d+'.'),400);
    return ()=>clearInterval(t);
  },[]);
  return (
    <Screen>
      <div style={{ textAlign:'center', ...mono }}>
        <div style={{ fontSize:26, fontWeight:900, letterSpacing:3, color:'#e0e8f0', marginBottom:8 }}>
          <span style={{color:'#cc2222'}}>RISK</span>RADAR
        </div>
        <div style={{ fontSize:10, color:'#2a5a7b', letterSpacing:3 }}>
          INITIALIZING{dots}
        </div>
      </div>
    </Screen>
  );
}

// ─── User Menu ────────────────────────────────────────────────────────────────
export function UserMenu() {
  const { user, member, org, role, signOut, sessionId } = useAuth();
  const [open, setOpen] = useState(false);
  const C = useColors();
  if (!user) return null;
  const name  = member?.display_name || user?.email || 'USER';
  const rLabel = {issm:'ISSM',isso:'ISSO',assessor:'ASSESSOR',auditor:'AUDITOR',readonly:'READ-ONLY'}[role]||'USER';
  return (
    <div style={{ position:'relative' }}>
      <div onClick={()=>setOpen(!open)} style={{ cursor:'pointer', display:'flex',
        alignItems:'center', gap:8, padding:'5px 10px',
        background:open?'rgba(0,80,200,0.12)':'transparent',
        borderRadius:4, border:'1px solid', borderColor:open?'#1e4a8a':'transparent' }}>
        <div style={{ width:26, height:26, borderRadius:'50%', background:'#0a2a4a',
          border:'1px solid #1e4a8a', display:'flex', alignItems:'center',
          justifyContent:'center', fontSize:11, color:'#4a8ab0', fontWeight:700 }}>
          {name[0]?.toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize:11, color:C.text, ...mono, fontWeight:700 }}>{name}</div>
          <div style={{ fontSize:9, color:'#4a7a9b', letterSpacing:1 }}>{rLabel}</div>
        </div>
        <span style={{ fontSize:9, color:'#2a4a6b' }}>▼</span>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'110%', right:0, zIndex:999, width:220,
          background:'#0d1b2e', border:'1px solid #1e3a5f', borderRadius:6, ...mono }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid #1e3a5f', fontSize:10 }}>
            <div style={{ color:'#e0e8f0', fontWeight:700, marginBottom:3 }}>{name}</div>
            <div style={{ color:'#4a7a9b' }}>{user.email}</div>
            <div style={{ color:'#4a7a9b' }}>Org: {org?.name||'—'}</div>
            <div style={{ color:'#4a7a9b' }}>Role: {rLabel}</div>
          </div>
          <div style={{ padding:8 }}>
            <div onClick={()=>{setOpen(false);signOut();}}
              style={{ padding:'7px 12px', cursor:'pointer', borderRadius:4,
                color:'#cc4444', fontWeight:700, fontSize:11, letterSpacing:1 }}
              onMouseOver={e=>e.currentTarget.style.background='rgba(150,0,0,0.15)'}
              onMouseOut={e=>e.currentTarget.style.background='transparent'}>
              🔒 SIGN OUT
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
