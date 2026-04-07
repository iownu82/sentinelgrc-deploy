import { useState } from 'react';
import { enrollYubiKey, authenticateYubiKey, hasEnrolledKey, revokeKey, isSupported } from '../services/webAuthnService.js';
import { useAuth } from './Auth.jsx';

const mono = { fontFamily:"'Courier New',monospace" };

export default function YubiKeyTest() {
  const { member } = useAuth();
  const userId    = member?.id || 'demo';
  const userEmail = member?.display_name ? member.display_name + '@ballardis3.com' : 'admin@ballardis3.com';
  const userName  = member?.display_name || 'Demo User';

  const [status, setStatus]   = useState('idle'); // idle|enrolling|enrolled|testing|success|error
  const [msg, setMsg]         = useState('');
  const [enrolled, setEnrolled] = useState(hasEnrolledKey(userId));
  const [credId, setCredId]   = useState('');

  const supported = isSupported();

  const doEnroll = async () => {
    setStatus('enrolling'); setMsg('');
    try {
      setMsg('Insert your YubiKey and touch it when it flashes...');
      const result = await enrollYubiKey({ userId, userEmail, userName });
      setCredId(result.credentialId.slice(0,24)+'...');
      setEnrolled(true);
      setStatus('enrolled');
      setMsg('YubiKey enrolled successfully! Credential ID: ' + result.credentialId.slice(0,16)+'...');
    } catch(e) {
      setStatus('error');
      setMsg('Enrollment failed: ' + e.message);
    }
  };

  const doAuth = async () => {
    setStatus('testing'); setMsg('');
    try {
      setMsg('Insert your YubiKey and touch it when it flashes...');
      const result = await authenticateYubiKey(userId);
      setStatus('success');
      setMsg('Authentication successful! Credential: ' + result.credentialId.slice(0,16)+'...');
    } catch(e) {
      setStatus('error');
      setMsg('Authentication failed: ' + e.message);
    }
  };

  const doRevoke = () => {
    revokeKey(userId);
    setEnrolled(false);
    setCredId('');
    setStatus('idle');
    setMsg('YubiKey credential removed. Re-enrollment required.');
  };

  const statusColor = {
    idle:'#4a7a9b', enrolling:'#ffaa44', enrolled:'#00cc66',
    testing:'#ffaa44', success:'#00cc66', error:'#cc4444'
  }[status];

  const statusIcon = {
    idle:'🔑', enrolling:'⏳', enrolled:'✅',
    testing:'⏳', success:'✅', error:'❌'
  }[status];

  return (
    <div style={{padding:24,...mono,color:'#c0d8f0',maxWidth:600}}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:16,fontWeight:700,color:'#e0e8f0',letterSpacing:1,marginBottom:4}}>
          🔐 YUBIKEY / FIDO2 TEST
        </div>
        <div style={{fontSize:10,color:'#4a7a9b'}}>
          FIDO2 · WebAuthn · Phishing-resistant hardware MFA
        </div>
      </div>

      {/* Browser support check */}
      <div style={{background:supported?'rgba(0,150,50,0.1)':'rgba(180,0,0,0.1)',
        border:'1px solid '+(supported?'#006622':'#660000'),
        borderRadius:4,padding:'10px 14px',marginBottom:16,fontSize:11}}>
        {supported
          ? '✅ WebAuthn / FIDO2 supported in this browser'
          : '❌ WebAuthn not supported — use Chrome, Firefox, Edge, or Safari 16+'}
      </div>

      {/* User context */}
      <div style={{background:'#061224',border:'1px solid #1e3a5f',borderRadius:4,
        padding:'10px 14px',marginBottom:16,fontSize:11,color:'#4a7a9b'}}>
        Testing as: <span style={{color:'#a0b8d0'}}>{userName}</span>
        {' · '}<span style={{color:'#a0b8d0'}}>{userEmail}</span>
        {' · '}Origin: <span style={{color:'#a0b8d0'}}>{window.location.hostname}</span>
      </div>

      {/* Status */}
      {msg && (
        <div style={{background:'rgba(0,0,0,0.3)',border:'1px solid #1e3a5f',
          borderRadius:4,padding:'10px 14px',marginBottom:16,
          fontSize:11,color:statusColor,lineHeight:1.7}}>
          {statusIcon} {msg}
        </div>
      )}

      {/* Enrollment status */}
      <div style={{background:'#061224',border:'1px solid '+(enrolled?'#006633':'#1e3a5f'),
        borderRadius:6,padding:16,marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:enrolled?'#00cc66':'#4a7a9b',marginBottom:8}}>
          {enrolled ? '✅ YUBIKEY ENROLLED' : '🔑 NO KEY ENROLLED'}
        </div>
        {enrolled && credId && (
          <div style={{fontSize:10,color:'#4a7a9b',marginBottom:4}}>
            Credential: <span style={{color:'#a0b8d0'}}>{credId}</span>
          </div>
        )}
        <div style={{fontSize:10,color:'#2a5a7b',lineHeight:1.7}}>
          {enrolled
            ? 'This user has a registered YubiKey credential for this origin.'
            : 'No YubiKey is registered for this user on this domain.'}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        {!enrolled ? (
          <button onClick={doEnroll} disabled={!supported||status==='enrolling'}
            style={{...mono,background:'#0055cc',border:'none',borderRadius:4,
              padding:'10px 20px',cursor:'pointer',color:'#fff',
              fontSize:11,fontWeight:700,letterSpacing:1,
              opacity:(!supported||status==='enrolling')?0.5:1}}>
            {status==='enrolling' ? '⏳ TOUCH YOUR YUBIKEY…' : '🔑 ENROLL YUBIKEY'}
          </button>
        ) : (
          <>
            <button onClick={doAuth} disabled={status==='testing'}
              style={{...mono,background:'#004422',border:'1px solid #006633',
                borderRadius:4,padding:'10px 20px',cursor:'pointer',
                color:'#00cc66',fontSize:11,fontWeight:700,letterSpacing:1,
                opacity:status==='testing'?0.5:1}}>
              {status==='testing' ? '⏳ TOUCH YOUR YUBIKEY…' : '🔐 TEST AUTHENTICATION'}
            </button>
            <button onClick={doRevoke}
              style={{...mono,background:'transparent',border:'1px solid #660000',
                borderRadius:4,padding:'10px 20px',cursor:'pointer',
                color:'#cc4444',fontSize:11,fontWeight:700,letterSpacing:1}}>
              🗑 REVOKE KEY
            </button>
          </>
        )}
      </div>

      {/* How it works */}
      <div style={{marginTop:20,background:'#061224',border:'1px solid #1e3a5f',
        borderRadius:4,padding:14,fontSize:10,color:'#4a7a9b',lineHeight:1.9}}>
        <strong style={{color:'#6a9ab0',display:'block',marginBottom:6}}>HOW IT WORKS</strong>
        Enrollment: Browser asks YubiKey to generate an ES256 keypair for this domain.
        Public key stored here. Private key never leaves the key.<br/>
        Authentication: Browser sends a challenge signed by YubiKey's private key.
        Server verifies the signature against the stored public key.<br/>
        <strong style={{color:'#ffaa44'}}>Phishing-proof:</strong> Credential is bound to
        <strong> {window.location.hostname}</strong> — a fake domain gets nothing.
      </div>
    </div>
  );
}
