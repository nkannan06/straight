import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar.jsx';
import { IconChevronLeft, IconTrophy, IconPeople, IconSettle, IconCalendar } from '../components/icons.jsx';
import { useProfile, initialsForName, colorForName } from '../hooks/useProfile.js';
import { useFriends } from '../hooks/useFriends.js';

const EVENT_ICON = {
  session_won: IconTrophy,
  friend_accepted: IconPeople,
  game_invite: IconCalendar,
  ledger_update: IconSettle,
};

function timeAgo(ts) {
  const diffMin = Math.max(1, Math.round((Date.now() - ts) / 60_000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

function activityLine(event) {
  const name = event.actor?.name || 'Someone';
  switch (event.type) {
    case 'session_won':
      return { bold: name, rest: ` won $${(event.payload.amountCents / 100).toFixed(2)}${event.payload.sessionName ? ` at ${event.payload.sessionName}` : ''}` };
    case 'friend_accepted':
      return { bold: name, rest: ' is now your friend' };
    case 'game_invite':
      return { bold: name, rest: ' invited you to a table' };
    default:
      return { bold: name, rest: ' did something' };
  }
}

export function ActivityFeedScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const { activity } = useFriends(profile.playerId);

  return (
    <div className="flex h-full flex-col px-5 pt-4">
      <div className="mb-2 flex items-center">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-text-primary">
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-center font-display text-title text-text-primary">Activity</h1>
        <div className="w-8" />
      </div>

      <div className="mt-2 flex-1 overflow-y-auto pb-4">
        <div className="flex flex-col gap-2">
          {activity.map((event) => {
            const Icon = EVENT_ICON[event.type] || IconTrophy;
            const line = activityLine(event);
            return (
              <div key={event.id} className="flex items-center gap-3 rounded-card border border-white/10 bg-bg-elevated px-4 py-3">
                {event.actor && (
                  <Avatar name={event.actor.name} initials={initialsForName(event.actor.name)} color={colorForName(event.actor.name)} size="sm" />
                )}
                <div className="flex-1">
                  <p className="font-sans text-[14px] text-text-primary">
                    <span className="font-semibold">{line.bold}</span>{line.rest}
                  </p>
                  <p className="font-sans text-[11px] text-text-tertiary">{timeAgo(event.createdAt)}</p>
                </div>
                <Icon className="h-4 w-4 shrink-0 text-accent-gold" />
              </div>
            );
          })}
        </div>

        {activity.length === 0 ? (
          <p className="mt-10 text-center font-sans text-subheadline text-text-tertiary">Nothing here yet</p>
        ) : (
          <p className="mt-4 text-center font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">
            ✓ You're all caught up
          </p>
        )}
      </div>
    </div>
  );
}
