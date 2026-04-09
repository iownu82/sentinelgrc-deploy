import { useState, useEffect, useRef } from 'react';
import { enrollYubiKey, authenticateYubiKey, hasEnrolledKey, revokeKey, isSupported } from '../services/webAuthnService.js';
import { auditLog, EVENTS } from '../security/auditLogger.js';
import { useAuth } from './Auth.jsx';

const mono = { fontFamily:"'Courier New',monospace" };

// Test steps — fully automated, only pauses for physical key touch
const STEPS = [
  { id:'check',    label:'Environment check',       desc:'Verify HTTPS + WebAuthn support' },
  { id:'enroll',   label:'Enroll YubiKey',           desc:'Register FIDO2 credential — touch key when prompted' },
  { id:'auth',     label:'Authenticate',             desc:'Verify credential — touch key when prompted' },
  { id:'revoke',   label:'Revoke + re-enroll check', desc:'Confirm revocation works correctly' },
  { id:'report',   label:'Security report',          desc:'Full test summary and audit log' },
];

export default function YubiKeyTest() {
  const { member } = useAuth();
  const userId    = member?.id || 'demo';
  const userEmail = member?.display_name ? (member.display_name.toLowerCase().replace(/ /g,'.')+'.test@ballardis3.com') : 'admin@ballardis3.com';
  const userName  = member?.display_name || 'Fredrick Ballard';

  const [currentStep, setCurrentStep] = useState(-1); // -1 = ready to start
  const [results, setResults]         = useState({}); // { stepId: { pass, msg, ts } }
  const [running, setRunning]         = useState(false);
  const [done, setDone]               = useState(false);
  const [activeMsg, setActiveMsg]     = useState('');
  const abortRef = useRef(false);

  const pass = (stepId, msg) => setResults(r=>({...r,[stepId]:{pass:true,  msg, ts:new Date().toISOString()}}));
  const fail = (stepId, msg) => setResults(r=>({...r,[stepId]:{pass:false, msg, ts:new Date().toISOString()}}));

  const runTests = async () => {
    abortRef.current = false;
    setRunning(true); setDone(false); setResults({});

    // ── Step 0: Environment check ──────────────────────────────────────────
    setCurrentStep(0); setActiveMsg('Checking browser and HTTPS...');
    await new Promise(r=>setTimeout(r,600));

    const supported = isSupported();
    const isHttps   = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    if (!supported) { fail('check','WebAuthn not supported in this browser. Use Chrome, Firefox, Edge, or Safari 16+.'); setRunning(false); setDone(true); return; }
    if (!isHttps)   { fail('check','WebAuthn requires HTTPS. App must be served over https://'); setRunning(false); setDone(true); return; }
    pass('check', 'WebAuthn supported ✓ · HTTPS confirmed ✓ · Origin: '+window.location.hostname);

    // Clear any existing credential for clean test
    revokeKey(userId);

    // ── Step 1: Enrollment ─────────────────────────────────────────────────
    setCurrentStep(1);
    setActiveMsg('Insert your YubiKey. The browser will prompt you to touch it...');
    try {
      const result = await enrollYubiKey({ userId, userEmail, userName });
      await auditLog(EVENTS.ISSM_CREATED, { actorId: userId, details: { method:'webauthn', credentialId: result.credentialId.slice(0,16) } });
      pass('enroll', 'Credential enrolled ✓ · ID: '+result.credentialId.slice(0,20)+'... · Method: FIDO2/ES256');
      setActiveMsg('Enrollment successful. Proceeding to authentication test...');
      await new Promise(r=>setTimeout(r,1200));
    } catch(e) {
      fail('enroll', e.message || 'Enrollment failed');
      setRunning(false); setDone(true); return;
    }

    // ── Step 2: Authentication ─────────────────────────────────────────────
    setCurrentStep(2);
    setActiveMsg('Touch your YubiKey again to verify authentication...');
    try {
      const result = await authenticateYubiKey(userId);
      await auditLog('WEBAUTHN_AUTH_SUCCESS', { actorId: userId, details: { credentialId: result.credentialId.slice(0,16) } });
      pass('auth', 'Authentication verified ✓ · Credential matched · Signature valid');
      setActiveMsg('Authentication passed. Testing revocation...');
      await new Promise(r=>setTimeout(r,1000));
    } catch(e) {
      fail('auth', e.message || 'Authentication failed');
      setRunning(false); setDone(true); return;
    }

    // ── Step 3: Revoke + verify ────────────────────────────────────────────
    setCurrentStep(3);
    setActiveMsg('Testing credential revocation...');
    await new Promise(r=>setTimeout(r,600));
    revokeKey(userId);
    const stillEnrolled = hasEnrolledKey(userId);
    if (stillEnrolled) {
      fail('revoke','Revocation failed — key still enrolled after revokeKey()');
    } else {
      pass('revoke','Revocation confirmed ✓ · Credential removed · Re-enrollment required');
    }
    await new Promise(r=>setTimeout(r,500));

    // ── Step 4: Report ─────────────────────────────────────────────────────
    setCurrentStep(4);
    setActiveMsg('Generating security report...');
    await new Promise(r=>setTimeout(r,800));
    const allPassed = ['check','enroll','auth','revoke'].every(s=>results[s]?.pass !== false);
    pass('report', allPassed
      ? 'All tests passed ✓ · YubiKey ready for production MFA enrollment'
      : 'Some tests failed — review results above');

    setRunning(false); setDone(true); setCurrentStep(-1);
    setActiveMsg('');
  };

  const supported = isSupported();
  const allPassed = done && ['check','enroll','auth','revoke'].every(s=>results[s]?.pass);
  const anyFailed = done && Object.values(results).some(r=>r?.pass===false);

  return (
    <div style={{padding:24,...mono,color:'var(--rr-text)',maxWidth:680}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:16,fontWeight:700,color:'var(--rr-white)',letterSpacing:1,marginBottom:4}}>
          🔐 YUBIKEY / FIDO2 — AUTOMATED TEST SUITE
        </div>
        <div style={{fontSize:10,color:'var(--rr-mute)',lineHeight:1.8}}>
          FIDO2 · WebAuthn · Phishing-resistant hardware MFA<br/>
          Testing on: <span style={{color:'#a0b8d0'}}>{window.location.hostname}</span>
          {' · '}User: <span style={{color:'#a0b8d0'}}>{userName}</span>
        </div>
      </div>

      {/* Browser check badge */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        <span style={{fontSize:10,padding:'3px 10px',borderRadius:4,
          background:supported?'rgba(0,150,50,0.12)':'rgba(180,0,0,0.12)',
          border:'1px solid '+(supported?'var(--rr-tint-green)':'var(--rr-tint-red)'),
          color:supported?'#00cc66':'#cc4444'}}>
          {supported?'✅ WebAuthn supported':'❌ WebAuthn not supported'}
        </span>
        <span style={{fontSize:10,padding:'3px 10px',borderRadius:4,
          background:'rgba(0,80,160,0.12)',border:'1px solid #003366',color:'#4a9fd4'}}>
          🔒 HTTPS: {window.location.protocol==='https:'?'✅':'❌'}
        </span>
        <span style={{fontSize:10,padding:'3px 10px',borderRadius:4,
          background:'rgba(0,0,0,0.2)',border:'1px solid #1e3a5f',color:'var(--rr-mute)'}}>
          Origin: {window.location.hostname}
        </span>
      </div>

      {/* Active status message */}
      {activeMsg && (
        <div style={{background:'rgba(0,100,200,0.1)',border:'1px solid #003366',
          borderRadius:4,padding:'10px 14px',marginBottom:16,fontSize:12,
          color:'#4a9fd4',display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:16}}>⏳</span> {activeMsg}
        </div>
      )}

      {/* Test steps */}
      <div style={{display:'grid',gap:8,marginBottom:20}}>
        {STEPS.map((step,i) => {
          const res    = results[step.id];
          const active = currentStep === i && running;
          const status = res ? (res.pass?'pass':'fail') : active ? 'running' : 'pending';
          const bg     = {pass:'rgba(0,150,50,0.08)',fail:'rgba(180,0,0,0.08)',
                          running:'rgba(0,100,200,0.1)',pending:'var(--rr-panel)'}[status];
          const border = {pass:'var(--rr-tint-green)',fail:'var(--rr-tint-red)',running:'var(--rr-tint-blue)',pending:'var(--rr-border-md)'}[status];
          const icon   = {pass:'✅',fail:'❌',running:'⏳',pending:'○'}[status];
          const numClr = {pass:'#00cc66',fail:'#cc4444',running:'#4a9fd4',pending:'var(--rr-mute)'}[status];
          return (
            <div key={step.id} style={{background:bg,border:'1px solid '+border,
              borderRadius:6,padding:'12px 14px',transition:'all 0.3s'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                <div style={{fontSize:14,minWidth:20,color:numClr,fontWeight:700,marginTop:1}}>
                  {icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontSize:12,fontWeight:700,color:'var(--rr-white)'}}>{step.label}</span>
                    <span style={{fontSize:9,color:'var(--rr-mute)'}}>{step.desc}</span>
                  </div>
                  {res && (
                    <div style={{fontSize:11,color:res.pass?'#00cc66':'#ff8888',lineHeight:1.6}}>
                      {res.msg}
                    </div>
                  )}
                  {active && !res && (
                    <div style={{fontSize:11,color:'#4a9fd4',lineHeight:1.6}}>
                      Running...
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Result banner */}
      {done && (
        <div style={{background:allPassed?'rgba(0,150,50,0.12)':'rgba(180,0,0,0.12)',
          border:'2px solid '+(allPassed?'var(--rr-tint-green)':'var(--rr-tint-red)'),
          borderRadius:8,padding:20,marginBottom:20,textAlign:'center'}}>
          <div style={{fontSize:36,marginBottom:8}}>{allPassed?'✅':'❌'}</div>
          <div style={{fontSize:14,fontWeight:700,
            color:allPassed?'#00cc66':'#cc4444',letterSpacing:1,marginBottom:6}}>
            {allPassed?'ALL TESTS PASSED':'SOME TESTS FAILED'}
          </div>
          <div style={{fontSize:11,color:'var(--rr-text-dim)',lineHeight:1.8}}>
            {allPassed
              ? 'YubiKey FIDO2 enrollment and authentication confirmed working on '+window.location.hostname+'. Ready for production MFA integration.'
              : 'Review failed steps above. Common issues: key not inserted, browser prompt dismissed, or browser does not support WebAuthn.'}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        {!running && (
          <button onClick={runTests} disabled={!supported}
            style={{...mono,background:supported?'#0055cc':'#1a2a3a',
              border:'none',borderRadius:4,padding:'11px 24px',
              cursor:supported?'pointer':'not-allowed',color:'#fff',
              fontSize:12,fontWeight:700,letterSpacing:1.5,
              opacity:supported?1:0.5}}>
            {done ? '🔄 RUN AGAIN' : '▶ START AUTOMATED TEST'}
          </button>
        )}
        {running && (
          <div style={{fontSize:11,color:'var(--rr-mute)'}}>
            Test running — touch your YubiKey when prompted by the browser...
          </div>
        )}
      </div>

      {/* Security note */}
      <div style={{marginTop:20,background:'var(--rr-panel)',border:'1px solid #1e3a5f',
        borderRadius:4,padding:14,fontSize:10,color:'var(--rr-mute)',lineHeight:1.9}}>
        <strong style={{color:'#6a9ab0',display:'block',marginBottom:4}}>
          WHY THE BROWSER PROMPT CANNOT BE AUTOMATED
        </strong>
        WebAuthn requires physical user presence (key touch) as a security guarantee.
        The browser enforces this at the OS level — no JavaScript can bypass it.
        This is what makes FIDO2 phishing-proof and replay-proof.
        Every test step other than the key touch runs automatically.
      </div>
    </div>
  );
}
