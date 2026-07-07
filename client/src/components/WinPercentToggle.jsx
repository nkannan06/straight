import { useEffect, useState } from 'react';
import { estimateEquity } from '../lib/equity.js';

// Private per-player equity pill for the multiplayer table — computed and
// shown entirely client-side, never sent to the server or other players,
// and with no host control over it. Off by default; expands to show a live
// percentage once tapped, matching the practice-mode hint meter's math.
export function WinPercentToggle({ holeCards, community, numOpponents }) {
  const [on, setOn] = useState(false);
  const [equity, setEquity] = useState(null);

  useEffect(() => {
    if (!on || !holeCards || holeCards.some((c) => !c)) {
      setEquity(null);
      return;
    }
    const result = estimateEquity({ holeCards, board: community, numOpponents: Math.max(1, numOpponents), iterations: 400 });
    setEquity(Math.round((result.win + result.tie * 0.5) * 100));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, community.length, numOpponents]);

  const disabled = !holeCards || holeCards.some((c) => !c);

  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      disabled={disabled}
      className={
        'flex items-center gap-1.5 rounded-full border px-3 py-1 font-sans text-[12px] disabled:opacity-40 ' +
        (on ? 'border-accent-gold text-accent-gold' : 'border-white/20 text-text-tertiary')
      }
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-accent-gold' : 'bg-white/30'}`} />
      {on && equity !== null ? (
        <span className="tabular-money font-semibold">Win {equity}%</span>
      ) : (
        <span>Win %</span>
      )}
      {on && <span className="ml-1 text-[10px] uppercase tracking-[0.04em] text-text-tertiary">private to you</span>}
    </button>
  );
}
