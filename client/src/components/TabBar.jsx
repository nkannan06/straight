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
    <nav className="safe-bottom flex items-center border-t border-white/5 bg-bg-primary/95 px-2 pt-2 backdrop-blur-md">
      {TABS.map(({ to, label, Icon, end, badgeKey }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            'flex flex-1 flex-col items-center gap-1 pb-2 pt-1 ' + (isActive ? 'text-accent-gold' : 'text-text-tertiary')
          }
        >
          {({ isActive }) => (
            <>
              <span className="relative">
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
