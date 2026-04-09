import { useState } from "react";

const C = {
  bg:"var(--rr-bg)", panel:"var(--rr-panel)", border:"var(--rr-border)",
  borderMd:"var(--rr-border-md)", text:"var(--rr-text)", dim:"var(--rr-text-dim)",
  mute:"var(--rr-mute)", teal:"var(--rr-teal)", blue:"var(--rr-blue)",
  red:"var(--rr-red)", orange:"var(--rr-orange)", green:"var(--rr-green)",
  gold:"var(--rr-gold)", input:"var(--rr-input)", inputBdr:"var(--rr-input-bdr)",
  white:"var(--rr-white)", tintBlue:"var(--rr-tint-blue)",
  tintGreen:"var(--rr-tint-green)", tintRed:"var(--rr-tint-red)",
  tintOrange:"var(--rr-tint-orange)",
};

const CAT_COLORS = { 'CAT I': 'var(--rr-red)', 'CAT II': 'var(--rr-orange)', 'CAT III': 'var(--rr-gold)' };

const DEMO_ALERTS = [
  {
    id:'SE-003', ruleId:'V-220706', title:'Account lockout threshold must be 3 attempts',
    cat:'CAT I', family:'Windows Server 2022', status:'pending',
    submittedBy:'J. Martinez (SysAdmin)', submittedAt:'2026-04-09 11:42',
    notes:'Applied via Default Domain Policy GPO. RSOP confirms lockout threshold = 3. Service restart not required.',
    hasScreenshot: true,
  },
  {
    id:'SE-004', ruleId:'V-254315', title:'Windows Server must use FIPS-compliant algorithms',
    cat:'CAT II', family:'Windows Server 2022', status:'pending',
    submittedBy:'J. Martinez (SysAdmin)', submittedAt:'2026-04-09 09:18',
    notes:'Registry key set: HKLM\\System\\CurrentControlSet\\Control\\Lsa\\FIPSAlgorithmPolicy\\Enabled = 1. System rebooted.',
    hasScreenshot: true,
  },
  {
    id:'SE-002', ruleId:'V-220712', title:'Local administrator accounts must be disabled',
    cat:'CAT II', family:'Windows Server 2022', status:'approved',
    submittedBy:'K. Thompson (SysAdmin)', submittedAt:'2026-04-08 14:32',
    notes:'Built-in Administrator account disabled via GPO. Confirmed via net user command output.',
    hasScreenshot: true, approvedBy:'ISSO', approvedAt:'2026-04-08 15:45',
  },
  {
    id:'SE-001', ruleId:'V-220826', title:'Windows event log size must be 32768 KB',
    cat:'CAT II', family:'Windows Server 2022', status:'rejected',
    submittedBy:'K. Thompson (SysAdmin)', submittedAt:'2026-04-07 16:20',
    notes:'Set via GPO.',
    hasScreenshot: true, rejectedBy:'ISSO', rejectedAt:'2026-04-07 17:00',
    rejectionReason:'Screenshot does not show the correct GPO path. Please resubmit with RSOP screenshot showing the effective setting.',
  },
];

