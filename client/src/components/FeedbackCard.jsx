export function FeedbackCard({ text }) {
  if (!text) return null;
  return (
    <div className="mx-4 mb-3 rounded-card border border-white/10 bg-bg-elevated px-4 py-3">
      <p className="mb-1 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Hand feedback</p>
      <p className="font-sans text-subheadline leading-snug text-text-secondary">{text}</p>
    </div>
  );
}
