import { estimateEquity } from './equity.js';

// All tiers share the same equity-estimator engine; what changes is sample
// size (read sharpness), how much noise gets mixed into the read, how often
// they raise for value vs. bluff, and how they size bets.
export const DIFFICULTIES = {
  easy: {
    label: 'Easy',
    description: 'Noisy reads, rarely raises, calls too loosely, almost never bluffs.',
    sampleSize: 60,
    noise: 0.32,
    raiseFrequency: 0.12,
    bluffFrequency: 0.04,
    callLooseness: 0.16, // will call even when meaningfully behind on pot odds
    betSizing: 'flat',
  },
  medium: {
    label: 'Medium',
    description: 'Plays pot odds fairly straight, raises for value, bluffs occasionally.',
    sampleSize: 250,
    noise: 0.12,
    raiseFrequency: 0.3,
    bluffFrequency: 0.12,
    callLooseness: 0.03,
    betSizing: 'pot-relative',
  },
  hard: {
    label: 'Hard',
    description: 'Sharp reads, sizes bets to pot odds and stack depth, bluffs and semi-bluffs with good timing.',
    sampleSize: 700,
    noise: 0.03,
    raiseFrequency: 0.45,
    bluffFrequency: 0.22,
    callLooseness: 0,
    betSizing: 'stack-aware',
  },
};

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function sizeBet({ betSizing, potSize, currentBet, minRaise, myCurrentBet, myStack, equity }) {
  const allInTotal = myCurrentBet + myStack;
  let fraction;
  if (betSizing === 'flat') {
    fraction = 0.5;
  } else if (betSizing === 'pot-relative') {
    fraction = 0.5 + Math.random() * 0.3; // 50-80% pot
  } else {
    // stack-aware: bigger with strong hands, occasionally overbets as a bluff/semi-bluff
    fraction = equity > 0.7 ? 0.85 + Math.random() * 0.35 : 0.45 + Math.random() * 0.25;
  }
  const raw = currentBet + Math.max(minRaise, Math.round(potSize * fraction));
  return Math.max(currentBet + minRaise, Math.min(raw, allInTotal));
}

// Deterministic, no-bluff recommendation for the practice-mode hint badge —
// purely equity vs. pot odds, clearly a suggestion rather than the AI's own
// (noisier, bluff-capable) decision logic.
export function suggestAction({ equity, toCall, potSize, minRaise, currentBet, myStack, myCurrentBet }) {
  if (toCall <= 0) {
    if (equity > 0.62 && myStack > 0) {
      return { action: 'raise', amount: sizeBet({ betSizing: 'pot-relative', potSize, currentBet, minRaise, myCurrentBet, myStack, equity }), reason: 'Strong equity — betting for value is reasonable.' };
    }
    return { action: 'check', reason: 'No bet to face — checking keeps the pot small with a modest hand.' };
  }
  const potOdds = toCall / (potSize + toCall);
  if (equity < potOdds - 0.05) {
    return { action: 'fold', reason: `Your equity (${Math.round(equity * 100)}%) is below the price you're being asked to pay.` };
  }
  if (equity > potOdds + 0.22 && myStack > 0) {
    return { action: 'raise', amount: sizeBet({ betSizing: 'pot-relative', potSize, currentBet, minRaise, myCurrentBet, myStack, equity }), reason: 'Well ahead of the pot odds — a raise builds value.' };
  }
  return { action: 'call', reason: `Your equity (${Math.round(equity * 100)}%) covers the pot odds here.` };
}

// Decide an action for one AI-controlled seat. Returns { action, amount? }.
export function decideAction({
  difficulty,
  holeCards,
  board,
  potSize,
  toCall,
  currentBet,
  minRaise,
  myStack,
  myCurrentBet,
  numOpponents,
}) {
  const config = DIFFICULTIES[difficulty];
  const raw = estimateEquity({ holeCards, board, numOpponents, iterations: config.sampleSize });
  const noise = (Math.random() * 2 - 1) * config.noise;
  const equity = clamp01(raw.win + raw.tie * 0.5 + noise);
  const canRaise = myStack > 0;

  if (toCall > 0) {
    const potOdds = toCall / (potSize + toCall);
    const surplus = equity - potOdds;

    if (surplus < -config.callLooseness) return { action: 'fold' };

    const wantsBluffRaise = canRaise && Math.random() < config.bluffFrequency && equity < 0.4;
    const wantsValueRaise = canRaise && surplus > 0.18 && Math.random() < config.raiseFrequency;
    if (wantsBluffRaise || wantsValueRaise) {
      const amount = sizeBet({ betSizing: config.betSizing, potSize, currentBet, minRaise, myCurrentBet, myStack, equity });
      return { action: 'raise', amount };
    }
    return { action: 'call' };
  }

  // Nobody to call — check, bet for value, or bet as a bluff.
  const wantsBluffBet = canRaise && Math.random() < config.bluffFrequency * 0.6 && equity < 0.35;
  const wantsValueBet = canRaise && equity > 0.55 && Math.random() < config.raiseFrequency;
  if (wantsBluffBet || wantsValueBet) {
    const amount = sizeBet({ betSizing: config.betSizing, potSize, currentBet, minRaise, myCurrentBet, myStack, equity });
    return { action: 'raise', amount };
  }
  return { action: 'check' };
}
