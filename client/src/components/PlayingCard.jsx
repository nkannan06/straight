import { AnimatePresence, motion } from 'framer-motion';

const SUIT_SYMBOL = { s: '♠', h: '♥', d: '♦', c: '♣' };
const RED_SUITS = new Set(['h', 'd']);

const SIZES = {
  sm: { w: 34, h: 48, rank: 'text-xs', suit: 'text-base' },
  md: { w: 52, h: 74, rank: 'text-sm', suit: 'text-2xl' },
  lg: { w: 68, h: 96, rank: 'text-base', suit: 'text-3xl' },
};

function CardFace({ card, dims }) {
  const isRed = RED_SUITS.has(card.suit);
  return (
    <div className="absolute inset-0 flex flex-col items-start rounded-chip border border-accent-gold-deep/50 bg-ivory p-1.5">
      <span className={`${dims.rank} font-sans font-semibold leading-none ${isRed ? 'text-fold' : 'text-text-on-ivory'}`}>
        {card.rank === 'T' ? '10' : card.rank}
      </span>
      <span className={`flex flex-1 items-center justify-center self-stretch ${dims.suit} ${isRed ? 'text-fold' : 'text-text-on-ivory'}`}>
        {SUIT_SYMBOL[card.suit]}
      </span>
    </div>
  );
}

function CardBack({ dims }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-chip border border-accent-gold-deep/60 bg-bg-elevated-2">
      <svg className="absolute inset-0 h-full w-full opacity-40" preserveAspectRatio="none">
        <pattern id="lattice" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="10" stroke="#E0B95C" strokeWidth="0.7" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#lattice)" />
      </svg>
      <span className="relative text-accent-gold" style={{ fontSize: dims.suit === 'text-2xl' ? 18 : 12 }}>♠</span>
    </div>
  );
}

// Empty placeholder for an undealt community-card slot (matches the "Frame"
// table mockup: dim olive outline, no content).
function CardPlaceholder({ dims }) {
  return <div className="rounded-chip border border-accent-olive/25 bg-bg-elevated/40" style={{ width: dims.w, height: dims.h }} />;
}

// Reveal transition implemented as a scale/fade cross-fade between the back
// and face rather than a true 3D Y-axis flip: a stray re-render mid-transition
// simply restarts a fade (never gets visually stuck), whereas a rotateY
// transform can freeze at an odd in-between angle if interrupted.
export function PlayingCard({ card, faceDown = false, size = 'md', animate = true }) {
  const dims = SIZES[size];
  if (!card) return <CardPlaceholder dims={dims} />;

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const shouldAnimate = animate && !prefersReducedMotion;
  const showFace = !faceDown;

  return (
    <div className="relative" style={{ width: dims.w, height: dims.h }}>
      <AnimatePresence initial={shouldAnimate}>
        <motion.div
          key={showFace ? 'face' : 'back'}
          className="absolute inset-0"
          initial={shouldAnimate ? { opacity: 0, scale: 0.85 } : false}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: shouldAnimate ? 0.22 : 0, ease: 'easeOut' }}
        >
          {showFace ? <CardFace card={card} dims={dims} /> : <CardBack dims={dims} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
