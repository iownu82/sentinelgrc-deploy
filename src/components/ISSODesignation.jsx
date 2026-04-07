import { useState } from 'react';

const mono = { fontFamily:"'Courier New',monospace" };

// Shown after ISSM creates account — dashboard LOCKED until ISSO is invited
export default function ISSODesignation({ onComplete }) {
  const [form, setForm]   = useState({ name:'', email:'' });
  const [done, setDone]   = useState(false);
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState('');

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = () => {
    if (!form.name.trim())          { setErr('ISSO full name required'); return; }
    if (!form.email.includes('@'))  { setErr('Valid ISSO email required'); return; }
    setErr(''); setBusy(true);
    // In production: POST /api/isso/invite { name, email }
    // Generates separate one-time invite token + sends email via AWS SES
    setTimeout(() => {
      setBusy(false);
      setDone(true);
    }, 800);
  };

  if (done) return (
    <div style={{ minHeight:'100vh', background:'#070d1a', display:'flex',
      alignItems:'center', justifyContent:'center', padding:20, ...mono }}>
      <div style={{ width:540, background:'#0d1b2e', border:'1px solid #1e3a5f',
        borderRadius:8, padding:32, textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:12 }}>✉️</div>
        <div style={{ fontSize:14, fontWeight:700, color:'#00cc66',
          letterSpacing:1, marginBottom:10 }}>ISSO INVITE SENT</div>
        <div style={{ fontSize:12, color:'#9ab0c8', lineHeight:1.8, marginBottom:6 }}>
          An invite link has been sent to<br/>
          <strong style={{color:'#a0b8d0'}}>{form.name}</strong> at{' '}
          <strong style={{color:'#a0b8d0'}}>{form.email}</strong>
        </div>
        <div style={{ fontSize:11, color:'#4a7a9b', lineHeight:1.8, marginBottom:24 }}>
          The link expires in 24 hours. Your dashboard is now unlocked.<br/>
          You will be notified when your ISSO completes setup.
        </div>
        <button onClick={()=>onComplete()} style={{ ...mono, background:'#0055cc',
          border:'none', borderRadius:4, padding:'11px 28px',
          cursor:'pointer', color:'#fff', fontSize:12, fontWeight:700, letterSpacing:1 }}>
          ENTER DASHBOARD →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#070d1a', display:'flex',
      alignItems:'center', justifyContent:'center', padding:20, ...mono }}>
      <div style={{ width:560, background:'#0d1b2e', border:'1px solid #1e3a5f',
        borderRadius:8, padding:32 }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:22, fontWeight:900, letterSpacing:3, color:'#e0e8f0' }}>
            <span style={{color:'#cc2222'}}>RISK</span>RADAR
          </div>
        </div>
        <div style={{ fontSize:14, fontWeight:700, color:'#e0e8f0',
          marginBottom:6, letterSpacing:1 }}>🔒 ONE MORE STEP</div>
        <div style={{ fontSize:12, color:'#9ab0c8', lineHeight:1.8, marginBottom:20 }}>
          Before accessing your dashboard, you must designate an ISSO
          (Information System Security Officer) as your backup privileged account.
        </div>
        <div style={{ background:'rgba(0,60,120,0.12)', border:'1px solid #1e3a5f',
          borderRadius:4, padding:'12px 16px', marginBottom:20,
          fontSize:11, color:'#4a7a9b', lineHeight:1.8 }}>
          <strong style={{color:'#6a9ab0',display:'block',marginBottom:4}}>
            WHY IS THIS REQUIRED?
          </strong>
          DoD policy requires dual privileged account coverage at all times.
          If your account is locked or unavailable, your ISSO can manage the system
          without loss of access. Your dashboard is locked until this step is complete.
        </div>
        {err && <div style={{ background:'rgba(160,0,0,0.15)', border:'1px solid #660000',
          borderRadius:4, padding:'8px 14px', marginBottom:14,
          fontSize:11, color:'#ff9999' }}>⚠ {err}</div>}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:10, color:'#4a7a9b',
            letterSpacing:2, marginBottom:5 }}>ISSO FULL NAME</label>
          <input value={form.name} onChange={e=>set('name',e.target.value)}
            placeholder='Jane Doe'
            style={{ width:'100%', background:'#061224', border:'1px solid #1e3a5f',
              borderRadius:4, padding:'9px 12px', color:'#c0d8f0',
              fontSize:12, ...mono, boxSizing:'border-box' }} />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', fontSize:10, color:'#4a7a9b',
            letterSpacing:2, marginBottom:5 }}>ISSO EMAIL ADDRESS</label>
          <input type='email' value={form.email} onChange={e=>set('email',e.target.value)}
            placeholder='isso@program.mil'
            style={{ width:'100%', background:'#061224', border:'1px solid #1e3a5f',
              borderRadius:4, padding:'9px 12px', color:'#c0d8f0',
              fontSize:12, ...mono, boxSizing:'border-box' }} />
          <div style={{fontSize:9,color:'#2a5a7b',marginTop:4}}>
            They will receive a separate one-time invite link · expires in 24 hours
          </div>
        </div>
        <button onClick={submit} disabled={busy}
          style={{ ...mono, width:'100%', padding:'11px 0', background:'#0055cc',
            border:'none', borderRadius:4, cursor:'pointer', color:'#fff',
            fontSize:12, fontWeight:700, letterSpacing:1.5 }}>
          {busy ? 'SENDING INVITE…' : 'SEND ISSO INVITE & UNLOCK DASHBOARD →'}
        </button>
      </div>
    </div>
  );
}
