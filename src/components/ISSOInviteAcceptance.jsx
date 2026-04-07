import { useState, useEffect } from 'react';

const mono = { fontFamily:"'Courier New',monospace" };

export default function ISSOInviteAcceptance({ token, orgSlug, onComplete }) {
  const [step, setStep]  = useState('validating');
  const [form, setForm]  = useState({ name:'', email:'', password:'', confirm:'', cyberDate:'' });
  const [err,  setErr]   = useState('');
  const [busy, setBusy]  = useState(false);
  const [pwStrength, setPwStrength] = useState({ score:0, label:'', color:'#2a4a6b' });

  useEffect(() => {
    // Validate token — demo: any token > 10 chars is valid
    setTimeout(() => {
      if (!token || token.length <= 10) { setStep('invalid'); return; }
      // In production: POST /api/isso-invite/validate { token, org: orgSlug }
      // Server checks: not expired, not used, hash matches, type='isso_invite'
      setStep('form');
    }, 800);
  }, [token]);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const checkStrength = (pw) => {
    let score = 0;
    if (pw.length >= 15)   score++;
    if (/[A-Z]/.test(pw))  score++;
    if (/[a-z]/.test(pw))  score++;
    if (/[0-9]/.test(pw))  score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ['','Weak','Fair','Good','Strong','Very strong'];
    const colors = ['','#cc4444','#cc7700','#aaaa00','#44aa44','#00cc66'];
    setPwStrength({ score, label: labels[score]||'', color: colors[score]||'#2a4a6b' });
  };

  const submit = () => {
    setErr('');
    if (!form.name.trim())           { setErr('Full name required'); return; }
    if (!form.email.includes('@'))   { setErr('Valid .mil or authorized email required'); return; }
    if (form.password.length < 15)   { setErr('Password must be at least 15 characters'); return; }
    if (!/[A-Z]/.test(form.password))  { setErr('Password must contain an uppercase letter'); return; }
    if (!/[0-9]/.test(form.password))  { setErr('Password must contain a number'); return; }
    if (!/[^A-Za-z0-9]/.test(form.password)) { setErr('Password must contain a special character'); return; }
    if (form.password !== form.confirm)  { setErr('Passwords do not match'); return; }
    if (!form.cyberDate) { setErr('Cyber Awareness completion date required'); return; }
    setBusy(true);
    setTimeout(() => { setBusy(false); setStep('mfa'); }, 600);
  };

  const completeMFA = () => {
    setBusy(true);
    // In production: POST /api/isso-invite/complete { token, ...form, mfaEnrolled: true }
    // Server: creates org_member record (role=isso), marks token used, sends ISSM notification
    setTimeout(() => { setStep('done'); setBusy(false); }, 800);
  };

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

  const Inp = ({label,type='text',value,onChange,placeholder,note}) => (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:10,color:'#4a7a9b',
        letterSpacing:2,marginBottom:5}}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{width:'100%',background:'#061224',border:'1px solid #1e3a5f',
          borderRadius:4,padding:'9px 12px',color:'#c0d8f0',fontSize:12,
          ...mono,boxSizing:'border-box'}}/>
      {note&&<div style={{fontSize:9,color:'#2a5a7b',marginTop:3}}>{note}</div>}
    </div>
  );

  if (step==='validating') return (
    <Screen>
      <div style={{textAlign:'center',color:'#4a7a9b',fontSize:12}}>
        Validating invite link…
      </div>
    </Screen>
  );

  if (step==='invalid') return (
    <Screen>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:36,marginBottom:12}}>❌</div>
        <div style={{fontSize:14,fontWeight:700,color:'#cc4444',marginBottom:8}}>
          INVALID OR EXPIRED INVITE
        </div>
        <div style={{fontSize:11,color:'#4a7a9b',lineHeight:1.8}}>
          This invite link has already been used, has expired, or is invalid.<br/>
          Contact your ISSM to request a new invite link.<br/>
          Invite links expire after 24 hours and are single-use.
        </div>
      </div>
    </Screen>
  );

  if (step==='form') return (
    <Screen>
      <div style={{fontSize:13,fontWeight:700,color:'#e0e8f0',marginBottom:4}}>
        ISSO ACCOUNT SETUP
      </div>
      <div style={{fontSize:10,color:'#4a7a9b',marginBottom:6,lineHeight:1.6}}>
        You have been designated as ISSO for this program.
      </div>
      <div style={{background:'rgba(0,60,120,0.12)',border:'1px solid #1e3a5f',
        borderRadius:4,padding:'10px 14px',marginBottom:18,fontSize:10,
        color:'#4a7a9b',lineHeight:1.8}}>
        As ISSO, you are the backup privileged account to the ISSM.<br/>
        Create your own credentials — your ISSM cannot see your password.<br/>
        MFA enrollment is mandatory before your account activates.
      </div>
      {err&&<div style={{background:'rgba(160,0,0,0.15)',border:'1px solid #660000',
        borderRadius:4,padding:'8px 14px',marginBottom:14,fontSize:11,
        color:'#ff9999'}}>⚠ {err}</div>}
      <Inp label='FULL NAME' value={form.name}
        onChange={e=>set('name',e.target.value)} placeholder='Jane Doe'/>
      <Inp label='EMAIL ADDRESS' type='email' value={form.email}
        onChange={e=>set('email',e.target.value)} placeholder='isso@program.mil'/>
      <div style={{marginBottom:14}}>
        <label style={{display:'block',fontSize:10,color:'#4a7a9b',
          letterSpacing:2,marginBottom:5}}>PASSWORD (MIN 15 CHARACTERS)</label>
        <input type='password' value={form.password}
          onChange={e=>{set('password',e.target.value);checkStrength(e.target.value);}}
          placeholder='•••••••••••••••'
          style={{width:'100%',background:'#061224',border:'1px solid #1e3a5f',
            borderRadius:4,padding:'9px 12px',color:'#c0d8f0',fontSize:12,
            ...mono,boxSizing:'border-box'}}/>
        {form.password.length > 0 && (
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:5}}>
            <div style={{flex:1,height:3,background:'#0a1520',borderRadius:2}}>
              <div style={{width:(pwStrength.score/5*100)+'%',height:'100%',
                background:pwStrength.color,borderRadius:2,transition:'all 0.3s'}}/>
            </div>
            <span style={{fontSize:9,color:pwStrength.color,minWidth:60}}>
              {pwStrength.label}
            </span>
          </div>
        )}
        <div style={{fontSize:9,color:'#2a5a7b',marginTop:3}}>
          Min 15 chars · upper + lower + number + special character required
        </div>
      </div>
      <Inp label='CONFIRM PASSWORD' type='password' value={form.confirm}
        onChange={e=>set('confirm',e.target.value)}
        placeholder='•••••••••••••••'/>
      <Inp label='CYBER AWARENESS COMPLETION DATE' type='date' value={form.cyberDate}
        onChange={e=>set('cyberDate',e.target.value)}
        note='Your account expires 365 days from this date — annual renewal required'/>
      <button onClick={submit} disabled={busy}
        style={{...mono,width:'100%',padding:'11px 0',background:'#0055cc',
          border:'none',borderRadius:4,cursor:'pointer',color:'#fff',
          fontSize:12,fontWeight:700,letterSpacing:1.5,marginTop:4}}>
        {busy?'CREATING ACCOUNT…':'CREATE ISSO ACCOUNT →'}
      </button>
    </Screen>
  );

  if (step==='mfa') return (
    <Screen>
      <div style={{textAlign:'center',marginBottom:20}}>
        <div style={{fontSize:30,marginBottom:8}}>🔐</div>
        <div style={{fontSize:13,fontWeight:700,color:'#e0e8f0',letterSpacing:1}}>
          ENROLL AUTHENTICATOR APP
        </div>
        <div style={{fontSize:11,color:'#4a7a9b',marginTop:4,lineHeight:1.6}}>
          MFA is mandatory for all ISSO accounts.<br/>
          Scan with Google Authenticator or Authy.
        </div>
      </div>
      <div style={{background:'#fff',borderRadius:6,padding:16,
        textAlign:'center',marginBottom:16}}>
        <div style={{fontSize:10,color:'#333',letterSpacing:1,marginBottom:8}}>
          DEMO MODE — real QR code appears in production
        </div>
        <div style={{background:'#f0f0f0',borderRadius:4,padding:12,
          fontSize:10,color:'#666',fontFamily:'monospace'}}>
          Demo MFA code: 000000
        </div>
      </div>
      <button onClick={completeMFA} disabled={busy}
        style={{...mono,width:'100%',padding:'11px 0',background:'#004422',
          border:'1px solid #006633',borderRadius:4,cursor:'pointer',
          color:'#00cc66',fontSize:12,fontWeight:700,letterSpacing:1.5}}>
        {busy?'FINALIZING…':'✓ AUTHENTICATOR ENROLLED — ACTIVATE ACCOUNT'}
      </button>
    </Screen>
  );

  if (step==='done') return (
    <Screen>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:42,marginBottom:12}}>✅</div>
        <div style={{fontSize:14,fontWeight:700,color:'#00cc66',letterSpacing:1,marginBottom:10}}>
          ISSO ACCOUNT ACTIVE
        </div>
        <div style={{fontSize:12,color:'#9ab0c8',lineHeight:1.8,marginBottom:20}}>
          Your ISSO account is now active.<br/>
          Your ISSM has been notified.<br/>
          You can now log in at{' '}
          <span style={{color:'#4a9fd4'}}>app.ballardis3.com</span>
        </div>
        <button onClick={()=>onComplete()}
          style={{...mono,background:'#0055cc',border:'none',borderRadius:4,
            padding:'11px 28px',cursor:'pointer',color:'#fff',
            fontSize:12,fontWeight:700,letterSpacing:1}}>
          GO TO LOGIN →
        </button>
      </div>
    </Screen>
  );

  return null;
}
