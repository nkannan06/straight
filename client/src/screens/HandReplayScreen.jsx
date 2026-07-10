import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlayingCard } from '../components/PlayingCard.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { IconChevronLeft } from '../components/icons.jsx';
import { initialsForName, colorForName } from '../hooks/useProfile.js';
import { apiGet } from '../lib/api.js';
import { formatMoney } from '../lib/money.js';

const STREET_LABEL = { flop: 'Flop dealt', turn: 'Turn dealt', river: 'River dealt' };

function buildSteps(actions, finalCommunity) {
  let pot = 0;
  const currentBet = new Map();
  const foldedIds = new Set();
  let community = [];
  const steps = [];

  for (const a of actions) {
    if (a.type === 'hand_started') continue;
    if (a.type === 'post_blind') {
      pot += a.amount;
      currentBet.set(a.playerId, (currentBet.get(a.playerId) || 0) + a.amount);
      steps.push({ community: [...community], pot, caption: `${a.playerName} posted ${formatMoney(a.amount)}`, foldedIds: new Set(foldedIds) });
    } else if (a.type === 'call') {
      pot += a.amount;
      steps.push({ community: [...community], pot, caption: `${a.playerName} called ${formatMoney(a.amount)}`, foldedIds: new Set(foldedIds) });
    } else if (a.type === 'check') {
      steps.push({ community: [...community], pot, caption: `${a.playerName} checked`, foldedIds: new Set(foldedIds) });
    } else if (a.type === 'raise') {
      const prevBet = currentBet.get(a.playerId) || 0;
      pot += a.amount - prevBet;
      currentBet.set(a.playerId, a.amount);
      steps.push({ community: [...community], pot, caption: `${a.playerName} raised to ${formatMoney(a.amount)}`, foldedIds: new Set(foldedIds) });
    } else if (a.type === 'fold') {
      foldedIds.add(a.playerId);
      steps.push({ community: [...community], pot, caption: `${a.playerName} folded`, foldedIds: new Set(foldedIds) });
    } else if (a.type === 'timeout') {
      steps.push({ community: [...community], pot, caption: `${a.playerName} ran out of time`, foldedIds: new Set(foldedIds) });
    } else if (a.type === 'street') {
      community = a.community;
      currentBet.clear();
      steps.push({ community: [...community], pot, caption: STREET_LABEL[a.street] || 'Cards dealt', foldedIds: new Set(foldedIds) });
    } else if (a.type === 'hand_complete') {
      steps.push({
        community: finalCommunity,
        pot,
        caption: a.wonWithoutShowdown ? 'Hand ended without showdown' : 'Showdown',
        foldedIds: new Set(foldedIds),
      });
    }
  }
  return steps;
}

export function HandReplayScreen() {
  const { handId } = useParams();
  const navigate = useNavigate();
  const [hand, setHand] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    apiGet(`/api/hands/detail/${handId}`).then((d) => setHand(d.hand)).catch(() => {});
  }, [handId]);

  const steps = useMemo(() => (hand ? buildSteps(hand.actions, hand.communityCards) : []), [hand]);
  const players = useMemo(() => {
    if (!hand) return [];
    const seen = new Map();
    for (const a of hand.actions) {
      if (a.playerId && a.playerName && !seen.has(a.playerId)) seen.set(a.playerId, a.playerName);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [hand]);

  if (!hand || steps.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5">
        <p className="font-sans text-subheadline text-text-tertiary">Loading…</p>
      </div>
    );
  }

  const step = steps[Math.min(stepIdx, steps.length - 1)];

  return (
    <div className="flex h-full flex-col px-5 safe-top">
      <div className="mb-2 flex items-center">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-text-primary">
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 text-center">
          <p className="font-display text-title text-text-primary">Replay</p>
          <p className="font-sans text-[12px] text-text-tertiary">
            {new Date(hand.playedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {formatMoney(hand.potCents)} pot
          </p>
        </div>
        <div className="w-8" />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {players.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-1 opacity-90" style={{ opacity: step.foldedIds.has(p.id) ? 0.4 : 1 }}>
            <Avatar name={p.name} initials={initialsForName(p.name)} color={colorForName(p.name)} size="sm" />
            <span className="font-sans text-[11px] text-text-secondary">{p.name}</span>
            {step.foldedIds.has(p.id) && <span className="font-sans text-[10px] text-text-tertiary">fold</span>}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <span className="tabular-money font-display text-large-title text-accent-gold">{formatMoney(step.pot)}</span>
        <div className="flex justify-center gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <PlayingCard key={i} card={step.community[i] || null} size="md" animate={false} />
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <p className="mb-3 text-center font-sans text-subheadline text-text-secondary">{step.caption}</p>

      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-2">
          <PlayingCard card={hand.holeCards[0]} size="md" animate={false} />
          <PlayingCard card={hand.holeCards[1]} size="md" animate={false} />
        </div>
      </div>

      <div className="safe-bottom mt-6 flex items-center gap-3 pb-6">
        <button
          type="button"
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          disabled={stepIdx === 0}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn border border-white/15 text-text-primary disabled:opacity-30"
        >
          <IconChevronLeft className="h-5 w-5" />
        </button>
        <input
          type="range"
          min={0}
          max={steps.length - 1}
          value={stepIdx}
          onChange={(e) => setStepIdx(Number(e.target.value))}
          className="flex-1 accent-accent-gold"
        />
        <button
          type="button"
          onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))}
          disabled={stepIdx === steps.length - 1}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-accent-gold text-text-on-ivory disabled:opacity-30"
        >
          <IconChevronLeft className="h-5 w-5 rotate-180" />
        </button>
      </div>
    </div>
  );
}
