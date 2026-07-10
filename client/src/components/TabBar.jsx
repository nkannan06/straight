import { NavLink } from 'react-router-dom';
import { IconSpade, IconPeople, IconList, IconTarget, IconPlayer } from './icons.jsx';
import { useProfile } from '../hooks/useProfile.js';
import { useSocialCounts } from '../hooks/useSocialCounts.js';

function Badge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -right-1.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-fold px-1 font-sans text-[10px] font-semibold text-ivory">
      {count > 9 ? '9+' : count}
    </span>
  );
}

const TABS = [
  { to: '/', label: 'Play', Icon: IconSpade, end: true },
  { to: '/friends', label: 'Friends', Icon: IconPeople, badgeKey: 'friendRequests' },
  { to: '/ledger', label: 'Ledger', Icon: IconList, badgeKey: 'unsettledFriends' },
  { to: '/practice', label: 'Practice', Icon: IconTarget },
  { to: '/profile', label: 'Profile', Icon: IconPlayer },
];

export function TabBar() {
  const profile = useProfile();
  const counts = useSocialCounts(profile.playerId);

  return (
    // One continuous surface (icon row + safe-area inset together) in a
    // distinctly lighter, opaque shade than the pure-black page behind it —
    // no separate strip, no transparency/blur that would let it blend into
    // that background.
    <nav className="safe-bottom flex items-center border-t border-white/10 bg-bg-elevated px-2 pb-2 pt-2">
      {TABS.map(({ to, label, Icon, end, badgeKey }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            'flex flex-1 flex-col items-center gap-1 py-1 transition-colors active:opacity-70 ' +
            (isActive ? 'text-accent-gold' : 'text-text-tertiary')
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={
                  'relative flex h-8 w-12 items-center justify-center rounded-full transition-colors ' +
                  (isActive ? 'bg-accent-gold/10' : '')
                }
              >
                <Icon className="h-6 w-6" filled={label === 'Play' && isActive} />
                <Badge count={badgeKey ? counts[badgeKey] : 0} />
              </span>
              <span className="font-sans text-[11px]">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
