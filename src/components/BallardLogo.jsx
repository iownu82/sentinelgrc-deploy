import { useState, useEffect, useRef } from 'react';

export function IS3Mark({ size = 36, isLight = false }) {
  const seg = isLight ? "#aaaaaa" : "#555555";
  return (
    <svg viewBox="0 0 48 48" fill="none" width={size} height={size} style={{flexShrink:0}}>
      <path d="M 38,24 A 14,14 0 0,1 33.37,34.40"    stroke={seg} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M 31.00,36.12 A 14,14 0 0,1 19.67,37.31" stroke={seg} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M 17.00,36.12 A 14,14 0 0,1 10.31,26.91" stroke={seg} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M 10.00,24.00 A 14,14 0 0,1 14.63,13.60" stroke={seg} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M 17.00,11.88 A 14,14 0 0,1 28.33,10.69" stroke={seg} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M 31.00,11.88 A 14,14 0 0,1 37.69,21.09" stroke={seg} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <circle cx="24" cy="24" r="22" stroke={isLight ? "#8B1220" : "#cc1a2e"} strokeWidth="3" fill="none"/>
    </svg>
  );
}

export function SidebarLogo() {
  const ref = useRef(null);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const detect = () => {
      const sidebar = ref.current?.closest('[style*="220px"]') ||
                      ref.current?.parentElement?.parentElement;
      if (!sidebar) return;
      const bg = window.getComputedStyle(sidebar).backgroundColor;
      const light = bg === 'rgb(255, 255, 255)' ||
                    bg.startsWith('rgb(24') || bg.startsWith('rgb(25') ||
                    bg.startsWith('rgb(23') || bg.startsWith('rgb(22');
      setIsLight(light);
    };
    detect();
    const obs = new MutationObserver(detect);
    obs.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['style'] });
    return () => obs.disconnect();
  }, []);

  const riskColor  = isLight ? '#8B0000' : '#cc1a2e';
  const radarColor = isLight ? '#0f172a' : '#f0f8ff';

  return (
    <div ref={ref} style={{display:"flex",alignItems:"center",gap:"12px",overflow:"hidden"}}>
      <IS3Mark size={36} isLight={isLight}/>
      <span style={{
        fontFamily:"monospace",
        fontSize:"20px",
        fontWeight:900,
        letterSpacing:"2px",
        lineHeight:1,
        whiteSpace:"nowrap",
      }}>
        <span style={{color: riskColor}}>RISK</span>
        <span style={{color: radarColor}}>RADAR</span>
      </span>
    </div>
  );
}

export function LayerBadge({ layer, label }) {
  const ref = useRef(null);
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const detect = () => {
      const sidebar = ref.current?.closest('[style*="220px"]');
      if (!sidebar) return;
      const bg = window.getComputedStyle(sidebar).backgroundColor;
      setIsLight(bg === 'rgb(255, 255, 255)');
    };
    detect();
    const obs = new MutationObserver(detect);
    obs.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style'] });
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{padding:"10px 12px 3px",display:"flex",alignItems:"center",gap:"6px",marginTop:"4px"}}>
      <span style={{fontFamily:"monospace",fontSize:"9px",color: isLight ? "#8B0000" : "#cc1a2e",letterSpacing:"2px",fontWeight:700}}>{layer}</span>
      <div style={{flex:1,height:"1px",background: isLight ? "#c8d8e8" : "#1a2f42"}}/>
      <span style={{fontFamily:"monospace",fontSize:"9px",color: isLight ? "#2d4a60" : "#4a7a99",letterSpacing:"1px",textTransform:"uppercase"}}>{label}</span>
    </div>
  );
}

export { SidebarLogo as BallardLogo };
