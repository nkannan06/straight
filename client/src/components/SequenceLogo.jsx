// "The Sequence" mark: five ascending cards forming a straight above the
// wordmark — the locked logo direction (2d) from the design package.
const BAR_HEIGHTS = [22, 30, 40, 30, 22];

export function SequenceLogo({ withWordmark = true, size = 'md' }) {
  const scale = size === 'lg' ? 1.4 : size === 'sm' ? 0.7 : 1;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-end gap-1.5" style={{ height: 40 * scale }}>
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className={i === 2 ? 'rounded-[3px] bg-accent-gold' : 'rounded-[3px] border border-accent-gold/70'}
            style={{ width: 10 * scale, height: h * scale }}
          />
        ))}
      </div>
      {withWordmark && (
        <h1 className="font-display text-large-title tracking-[0.2em] text-text-primary">STRAIGHT</h1>
      )}
    </div>
  );
}
