import { useState, useEffect } from 'react';

const ARCS = [
  "M 38,24 A 14,14 0 0,1 33.37,34.40",
  "M 31.00,36.12 A 14,14 0 0,1 19.67,37.31",
  "M 17.00,36.12 A 14,14 0 0,1 10.31,26.91",
  "M 10.00,24.00 A 14,14 0 0,1 14.63,13.60",
  "M 17.00,11.88 A 14,14 0 0,1 28.33,10.69",
  "M 31.00,11.88 A 14,14 0 0,1 37.69,21.09",
];

export function IS3Mark({ size = 36 }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" width={size} height={size} style={{ flexShrink: 0, overflow: 'visible' }}>
      {[0, 1].map(i => (
        <circle key={i} cx="24" cy="24" r="22" stroke="#cc1a2e" strokeWidth="1.5" fill="none"
          style={{ transformBox: 'fill-box', transformOrigin: 'center',
                   animation: `rr-radar-expand 2.8s ease-out infinite ${i * 1.4}s` }} />
      ))}
      <circle cx="24" cy="24" r="22" stroke="#cc1a2e" strokeWidth="3" fill="none" />
      {ARCS.map((d, i) => (
        <path key={i} d={d} stroke="#6b7f94" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ))}
    </svg>
  );
}

function useIsLight() {
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const detect = () => {
      const sidebar = document.querySelector('[style*="220px"]');
      if (!sidebar) return;
      const bg = window.getComputedStyle(sidebar).backgroundColor;
      setIsLight(bg === 'rgb(255, 255, 255)' || bg.startsWith('rgb(24') || bg.startsWith('rgb(23'));
    };
    detect();
    const obs = new MutationObserver(detect);
    obs.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['style'] });
    return () => obs.disconnect();
  }, []);
  return isLight;
}

export function SidebarLogo() {
  const isLight = useIsLight();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
      <IS3Mark size={36} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: '20px',
                       fontWeight: 900, letterSpacing: '2px', lineHeight: 1, whiteSpace: 'nowrap' }}>
          <span style={{ color: '#cc1a2e' }}>RISK</span>
          <span style={{ color: isLight ? '#060E1A' : '#f0f8ff' }}>RADAR</span>
        </span>
        
      </div>
    </div>
  );
}

export function LayerBadge({ layer, label }) {
  const isLight = useIsLight();
  return (
    <div style={{ padding: '10px 12px 3px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
      <span style={{ fontFamily: 'monospace', fontSize: '9px', color: '#cc1a2e',
                     letterSpacing: '2px', fontWeight: 700 }}>{layer}</span>
      <div style={{ flex: 1, height: '1px', background: isLight ? '#C0D0E0' : '#1a2f42' }} />
      <span style={{ fontFamily: 'monospace', fontSize: '9px',
                     color: isLight ? '#3A5878' : '#4a7a99',
                     letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

export { SidebarLogo as BallardLogo };
