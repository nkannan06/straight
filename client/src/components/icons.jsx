// Minimal line-icon set matching the design system spec: 1.6px stroke, rounded caps.
const base = {
  fill: 'none',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function IconFold({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconCheck({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function IconChips({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export function IconRaise({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M12 19V6M6 11l6-6 6 6" />
    </svg>
  );
}

export function IconTimer({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9v4l3 2M9.5 2.5h5" />
    </svg>
  );
}

export function IconCrown({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M4 18h16M4.5 18l-1-9 4.5 4L12 6l4 7 4.5-4-1 9" />
    </svg>
  );
}

export function IconMute({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M4 4l16 16" />
      <path d="M9 9v3a3 3 0 0 0 4.6 2.5M15 12V6a3 3 0 0 0-5.7-1.3" />
      <path d="M5.5 12a6.5 6.5 0 0 0 9.8 5.6M18.5 12A6.5 6.5 0 0 0 17 8" />
      <path d="M12 18.5V21" />
    </svg>
  );
}

export function IconDisconnect({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M4 4l16 16" />
      <path d="M8.5 8.5C6.5 9.7 5 11.6 5 13" />
      <path d="M12 6c2.8 0 5.2 1 7 2.7" />
      <path d="M9 12.3a4.4 4.4 0 0 1 3-1.3c1 0 2 .3 2.8.9" />
      <circle cx="12" cy="17.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconShare({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

export function IconCopy({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M5.5 15.5h-1a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IconPlayer({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <circle cx="12" cy="8" r="3.3" />
      <path d="M5 20c1-4 4-6 7-6s6 2 7 6" />
    </svg>
  );
}

export function IconDealer({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <circle cx="12" cy="12" r="8" />
      <text x="12" y="15.5" fontSize="9" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="Marcellus, serif">D</text>
    </svg>
  );
}

export function IconChevronLeft({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function IconClose({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconPlus({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconMinus({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconSpade({ className, filled = false }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" fill={filled ? 'currentColor' : 'none'} strokeWidth={base.strokeWidth} strokeLinecap={base.strokeLinecap} strokeLinejoin={base.strokeLinejoin}>
      <path d="M12 3c-3 3.5-7 6-7 10a5 5 0 0 0 8.5 3.6C13 18 12.3 19.6 10.5 21h7C15.7 19.6 15 18 14.5 16.6A5 5 0 0 0 19 13c0-4-4-6.5-7-10z" />
    </svg>
  );
}

export function IconPeople({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.7-3 2.8-4.8 5.5-4.8s4.8 1.8 5.5 4.8" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.5 14.4c2.3.2 3.8 1.8 4.3 4" />
    </svg>
  );
}

export function IconList({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

export function IconTarget({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.3" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function IconGem({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M6 4h12l4 6-10 10L2 10z" />
      <path d="M2 10h20M9 4l-2.5 6L12 20l5.5-10L15 4" />
    </svg>
  );
}

export function IconShield({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    </svg>
  );
}

export function IconTrophy({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4" />
      <path d="M12 14v3M9 21h6M9.5 21c-.3-1.5 0-3 2.5-4 2.5 1 2.8 2.5 2.5 4" />
    </svg>
  );
}

export function IconBell({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6z" />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

export function IconSettle({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <path d="M6 8h14M16 4l4 4-4 4" />
      <path d="M18 16H4M8 12l-4 4 4 4" />
    </svg>
  );
}

export function IconCalendar({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3.5v3M16 3.5v3" />
    </svg>
  );
}

export function IconSearch({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...base}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.8-4.8" />
    </svg>
  );
}

export function IconApple({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.416 2.06-1.248 2.76-.876.72-1.837 1.14-2.837 1.062-.13-1.08.365-2.14 1.18-2.86.833-.74 1.98-1.15 2.905-1.16.02.06 0 .12 0 .2zm3.51 16.65c-.29.68-.63 1.32-1.02 1.93-.53.83-1.09 1.66-1.96 1.68-.85.02-1.12-.52-2.09-.52-.97 0-1.27.5-2.08.54-.85.04-1.5-.9-2.03-1.72-1.09-1.68-1.94-4.75-.81-6.83.56-1.03 1.56-1.68 2.65-1.7.83-.02 1.6.56 2.1.56.5 0 1.44-.68 2.42-.58.41.02 1.57.17 2.32 1.26-.06.04-1.38.81-1.37 2.4.02 1.9 1.67 2.53 1.68 2.54-.01.05-.28.94-.81 1.87z" />
    </svg>
  );
}

export function IconGoogle({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.55c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.77c-.99.66-2.25 1.05-3.73 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.85z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
