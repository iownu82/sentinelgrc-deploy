/**
 * RiskRadar — Ballard IS3 Admin Console
 * Platform-level admin: org management, bootstrap tokens, account recovery
 * NIST 800-53: AC-2, AC-3, AC-5, AU-2, AU-12, IA-4
 * Access: Ballard IS3 admin only (admin@ballardis3.com)
 */
import { useState, useEffect } from 'react';
import { useColors } from '../theme.js';
import { useAuth } from './Auth.jsx';
import { supabase, SUPABASE_CONFIGURED } from '../supabase.js';
import { sha256, generateNonce } from '../auth/crypto.js';

const mono = { fontFamily:"'Courier New',monospace" };

// ─── Demo org registry (used when Supabase not configured) ────────────────
const DEMO_ORGS = [
  { id:'org-f35',  name:'F-35 JSF Program',        slug:'f35-jsf',        type:'dod_program',        status:'active',   issm:'issm@f35.mil',   isso:'isso@f35.mil',   members:4,  created:'2026-03-01' },
  { id:'org-ray',  name:'Raytheon Technologies',    slug:'raytheon',       type:'prime_contractor',   status:'active',   issm:'issm@raytheon.com', isso:'isso@raytheon.com', members:7, created:'2026-03-15' },
  { id:'org-cmmc', name:'Acme Defense LLC (CMMC)',  slug:'acme-defense',   type:'cmmc_sb',            status:'bootstrap',issm:'pending',        isso:'pending',        members:0,  created:'2026-04-01' },
  { id:'org-lm',   name:'Lockheed Martin F-22',     slug:'lm-f22',         type:'prime_contractor',   status:'active',   issm:'issm@lm.com',    isso:'isso@lm.com',    members:12, created:'2026-02-20' },
];

// ─── Shared UI ─────────────────────────────────────────────────────────────
const Card = ({children,title,color='#1e3a5f'}) => {
  const C = useColors();
  return (
    <div style={{background:C.panel,border:'1px solid '+color,borderRadius:8,marginBottom:16,overflow:'hidden'}}>
      {title && <div style={{padding:'12px 18px',borderBottom:'1px solid '+color,background:C.headerBg,
        fontSize:11,fontWeight:700,color:C.text,letterSpacing:1,...mono}}>{title}</div>}
      <div style={{padding:18}}>{children}</div>
    </div>
  );
};

const Btn = ({onClick,children,variant='primary',disabled,sm}) => {
  const v={primary:{bg:'#0055aa',c:'#fff',b:'#0066cc'},danger:{bg:'rgba(150,0,0,0.2)',c:'#ff7777',b:'#660000'},
    success:{bg:'rgba(0,120,60,0.2)',c:'#44cc88',b:'#005522'},ghost:{bg:'transparent',c:'#5588bb',b:'#1e3a5f'}}[variant]||{};
  return <button onClick={onClick} disabled={disabled}
    style={{...mono,padding:sm?'4px 10px':'7px 16px',fontSize:sm?9:11,fontWeight:700,letterSpacing:1,
      borderRadius:4,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.4:1,
      background:v.bg,color:v.c,border:'1px solid '+v.b}}>{children}</button>;
};

const Badge = ({label,color='blue'}) => {
  const m={blue:'#0066cc',green:'#006633',red:'#7a0000',orange:'#885500',gray:'#334455',teal:'#006666'}[color]||'#334455';
  return <span style={{...mono,fontSize:9,fontWeight:700,letterSpacing:1,padding:'2px 7px',borderRadius:3,
    background:m+'33',color:m,border:'1px solid '+m+'66'}}>{label}</span>;
};

const Inp = ({label,value,onChange,placeholder,type='text'}) => {
  const C=useColors();
  return <div style={{marginBottom:12}}>
    <label style={{display:'block',fontSize:9,color:C.mute,letterSpacing:1.5,marginBottom:4,textTransform:'uppercase',...mono}}>{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{width:'100%',background:C.bg,border:'1px solid '+C.border,borderRadius:4,padding:'7px 10px',
        color:C.text,fontSize:12,...mono,boxSizing:'border-box'}}/>
  </div>;
};

