import { useState } from 'react';
import { sha256, generateNonce } from '../auth/crypto.js';
import { useAuth } from './Auth.jsx';

const mono={fontFamily:"'Courier New',monospace"};
const ACTION_C={LOGIN_SUCCESS:'#00cc66',LOGIN_FAIL:'#cc4444',ACCOUNT_LOCKED:'#cc2222',
  ACCOUNT_UNLOCKED:'#00aa44',CERT_UPLOADED:'#4a9fd4',ORG_CREATED:'#aa77ff',
  POAM_UPDATED:'#ffaa44',SESSION_EXPIRED:'var(--rr-tint-orange)'};
const DEMO_ORGS=[
  {id:'o1',name:'F-35 JSF Program',slug:'f35-jsf',type:'dod_program',status:'active',
   created:'2026-03-01',members:4,issm:'j.smith@lm.mil',isso:'j.doe@lm.mil'},
  {id:'o2',name:'Raytheon AMRAAM',slug:'raytheon-amraam',type:'prime_contractor',status:'active',
   created:'2026-03-15',members:2,issm:'r.jones@raytheon.mil',isso:'—'},
  {id:'o3',name:'AcmeDef LLC',slug:'acmedef-cmmc',type:'cmmc_sb',status:'bootstrap',
   created:'2026-04-01',members:0,issm:'—',isso:'—'},
];
const DEMO_USERS=[
  {id:'u1',name:'Fredrick Ballard',email:'admin@ballardis3.com',org:'Ballard IS3',
   role:'issm',status:'active',last_login:'2026-04-06',cyber:'2027-01-15',mfa:true,
   locked:false,locked_reason:''},
  {id:'u2',name:'John Smith',email:'j.smith@lm.mil',org:'F-35 JSF Program',
   role:'issm',status:'active',last_login:'2026-04-05',cyber:'2026-11-20',mfa:true,
   locked:false,locked_reason:''},
  {id:'u3',name:'Jane Doe',email:'j.doe@lm.mil',org:'F-35 JSF Program',
   role:'isso',status:'active',last_login:'2026-04-04',cyber:'2026-12-10',mfa:true,
   locked:false,locked_reason:''},
  {id:'u4',name:'Bob Wilson',email:'b.wilson@raytheon.mil',org:'Raytheon AMRAAM',
   role:'issm',status:'locked',last_login:'2026-04-03',cyber:'2026-09-01',mfa:true,
   locked:true,locked_reason:'3 failed login attempts (AC-7)'},
];
const DEMO_AUDIT=[
  {id:1,ts:'2026-04-06 14:32',actor:'admin@ballardis3.com',role:'issm',org:'Ballard IS3',
   action:'LOGIN_SUCCESS',ip:'192.168.1.100'},
  {id:2,ts:'2026-04-06 14:28',actor:'b.wilson@raytheon.mil',role:'issm',org:'Raytheon AMRAAM',
   action:'LOGIN_FAIL',ip:'10.5.2.88'},
  {id:3,ts:'2026-04-06 14:29',actor:'SYSTEM',role:'system',org:'Raytheon AMRAAM',
   action:'ACCOUNT_LOCKED',ip:'10.5.2.88'},
  {id:4,ts:'2026-04-06 13:15',actor:'j.smith@lm.mil',role:'issm',org:'F-35 JSF Program',
   action:'CERT_UPLOADED',ip:'10.1.5.4'},
  {id:5,ts:'2026-04-05 16:45',actor:'admin@ballardis3.com',role:'issm',org:'Ballard IS3',
   action:'ORG_CREATED',ip:'192.168.1.100'},
];

