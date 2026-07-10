import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile.js';
import { apiGet, apiPost } from '../lib/api.js';
import { formatMoney } from '../lib/money.js';
import { useToast } from '../components/Toast.jsx';

export function SettleUpScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const showToast = useToast();
  const [plan, setPlan] = useState(null);
  const [paid, setPaid] = useState(new Set());
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    apiGet(`/api/ledger/${profile.playerId}/settle-plan`).then((d) => setPlan(d.plan)).catch(() => {});
  }, [profile.playerId]);

  if (!plan) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5">
        <p className="font-sans text-subheadline text-text-tertiary">Loading…</p>
      </div>
    );
  }

  if (plan.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5 text-center">
        <p className="font-display text-title text-text-primary">All settled up</p>
        <p className="mt-2 font-sans text-subheadline text-text-tertiary">Nothing to settle right now.</p>
      </div>
    );
  }

  const headline = plan.length === 1
    ? `${plan[0].fromName} owe${plan[0].fromName === 'You' ? '' : 's'} ${plan[0].toName === 'You' ? 'you' : plan[0].toName} ${formatMoney(plan[0].amountCents)}`
    : `${plan.length} transfers will settle every balance`;

  function togglePaid(idx) {
    setPaid((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function handleConfirm() {
    setSettling(true);
    try {
      await Promise.all(plan.map((t) => apiPost('/api/ledger/settle', { userA: t.from, userB: t.to })));
      showToast('Settled up');
      navigate('/ledger', { replace: true });
    } catch {
      showToast('Could not settle — try again');
    } finally {
      setSettling(false);
    }
  }

  return (
    <div className="flex h-full flex-col px-5 safe-top">
      <h1 className="font-display text-title text-text-primary">Settle Up</h1>
      <p className="mt-2 font-sans text-body text-text-secondary">{headline} — here's the simplest way for the group to clear up.</p>

      <p className="mb-2 mt-6 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">
        Simplified · {plan.length} transfer{plan.length === 1 ? '' : 's'}
      </p>
      <div className="flex flex-col gap-2">
        {plan.map((t, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-card border border-white/10 px-4 py-3">
            <span className="font-sans text-body text-text-primary">
              {t.fromName} <span className="text-text-tertiary">→</span> {t.toName}
            </span>
            <div className="flex items-center gap-3">
              <span className="tabular-money font-sans font-semibold text-text-primary">{formatMoney(t.amountCents)}</span>
              <button
                type="button"
                onClick={() => togglePaid(idx)}
                aria-label="Mark as paid"
                className={`flex h-6 w-6 items-center justify-center rounded-md border ${paid.has(idx) ? 'border-accent-olive bg-accent-olive text-text-on-ivory' : 'border-white/25'}`}
              >
                {paid.has(idx) && '✓'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-card border border-white/10 px-4 py-3">
        <span className="text-text-tertiary">ⓘ</span>
        <p className="font-sans text-[12px] leading-snug text-text-tertiary">
          Straight tracks balances for your records — it doesn't move money. Settle up however your group prefers (cash, Venmo, etc.).
        </p>
      </div>

      <div className="flex-1" />

      <div className="safe-bottom pb-6">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={settling}
          className="w-full rounded-btn bg-accent-gold py-4 text-center font-sans font-semibold text-text-on-ivory disabled:opacity-60"
        >
          {settling ? 'Settling…' : 'Confirm Settlement'}
        </button>
      </div>
    </div>
  );
}
