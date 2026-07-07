import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar.jsx';
import { IconChevronLeft } from '../components/icons.jsx';
import { initialsForName, colorForName } from '../hooks/useProfile.js';
import { apiGet } from '../lib/api.js';
import { formatMoney } from '../lib/money.js';

export function SessionDetailScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  useEffect(() => {
    apiGet(`/api/ledger/session/${sessionId}`).then((d) => setSession(d.session)).catch(() => {});
  }, [sessionId]);

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5">
        <p className="font-sans text-subheadline text-text-tertiary">Loading…</p>
      </div>
    );
  }

  const totalPotCycled = session.entries.reduce((sum, e) => sum + e.buy_in_cents, 0);

  return (
    <div className="flex h-full flex-col px-5 pt-4">
      <div className="mb-4 flex items-center">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-text-primary">
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex-1" />
      </div>

      <div className="text-center">
        <h1 className="font-display text-title text-text-primary">{session.name || 'Table Session'}</h1>
        <p className="mt-1 font-sans text-subheadline text-text-tertiary">
          {new Date(session.played_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          {session.duration_minutes ? ` · ${session.duration_minutes}m` : ''} · {formatMoney(session.blinds_small_cents)}/{formatMoney(session.blinds_big_cents)}
        </p>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto">
        <div className="mb-2 flex justify-between font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">
          <span>Player</span>
          <div className="flex gap-8">
            <span>Buy-in</span>
            <span>Net</span>
          </div>
        </div>
        <div className="flex flex-col divide-y divide-white/5">
          {session.entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Avatar name={e.display_name} initials={initialsForName(e.display_name)} color={colorForName(e.display_name)} size="sm" />
                <div>
                  <p className="font-sans text-body text-text-primary">{e.display_name}</p>
                  {e.rebuys_count > 0 && <p className="font-sans text-[11px] text-text-tertiary">+{e.rebuys_count} rebuys</p>}
                </div>
              </div>
              <div className="flex items-center gap-6 tabular-money">
                <span className="w-16 text-right font-sans text-[14px] text-text-secondary">{formatMoney(e.buy_in_cents)}</span>
                <span className={`w-16 text-right font-sans text-[14px] font-semibold ${e.net_cents >= 0 ? 'text-accent-olive' : 'text-fold'}`}>
                  {e.net_cents >= 0 ? '+' : '-'}{formatMoney(Math.abs(e.net_cents))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between py-3 font-sans text-[13px] text-text-tertiary">
        <span>Total pot cycled · {formatMoney(totalPotCycled)}</span>
      </div>

      <div className="safe-bottom pb-6">
        {session.settled ? (
          <div className="rounded-btn border border-white/10 py-3 text-center font-sans text-subheadline text-text-tertiary">
            Settled on {new Date(session.settled_at).toLocaleDateString()}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/ledger/settle')}
            className="w-full rounded-btn bg-accent-gold py-4 text-center font-sans font-semibold text-text-on-ivory"
          >
            Mark as Settled
          </button>
        )}
      </div>
    </div>
  );
}
