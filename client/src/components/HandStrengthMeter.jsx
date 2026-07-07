export function HandStrengthMeter({ equity }) {
  if (equity == null) return null;
  const pct = Math.round(equity * 100);
  return (
    <div className="w-full max-w-[220px]">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Hand strength</span>
        <span className="tabular-money font-sans text-[13px] font-semibold text-accent-gold">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated-2">
        <div className="h-full rounded-full bg-accent-olive" style={{ width: `${pct}%`, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}
