import { formatMoney } from '../lib/money.js';

export function PotDisplay({ total, sidePotAmounts = [] }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Pot</span>
      <span className="tabular-money font-display text-title text-accent-gold">{formatMoney(total)}</span>
      {sidePotAmounts.length > 1 && (
        <span className="font-sans text-subheadline text-text-secondary">
          {sidePotAmounts.length} pots · {sidePotAmounts.map((a) => formatMoney(a)).join(' + ')}
        </span>
      )}
    </div>
  );
}
