import { useState, useRef, useEffect } from "react";
import { loadSubmissions, addSubmission, generateId } from '../utils/stigStore.js';

const C = {
  bg:"var(--rr-bg)", panel:"var(--rr-panel)", border:"var(--rr-border)",
  borderMd:"var(--rr-border-md)", text:"var(--rr-text)", dim:"var(--rr-text-dim)",
  mute:"var(--rr-mute)", teal:"var(--rr-teal)", blue:"var(--rr-blue)",
  red:"var(--rr-red)", orange:"var(--rr-orange)", green:"var(--rr-green)",
  input:"var(--rr-input)", inputBdr:"var(--rr-input-bdr)", white:"var(--rr-white)",
  tintBlue:"var(--rr-tint-blue)", tintGreen:"var(--rr-tint-green)",
  tintRed:"var(--rr-tint-red)", tintOrange:"var(--rr-tint-orange)",
};

const mono = { fontFamily:"'Courier New',monospace" };

const CAT_COLORS = { 'CAT I': 'var(--rr-red)', 'CAT II': 'var(--rr-orange)', 'CAT III': 'var(--rr-gold)' };

const STIG_FAMILIES = [
  'Windows Server 2022','Windows Server 2019','Windows 10','Windows 11',
  'RHEL 8','RHEL 9','Ubuntu 20.04','Ubuntu 22.04',
  'Cisco IOS','Cisco NX-OS','Palo Alto PAN-OS',
  'VMware ESXi','SQL Server 2019','IIS 10','Apache 2.4',
  'Docker Enterprise','Kubernetes',
];

