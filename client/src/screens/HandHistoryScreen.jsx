import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayingCard } from '../components/PlayingCard.jsx';
import { IconChevronLeft } from '../components/icons.jsx';
import { useProfile } from '../hooks/useProfile.js';
import { apiGet } from '../lib/api.js';
import { formatMoney } from '../lib/money.js';

const RESULT_COLOR = { won: 'text-accent-olive', lost: 'text-fold', folded: 'text-text-tertiary' };
const RESULT_LABEL = { won: 'Won', lost: 'Lost', folded: 'Folded' };

export function HandHistoryScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [hands, setHands] = useState([]);

  useEffect(() => {
    apiGet(`/api/hands/${profile.playerId}`).then((d) => setHands(d.hands)).catch(() => {});
  }, [profile.playerId]);

  return (
    <div className="flex h-full flex-col px-5 pt-4">
      <div className="mb-2 flex items-center">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-text-primary">
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-center font-display text-title text-text-primary">Hand History</h1>
        <div className="w-8" />
      </div>

      <div className="mt-3 flex-1 overflow-y-auto pb-4">
        {hands.length === 0 && (
          <p className="mt-10 text-center font-sans text-subheadline text-text-tertiary">No hands recorded yet</p>
        )}
        <div className="flex flex-col gap-2">
          {hands.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => navigate(`/hands/${h.id}`)}
              className="flex items-center gap-3 rounded-card border border-white/10 bg-bg-elevated px-3 py-3 text-left"
            >
              <div className="flex gap-1">
                <PlayingCard card={h.holeCards[0]} size="sm" animate={false} />
                <PlayingCard card={h.holeCards[1]} size="sm" animate={false} />
              </div>
              <div className="flex-1">
                <p className={`font-sans text-body font-medium ${RESULT_COLOR[h.result]}`}>{h.description}</p>
                <p className="font-sans text-[12px] text-text-tertiary">
                  {new Date(h.playedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {RESULT_LABEL[h.result]}
                </p>
              </div>
              <span className="tabular-money font-display text-headline text-accent-gold">{formatMoney(h.potCents)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
