import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar.jsx';
import { IconChevronLeft } from '../components/icons.jsx';
import { useProfile, initialsForName, colorForName } from '../hooks/useProfile.js';
import { useSchedule } from '../hooks/useSchedule.js';
import { apiPost } from '../lib/api.js';

const REPEAT_LABEL = { weekly: 'repeats weekly', biweekly: 'repeats every 2 weeks', monthly: 'repeats monthly' };
const LIVE_WINDOW_MS = 4 * 60 * 60 * 1000;

function formatWhen(ts) {
  const d = new Date(ts);
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export function UpcomingGamesScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const { games, refresh } = useSchedule(profile.playerId);

  async function handleRsvp(gameId, rsvp) {
    await apiPost(`/api/schedule/${gameId}/rsvp`, { userId: profile.playerId, rsvp });
    refresh();
  }

  return (
    <div className="flex h-full flex-col px-5 safe-top">
      <div className="mb-2 flex items-center">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-text-primary">
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-center font-display text-title text-text-primary">Upcoming</h1>
        <div className="w-8" />
      </div>

      <div className="mt-3 flex-1 overflow-y-auto pb-4">
        {games.length === 0 && (
          <p className="mt-10 text-center font-sans text-subheadline text-text-tertiary">No games scheduled yet</p>
        )}
        <div className="flex flex-col gap-3">
          {games.map((g) => {
            const isLive = Date.now() >= g.scheduledAt && Date.now() - g.scheduledAt < LIVE_WINDOW_MS;
            const others = g.invitees.filter((i) => i.id !== profile.playerId);
            return (
              <div key={g.id} className="rounded-card border border-white/10 bg-bg-elevated px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-headline text-text-primary">{g.name || 'Poker Night'}</p>
                    <p className="mt-0.5 font-sans text-[12px] text-text-tertiary">
                      {isLive ? <span className="text-accent-olive">Live now · started {new Date(g.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span> : formatWhen(g.scheduledAt)}
                    </p>
                    {g.repeatRule !== 'none' && !isLive && (
                      <p className="font-sans text-[11px] text-text-tertiary">{REPEAT_LABEL[g.repeatRule]}</p>
                    )}
                  </div>
                  <div className="flex -space-x-2">
                    {others.slice(0, 3).map((i) => (
                      <div key={i.id} className="rounded-full ring-2 ring-bg-elevated">
                        <Avatar name={i.displayName} initials={initialsForName(i.displayName)} color={colorForName(i.displayName)} size="sm" />
                      </div>
                    ))}
                    {others.length > 3 && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-elevated-2 text-[11px] text-text-secondary ring-2 ring-bg-elevated">
                        +{others.length - 3}
                      </div>
                    )}
                  </div>
                </div>

                {isLive ? (
                  <button
                    type="button"
                    onClick={() => navigate(g.roomCode ? `/lobby/${g.roomCode}` : '/create')}
                    className="mt-3 w-full rounded-btn bg-accent-gold py-3 text-center font-sans font-semibold text-text-on-ivory"
                  >
                    Join Now
                  </button>
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {['going', 'maybe', 'cant'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleRsvp(g.id, option)}
                        className={
                          'rounded-btn border py-2 font-sans text-[13px] font-medium capitalize ' +
                          (g.myRsvp === option ? 'border-accent-gold text-accent-gold' : 'border-white/15 text-text-secondary')
                        }
                      >
                        {option === 'cant' ? "Can't" : option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