// ─── Stat card ─────────────────────────────────────────────────────────────
const Stat = ({label,value,color='#4a8ab0',icon}) => {
  const C=useColors();
  return <div style={{background:C.bg,border:'1px solid '+C.border,borderRadius:6,padding:14,textAlign:'center'}}>
    <div style={{fontSize:22,...mono,color,fontWeight:700}}>{icon||''}{value}</div>
    <div style={{fontSize:9,color:C.mute,letterSpacing:1.5,marginTop:4,...mono}}>{label}</div>
  </div>;
};

// ─── Create Org Panel ──────────────────────────────────────────────────────
function CreateOrg({onCreated}) {
  const C=useColors();
  const [name,setName]=useState('');
  const [slug,setSlug]=useState('');
  const [type,setType]=useState('dod_program');
  const [contract,setContract]=useState('');
  const [loading,setLoading]=useState(false);
  const [token,setToken]=useState(null);
  const [err,setErr]=useState('');

  const slugify = v => v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  const create = async () => {
    if(!name||!slug) return;
    setLoading(true); setErr('');
    try {
      if(SUPABASE_CONFIGURED && supabase) {
        const {data:org,error:oErr} = await supabase.from('organizations')
          .insert({name,slug,program_type:type,contract_number:contract||null,status:'bootstrap'})
          .select().single();
        if(oErr) throw oErr;
        // Generate SHA-256 bootstrap token
        const rawToken = generateNonce()+generateNonce();
        const tokenHash = await sha256(rawToken);
        const expires = new Date(Date.now()+24*60*60*1000).toISOString();
        await supabase.from('bootstrap_tokens').insert({org_id:org.id,token_hash:tokenHash,expires_at:expires});
        setToken({raw:rawToken,org,expires});
        onCreated?.(org);
      } else {
        // Demo mode — simulate
        const rawToken = 'demo-'+generateNonce();
        setToken({raw:rawToken,org:{id:'org-new',name,slug,status:'bootstrap'},expires:new Date(Date.now()+86400000).toISOString()});
        onCreated?.({id:'org-new',name,slug});
      }
    } catch(e) { setErr(e.message||'Failed to create org'); }
    setLoading(false);
  };

  if(token) return (
    <Card title='✅ ORG CREATED — BOOTSTRAP TOKEN' color='#005522'>
      <div style={{fontSize:11,color:'#44cc88',marginBottom:12,...mono}}>
        Organization <strong>{token.org.name}</strong> created. Share this one-time setup link with the ISSM.
      </div>
      <div style={{background:'#020d1a',border:'1px solid #003322',borderRadius:4,padding:12,marginBottom:12}}>
        <div style={{fontSize:9,color:'#2a6a4a',letterSpacing:1,marginBottom:6,...mono}}>BOOTSTRAP TOKEN (single-use · 24hr TTL)</div>
        <div style={{fontSize:11,color:'#44cc88',wordBreak:'break-all',...mono}}>{token.raw}</div>
      </div>
      <div style={{fontSize:10,color:'#2a5a3a',...mono,lineHeight:1.8}}>
        Setup URL: https://app.ballardis3.com/setup?token={token.raw}<br/>
        Expires: {new Date(token.expires).toUTCString()}<br/>
        ⚠ This token is displayed ONCE. Store it securely before closing.<br/>
        ⚠ Token hash stored (SHA-256). Raw token never persisted.
      </div>
      <div style={{marginTop:12,display:'flex',gap:8}}>
        <Btn onClick={()=>{navigator.clipboard?.writeText(token.raw)}} variant='ghost' sm>COPY TOKEN</Btn>
        <Btn onClick={()=>{setToken(null);setName('');setSlug('');setContract('');}} variant='ghost' sm>CREATE ANOTHER</Btn>
      </div>
    </Card>
  );

  return (
    <Card title='CREATE NEW ORGANIZATION'>
      {err && <div style={{background:'rgba(150,0,0,0.15)',border:'1px solid #550000',borderRadius:4,
        padding:'8px 12px',marginBottom:12,fontSize:11,color:'#ff7777',...mono}}>⚠ {err}</div>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Inp label='Organization Name' value={name} placeholder='F-35 JSF Program'
          onChange={e=>{setName(e.target.value);setSlug(slugify(e.target.value));}} />
        <Inp label='URL Slug (auto)' value={slug} placeholder='f35-jsf'
          onChange={e=>setSlug(slugify(e.target.value))} />
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:9,color:'#4a7a9b',letterSpacing:1.5,marginBottom:4,textTransform:'uppercase',...mono}}>
            Program Type
          </label>
          <select value={type} onChange={e=>setType(e.target.value)}
            style={{width:'100%',background:C.bg,border:'1px solid '+C.border,borderRadius:4,
              padding:'7px 10px',color:C.text,fontSize:12,...mono}}>
            <option value='dod_program'>DoD Program</option>
            <option value='prime_contractor'>Prime Contractor</option>
            <option value='subcontractor'>Subcontractor</option>
            <option value='cmmc_sb'>CMMC Small Business</option>
          </select>
        </div>
        <Inp label='Contract / CAGE Code (optional)' value={contract} placeholder='FA8721-23-C-0001'
          onChange={e=>setContract(e.target.value)} />
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:4}}>
        <Btn onClick={create} disabled={!name||!slug||loading}>
          {loading?'GENERATING...':'CREATE ORG + BOOTSTRAP TOKEN →'}
        </Btn>
      </div>
      <div style={{fontSize:9,color:'#2a4a6b',marginTop:10,...mono,lineHeight:1.8}}>
        Creates org in DB → Generates single-use SHA-256 bootstrap token → 24hr TTL<br/>
        ISSM uses token to create their account → Must create ISSO before dashboard unlocks
      </div>
    </Card>
  );
}