export default function STIGEvidence({ member }) {
  const [ruleId, setRuleId] = useState('');
  const [vulnId, setVulnId] = useState('');
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('CAT II');
  const [family, setFamily] = useState('Windows Server 2022');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState(() => loadSubmissions());
  const fileRef = useRef(null);

  // Listen for cross-role updates (ISSO/ISSM approve/reject)
  useEffect(() => {
    const onStorage = () => setSubmissions(loadSubmissions());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImage(f);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f || !f.type.startsWith('image/')) return;
    setImage(f);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!ruleId || !title || !imagePreview) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    const newSub = {
      id: generateId(),
      ruleId, vulnId, title, cat, family, notes,
      status: 'pending',
      submittedBy: member?.name || 'SysAdmin',
      submittedAt: new Date().toISOString().slice(0,16).replace('T',' '),
      preview: imagePreview,
    };
    const updated = addSubmission(newSub);
    setSubmissions(updated);
    setSubmitted(true);
    setSubmitting(false);
    // Reset form
    setRuleId(''); setVulnId(''); setTitle(''); setNotes('');
    setImage(null); setImagePreview(null); setCat('CAT II');
    setTimeout(() => setSubmitted(false), 4000);
  };

  const statusColor = s => s==='approved' ? C.green : s==='rejected' ? C.red : C.orange;
  const statusLabel = s => s==='approved' ? '✓ APPROVED' : s==='rejected' ? '✗ REJECTED' : '⏳ PENDING REVIEW';

  return (
    <div style={{ padding:'20px 24px', fontFamily:"'Courier New',monospace", color:C.text, height:'100%', overflowY:'auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.teal, letterSpacing:2 }}>📸 STIG EVIDENCE SUBMISSION</div>
          <div style={{ fontSize:10, color:C.mute, letterSpacing:1, marginTop:2 }}>Single STIG implementation proof · Screenshot upload · ISSO/ISSM review</div>
        </div>
        <div style={{ fontSize:9, color:C.mute, letterSpacing:1, textAlign:'right' }}>
          <div>AU-10 COMPLIANT</div>
          <div style={{ color:C.teal }}>ALL SUBMISSIONS LOGGED</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* LEFT — Submission form */}
        <div>
          <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.white, letterSpacing:1, marginBottom:16, paddingBottom:10, borderBottom:`1px solid ${C.border}` }}>
              SUBMIT STIG IMPLEMENTATION EVIDENCE
            </div>

            {submitted && (
              <div style={{ background:C.tintGreen, border:`1px solid ${C.green}`, borderRadius:6, padding:'10px 14px', marginBottom:14, fontSize:11, color:C.green }}>
                ✓ Evidence submitted — ISSO and ISSM have been notified for review
              </div>
            )}

            {/* STIG identifiers */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:9, letterSpacing:1.5, color:C.mute, marginBottom:5 }}>RULE ID *</div>
                <input value={ruleId} onChange={e=>setRuleId(e.target.value)}
                  placeholder="V-254239"
                  style={{ width:'100%', background:C.input, border:`1px solid ${ruleId?C.teal:C.inputBdr}`, borderRadius:5, padding:'7px 10px', fontSize:11, color:C.text, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }} />
              </div>
              <div>
                <div style={{ fontSize:9, letterSpacing:1.5, color:C.mute, marginBottom:5 }}>VULN ID</div>
                <input value={vulnId} onChange={e=>setVulnId(e.target.value)}
                  placeholder="V-254239"
                  style={{ width:'100%', background:C.input, border:`1px solid ${C.inputBdr}`, borderRadius:5, padding:'7px 10px', fontSize:11, color:C.text, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
              </div>
            </div>

            {/* CAT + Family */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:9, letterSpacing:1.5, color:C.mute, marginBottom:5 }}>CATEGORY *</div>
                <select value={cat} onChange={e=>setCat(e.target.value)}
                  style={{ width:'100%', background:C.input, border:`1px solid ${CAT_COLORS[cat]||C.inputBdr}`, borderRadius:5, padding:'7px 10px', fontSize:11, color:CAT_COLORS[cat]||C.text, fontFamily:'inherit', outline:'none', cursor:'pointer', boxSizing:'border-box' }}>
                  <option>CAT I</option><option>CAT II</option><option>CAT III</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize:9, letterSpacing:1.5, color:C.mute, marginBottom:5 }}>STIG FAMILY *</div>
                <select value={family} onChange={e=>setFamily(e.target.value)}
                  style={{ width:'100%', background:C.input, border:`1px solid ${C.inputBdr}`, borderRadius:5, padding:'7px 10px', fontSize:11, color:C.text, fontFamily:'inherit', outline:'none', cursor:'pointer', boxSizing:'border-box' }}>
                  {['Windows Server 2022','Windows Server 2019','Windows 10','Windows 11','RHEL 8','RHEL 9','Ubuntu 20.04','Ubuntu 22.04','Cisco IOS','Cisco NX-OS','Palo Alto PAN-OS','VMware ESXi','SQL Server 2019','IIS 10','Apache 2.4'].map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:9, letterSpacing:1.5, color:C.mute, marginBottom:5 }}>STIG TITLE / FINDING DESCRIPTION *</div>
              <input value={title} onChange={e=>setTitle(e.target.value)}
                placeholder="Minimum password length must be 14 characters"
                style={{ width:'100%', background:C.input, border:`1px solid ${title?C.teal:C.inputBdr}`, borderRadius:5, padding:'7px 10px', fontSize:11, color:C.text, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }} />
            </div>

            {/* Notes */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, letterSpacing:1.5, color:C.mute, marginBottom:5 }}>IMPLEMENTATION NOTES</div>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                placeholder="Describe how the STIG was implemented — GPO path, registry key set, command run, etc."
                rows={3}
                style={{ width:'100%', background:C.input, border:`1px solid ${C.inputBdr}`, borderRadius:5, padding:'7px 10px', fontSize:11, color:C.text, fontFamily:'inherit', outline:'none', resize:'none', boxSizing:'border-box' }} />
            </div>

            {/* Screenshot upload */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:9, letterSpacing:1.5, color:C.mute, marginBottom:5 }}>EVIDENCE SCREENSHOT *</div>
              <div
                onDrop={handleDrop} onDragOver={e=>e.preventDefault()}
                onClick={()=>fileRef.current?.click()}
                style={{
                  border:`2px dashed ${imagePreview?C.teal:C.inputBdr}`,
                  borderRadius:8, padding:imagePreview?'8px':'24px',
                  textAlign:'center', cursor:'pointer',
                  background:imagePreview?'transparent':C.input,
                  transition:'all 0.2s',
                }}>
                {imagePreview ? (
                  <div style={{ position:'relative' }}>
                    <img src={imagePreview} alt="Evidence" style={{ maxWidth:'100%', maxHeight:180, borderRadius:4, display:'block' }} />
                    <div style={{ position:'absolute', top:6, right:6 }}>
                      <button onClick={e=>{e.stopPropagation();setImage(null);setImagePreview(null);}}
                        style={{ background:'rgba(255,68,68,0.8)', border:'none', borderRadius:4, color:'white', fontSize:10, padding:'2px 8px', cursor:'pointer' }}>✕ Remove</button>
                    </div>
                    <div style={{ fontSize:9, color:C.teal, marginTop:6, letterSpacing:1 }}>✓ {image?.name||'screenshot.png'}</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize:24, marginBottom:8 }}>📸</div>
                    <div style={{ fontSize:11, color:C.dim }}>Drag & drop screenshot or click to upload</div>
                    <div style={{ fontSize:9, color:C.mute, marginTop:4 }}>PNG, JPG, BMP · Max 10MB · Shows implemented STIG setting</div>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />
            </div>

            {/* What to screenshot guidance */}
            <div style={{ background:C.tintBlue, border:`1px solid ${C.blue}33`, borderRadius:6, padding:'10px 14px', marginBottom:14, fontSize:10, color:C.dim }}>
              <div style={{ color:C.blue, fontWeight:700, marginBottom:5, letterSpacing:1 }}>📋 EVIDENCE SCREENSHOT GUIDANCE</div>
              <div>• <strong>Registry:</strong> Show full path + value name + data in Registry Editor</div>
              <div>• <strong>Group Policy:</strong> Show the RSOP or GPO setting with correct value</div>
              <div>• <strong>PowerShell/CLI:</strong> Show command + output in terminal window</div>
              <div>• <strong>Service config:</strong> Show service properties with correct startup type</div>
              <div style={{ marginTop:5, color:C.blue }}>Include the system hostname/date in the screenshot when possible (AU-10)</div>
            </div>

            {/* Submit button */}
            <button
              onClick={submit}
              disabled={!ruleId||!title||!imagePreview||submitting}
              style={{
                width:'100%', padding:'11px 0', borderRadius:6, border:'none',
                background: ruleId&&title&&imagePreview&&!submitting
                  ? `linear-gradient(135deg, ${C.teal}, ${C.blue})`
                  : C.border,
                color: ruleId&&title&&imagePreview&&!submitting ? '#020A10' : C.mute,
                fontSize:12, fontWeight:700, letterSpacing:1.5,
                cursor: ruleId&&title&&imagePreview&&!submitting ? 'pointer' : 'default',
                fontFamily:'inherit', transition:'all 0.2s',
              }}>
              {submitting ? '⏳ SUBMITTING...' : '📤 SUBMIT EVIDENCE → NOTIFY ISSO/ISSM'}
            </button>
          </div>
        </div>

        {/* RIGHT — Submission history + alerts */}
        <div>
          {/* Alert banner */}
          <div style={{ background:C.tintBlue, border:`1px solid ${C.blue}44`, borderRadius:8, padding:'12px 16px', marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.blue, letterSpacing:1, marginBottom:6 }}>⚡ HOW IT WORKS</div>
            <div style={{ fontSize:10, color:C.dim, lineHeight:1.7 }}>
              1. SysAdmin implements the STIG on the system<br/>
              2. Takes screenshot proving the setting is configured<br/>
              3. Submits here — ISSO + ISSM get in-app alert<br/>
              4. ISSO reviews screenshot + notes, approves or requests more info<br/>
              5. Approved evidence auto-populates Evidence Tracker + POAM<br/>
              6. No full SCAP scan needed for single STIG implementations
            </div>
          </div>

          {/* Submission history */}
          <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, fontSize:11, fontWeight:700, color:C.white, letterSpacing:1 }}>
              SUBMISSION HISTORY
            </div>
            {submissions.map((s,i) => (
              <div key={i} style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, transition:'background 0.1s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <div>
                    <span style={{ fontSize:9, color:C.mute, letterSpacing:1 }}>{s.id} · </span>
                    <span style={{ fontSize:10, fontWeight:700, color:CAT_COLORS[s.cat]||C.orange }}>{s.cat}</span>
                    <span style={{ fontSize:9, color:C.mute }}> · {s.family}</span>
                  </div>
                  <div style={{ fontSize:9, fontWeight:700, color:statusColor(s.status), letterSpacing:1 }}>
                    {statusLabel(s.status)}
                  </div>
                </div>
                <div style={{ fontSize:11, color:C.text, marginBottom:4 }}>{s.ruleId} — {s.title}</div>
                <div style={{ fontSize:9, color:C.mute }}>{s.submittedBy} · {s.submittedAt}</div>
                {s.notes && <div style={{ fontSize:9, color:C.dim, marginTop:4, fontStyle:'italic' }}>{s.notes}</div>}
                {s.status==='approved' && s.approvedBy && (
                  <div style={{ fontSize:9, color:C.green, marginTop:4 }}>✓ Approved by {s.approvedBy} · {s.approvedAt}</div>
                )}
                {s.preview && (
                  <img src={s.preview} alt="Evidence" style={{ maxWidth:'100%', maxHeight:80, borderRadius:4, marginTop:8, opacity:0.8 }} />
                )}
              </div>
            ))}
            {submissions.length===0 && (
              <div style={{ padding:'24px', textAlign:'center', fontSize:11, color:C.mute }}>No submissions yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}