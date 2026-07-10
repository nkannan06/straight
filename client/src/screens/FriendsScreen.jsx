import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar.jsx';
import { AddFriendSheet } from '../components/AddFriendSheet.jsx';
import { IconPlus, IconSpade, IconChevronLeft } from '../components/icons.jsx';
import { useProfile, initialsForName, colorForName } from '../hooks/useProfile.js';
import { useFriends } from '../hooks/useFriends.js';

function timeAgo(ts) {
  const diffMin = Math.max(1, Math.round((Date.now() - ts) / 60_000));
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.round(diffHr / 24)}d`;
}

function activityLine(event) {
  const name = event.actor?.name || 'Someone';
  switch (event.type) {
    case 'session_won':
      return `${name} won $${(event.payload.amountCents / 100).toFixed(2)}${event.payload.sessionName ? ` at ${event.payload.sessionName}` : ''}`;
    case 'friend_accepted':
      return `You and ${name} are now friends`;
    case 'game_invite':
      return `${name} invited you to a table`;
    default:
      return `${name} did something`;
  }
}

function PresenceIndicator({ presence }) {
  if (presence === 'in_game') {
    return (
      <span className="flex items-center gap-1 text-accent-gold">
        <IconSpade className="h-3 w-3" filled />
      </span>
    );
  }
  return <span className={`h-2 w-2 rounded-full ${presence === 'online' ? 'bg-accent-olive' : 'bg-white/20'}`} />;
}

export function FriendsScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const { friends, requests, suggested, activity, loading, refresh } = useFriends(profile.playerId);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredFriends = search.trim()
    ? friends.filter((f) => f.displayName.toLowerCase().includes(search.toLowerCase()) || f.username.toLowerCase().includes(search.toLowerCase()))
    : friends;

  return (
    <div className="flex h-full flex-col px-5 safe-top">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-large-title text-text-primary">Friends</h1>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Add friend"
          className="flex h-9 w-9 items-center justify-center rounded-btn border border-accent-gold/40 text-accent-gold"
        >
          <IconPlus className="h-4 w-4" />
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by @username"
        className="mb-4 w-full rounded-btn border border-white/15 bg-bg-elevated-2 px-4 py-2.5 font-sans text-body text-text-primary outline-none focus:border-accent-gold"
      />

      <div className="flex-1 overflow-y-auto pb-4">
        {activity.length > 0 && (
          <section className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Activity</h2>
              <button type="button" onClick={() => navigate('/friends/activity')} className="font-sans text-[12px] text-accent-gold">
                See all
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {activity.slice(0, 4).map((event) => (
                <div key={event.id} className="w-[180px] shrink-0 rounded-card border border-white/10 bg-bg-elevated p-3">
                  <div className="flex items-center gap-2">
                    {event.actor && (
                      <Avatar name={event.actor.name} initials={initialsForName(event.actor.name)} color={colorForName(event.actor.name)} size="sm" />
                    )}
                    <span className="font-sans text-[11px] text-text-tertiary">{timeAgo(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 font-sans text-[13px] leading-snug text-text-primary">{activityLine(event)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {requests.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('/friends/requests')}
            className="mb-4 flex w-full items-center justify-between rounded-card border border-accent-gold/30 bg-bg-elevated px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {requests.slice(0, 3).map((r) => (
                  <div key={r.id} className="rounded-full ring-2 ring-bg-elevated">
                    <Avatar name={r.displayName} initials={initialsForName(r.displayName)} color={colorForName(r.displayName)} size="sm" />
                  </div>
                ))}
              </div>
              <span className="font-sans text-body text-text-primary">{requests.length} friend request{requests.length > 1 ? 's' : ''}</span>
            </div>
            <IconChevronLeft className="h-4 w-4 rotate-180 text-text-tertiary" />
          </button>
        )}

        <h2 className="mb-2 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">
          All Friends {friends.length > 0 && `· ${friends.length}`}
        </h2>

        {!loading && friends.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <p className="font-sans text-subheadline text-text-secondary">No friends yet — find people to play with</p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="rounded-btn bg-accent-gold px-5 py-3 font-sans font-semibold text-text-on-ivory"
            >
              Find Friends
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1">
          {filteredFriends.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => navigate(`/friends/${f.id}`)}
              className="flex items-center justify-between rounded-btn px-1 py-2.5 text-left"
            >
              <div className="flex items-center gap-3">
                <Avatar name={f.displayName} initials={initialsForName(f.displayName)} color={colorForName(f.displayName)} size="sm" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-sans text-body font-medium text-text-primary">{f.displayName}</span>
                    <PresenceIndicator presence={f.presence} />
                  </div>
                  <p className="font-sans text-[12px] text-text-tertiary">@{f.username}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <AddFriendSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        userId={profile.playerId}
        suggested={suggested}
        onSent={refresh}
      />
    </div>
  );
}
