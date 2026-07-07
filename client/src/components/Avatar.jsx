import { useEffect, useState } from 'react';
import { IconDisconnect, IconCrown } from './icons.jsx';

const SIZES = {
  sm: { box: 32, font: 'text-[11px]', ring: 34 },
  md: { box: 44, font: 'text-sm', ring: 48 },
  lg: { box: 64, font: 'text-lg', ring: 70 },
};

// Avatar states: idle / active-turn (gold countdown ring) / folded (dimmed) /
// disconnected (badge) / allIn (solid gold ring). Every non-idle state is also
// paired with text/iconography elsewhere (PlayerSeat) — color is never the
// sole signal.
export function Avatar({ name, initials, color, size = 'md', state = 'idle', deadline, isHost = false }) {
  const dims = SIZES[size];
  const [fraction, setFraction] = useState(1);

  useEffect(() => {
    if (state !== 'active' || !deadline) {
      setFraction(1);
      return undefined;
    }
    const total = Math.max(deadline - Date.now(), 1);
    const startTotal = total;
    let raf;
    const tick = () => {
      const remaining = Math.max(deadline - Date.now(), 0);
      setFraction(remaining / startTotal);
      if (remaining > 0) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [state, deadline]);

  const radius = dims.ring / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - fraction);

  return (
    <div className="relative shrink-0" style={{ width: dims.ring, height: dims.ring }}>
      {state === 'active' && (
        <svg
          width={dims.ring}
          height={dims.ring}
          viewBox={`0 0 ${dims.ring} ${dims.ring}`}
          className="absolute inset-0 -rotate-90"
        >
          <circle cx={dims.ring / 2} cy={dims.ring / 2} r={radius} stroke="rgba(224,185,92,0.2)" strokeWidth="2" fill="none" />
          <circle
            cx={dims.ring / 2}
            cy={dims.ring / 2}
            r={radius}
            stroke="#E0B95C"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            style={{ transition: 'stroke-dashoffset 0.2s linear' }}
          />
        </svg>
      )}
      {state === 'allIn' && (
        <div className="absolute inset-0 rounded-full ring-2 ring-accent-gold" />
      )}
      <div
        className="absolute flex items-center justify-center rounded-full font-sans font-semibold"
        style={{
          width: dims.box,
          height: dims.box,
          left: (dims.ring - dims.box) / 2,
          top: (dims.ring - dims.box) / 2,
          backgroundColor: color,
          opacity: state === 'folded' || state === 'disconnected' ? 0.4 : 1,
          filter: state === 'folded' ? 'grayscale(0.6)' : 'none',
        }}
      >
        <span className={`${dims.font} text-ivory`}>{initials}</span>
      </div>
      {isHost && (
        <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-gold text-bg-primary">
          <IconCrown className="h-2.5 w-2.5" />
        </div>
      )}
      {state === 'disconnected' && (
        <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-bg-elevated-2 text-text-secondary ring-2 ring-bg-primary">
          <IconDisconnect className="h-2.5 w-2.5" />
        </div>
      )}
      <span className="sr-only">{name}</span>
    </div>
  );
}
