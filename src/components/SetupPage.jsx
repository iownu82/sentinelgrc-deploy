import { useState, useEffect } from 'react';

const mono = { fontFamily:"'Courier New',monospace" };

// Validates the ?setup= token from URL and renders ISSM account creation form
export default function SetupPage({ token, orgSlug, onComplete }) {
  const [step, setStep]       = useState('validating'); // validating|form|mfa|done|invalid
  const [err, setErr]         = useState('');
  const [busy, setBusy]       = useState(false);
  const [form, setForm]       = useState({ name:'', email:'', password:'', confirm:'', cyberDate:'' });
  const [mfaSecret] = useState('JBSWY3DPEHPK3PXP'); // demo static secret

  useEffect(() => {
    // In production: POST /api/setup/validate { token, org: orgSlug }
    // Demo: any token with length > 10 is 'valid'
    setTimeout(() => {
      if (token && token.length > 10) {
        setStep('form');
      } else {
        setStep('invalid');
      }
    }, 800);
  }, [token]);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const submitForm = () => {
    if (!form.name.trim())         { setErr('Full name required'); return; }
    if (!form.email.includes('@')) { setErr('Valid email required'); return; }
    if (form.password.length < 15) { setErr('Password must be at least 15 characters'); return; }
    if (form.password !== form.confirm) { setErr('Passwords do not match'); return; }
    if (!form.cyberDate)           { setErr('Cyber Awareness date required'); return; }
    setErr(''); setBusy(true);
    setTimeout(() => { setBusy(false); setStep('mfa'); }, 600);
  };

  const completeMFA = () => {
    // In production: POST /api/setup/complete { token, ...form, mfaEnrolled: true }
    setBusy(true);
    setTimeout(() => { setStep('done'); setBusy(false); }, 800);
  };

  const Input = ({ label, type='text', value, onChange, placeholder, note }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:10, color:'#4a7a9b',
        letterSpacing:2, marginBottom:5 }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width:'100%', background:'#061224', border:'1px solid #1e3a5f',
          borderRadius:4, padding:'9px 12px', color:'#c0d8f0',
          fontSize:12, ...mono, boxSizing:'border-box' }} />
      {note && <div style={{fontSize:9,color:'#2a5a7b',marginTop:3}}>{note}</div>}
    </div>
  );

  const Screen = ({ children }) => (
    <div style={{ minHeight:'100vh', background:'#070d1a', display:'flex',
      alignItems:'center', justifyContent:'center', padding:20, ...mono }}>
      <div style={{ width:520, maxWidth:'100%', background:'#0d1b2e',
        border:'1px solid #1e3a5f', borderRadius:8, padding:32 }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:22, fontWeight:900, letterSpacing:3, color:'#e0e8f0' }}>
            <span style={{color:'#cc2222'}}>RISK</span>RADAR
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  if (step === 'validating') return (
    <Screen>
      <div style={{ textAlign:'center', color:'#4a7a9b', fontSize:12 }}>
        Validating setup link…
      </div>
    </Screen>
  );

  if (step === 'invalid') return (
    <Screen>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:12 }}>❌</div>
        <div style={{ fontSize:14, fontWeight:700, color:'#cc4444', marginBottom:8 }}>
          INVALID OR EXPIRED LINK
        </div>
        <div style={{ fontSize:11, color:'#4a7a9b', lineHeight:1.8 }}>
          This setup link has already been used, has expired, or is invalid.<br/>
          Contact your Ballard IS3 administrator to request a new link.
        </div>
      </div>
    </Screen>
  );

  if (step === 'form') return (
    <Screen>
      <div style={{ fontSize:13, fontWeight:700, color:'#e0e8f0', marginBottom:4 }}>
        ISSM ACCOUNT SETUP
      </div>
      <div style={{ fontSize:10, color:'#4a7a9b', marginBottom:20, lineHeight:1.6 }}>
        You have been designated as the primary ISSM for this organization.
        Complete setup to activate your account.
      </div>
      {err && <div style={{ background:'rgba(160,0,0,0.15)', border:'1px solid #660000',
        borderRadius:4, padding:'8px 14px', marginBottom:14,
        fontSize:11, color:'#ff9999' }}>⚠ {err}</div>}
      <Input label='FULL NAME' value={form.name}
        onChange={e=>set('name',e.target.value)} placeholder='John Smith' />
      <Input label='EMAIL ADDRESS' type='email' value={form.email}
        onChange={e=>set('email',e.target.value)} placeholder='issm@program.mil' />
      <Input label='PASSWORD (min 15 characters)' type='password' value={form.password}
        onChange={e=>set('password',e.target.value)} placeholder='•••••••••••••••'
        note='Min 15 chars · upper + lower + number + special required' />
      <Input label='CONFIRM PASSWORD' type='password' value={form.confirm}
        onChange={e=>set('confirm',e.target.value)} placeholder='•••••••••••••••' />
      <Input label='CYBER AWARENESS COMPLETION DATE' type='date' value={form.cyberDate}
        onChange={e=>set('cyberDate',e.target.value)}
        note='Your account expires 365 days from this date' />
      <button onClick={submitForm} disabled={busy}
        style={{ ...mono, width:'100%', padding:'11px 0', background:'#0055cc',
          border:'none', borderRadius:4, cursor:'pointer', color:'#fff',
          fontSize:12, fontWeight:700, letterSpacing:1.5, marginTop:4 }}>
        {busy ? 'CREATING ACCOUNT…' : 'CREATE ISSM ACCOUNT →'}
      </button>
    </Screen>
  );

  if (step === 'mfa') return (
    <Screen>
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <div style={{ fontSize:36, marginBottom:8 }}>🔐</div>
        <div style={{ fontSize:13, fontWeight:700, color:'#e0e8f0', letterSpacing:1 }}>
          ENROLL AUTHENTICATOR APP
        </div>
        <div style={{ fontSize:11, color:'#4a7a9b', marginTop:6, lineHeight:1.6 }}>
          Scan the QR code with Google Authenticator or Authy.
          MFA is mandatory for all ISSM accounts.
        </div>
      </div>
      <div style={{ background:'#fff', borderRadius:6, padding:16,
        textAlign:'center', marginBottom:16 }}>
        <div style={{ fontSize:10, color:'#333', letterSpacing:1, marginBottom:8 }}>
          DEMO MODE — in production a real QR code appears here
        </div>
        <div style={{ background:'#f0f0f0', borderRadius:4, padding:'12px',
          fontSize:10, color:'#666', fontFamily:'monospace' }}>
          Secret key: {mfaSecret}<br/>
          Demo MFA code: 000000
        </div>
      </div>
      <div style={{ fontSize:10, color:'#4a7a9b', marginBottom:16, lineHeight:1.8 }}>
        After enrolling your authenticator app, you will be required to enter<br/>
        a 6-digit code every time you log in.
      </div>
      <button onClick={completeMFA} disabled={busy}
        style={{ ...mono, width:'100%', padding:'11px 0', background:'#004422',
          border:'1px solid #006633', borderRadius:4, cursor:'pointer',
          color:'#00cc66', fontSize:12, fontWeight:700, letterSpacing:1.5 }}>
        {busy ? 'FINALIZING…' : '✓ AUTHENTICATOR ENROLLED — COMPLETE SETUP'}
      </button>
    </Screen>
  );

  if (step === 'done') return (
    <Screen>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:42, marginBottom:12 }}>✅</div>
        <div style={{ fontSize:14, fontWeight:700, color:'#00cc66',
          letterSpacing:1, marginBottom:10 }}>ACCOUNT CREATED</div>
        <div style={{ fontSize:12, color:'#9ab0c8', lineHeight:1.8, marginBottom:20 }}>
          Your ISSM account is active. Before you can access the dashboard,<br/>
          you must designate an ISSO.
        </div>
        <button onClick={()=>onComplete('isso_designation')}
          style={{ ...mono, background:'#0055cc', border:'none', borderRadius:4,
            padding:'11px 28px', cursor:'pointer', color:'#fff',
            fontSize:12, fontWeight:700, letterSpacing:1 }}>
          DESIGNATE ISSO →
        </button>
      </div>
    </Screen>
  );

  return null;
}
