import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar.jsx';
import { useProfile, initialsForName, colorForName } from '../hooks/useProfile.js';
import { apiGet } from '../lib/api.js';
import { formatMoney } from '../lib/money.js';

export function LedgerScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [data, setData] = useState(null);
  const [view, setView] = useState('friend'); // 'friend' | 'sessions'

  useEffect(() => {
    apiGet(`/api/ledger/${profile.playerId}`).then(setData).catch(() => {});
  }, [profile.playerId]);

  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5">
        <p className="font-sans text-subheadline text-text-tertiary">Loading…</p>
      </div>
    );
  }

  const unsettledFriends = data.friends.filter((f) => f.balanceCents !== 0);
  const net = data.allTimeNetCents;
  const uniqueFriendCount = data.friends.length;

  return (
    <div className="flex h-full flex-col px-5 pt-4">
      <h1 className="mb-3 font-display text-large-title text-text-primary">Ledger</h1>

      <div className="rounded-card border border-white/10 bg-bg-elevated px-4 py-5 text-center">
        <p className="font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">All-Time Net</p>
        <p className={`tabular-money mt-1 font-display text-large-title ${net === 0 ? 'text-text-primary' : net > 0 ? 'text-accent-olive' : 'text-fold'}`}>
          {net >= 0 ? '+' : '-'}{formatMoney(Math.abs(net))}
        </p>
        <p className="mt-1 font-sans text-[12px] text-text-tertiary">
          Across {uniqueFriendCount} friend{uniqueFriendCount === 1 ? '' : 's'} · {data.sessions.length} session{data.sessions.length === 1 ? '' : 's'}
        </p>
      </div>

      {unsettledFriends.length > 0 && (
        <button
          type="button"
          onClick={() => navigate('/ledger/settle')}
          className="mt-3 flex items-center justify-between rounded-card border border-accent-gold/30 bg-bg-elevated px-4 py-3"
        >
          <span className="font-sans text-body text-text-primary">
            {unsettledFriends.length} balance{unsettledFriends.length === 1 ? '' : 's'} to settle
          </span>
          <span className="font-sans font-semibold text-accent-gold">Settle Up</span>
        </button>
      )}

      <div className="mt-4 flex gap-2 rounded-btn border border-white/10 p-1">
        <button
          type="button"
          onClick={() => setView('friend')}
          className={`flex-1 rounded-chip py-1.5 font-sans text-[13px] font-medium ${view === 'friend' ? 'bg-bg-elevated-2 text-accent-gold' : 'text-text-tertiary'}`}
        >
          By Friend
        </button>
        <button
          type="button"
          onClick={() => setView('sessions')}
          className={`flex-1 rounded-chip py-1.5 font-sans text-[13px] font-medium ${view === 'sessions' ? 'bg-bg-elevated-2 text-accent-gold' : 'text-text-tertiary'}`}
        >
          All Sessions
        </button>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto pb-4">
        {view === 'friend' ? (
          <div className="flex flex-col gap-1">
            {data.friends.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => navigate(`/friends/${f.id}`)}
                className="flex items-center justify-between rounded-btn px-1 py-2.5 text-left"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={f.displayName} initials={initialsForName(f.displayName)} color={colorForName(f.displayName)} size="sm" />
                  <div>
                    <p className="font-sans text-body font-medium text-text-primary">{f.displayName}</p>
                  </div>
                </div>
                <span className={`tabular-money font-sans text-[14px] font-semibold ${f.balanceCents === 0 ? 'text-text-tertiary' : f.balanceCents > 0 ? 'text-accent-olive' : 'text-fold'}`}>
                  {f.balanceCents === 0 ? formatMoney(0) : `${f.balanceCents > 0 ? '+' : '-'}${formatMoney(Math.abs(f.balanceCents))}`}
                </span>
              </button>
            ))}
            {data.friends.length === 0 && (
              <p className="mt-8 text-center font-sans text-subheadline text-text-tertiary">No ledger history yet</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data.sessions.map((s) => {
              const mine = s.entries.find((e) => e.user_id === profile.playerId);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => navigate(`/ledger/session/${s.id}`)}
                  className="flex items-center justify-between rounded-btn border border-white/10 px-4 py-3 text-left"
                >
                  <div>
                    <p className="font-sans text-body text-text-primary">{s.name || 'Table Session'}</p>
                    <p className="font-sans text-[12px] text-text-tertiary">
                      {new Date(s.played_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {formatMoney(s.blinds_small_cents)}/{formatMoney(s.blinds_big_cents)}
                    </p>
                  </div>
                  {mine && (
                    <span className={`tabular-money font-sans text-[14px] font-semibold ${mine.net_cents >= 0 ? 'text-accent-olive' : 'text-fold'}`}>
                      {mine.net_cents >= 0 ? '+' : '-'}{formatMoney(Math.abs(mine.net_cents))}
                    </span>
                  )}
                </button>
              );
            })}
            {data.sessions.length === 0 && (
              <p className="mt-8 text-center font-sans text-subheadline text-text-tertiary">No sessions played yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
