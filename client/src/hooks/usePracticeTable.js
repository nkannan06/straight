import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Table } from '../lib/gameEngine.js';
import { estimateEquity } from '../lib/equity.js';
import { decideAction, suggestAction } from '../lib/aiPlayer.js';

const YOU_ID = 'you';
const AI_NAMES = ['Devon', 'Alex', 'Sena', 'Reed', 'Mika'];
const NEXT_HAND_DELAY_MS = 4000;
const AI_ACTION_DELAY_MS = [500, 1100];

function sanitizeForHuman(fullState) {
  const revealedIds = new Set();
  if (fullState.lastHandResult && !fullState.lastHandResult.wonWithoutShowdown) {
    for (const sh of fullState.lastHandResult.showdownHands) revealedIds.add(sh.id);
  }
  return {
    ...fullState,
    seats: fullState.seats.map((seat) => {
      if (!seat) return null;
      const show = seat.id === YOU_ID || revealedIds.has(seat.id);
      return { ...seat, holeCards: show ? seat.holeCards : (seat.holeCards ? [null, null] : null) };
    }),
  };
}

// Amounts are integer cents (see lib/money.js) — defaults here are $1/$2
// blinds with a $1,000 starting stack.
export function usePracticeTable({ difficulty, opponentCount, startingStack = 100_000, blinds = { small: 100, big: 200 } }) {
  const tableRef = useRef(null);
  if (!tableRef.current) {
    const table = new Table({ code: 'PRACTICE', maxSeats: opponentCount + 1, blinds, startingStack, turnTimeoutMs: 25_000 });
    table.addPlayer(YOU_ID, 'You');
    for (let i = 0; i < opponentCount; i++) table.addPlayer(`ai-${i}`, AI_NAMES[i % AI_NAMES.length]);
    table.startHand();
    tableRef.current = table;
  }

  const [tick, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const [nextHandAt, setNextHandAt] = useState(null);
  const aiTimerRef = useRef(null);
  const nextHandTimerRef = useRef(null);
  const handCompleteHandledRef = useRef(false);

  const table = tableRef.current;
  const state = table.getState();

  const activeOpponentCount = state.seats.filter((s) => s && s.id !== YOU_ID && !s.folded && s.dealtIn).length;

  function currentEquityForYou() {
    const me = state.seats.find((s) => s && s.id === YOU_ID);
    if (!me || !me.holeCards || me.holeCards.some((c) => !c)) return null;
    const opponents = Math.max(1, activeOpponentCount);
    return estimateEquity({ holeCards: me.holeCards, board: state.community, numOpponents: opponents, iterations: 400 });
  }

  const applyHumanAction = useCallback((action, amount = 0) => {
    try {
      table.applyAction(YOU_ID, action, amount);
    } catch {
      // illegal action (shouldn't happen from the UI, which only offers legal moves)
    }
    rerender();
  }, [table, rerender]);

  // Drive AI turns automatically.
  useEffect(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    const s = table.getState();
    if (!['preflop', 'flop', 'turn', 'river'].includes(s.street) || s.actingSeat === null) return undefined;
    const actor = s.seats.find((seat) => seat && seat.seat === s.actingSeat);
    if (!actor || actor.id === YOU_ID) return undefined;

    const delay = AI_ACTION_DELAY_MS[0] + Math.random() * (AI_ACTION_DELAY_MS[1] - AI_ACTION_DELAY_MS[0]);
    aiTimerRef.current = setTimeout(() => {
      const live = table.seats.find((p) => p.id === actor.id);
      if (!live || table.actingSeat !== live.seat) return;
      const toCall = table.currentBet - live.currentBet;
      const potSize = table.seats.filter(Boolean).reduce((sum, p) => sum + p.contributed, 0);
      const opponentsAlive = Math.max(1, table.seats.filter((p) => p && p.id !== actor.id && !p.folded && p.dealtIn).length);
      const decision = decideAction({
        difficulty,
        holeCards: live.holeCards,
        board: table.community,
        potSize,
        toCall,
        currentBet: table.currentBet,
        minRaise: table.minRaise,
        myStack: live.stack,
        myCurrentBet: live.currentBet,
        numOpponents: opponentsAlive,
      });
      try {
        table.applyAction(actor.id, decision.action, decision.amount || 0);
      } catch {
        table.applyAction(actor.id, toCall > 0 ? 'call' : 'check');
      }
      rerender();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, delay);
    return () => clearTimeout(aiTimerRef.current);
  }, [tick, difficulty, table, rerender]);

  // Auto-advance to the next hand once one completes.
  useEffect(() => {
    const s = table.getState();
    if (s.street !== 'hand_complete') {
      handCompleteHandledRef.current = false;
      return undefined;
    }
    if (handCompleteHandledRef.current) return undefined;
    handCompleteHandledRef.current = true;

    setNextHandAt(Date.now() + NEXT_HAND_DELAY_MS);
    nextHandTimerRef.current = setTimeout(() => {
      setNextHandAt(null);
      if (table.canStartHand()) table.startHand();
      rerender();
    }, NEXT_HAND_DELAY_MS);
    return () => clearTimeout(nextHandTimerRef.current);
  }, [tick, table, rerender]);

  useEffect(() => () => {
    clearTimeout(aiTimerRef.current);
    clearTimeout(nextHandTimerRef.current);
  }, []);

  const hint = useMemo(() => {
    const me = state.seats.find((s) => s && s.id === YOU_ID);
    if (!me || !me.holeCards || me.holeCards.some((c) => !c) || !['preflop', 'flop', 'turn', 'river'].includes(state.street)) {
      return null;
    }
    const equity = currentEquityForYou();
    if (!equity) return null;
    const winTie = equity.win + equity.tie * 0.5;
    const toCall = state.currentBet - me.currentBet;
    const potSize = state.pot;
    const suggestion = state.actingSeat === me.seat
      ? suggestAction({
        equity: winTie,
        toCall,
        potSize,
        minRaise: state.minRaise,
        currentBet: state.currentBet,
        myStack: me.stack,
        myCurrentBet: me.currentBet,
      })
      : null;
    return { equity: winTie, suggestion };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.street, state.community.length, state.actingSeat, state.handNumber]);

  return {
    state: sanitizeForHuman(state),
    nextHandAt,
    hint,
    sendAction: applyHumanAction,
  };
}
