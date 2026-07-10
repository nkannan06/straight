import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar.jsx';
import { IconChevronLeft } from '../components/icons.jsx';
import { useProfile, initialsForName, colorForName } from '../hooks/useProfile.js';
import { apiGet, apiDelete } from '../lib/api.js';
import { formatMoney } from '../lib/money.js';
import { useToast } from '../components/Toast.jsx';

export function FriendProfileScreen() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const profile = useProfile();
  const showToast = useToast();
  const [data, setData] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  useEffect(() => {
    apiGet(`/api/friends/${profile.playerId}/${friendId}/profile`).then(setData).catch(() => {});
  }, [profile.playerId, friendId]);

  async function handleRemove() {
    try {
      await apiDelete(`/api/friends/${profile.playerId}/${friendId}`);
      navigate('/friends', { replace: true });
    } catch {
      showToast('Could not remove friend');
    }
  }

  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5">
        <p className="font-sans text-subheadline text-text-tertiary">Loading…</p>
      </div>
    );
  }

  const { friend, stats, recentSessions } = data;
  const balancePositive = stats.balanceCents > 0;

  return (
    <div className="relative flex h-full flex-col px-5 safe-top">
      <div className="mb-4 flex items-center">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-text-primary">
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex-1" />
        <button type="button" onClick={() => setMenuOpen((v) => !v)} className="p-1 text-text-primary">
          ⋮
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-5 top-14 z-10 rounded-btn border border-white/10 bg-bg-elevated-2 py-1 shadow-modal">
          {!confirmingRemove ? (
            <button
              type="button"
              onClick={() => setConfirmingRemove(true)}
              className="whitespace-nowrap px-4 py-2 text-left font-sans text-[13px] text-fold"
            >
              Remove Friend
            </button>
          ) : (
            <div className="flex gap-2 px-3 py-2">
              <button type="button" onClick={handleRemove} className="rounded-chip bg-fold px-2 py-1 font-sans text-[12px] text-ivory">
                Confirm
              </button>
              <button type="button" onClick={() => setConfirmingRemove(false)} className="font-sans text-[12px] text-text-tertiary">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-center">
        <Avatar name={friend.displayName} initials={initialsForName(friend.displayName)} color={colorForName(friend.displayName)} size="lg" />
        <h1 className="mt-3 font-display text-title text-text-primary">{friend.displayName}</h1>
        <p className="font-sans text-subheadline text-text-tertiary">
          @{friend.username} · {friend.presence === 'in_game' ? 'at a table now' : friend.presence === 'online' ? 'online' : 'offline'}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-card border border-white/10 bg-bg-elevated px-2 py-4 text-center">
        <div>
          <p className="tabular-money font-display text-headline text-text-primary">{stats.handsTogether}</p>
          <p className="font-sans text-[11px] text-text-tertiary">Hands together</p>
        </div>
        <div className="border-x border-white/10">
          <p className={`tabular-money font-display text-headline ${stats.balanceCents === 0 ? 'text-text-primary' : balancePositive ? 'text-accent-olive' : 'text-fold'}`}>
            {stats.balanceCents === 0 ? formatMoney(0) : `${balancePositive ? '+' : '-'}${formatMoney(Math.abs(stats.balanceCents))}`}
          </p>
          <p className="font-sans text-[11px] text-text-tertiary">{balancePositive ? 'They owe you' : 'You owe them'}</p>
        </div>
        <div>
          <p className="tabular-money font-display text-headline text-accent-gold">{formatMoney(stats.biggestPotCents)}</p>
          <p className="font-sans text-[11px] text-text-tertiary">Biggest pot</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => navigate('/create')}
          className="flex-1 rounded-btn bg-accent-gold py-3 text-center font-sans font-semibold text-text-on-ivory"
        >
          Invite to Table
        </button>
        <button
          type="button"
          onClick={() => navigate('/ledger')}
          className="flex-1 rounded-btn border border-white/20 py-3 text-center font-sans font-semibold text-text-primary"
        >
          View Ledger
        </button>
      </div>

      {recentSessions.length > 0 && (
        <div className="mt-6 flex-1 overflow-y-auto">
          <h2 className="mb-2 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Recent Together</h2>
          <div className="flex flex-col gap-2">
            {recentSessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(`/ledger/session/${s.id}`)}
                className="flex items-center justify-between rounded-btn border border-white/10 px-4 py-3 text-left"
              >
                <div>
                  <p className="font-sans text-body text-text-primary">{s.name || 'Table Session'}</p>
                  <p className="font-sans text-[12px] text-text-tertiary">
                    {new Date(s.played_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {s.my_net_cents >= 0 ? 'you won' : `${friend.displayName} won`}
                  </p>
                </div>
                <span className={`tabular-money font-sans text-[14px] font-semibold ${s.my_net_cents >= 0 ? 'text-accent-olive' : 'text-fold'}`}>
                  {s.my_net_cents >= 0 ? '+' : '-'}{formatMoney(Math.abs(s.my_net_cents))}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
