import { IconFold, IconCheck, IconChips, IconRaise } from './icons.jsx';
import { formatMoney } from '../lib/money.js';

// Fold / Check-or-Call / Raise. Only interactive on the user's turn — when
// it isn't, the bar stays mounted (no layout jank) but is visibly disabled
// and swaps its center slot for a "waiting" indicator instead of vanishing.
export function ActionBar({ isMyTurn, legalActions, toCall, actingName, onFold, onCheck, onCall, onOpenRaise }) {
  const canCheck = legalActions.includes('check');
  const canRaise = legalActions.includes('raise');

  return (
    <div className="safe-bottom flex items-center gap-2 border-t border-white/5 bg-bg-primary px-4 pb-3 pt-3">
      {isMyTurn ? (
        <>
          <button
            type="button"
            onClick={onFold}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-btn border border-fold/60 py-3.5 font-sans font-semibold text-fold active:scale-[0.98]"
          >
            <IconFold className="h-4 w-4" />
            Fold
          </button>
          <button
            type="button"
            onClick={canCheck ? onCheck : onCall}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-btn border border-text-secondary/40 py-3.5 font-sans font-semibold text-text-primary active:scale-[0.98]"
          >
            <IconCheck className="h-4 w-4" />
            {canCheck ? 'Check' : `Call ${formatMoney(toCall)}`}
          </button>
          <button
            type="button"
            onClick={onOpenRaise}
            disabled={!canRaise}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-btn bg-accent-gold py-3.5 font-sans font-semibold text-text-on-ivory shadow-glow-gold active:scale-[0.98] disabled:opacity-40"
          >
            <IconRaise className="h-4 w-4" />
            Raise
          </button>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center gap-2 rounded-btn border border-white/5 bg-bg-elevated py-3.5 font-sans text-subheadline text-text-tertiary">
          <IconChips className="h-4 w-4" />
          Waiting on {actingName || 'other players'}…
        </div>
      )}
    </div>
  );
}