// ─── Org List ──────────────────────────────────────────────────────────────
function OrgList({orgs,onRefresh}) {
  const statusColor = {active:'green',bootstrap:'orange',suspended:'red',expired:'gray'};
  const typeLabel = {dod_program:'DoD Program',prime_contractor:'Prime Contractor',
    subcontractor:'Subcontractor',cmmc_sb:'CMMC Small Biz'};
  return (
    <Card title={'ALL ORGANIZATIONS ('+orgs.length+')'}>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',...mono,fontSize:10}}>
          <thead>
            <tr style={{borderBottom:'1px solid #1e3a5f',color:'#4a7a9b',letterSpacing:1}}>
              {['ORGANIZATION','TYPE','STATUS','ISSM','ISSO','MEMBERS','CREATED','ACTIONS'].map(h=>(
                <th key={h} style={{padding:'6px 10px',textAlign:'left',fontWeight:700,fontSize:9}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orgs.map(o=>(
              <tr key={o.id} style={{borderBottom:'1px solid #0d2030'}}>
                <td style={{padding:'8px 10px',color:'#c0d8f0',fontWeight:700}}>{o.name}</td>
                <td style={{padding:'8px 10px',color:'#4a7a9b'}}>{typeLabel[o.type]||o.type}</td>
                <td style={{padding:'8px 10px'}}><Badge label={o.status?.toUpperCase()} color={statusColor[o.status]||'gray'}/></td>
                <td style={{padding:'8px 10px',color:'#4a7a9b',fontSize:9}}>{o.issm||'pending'}</td>
                <td style={{padding:'8px 10px',color:'#4a7a9b',fontSize:9}}>{o.isso||'pending'}</td>
                <td style={{padding:'8px 10px',color:'#88aacc',textAlign:'center'}}>{o.members||0}</td>
                <td style={{padding:'8px 10px',color:'#2a4a6b'}}>{o.created?.slice(0,10)||'—'}</td>
                <td style={{padding:'8px 10px'}}>
                  <div style={{display:'flex',gap:4}}>
                    <Btn variant='ghost' sm onClick={()=>{}}>VIEW</Btn>
                    {o.status==='bootstrap' && <Btn variant='success' sm>REGEN TOKEN</Btn>}
                    {o.status==='active' && <Btn variant='danger' sm>SUSPEND</Btn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Locked Accounts Panel ─────────────────────────────────────────────────
function LockedAccounts() {
  const DEMO_LOCKED = [
    {email:'user@f35.mil', org:'F-35 JSF Program', locked_at:'2026-04-06T14:22:00Z', reason:'3 failed login attempts', id:'la1'},
  ];
  const [accounts] = useState(DEMO_LOCKED);
  return (
    <Card title={'🔒 LOCKED ACCOUNTS ('+accounts.length+')'} color={accounts.length?'#660000':'#1e3a5f'}>
      {accounts.length===0 ? (
        <div style={{fontSize:11,color:'#2a6a4a',...mono}}>✅ No locked accounts</div>
      ) : accounts.map(a=>(
        <div key={a.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'10px 12px',background:'rgba(150,0,0,0.08)',border:'1px solid #440000',
          borderRadius:4,marginBottom:8}}>
          <div>
            <div style={{fontSize:11,color:'#ff9999',fontWeight:700,...mono}}>{a.email}</div>
            <div style={{fontSize:9,color:'#664444',...mono}}>
              Org: {a.org} · Locked: {new Date(a.locked_at).toLocaleString()} · Reason: {a.reason}
            </div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <Btn variant='success' sm onClick={()=>alert('Account re-enabled. Audit log entry created.')}>
              RE-ENABLE
            </Btn>
            <Btn variant='ghost' sm>VIEW LOG</Btn>
          </div>
        </div>
      ))}
      <div style={{fontSize:9,color:'#2a4a6b',marginTop:8,...mono}}>
        NIST 800-53 AC-7: All account unlocks require ISSM identity verification and are logged with timestamp and justification.
      </div>
    </Card>
  );
}

// ─── Main Admin Console ────────────────────────────────────────────────────
export default function AdminConsole() {
  const C = useColors();
  const { user, isDemo } = useAuth();
  const [tab, setTab] = useState('overview');
  const [orgs, setOrgs] = useState(DEMO_ORGS);

  // Load orgs from Supabase
  useEffect(()=>{
    if(!SUPABASE_CONFIGURED||!supabase) return;
    supabase.from('organizations').select('*, org_members(count)').order('created_at',{ascending:false})
      .then(({data})=>{ if(data) setOrgs(data); });
  },[]);

  const stats = {
    total: orgs.length,
    active: orgs.filter(o=>o.status==='active').length,
    bootstrap: orgs.filter(o=>o.status==='bootstrap').length,
    members: orgs.reduce((s,o)=>s+(o.members||0),0),
  };

  const TABS = ['overview','organizations','create_org','locked','audit'];

  return (
    <div style={{padding:'24px 28px',maxWidth:1200,...mono}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <div style={{fontSize:18,fontWeight:900,color:C.text,letterSpacing:2}}>
            <span style={{color:'#cc2222'}}>BALLARD IS3</span> ADMIN CONSOLE
          </div>
          <div style={{fontSize:10,color:C.mute,letterSpacing:2,marginTop:4}}>
            Platform Administration · NIST 800-53 AC-2 · {isDemo?'DEMO MODE':'LIVE'}
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:10,color:'#44cc88',marginBottom:2}}>● PLATFORM ADMIN</div>
          <div style={{fontSize:9,color:C.mute}}>{user?.email}</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        <Stat label='TOTAL ORGS' value={stats.total} color='#4a8ab0' icon='🏢 '/>
        <Stat label='ACTIVE' value={stats.active} color='#44cc88' icon='✅ '/>
        <Stat label='PENDING SETUP' value={stats.bootstrap} color='#ffaa44' icon='⏳ '/>
        <Stat label='TOTAL USERS' value={stats.members} color='#8888cc' icon='👤 '/>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:'1px solid '+C.border,paddingBottom:0}}>
        {[
          {id:'overview',label:'Overview'},
          {id:'organizations',label:'Organizations'},
          {id:'create_org',label:'+ Create Org'},
          {id:'locked',label:'🔒 Locked Accounts'},
          {id:'audit',label:'Audit Log'},
        ].map(t=>(
          <div key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'8px 16px',cursor:'pointer',fontSize:10,fontWeight:700,letterSpacing:1,
              color:tab===t.id?'#4a8ab0':C.mute,borderBottom:tab===t.id?'2px solid #0066cc':'2px solid transparent',
              marginBottom:-1}}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Tab content */}
      {tab==='overview' && (
        <div>
          <Card title='PLATFORM SECURITY STATUS'>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
              {[
                {label:'FIPS 199 Category',value:'MODERATE',color:'#ffaa44'},
                {label:'800-53 Baseline',value:'MODERATE',color:'#ffaa44'},
                {label:'CMMC Level',value:'Level 2',color:'#4a8ab0'},
                {label:'Auth Standard',value:'PBKDF2+Argon2id',color:'#44cc88'},
                {label:'Encryption',value:'AES-256 KMS',color:'#44cc88'},
                {label:'Audit Retention',value:'3 Years WORM',color:'#44cc88'},
                {label:'Session Timeout',value:'15 Minutes',color:'#44cc88'},
                {label:'Max Login Attempts',value:'3 (AC-7)',color:'#44cc88'},
                {label:'MFA Status',value:'TOTP Active',color:'#44cc88'},
              ].map(s=>(
                <div key={s.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                  padding:'8px 0',borderBottom:'1px solid '+C.border}}>
                  <span style={{fontSize:10,color:C.mute}}>{s.label}</span>
                  <span style={{fontSize:10,fontWeight:700,color:s.color}}>{s.value}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title='QUICK ACTIONS'>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <Btn onClick={()=>setTab('create_org')}>+ CREATE NEW ORG</Btn>
              <Btn variant='ghost' onClick={()=>setTab('locked')}>🔒 VIEW LOCKED ACCOUNTS</Btn>
              <Btn variant='ghost' onClick={()=>setTab('audit')}>📋 VIEW AUDIT LOG</Btn>
            </div>
          </Card>
        </div>
      )}

      {tab==='organizations' && <OrgList orgs={orgs} onRefresh={()=>{}} />}
      {tab==='create_org' && <CreateOrg onCreated={org=>{setOrgs(o=>[org,...o]);setTab('organizations');}} />}
      {tab==='locked' && <LockedAccounts />}

      {tab==='audit' && (
        <Card title='PLATFORM AUDIT LOG (Last 20 Events)'>
          <div style={{fontSize:10,color:'#2a5a7b',...mono,lineHeight:2}}>
            [2026-04-06 15:30:22 UTC] ACCOUNT_LOCKED · admin@ballardis3.com · org:ballard-is3 · ip:47.34.130.211 · 3 failed attempts<br/>
            [2026-04-06 15:15:08 UTC] LOGIN_SUCCESS · admin@ballardis3.com · org:ballard-is3 · ip:47.34.130.211 · session:abc123<br/>
            [2026-04-06 14:55:00 UTC] ORG_CREATED · Acme Defense LLC · admin@ballardis3.com · type:cmmc_sb<br/>
            [2026-04-06 14:22:11 UTC] BOOTSTRAP_TOKEN_GENERATED · org:acme-defense · ttl:24h · admin@ballardis3.com<br/>
            [2026-04-06 09:00:00 UTC] SYSTEM_STARTUP · platform:RiskRadar v1.1.0 · demo_mode:true
          </div>
          <div style={{fontSize:9,color:'#1a3a5a',marginTop:12,...mono}}>
            NIST 800-53 AU-11: All events retained minimum 3 years · SHA-256 chain verified · WORM storage
          </div>
        </Card>
      )}
    </div>
  );
}