export default function STIGAlerts({ role }) {
  const [alerts, setAlerts] = useState(DEMO_ALERTS);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [filter, setFilter] = useState('all');

  const canApprove = role === 'issm' || role === 'isso';
  const pending = alerts.filter(a=>a.status==='pending').length;

  const approve = (id) => {
    setAlerts(prev=>prev.map(a=>a.id===id?{...a,status:'approved',approvedBy:role.toUpperCase(),approvedAt:new Date().toISOString().slice(0,16).replace('T',' ')}:a));
    setSelected(null);
    setFeedback('');
  };

  const reject = (id) => {
    if(!feedback.trim()){alert('Please provide rejection reason before rejecting.');return;}
    setAlerts(prev=>prev.map(a=>a.id===id?{...a,status:'rejected',rejectedBy:role.toUpperCase(),rejectedAt:new Date().toISOString().slice(0,16).replace('T',' '),rejectionReason:feedback}:a));
    setSelected(null);
    setFeedback('');
  };

  const filtered = filter==='all' ? alerts : alerts.filter(a=>a.status===filter);
  const statusColor = s => s==='approved'?C.green:s==='rejected'?C.red:C.orange;
  const statusLabel = s => s==='approved'?'✓ APPROVED':s==='rejected'?'✗ REJECTED':'⏳ PENDING';

  return (
    <div style={{ padding:'20px 24px', fontFamily:"'Courier New',monospace", color:C.text, height:'100%', overflowY:'auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.blue, letterSpacing:2 }}>
            🔔 STIG EVIDENCE REVIEW
            {pending>0 && <span style={{ marginLeft:10, background:C.red, color:'white', fontSize:9, padding:'2px 8px', borderRadius:10, letterSpacing:1 }}>{pending} PENDING</span>}
          </div>
          <div style={{ fontSize:10, color:C.mute, letterSpacing:1, marginTop:2 }}>
            Review SysAdmin STIG implementation screenshots · Approve or request re-submission
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {['all','pending','approved','rejected'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{
              padding:'4px 10px', fontSize:9, letterSpacing:1, fontFamily:'inherit',
              border:`1px solid ${filter===f?C.blue:C.border}`,
              background:filter===f?C.tintBlue:'transparent',
              color:filter===f?C.blue:C.mute, borderRadius:4, cursor:'pointer',
              textTransform:'uppercase',
            }}>{f}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* LEFT — Alert list */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(a=>(
            <div key={a.id} onClick={()=>{setSelected(a);setFeedback('');}}
              style={{
                background: selected?.id===a.id ? C.tintBlue : C.panel,
                border: `1px solid ${selected?.id===a.id?C.blue:C.border}`,
                borderLeft: `3px solid ${statusColor(a.status)}`,
                borderRadius:6, padding:'12px 14px', cursor:'pointer',
                transition:'all 0.15s',
              }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:CAT_COLORS[a.cat] }}>{a.cat}</span>
                  <span style={{ fontSize:9, color:C.mute }}>{a.family}</span>
                </div>
                <span style={{ fontSize:9, fontWeight:700, color:statusColor(a.status), letterSpacing:1 }}>{statusLabel(a.status)}</span>
              </div>
              <div style={{ fontSize:11, color:C.text, marginBottom:4 }}>{a.ruleId} — {a.title}</div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:C.mute }}>
                <span>{a.submittedBy}</span>
                <span>{a.submittedAt}</span>
              </div>
              {a.hasScreenshot && <div style={{ fontSize:9, color:C.teal, marginTop:4 }}>📸 Screenshot attached</div>}
            </div>
          ))}
          {filtered.length===0 && (
            <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:6, padding:24, textAlign:'center', fontSize:11, color:C.mute }}>
              No {filter!=='all'?filter+' ':''}submissions
            </div>
          )}
        </div>

        {/* RIGHT — Detail / review panel */}
        <div>
          {selected ? (
            <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.white, letterSpacing:1 }}>EVIDENCE REVIEW</div>
                <span style={{ fontSize:9, fontWeight:700, color:statusColor(selected.status), letterSpacing:1 }}>{statusLabel(selected.status)}</span>
              </div>
              <div style={{ padding:16 }}>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:9, color:C.mute, letterSpacing:1.5, marginBottom:4 }}>FINDING</div>
                  <div style={{ fontSize:12, color:C.text }}>{selected.ruleId}</div>
                  <div style={{ fontSize:11, color:C.dim, marginTop:2 }}>{selected.title}</div>
                  <div style={{ display:'flex', gap:12, marginTop:6, fontSize:9 }}>
                    <span style={{ color:CAT_COLORS[selected.cat] }}>{selected.cat}</span>
                    <span style={{ color:C.mute }}>{selected.family}</span>
                  </div>
                </div>

                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:9, color:C.mute, letterSpacing:1.5, marginBottom:4 }}>SUBMITTED BY</div>
                  <div style={{ fontSize:11, color:C.text }}>{selected.submittedBy} · {selected.submittedAt}</div>
                </div>

                {selected.notes && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:9, color:C.mute, letterSpacing:1.5, marginBottom:4 }}>IMPLEMENTATION NOTES</div>
                    <div style={{ fontSize:11, color:C.dim, background:C.bg, border:`1px solid ${C.border}`, borderRadius:4, padding:'8px 10px', lineHeight:1.6 }}>{selected.notes}</div>
                  </div>
                )}

                {/* Screenshot placeholder */}
                {selected.hasScreenshot && (
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:9, color:C.mute, letterSpacing:1.5, marginBottom:6 }}>EVIDENCE SCREENSHOT</div>
                    <div style={{ background:C.bg, border:`2px dashed ${C.teal}44`, borderRadius:6, padding:24, textAlign:'center', color:C.mute, fontSize:10 }}>
                      📸 Screenshot attached<br/>
                      <span style={{ fontSize:9 }}>(Phase 4: stored in S3 GovCloud)</span>
                    </div>
                  </div>
                )}

                {selected.status==='rejected' && selected.rejectionReason && (
                  <div style={{ background:C.tintRed, border:`1px solid ${C.red}44`, borderRadius:6, padding:'10px 14px', marginBottom:14, fontSize:10, color:C.red }}>
                    <strong>Rejection reason:</strong> {selected.rejectionReason}
                  </div>
                )}

                {selected.status==='approved' && (
                  <div style={{ background:C.tintGreen, border:`1px solid ${C.green}44`, borderRadius:6, padding:'10px 14px', marginBottom:14, fontSize:10, color:C.green }}>
                    ✓ Approved by {selected.approvedBy} · {selected.approvedAt}
                  </div>
                )}

                {/* Approve/Reject actions */}
                {canApprove && selected.status==='pending' && (
                  <div>
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontSize:9, color:C.mute, letterSpacing:1.5, marginBottom:5 }}>FEEDBACK / REJECTION REASON</div>
                      <textarea value={feedback} onChange={e=>setFeedback(e.target.value)}
                        placeholder="Optional for approval · Required for rejection"
                        rows={3}
                        style={{ width:'100%', background:C.input, border:`1px solid ${C.inputBdr}`, borderRadius:5, padding:'7px 10px', fontSize:10, color:C.text, fontFamily:'inherit', outline:'none', resize:'none', boxSizing:'border-box' }} />
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <button onClick={()=>approve(selected.id)} style={{
                        padding:'9px 0', borderRadius:5, border:`1px solid ${C.green}`,
                        background:C.tintGreen, color:C.green, fontSize:11, fontWeight:700,
                        cursor:'pointer', fontFamily:'inherit', letterSpacing:1,
                      }}>✓ APPROVE</button>
                      <button onClick={()=>reject(selected.id)} style={{
                        padding:'9px 0', borderRadius:5, border:`1px solid ${C.red}`,
                        background:C.tintRed, color:C.red, fontSize:11, fontWeight:700,
                        cursor:'pointer', fontFamily:'inherit', letterSpacing:1,
                      }}>✗ REQUEST RESUBMIT</button>
                    </div>
                  </div>
                )}

                {!canApprove && selected.status==='pending' && (
                  <div style={{ fontSize:10, color:C.mute, textAlign:'center', padding:'10px 0' }}>
                    Awaiting ISSO/ISSM review
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:32, textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>🔔</div>
              <div style={{ fontSize:12, color:C.dim, marginBottom:6 }}>Select a submission to review</div>
              <div style={{ fontSize:10, color:C.mute }}>
                {canApprove ? 'You can approve or request resubmission' : 'View your submission status here'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}