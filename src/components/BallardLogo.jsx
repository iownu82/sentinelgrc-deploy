import { useState, useEffect, useRef } from 'react';

export function IS3Mark({ size = 36 }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" width={size} height={size} style={{flexShrink:0,overflow:'visible'}}>
      <circle cx="24" cy="24" r="22" stroke="#cc1a2e" strokeWidth="1.2" fill="none"
        style={{transformBox:'fill-box',transformOrigin:'center',animation:'radarExpand 2.5s ease-out infinite',opacity:0}}/>
      <circle cx="24" cy="24" r="22" stroke="#cc1a2e" strokeWidth="1.2" fill="none"
        style={{transformBox:'fill-box',transformOrigin:'center',animation:'radarExpand 2.5s ease-out infinite 1.25s',opacity:0}}/>
      <path d="M 38,24 A 14,14 0 0,1 33.37,34.40" stroke="#4a6a84" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M 31.00,36.12 A 14,14 0 0,1 19.67,37.31" stroke="#4a6a84" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M 17.00,36.12 A 14,14 0 0,1 10.31,26.91" stroke="#4a6a84" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M 10.00,24.00 A 14,14 0 0,1 14.63,13.60" stroke="#4a6a84" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M 17.00,11.88 A 14,14 0 0,1 28.33,10.69" stroke="#4a6a84" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M 31.00,11.88 A 14,14 0 0,1 37.69,21.09" stroke="#4a6a84" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <circle cx="24" cy="24" r="22" stroke="#cc1a2e" strokeWidth="3" fill="none"/>
    </svg>
  );
}

export function SidebarLogo() {
  const ref = useRef(null);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    if (!document.getElementById('rr-sb')) {
      const s = document.createElement('style');
      s.id = 'rr-sb';
      s.textContent = '.rr-sl [style*="font-size: 13px"]{color:#111820!important;font-weight:700!important}.rr-sl [style*="font-size: 11px"]{color:#1a2a3a!important;font-weight:600!important}.rr-sl [style*="font-size: 10px"]{color:#3a5a70!important}.rr-sl [style*="font-size: 9px"]{color:#4a6a84!important}';
      document.head.appendChild(s);
    }
    const apply = () => {
      const sb = ref.current?.closest('[style*="220px"]') || ref.current?.closest('[style*="60px"]');
      if (!sb) return;
      const light = !!document.querySelector('[style*="invert(1)"]');
      setIsLight(light);
      if (light) { sb.style.filter='invert(1) hue-rotate(180deg) saturate(1.43) brightness(0.952)'; sb.classList.add('rr-sl'); }
      else { sb.style.filter=''; sb.classList.remove('rr-sl'); }
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['style']});
    return ()=>obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{display:"flex",alignItems:"center",gap:"12px",overflow:"hidden"}}>
      <IS3Mark size={36}/>
      <span style={{fontFamily:"monospace",fontSize:"20px",fontWeight:900,letterSpacing:"2px",lineHeight:1,whiteSpace:"nowrap"}}>
        <span style={{color:'#cc1a2e'}}>RISK</span>
        <span style={{color:isLight?'#0a1628':'#f0f8ff'}}>RADAR</span>
      </span>
    </div>
  );
}

export function LayerBadge({ layer, label }) {
  const ref = useRef(null);
  const [isLight, setIsLight] = useState(false);
  useEffect(()=>{
    const d=()=>{const sb=ref.current?.closest('[style*="220px"]');if(sb)setIsLight(sb.classList.contains('rr-sl'));};
    d();
    const o=new MutationObserver(d);
    o.observe(document.body,{attributes:true,subtree:true,attributeFilter:['class']});
    return ()=>o.disconnect();
  },[]);
  return (
    <div ref={ref} style={{padding:"10px 12px 3px",display:"flex",alignItems:"center",gap:"6px",marginTop:"4px"}}>
      <span style={{fontFamily:"monospace",fontSize:"9px",color:"#cc1a2e",letterSpacing:"2px",fontWeight:700}}>{layer}</span>
      <div style={{flex:1,height:"1px",background:isLight?"#c0d0e0":"#1a2f42"}}/>
      <span style={{fontFamily:"monospace",fontSize:"9px",color:isLight?"#4a6a84":"#4a7a99",letterSpacing:"1px",textTransform:"uppercase"}}>{label}</span>
    </div>
  );
}

export { SidebarLogo as BallardLogo };
