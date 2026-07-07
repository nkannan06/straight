import { formatMoney } from '../lib/money.js';

function formatEntry(entry, nameById) {
  const name = nameById.get(entry.playerId) || 'Someone';
  switch (entry.type) {
    case 'fold':
      return `${name} folded`;
    case 'check':
      return `${name} checked`;
    case 'call':
      return `${name} called ${formatMoney(entry.amount)}`;
    case 'raise':
      return `${name} raised to ${formatMoney(entry.amount)}`;
    case 'post_blind':
      return `${name} posted ${formatMoney(entry.amount)}`;
    case 'timeout':
      return `${name} ran out of time`;
    case 'player_joined':
      return `${name} joined the table`;
    case 'player_left':
      return `${name} left the table`;
    case 'street':
      return entry.street === 'flop' ? 'Flop dealt' : entry.street === 'turn' ? 'Turn dealt' : 'River dealt';
    case 'hand_complete':
      return entry.wonWithoutShowdown ? 'Hand ended without showdown' : 'Showdown';
    default:
      return null;
  }
}

// Compact recent-actions ticker (matches the mockup's "Sena raised to $80 ·
// Alex called" strip above the hole cards).
export function ActionLog({ entries, nameById, count = 2 }) {
  const lines = entries
    .map((e) => formatEntry(e, nameById))
    .filter(Boolean)
    .slice(-count);

  if (lines.length === 0) return null;

  return (
    <div className="truncate px-4 text-center font-sans text-subheadline text-text-secondary">
      {lines.join(' · ')}
    </div>
  );
}
