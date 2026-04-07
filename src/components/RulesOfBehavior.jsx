import { useState } from 'react';
import { useAuth } from './Auth.jsx';

const mono = { fontFamily: "'Courier New',monospace" };
const ROB_VERSION = 'rob_v1';
const RULES = [
  'You are only authorized to access this system for official duties within your assigned role.',
  'You will not attempt to access data, systems, or networks beyond your authorized scope.',
  'You will not share your credentials, MFA codes, or session with any other person.',
  'You will lock your workstation when unattended and report any suspected compromise immediately.',
  'You will complete annual DoD Cyber Awareness training and maintain a current certificate.',
  'You understand that all actions on this system are monitored, logged, and subject to audit.',
  'You will report any suspected unauthorized access, data spills, or security incidents to your ISSM.',
  'Violation of these rules may result in removal of access, administrative action, or criminal prosecution.',
];

export function useROBAccepted(memberId) {
  return !!localStorage.getItem(ROB_VERSION + '_' + (memberId || 'demo'));
}

export default function RulesOfBehaviorModal({ onAccept }) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const { member } = useAuth();

  const accept = () => {
    if (!checked || busy) return;
    setBusy(true);
    localStorage.setItem(ROB_VERSION + '_' + (member?.id || 'demo'), Date.now().toString());
    setTimeout(() => onAccept(), 400);
  };

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0,
      background:'rgba(0,0,0,0.82)', zIndex:2000,
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:20, ...mono }}>
      <div style={{ background:'#0d1b2e', border:'2px solid #1e3a5f',
        borderRadius:8, padding:32, width:620, maxWidth:'100%',
        maxHeight:'90vh', display:'flex', flexDirection:'column', gap:0 }}>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:10, color:'#4a7a9b', letterSpacing:3, marginBottom:6 }}>
            NIST 800-53 PL-4 · PS-6 · DoD required
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:'#e0e8f0', letterSpacing:1 }}>
            RULES OF BEHAVIOR
          </div>
          <div style={{ fontSize:11, color:'#4a7a9b', marginTop:4, lineHeight:1.6 }}>
            Read and acknowledge the following rules before accessing RiskRadar.
            This acknowledgment is logged and required annually.
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto', background:'#061224',
          border:'1px solid #1e3a5f', borderRadius:6,
          padding:'16px 20px', marginBottom:18 }}>
          {RULES.map((rule, i) => (
            <div key={i} style={{ display:'flex', gap:12, marginBottom: i < RULES.length-1 ? 14 : 0,
              fontSize:12, color:'#9ab0c8', lineHeight:1.7 }}>
              <span style={{ color:'#1e4a8a', fontWeight:700, flexShrink:0, marginTop:1 }}>
                {String(i+1).padStart(2,'0')}
              </span>
              <span>{rule}</span>
            </div>
          ))}
        </div>

        {member && (
          <div style={{ background:'rgba(0,60,120,0.12)', border:'1px solid #1e3a5f',
            borderRadius:4, padding:'8px 14px', marginBottom:14,
            fontSize:11, color:'#4a7a9b' }}>
            Acknowledging as: <span style={{color:'#a0b8d0'}}>{member.display_name || 'Demo User'}</span>
            {' · '}Role: <span style={{color:'#a0b8d0'}}>{(member.role||'issm').toUpperCase()}</span>
            {' · '}{new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}
          </div>
        )}

        <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer',
          marginBottom:18, fontSize:12, color:'#9ab0c8', lineHeight:1.6 }}>
          <input type='checkbox' checked={checked} onChange={e=>setChecked(e.target.checked)}
            style={{ marginTop:2, accentColor:'#0066cc', flexShrink:0 }} />
          <span>
            I have read, understand, and agree to abide by these Rules of Behavior.
            I acknowledge that my use of this system is subject to monitoring and
            that violations may result in loss of access or criminal prosecution.
          </span>
        </label>

        <button onClick={accept} disabled={!checked || busy} style={{
          ...mono, width:'100%', padding:'11px 0',
          background: checked ? '#0055cc' : '#1a2a3a',
          border:'none', borderRadius:4, cursor: checked ? 'pointer' : 'not-allowed',
          color: checked ? '#fff' : '#2a4a6b',
          fontSize:12, fontWeight:700, letterSpacing:1.5,
          opacity: busy ? 0.7 : 1, transition:'all 0.2s',
        }}>
          {busy ? 'RECORDING ACKNOWLEDGMENT…' : 'I ACKNOWLEDGE AND ACCEPT →'}
        </button>
      </div>
    </div>
  );
}
