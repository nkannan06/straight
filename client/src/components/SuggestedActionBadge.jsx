import { formatMoney } from '../lib/money.js';

const ACTION_LABEL = { fold: 'Fold', check: 'Check', call: 'Call', raise: 'Raise' };

export function SuggestedActionBadge({ suggestion }) {
  if (!suggestion) return null;
  return (
    <div className="flex max-w-[280px] items-center gap-2 rounded-btn border border-accent-olive/40 bg-bg-elevated-2 px-3 py-2">
      <span className="shrink-0 rounded-chip bg-accent-olive px-2 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.04em] text-text-on-ivory">
        Suggested: {ACTION_LABEL[suggestion.action]}
        {suggestion.amount ? ` ${formatMoney(suggestion.amount)}` : ''}
      </span>
      <span className="font-sans text-[11px] leading-tight text-text-secondary">{suggestion.reason}</span>
    </div>
  );
}