function Btn({onClick,children,variant='primary',sm,disabled}){
  const s={...mono,border:'none',cursor:disabled?'not-allowed':'pointer',fontWeight:700,
    letterSpacing:1,borderRadius:4,padding:sm?'5px 12px':'9px 20px',
    fontSize:sm?10:11,opacity:disabled?0.5:1,
    background:variant==='primary'?'#0055aa':variant==='success'?'var(--rr-tint-green)':
      variant==='danger'?'var(--rr-tint-red)':'transparent',
    color:variant==='primary'?'#fff':variant==='success'?'#00cc66':
      variant==='danger'?'#ff8888':'var(--rr-mute)',
    border:variant==='ghost'?'1px solid var(--rr-border-md)':'none'};
  return <button style={s} onClick={onClick} disabled={disabled}>{children}</button>;
}
function Badge({label,color='#4a8ab0'}){
  return <span style={{fontSize:9,padding:'2px 8px',borderRadius:10,background:'rgba(0,0,0,0.3)',
    color,border:'1px solid '+color}}>{label}</span>;
}

export default function AdminConsole(){
  const {role,isDemo}=useAuth();
  const [tab,setTab]=useState('orgs');
  const [orgs,setOrgs]=useState(DEMO_ORGS);
  const [users,setUsers]=useState(DEMO_USERS);
  const [token,setToken]=useState(null);
  const [msg,setMsg]=useState('');
  const [msgType,setMsgType]=useState('ok');
  // CAC+PIN unlock modal state
  const [unlockTarget,setUnlockTarget]=useState(null);
  const [unlockStep,setUnlockStep]=useState('review'); // review|pin|done
  const [unlockPin,setUnlockPin]=useState('');
  const [unlockReason,setUnlockReason]=useState('');

  const notify=(text,type='ok')=>{setMsg(text);setMsgType(type);setTimeout(()=>setMsg(''),5000);};

  const TABS=[{id:'orgs',icon:'🏢',label:'Organizations'},{id:'create',icon:'➕',label:'New Org'},
    {id:'users',icon:'👤',label:'Users'},{id:'audit',icon:'📋',label:'Audit Log'},
    {id:'system',icon:'⚙',label:'System'}];

  const generateToken=async(org)=>{
    const raw=generateNonce()+generateNonce()+generateNonce();
    const hash=await sha256(raw);
    setToken({org,raw,hash,expires:new Date(Date.now()+86400000).toISOString()});
    setTab('token');
    notify('Bootstrap token generated for '+org.name);
  };

  // Step 1: ISSM clicks RE-ENABLE — shows review screen
  const initiateUnlock=(u)=>{
    setUnlockTarget(u);setUnlockStep('review');
    setUnlockPin('');setUnlockReason('');
  };

  // Step 2: ISSM proceeds to CAC+PIN screen
  const proceedToPin=()=>setUnlockStep('pin');

  // Step 3: ISSM enters PIN + justification → account unlocked + logged
  const confirmUnlock=()=>{
    if(unlockPin!=='000000'){notify('Authentication failed. Unlock not permitted.','err');return;}
    if(!unlockReason.trim()){notify('Justification is required for the audit record.','err');return;}
    setUsers(p=>p.map(u=>u.id===unlockTarget.id?
      {...u,status:'active',locked:false,locked_reason:''}:u));
    // In production: write audit record with ISSM CAC thumbprint, timestamp, IP, justification
    setUnlockStep('done');
    setTimeout(()=>{setUnlockTarget(null);setUnlockStep('review');},2500);
    notify('Account re-enabled. CAC+PIN auth recorded in audit log (AU-10, JSIG).');
  };

  return(
    <div style={{padding:24,...mono,color:'var(--rr-text)'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
        marginBottom:20,paddingBottom:16,borderBottom:'1px solid var(--rr-border-md)'}}>
        <div>
          <div style={{fontSize:16,fontWeight:900,color:'var(--rr-white)',letterSpacing:2}}>
            🛡 ADMIN CONSOLE
          </div>
          <div style={{fontSize:10,color:'var(--rr-mute)',marginTop:3}}>
            Multi-Tenant Management · Org Provisioning · User Oversight
          </div>
        </div>
        <div style={{fontSize:10,padding:'4px 12px',borderRadius:4,letterSpacing:1,
          background:isDemo?'rgba(180,80,0,0.1)':'rgba(0,180,80,0.1)',
          border:'1px solid '+(isDemo?'var(--rr-tint-orange)':'var(--rr-tint-green)'),
          color:isDemo?'#ffaa44':'#00cc66'}}>
          {isDemo?'⚠ DEMO MODE':'● LIVE'}
        </div>
      </div>

      {msg&&<div style={{background:msgType==='ok'?'rgba(0,150,50,0.12)':'rgba(180,0,0,0.12)',
        border:'1px solid '+(msgType==='ok'?'var(--rr-tint-green)':'var(--rr-tint-red)'),borderRadius:4,
        padding:'9px 16px',marginBottom:16,fontSize:11,
        color:msgType==='ok'?'#00cc66':'#ff8888'}}>{msg}</div>}

      {/* Tabs */}
      <div style={{display:'flex',gap:2,marginBottom:20,borderBottom:'1px solid var(--rr-border-md)'}}>
        {TABS.map(t=>(
          <div key={t.id} onClick={()=>setTab(t.id)} style={{padding:'8px 16px',cursor:'pointer',
            fontSize:11,fontWeight:700,letterSpacing:1,borderRadius:'4px 4px 0 0',
            background:tab===t.id?'#0d2a4a':'transparent',
            color:tab===t.id?'#4a9fd4':'var(--rr-mute)',
            borderBottom:tab===t.id?'2px solid #0066cc':'2px solid transparent'}}>
            {t.icon} {t.label}
          </div>
        ))}
      </div>

      {/* Orgs tab */}
      {tab==='orgs'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--rr-white)'}}>ORGANIZATIONS ({orgs.length})</div>
            <Btn onClick={()=>setTab('create')}>➕ NEW ORG</Btn>
          </div>
          <div style={{display:'grid',gap:10}}>
            {orgs.map(org=>{
              const sc={active:'#00cc66',bootstrap:'#ffaa44',suspended:'#cc4444'}[org.status]||'#888';
              const tc={dod_program:'DoD Program',prime_contractor:'Prime Contractor',
                cmmc_sb:'CMMC SB',subcontractor:'Sub'}[org.type]||org.type;
              return(
                <div key={org.id} style={{background:'var(--rr-panel)',border:'1px solid var(--rr-border-md)',
                  borderRadius:6,padding:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                        <span style={{fontSize:13,fontWeight:700,color:'var(--rr-white)'}}>{org.name}</span>
                        <Badge label={tc} color='#4a8ab0'/>
                        <Badge label={org.status.toUpperCase()} color={sc}/>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,
                        fontSize:10,color:'var(--rr-mute)'}}>
                        <div>SLUG<br/><span style={{color:'var(--rr-text-dim)'}}>{org.slug}</span></div>
                        <div>MEMBERS<br/><span style={{color:'var(--rr-text-dim)'}}>{org.members}</span></div>
                        <div>CREATED<br/><span style={{color:'var(--rr-text-dim)'}}>{org.created}</span></div>
                        <div>ISSM<br/><span style={{color:'var(--rr-text-dim)',fontSize:9}}>{org.issm}</span></div>
                        <div>ISSO<br/><span style={{color:org.isso==='—'?'#cc4444':'var(--rr-text-dim)',fontSize:9}}>{org.isso}</span></div>
                      </div>
                    </div>
                    <Btn sm onClick={()=>generateToken(org)} variant='ghost'>🔑 TOKEN</Btn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Org tab */}
      {tab==='create'&&<CreateOrgPanel onCreated={org=>{
        setOrgs(p=>[...p,{...org,id:'o'+Date.now(),created:new Date().toISOString().slice(0,10),
          members:0,issm:'—',isso:'—'}]);
        notify('Org created: '+org.name+'. Generate a bootstrap token to invite ISSM.');
        setTab('orgs');
      }}/>}

      {/* Token display */}
      {tab==='token'&&token&&<TokenPanel token={token} onDone={()=>{setToken(null);setTab('orgs');}}/>}

      {/* Users tab */}
      {tab==='users'&&(
        <div>
          <div style={{fontSize:12,fontWeight:700,color:'var(--rr-white)',marginBottom:14}}>
            USER ACCOUNTS ({users.length})
          </div>
          <div style={{display:'grid',gap:8}}>
            {users.map(u=>(
              <div key={u.id} style={{background:'var(--rr-panel)',
                border:'1px solid '+(u.locked?'var(--rr-tint-red)':'var(--rr-border-md)'),
                borderRadius:6,padding:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                      <span style={{fontSize:12,fontWeight:700,color:'var(--rr-white)'}}>{u.name}</span>
                      <Badge label={u.role.toUpperCase()} color='#4a8ab0'/>
                      <Badge label={u.status.toUpperCase()}
                        color={u.locked?'#cc4444':u.status==='active'?'#00cc66':'#ffaa44'}/>
                    </div>
                    <div style={{fontSize:10,color:'var(--rr-mute)',lineHeight:1.8}}>
                      {u.email} · {u.org} · Last login: {u.last_login} · Cyber expires: {u.cyber}
                      {u.locked_reason&&<span style={{color:'#cc4444'}}> · {u.locked_reason}</span>}
                    </div>
                  </div>
                  {u.locked&&(
                    <button onClick={()=>initiateUnlock(u)}
                      style={{...mono,background:'var(--rr-tint-green)',border:'1px solid #006633',
                        color:'#00cc66',borderRadius:4,padding:'6px 14px',
                        cursor:'pointer',fontSize:10,fontWeight:700,marginLeft:16}}>
                      🔓 RE-ENABLE
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log tab */}
      {tab==='audit'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--rr-white)'}}>AUDIT LOG — IMMUTABLE</div>
            <div style={{fontSize:10,color:'var(--rr-mute)'}}>3-year WORM · SHA-256 chained</div>
          </div>
          <div style={{background:'var(--rr-panel)',border:'1px solid var(--rr-border-md)',borderRadius:6,overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'130px 1fr 140px 110px',gap:8,
              padding:'8px 14px',background:'var(--rr-panel-alt)',fontSize:9,color:'var(--rr-mute)',
              letterSpacing:1.5,fontWeight:700}}>
              {['TIMESTAMP','ACTOR / ORG','ACTION','IP'].map((h,i)=><div key={i}>{h}</div>)}
            </div>
            {DEMO_AUDIT.map(row=>(
              <div key={row.id} style={{display:'grid',gridTemplateColumns:'130px 1fr 140px 110px',
                gap:8,padding:'10px 14px',borderTop:'1px solid var(--rr-border)',
                fontSize:10,alignItems:'center'}}>
                <div style={{color:'var(--rr-mute)'}}>{row.ts}</div>
                <div>
                  <div style={{color:'var(--rr-text-dim)'}}>{row.actor}</div>
                  <div style={{fontSize:9,color:'var(--rr-mute)'}}>{row.org}</div>
                </div>
                <div style={{color:ACTION_C[row.action]||'#888',fontWeight:700,fontSize:9}}>
                  {row.action}
                </div>
                <div style={{color:'var(--rr-mute)',fontSize:9}}>{row.ip}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System tab */}
      {tab==='system'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {[
            ['Platform Version','v1.1.0 — Phase 1','ok'],
            ['Auth System','Active — Demo Mode','ok'],
            ['Account Unlock','CAC+PIN Required (JSIG)','ok'],
            ['Database','Supabase — Not Connected','warn'],
            ['AWS SES Email','Not Configured','warn'],
            ['CNSSI 1253','NSS Overlay — Phase 3','info'],
            ['JSIG Compliance','SAP Controls — Phase 3','info'],
            ['GovCloud Migration','Phase 4','info'],
          ].map(([l,v,s])=>(
            <div key={l} style={{background:'var(--rr-panel)',border:'1px solid var(--rr-border-md)',
              borderRadius:6,padding:14}}>
              <div style={{fontSize:10,color:'var(--rr-mute)',marginBottom:5}}>{l}</div>
              <div style={{fontSize:11,fontWeight:700,
                color:s==='ok'?'#00cc66':s==='warn'?'#ffaa44':'var(--rr-mute)'}}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── CAC+PIN Unlock Modal (3-step: review → pin → done) ────────── */}
      {unlockTarget&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,
          background:'rgba(0,0,0,0.8)',zIndex:1000,display:'flex',
          alignItems:'center',justifyContent:'center',...mono}}>
          <div style={{background:'#0d1b2e',border:'2px solid #0066cc',
            borderRadius:8,padding:28,width:540,maxWidth:'95vw'}}>

            {unlockStep==='review'&&(<>
              <div style={{fontSize:14,fontWeight:700,color:'var(--rr-white)',marginBottom:4,letterSpacing:1}}>
                🔓 RE-ENABLE ACCOUNT
              </div>
              <div style={{fontSize:10,color:'#ffaa44',marginBottom:18,letterSpacing:1}}>
                PRIVILEGED ACTION · REQUIRES CAC+PIN AUTHENTICATION · LOGGED PER AU-10
              </div>
              <div style={{background:'var(--rr-panel)',border:'1px solid var(--rr-border-md)',borderRadius:4,
                padding:14,marginBottom:14,fontSize:11,color:'var(--rr-mute)',lineHeight:1.9}}>
                <div style={{color:'var(--rr-white)',fontWeight:700,marginBottom:6}}>LOCKOUT EVENT</div>
                Account: <span style={{color:'var(--rr-text-dim)'}}>{unlockTarget.email}</span><br/>
                Org: <span style={{color:'var(--rr-text-dim)'}}>{unlockTarget.org}</span><br/>
                Reason: <span style={{color:'#cc4444'}}>{unlockTarget.locked_reason}</span><br/>
                Last Login: <span style={{color:'var(--rr-text-dim)'}}>{unlockTarget.last_login}</span>
              </div>
              <div style={{background:'rgba(0,80,160,0.1)',border:'1px solid #003366',
                borderRadius:4,padding:12,marginBottom:18,fontSize:10,color:'var(--rr-mute)',lineHeight:1.8}}>
                Verify this was not a malicious access attempt before proceeding.
                Your CAC+PIN authentication will create a non-repudiable audit record
                identifying you as the authorizing ISSM (JSIG AU-10, AC-5).
              </div>
              <div style={{display:'flex',gap:10}}>
                <Btn onClick={proceedToPin}>PROCEED TO CAC+PIN →</Btn>
                <Btn variant='ghost' onClick={()=>setUnlockTarget(null)}>CANCEL</Btn>
              </div>
            </>)}

            {unlockStep==='pin'&&(<>
              <div style={{fontSize:14,fontWeight:700,color:'var(--rr-white)',marginBottom:4,letterSpacing:1}}>
                🔐 CAC + PIN AUTHENTICATION
              </div>
              <div style={{fontSize:10,color:'#ffaa44',marginBottom:16,letterSpacing:1}}>
                RE-AUTHENTICATE TO AUTHORIZE ACCOUNT UNLOCK
              </div>
              <div style={{fontSize:10,color:'var(--rr-mute)',marginBottom:14,lineHeight:1.8}}>
                Phase 1: Enter TOTP code &nbsp;|&nbsp; Phase 3: Insert CAC card + enter PIN<br/>
                <span style={{color:'var(--rr-mute)'}}>Demo code: 000000</span>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:10,color:'var(--rr-mute)',
                  letterSpacing:2,marginBottom:5}}>CAC PIN / AUTH CODE</label>
                <input type='password' value={unlockPin}
                  onChange={e=>setUnlockPin(e.target.value)}
                  placeholder='••••••' maxLength={8} autoFocus
                  style={{width:'100%',background:'var(--rr-panel)',border:'1px solid var(--rr-border-md)',
                    borderRadius:4,padding:'10px',color:'var(--rr-text)',fontSize:18,
                    ...mono,textAlign:'center',letterSpacing:8,boxSizing:'border-box'}}/>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:10,color:'var(--rr-mute)',
                  letterSpacing:2,marginBottom:5}}>
                  JUSTIFICATION (required — stored in audit record)
                </label>
                <textarea value={unlockReason} onChange={e=>setUnlockReason(e.target.value)}
                  placeholder='e.g. User confirmed legitimate access. Identity verified via phone. Approved to re-enable.'
                  rows={3}
                  style={{width:'100%',background:'var(--rr-panel)',border:'1px solid var(--rr-border-md)',
                    borderRadius:4,padding:'10px',color:'var(--rr-text)',fontSize:11,
                    ...mono,boxSizing:'border-box',resize:'vertical'}}/>
              </div>
              <div style={{fontSize:9,color:'var(--rr-mute)',marginBottom:16,lineHeight:1.8}}>
                Audit record will contain: ISSM identity · CAC thumbprint (Phase 3) ·
                Timestamp · IP address · Justification · Account re-enabled
              </div>
              <div style={{display:'flex',gap:10}}>
                <Btn variant='success'
                  disabled={!unlockPin||!unlockReason.trim()}
                  onClick={confirmUnlock}>
                  AUTHENTICATE &amp; RE-ENABLE
                </Btn>
                <Btn variant='ghost' onClick={()=>setUnlockStep('review')}>← BACK</Btn>
              </div>
            </>)}

            {unlockStep==='done'&&(
              <div style={{textAlign:'center',padding:20}}>
                <div style={{fontSize:42,marginBottom:12}}>✅</div>
                <div style={{fontSize:13,fontWeight:700,color:'#00cc66',letterSpacing:1}}>
                  ACCOUNT RE-ENABLED
                </div>
                <div style={{fontSize:10,color:'var(--rr-mute)',marginTop:8}}>
                  CAC+PIN authentication recorded in audit trail (AU-10 · JSIG)
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateOrgPanel({onCreated}){
  const [f,setF]=useState({name:'',slug:'',type:'dod_program',issm_email:'',domain:''});
  const [err,setErr]=useState('');
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const slug=n=>n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const submit=()=>{
    if(!f.name||!f.issm_email){setErr('Name and ISSM email required');return;}
    if(!f.issm_email.includes('@')){setErr('Invalid ISSM email');return;}
    setErr('');onCreated({...f,status:'bootstrap'});
  };
  const inp=(label,val,onChange,placeholder,note)=>(
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:10,color:'var(--rr-mute)',
        letterSpacing:2,marginBottom:5}}>{label}</label>
      <input value={val} onChange={onChange} placeholder={placeholder}
        style={{width:'100%',background:'var(--rr-panel)',border:'1px solid var(--rr-border-md)',
          borderRadius:4,padding:'9px 12px',color:'var(--rr-text)',fontSize:12,...mono,boxSizing:'border-box'}}/>
      {note&&<div style={{fontSize:9,color:'var(--rr-mute)',marginTop:3}}>{note}</div>}
    </div>
  );
  return(
    <div style={{maxWidth:540}}>
      <div style={{fontSize:13,fontWeight:700,color:'var(--rr-white)',marginBottom:18}}>CREATE ORGANIZATION</div>
      {err&&<div style={{background:'rgba(180,0,0,0.12)',border:'1px solid #660000',borderRadius:4,
        padding:'8px 14px',marginBottom:14,fontSize:11,color:'#ff9999'}}>⚠ {err}</div>}
      {inp('ORGANIZATION NAME',f.name,e=>{set('name',e.target.value);set('slug',slug(e.target.value));},
        'F-35 JSF Program')}
      {inp('URL SLUG',f.slug,e=>set('slug',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')),
        'f35-jsf','Lowercase, hyphens only')}
      <div style={{marginBottom:14}}>
        <label style={{display:'block',fontSize:10,color:'var(--rr-mute)',letterSpacing:2,marginBottom:5}}>
          PROGRAM TYPE
        </label>
        <select value={f.type} onChange={e=>set('type',e.target.value)}
          style={{width:'100%',background:'var(--rr-panel)',border:'1px solid var(--rr-border-md)',
            borderRadius:4,padding:'9px 12px',color:'var(--rr-text)',fontSize:12,...mono}}>
          <option value='dod_program'>DoD Program (F-35, F-22, B-21...)</option>
          <option value='prime_contractor'>Prime Contractor (LM, Raytheon, Boeing...)</option>
          <option value='cmmc_sb'>CMMC Small Business</option>
          <option value='subcontractor'>Subcontractor</option>
        </select>
      </div>
      {inp('ISSM EMAIL',f.issm_email,e=>set('issm_email',e.target.value),'issm@program.mil',
        'Receives bootstrap token. Creates ISSM account first.')}
      {inp('EMAIL DOMAIN RESTRICTION (optional)',f.domain,e=>set('domain',e.target.value),'.mil or lm.com')}
      <div style={{background:'var(--rr-panel)',border:'1px solid var(--rr-border-md)',borderRadius:4,
        padding:12,marginBottom:16,fontSize:10,color:'var(--rr-mute)',lineHeight:1.9}}>
        After creation: generate bootstrap token → ISSM creates account →
        ISSM must create ISSO → dashboard unlocks. Token single-use, 24hr TTL.
      </div>
      <Btn onClick={submit}>CREATE ORGANIZATION →</Btn>
    </div>
  );
}

function TokenPanel({token,onDone}){
  const [copied,setCopied]=useState(false);
  const url=window.location.origin+'/?setup='+token.raw+'&org='+token.org.slug;
  const copy=()=>{
    navigator.clipboard?.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),3000);});
  };
  return(
    <div style={{maxWidth:580}}>
      <div style={{textAlign:'center',marginBottom:22}}>
        <div style={{fontSize:38,marginBottom:8}}>🔑</div>
        <div style={{fontSize:14,fontWeight:700,color:'var(--rr-white)',letterSpacing:2}}>
          BOOTSTRAP TOKEN GENERATED
        </div>
        <div style={{fontSize:11,color:'#ffaa44',marginTop:5}}>{token.org.name}</div>
      </div>
      <div style={{background:'var(--rr-panel)',border:'2px solid #0066cc',borderRadius:6,
        padding:16,marginBottom:14}}>
        <div style={{fontSize:9,color:'var(--rr-mute)',letterSpacing:2,marginBottom:8}}>
          ONE-TIME SETUP LINK — expires {new Date(token.expires).toLocaleString()}
        </div>
        <div style={{wordBreak:'break-all',fontSize:11,color:'#4a9fd4',
          lineHeight:1.6,marginBottom:12}}>{url}</div>
        <button onClick={copy} style={{...mono,fontSize:10,fontWeight:700,
          background:copied?'var(--rr-tint-green)':'var(--rr-tint-blue)',
          border:'1px solid '+(copied?'#00cc66':'#0055aa'),
          color:copied?'#00cc66':'#4a9fd4',borderRadius:4,
          padding:'6px 16px',cursor:'pointer'}}>
          {copied?'✓ COPIED':'📋 COPY LINK'}
        </button>
      </div>
      <div style={{background:'rgba(180,80,0,0.1)',border:'1px solid #663300',borderRadius:4,
        padding:12,marginBottom:16,fontSize:11,color:'#ffaa44',lineHeight:1.9}}>
        ⚠ Single-use · Expires 24hrs · Send via encrypted channel only ·
        Raw token not stored — this is the only chance to copy it
      </div>
      <div style={{display:'flex',gap:10}}>
        <Btn variant='ghost' onClick={onDone}>← BACK</Btn>
      </div>
    </div>
  );
}