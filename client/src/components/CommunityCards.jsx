import { PlayingCard } from './PlayingCard.jsx';

// Renders 5 fixed slots. Because each slot is keyed by index and a dealt card
// never changes once set, React keeps the same PlayingCard instance mounted
// across re-renders — so already-revealed cards never re-flip, only newly
// dealt ones do.
export function CommunityCards({ community, size = 'md' }) {
  const slots = Array.from({ length: 5 }, (_, i) => community[i] || null);
  return (
    <div className="flex justify-center gap-2">
      {slots.map((card, i) => (
        <PlayingCard key={i} card={card} size={size} />
      ))}
    </div>
  );
}
