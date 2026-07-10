import { shuffledDeck } from './deck.js';
import { bestHand, compareScore, describeHand } from './handEvaluator.js';

const STREETS = ['preflop', 'flop', 'turn', 'river'];
const DEFAULT_TURN_TIMEOUT_MS = 25_000;

function nowMs() {
  return Date.now();
}

// Splits pots into main + side pots from each player's total contribution this
// hand. Handles all-in-below-full-bet correctly: every distinct contribution
// level becomes a pot layer, and a player is only eligible for layers up to
// (and including) what they put in. Folded players still contribute their
// chips to whatever layers they funded, but are never eligible to win them.
export function computeSidePots(contributions) {
  // contributions: [{ id, contributed, folded }]
  const contributors = contributions.filter((p) => p.contributed > 0);
  if (contributors.length === 0) return [];
  const thresholds = [...new Set(contributors.map((p) => p.contributed))].sort((a, b) => a - b);

  const rawPots = [];
  let prevThreshold = 0;
  for (const threshold of thresholds) {
    const layerAmount = threshold - prevThreshold;
    const layerContributors = contributors.filter((p) => p.contributed >= threshold);
    const potSize = layerAmount * layerContributors.length;
    if (potSize > 0) {
      const eligiblePlayerIds = layerContributors.filter((p) => !p.folded).map((p) => p.id);
      if (eligiblePlayerIds.length > 0) rawPots.push({ amount: potSize, eligiblePlayerIds });
    }
    prevThreshold = threshold;
  }

  // Merge adjacent layers that share the exact same eligible set (common case:
  // no all-ins, everyone who's still in called the same amount).
  const merged = [];
  for (const pot of rawPots) {
    const last = merged[merged.length - 1];
    if (last && last.eligiblePlayerIds.length === pot.eligiblePlayerIds.length &&
        last.eligiblePlayerIds.every((id, i) => id === pot.eligiblePlayerIds[i])) {
      last.amount += pot.amount;
    } else {
      merged.push({ amount: pot.amount, eligiblePlayerIds: pot.eligiblePlayerIds });
    }
  }
  return merged;
}

// Checks the classic home-game "2-7 bounty" side rule: exactly a deuce and a
// seven, different suits. Ranking of the hand they actually made doesn't
// matter — this is purely about what their two hole cards are.
export function isTwoSevenOffsuit(holeCards) {
  if (!holeCards || holeCards.length !== 2) return false;
  const ranks = [holeCards[0].rank, holeCards[1].rank].sort();
  return ranks[0] === '2' && ranks[1] === '7' && holeCards[0].suit !== holeCards[1].suit;
}

export class IllegalActionError extends Error {}

export class Table {
  constructor({
    code,
    maxSeats = 8,
    blinds = { small: 1, big: 2 },
    startingStack = 1000,
    turnTimeoutMs = DEFAULT_TURN_TIMEOUT_MS,
    rabbitHuntEnabled = false,
    bounty27Enabled = false,
    bounty27Multiplier = 2,
  }) {
    this.code = code;
    this.maxSeats = maxSeats;
    this.blinds = { ...blinds };
    this.pendingBlinds = null;
    this.startingStack = startingStack;
    this.turnTimeoutMs = turnTimeoutMs;
    this.rabbitHuntEnabled = rabbitHuntEnabled;
    this.bounty27Enabled = bounty27Enabled;
    this.bounty27Multiplier = bounty27Multiplier;

    this.seats = new Array(maxSeats).fill(null);
    this.hostId = null;
    this.dealerSeat = null;
    this.deck = [];
    this.community = [];
    this.street = 'lobby'; // lobby | preflop | flop | turn | river | hand_complete
    this.currentBet = 0;
    this.minRaise = blinds.big;
    this.actingSeat = null;
    this.actionDeadline = null;
    this.postflopFirstToAct = null;
    this.actionLog = [];
    this.handNumber = 0;
    this.lastHandResult = null;
  }

  // ---- seating ----

  findPlayer(playerId) {
    return this.seats.find((p) => p && p.id === playerId) || null;
  }

  occupiedSeats() {
    return this.seats.filter(Boolean);
  }

  addPlayer(playerId, name) {
    if (this.findPlayer(playerId)) return this.findPlayer(playerId);
    const seatIndex = this.seats.findIndex((s) => s === null);
    if (seatIndex === -1) throw new IllegalActionError('Table is full');
    const player = {
      id: playerId,
      name,
      seat: seatIndex,
      stack: this.startingStack,
      holeCards: null,
      folded: false,
      allIn: false,
      sittingOut: false,
      currentBet: 0,
      contributed: 0,
      hasActed: false,
      connected: true,
    };
    this.seats[seatIndex] = player;
    if (this.hostId === null) this.hostId = playerId;
    this.logAction({ type: 'player_joined', playerId, name });
    return player;
  }

  removePlayer(playerId) {
    const player = this.findPlayer(playerId);
    if (!player) return;
    const handInProgress = ['preflop', 'flop', 'turn', 'river'].includes(this.street);
    const isLiveInHand = handInProgress && player.dealtIn && !player.folded;

    if (isLiveInHand) {
      // Can't free the seat yet — their chips are still part of the pot(s)
      // being tracked for this hand. Fold them out now and defer the actual
      // seat cleanup until the hand resolves (see startHand's sweep).
      if (this.actingSeat === player.seat) this.timeoutCurrentActor();
      if (!player.folded) {
        player.folded = true;
        this.logAction({ type: 'fold', playerId, reason: 'removed' });
        if (this.nonFoldedPlayers().length === 1) this.endHandByFold();
      }
      player.sittingOut = true;
      player.markedForRemoval = true;
      this.logAction({ type: 'player_left', playerId, name: player.name });
      return;
    }

    this.seats[player.seat] = null;
    this.logAction({ type: 'player_left', playerId, name: player.name });
    if (this.hostId === playerId) {
      const next = this.occupiedSeats()[0];
      this.hostId = next ? next.id : null;
    }
  }

  setConnected(playerId, connected) {
    const player = this.findPlayer(playerId);
    if (player) player.connected = connected;
  }

  // ---- host controls ----

  setPendingBlinds(blinds) {
    this.pendingBlinds = { ...blinds };
  }

  // Unlike blinds, these don't affect in-progress betting math, so they take
  // effect immediately rather than needing a "pending until next hand" step.
  setGameOptions({ rabbitHuntEnabled, bounty27Enabled, bounty27Multiplier } = {}) {
    if (rabbitHuntEnabled !== undefined) this.rabbitHuntEnabled = !!rabbitHuntEnabled;
    if (bounty27Enabled !== undefined) this.bounty27Enabled = !!bounty27Enabled;
    if (bounty27Multiplier !== undefined) this.bounty27Multiplier = bounty27Multiplier;
  }

  canStartHand() {
    const eligible = this.occupiedSeats().filter((p) => !p.sittingOut && p.stack > 0);
    return this.street === 'lobby' || this.street === 'hand_complete' ? eligible.length >= 2 : false;
  }

  resetGame() {
    for (const p of this.occupiedSeats()) {
      p.stack = this.startingStack;
      p.holeCards = null;
      p.folded = false;
      p.allIn = false;
      p.currentBet = 0;
      p.contributed = 0;
      p.hasActed = false;
    }
    this.dealerSeat = null;
    this.street = 'lobby';
    this.community = [];
    this.actionLog = [];
    this.handNumber = 0;
    this.lastHandResult = null;
  }

  // ---- seat-order helpers ----

  nextOccupiedSeat(fromIndex) {
    for (let step = 1; step <= this.maxSeats; step++) {
      const idx = (fromIndex + step) % this.maxSeats;
      if (this.seats[idx]) return idx;
    }
    return null;
  }

  // Next seat that can still act this street (not folded, not all-in, not sitting out).
  nextActingSeat(fromIndex) {
    for (let step = 1; step <= this.maxSeats; step++) {
      const idx = (fromIndex + step) % this.maxSeats;
      const p = this.seats[idx];
      if (p && p.dealtIn && !p.folded && !p.allIn && !p.sittingOut) return idx;
    }
    return null;
  }

  nonFoldedPlayers() {
    return this.occupiedSeats().filter((p) => !p.folded && p.dealtIn);
  }

  playersWhoCanAct() {
    return this.occupiedSeats().filter((p) => p.dealtIn && !p.folded && !p.allIn);
  }

  logAction(entry) {
    this.actionLog.push({ ts: nowMs(), street: this.street, ...entry });
    if (this.actionLog.length > 200) this.actionLog.shift();
  }

  // ---- hand lifecycle ----

  startHand() {
    for (const p of this.seats) {
      if (p && p.markedForRemoval) this.seats[p.seat] = null;
    }
    if (this.hostId && !this.findPlayer(this.hostId)) {
      const next = this.occupiedSeats()[0];
      this.hostId = next ? next.id : null;
    }
    if (!this.canStartHand()) throw new IllegalActionError('Not enough players to start a hand');
    if (this.pendingBlinds) {
      this.blinds = this.pendingBlinds;
      this.pendingBlinds = null;
    }

    const eligible = this.occupiedSeats().filter((p) => !p.sittingOut && p.stack > 0);
    for (const p of this.seats) {
      if (!p) continue;
      const dealtIn = eligible.includes(p);
      p.dealtIn = dealtIn;
      p.holeCards = null;
      p.folded = !dealtIn;
      p.allIn = false;
      p.currentBet = 0;
      p.contributed = 0;
      p.hasActed = false;
    }

    this.dealerSeat = this.dealerSeat === null
      ? eligible[0].seat
      : this.nextDealerSeat(eligible);

    this.deck = shuffledDeck();
    this.community = [];
    this.street = 'preflop';
    this.handNumber += 1;

    for (const p of eligible) {
      p.holeCards = [this.deck.pop(), this.deck.pop()];
    }

    const isHeadsUp = eligible.length === 2;
    let sbSeat, bbSeat;
    if (isHeadsUp) {
      sbSeat = this.dealerSeat;
      bbSeat = eligible.find((p) => p.seat !== this.dealerSeat).seat;
    } else {
      sbSeat = this.nextOccupiedSeat(this.dealerSeat);
      bbSeat = this.nextOccupiedSeat(sbSeat);
    }

    this.postBlind(sbSeat, this.blinds.small);
    this.postBlind(bbSeat, this.blinds.big);
    this.currentBet = this.blinds.big;
    this.minRaise = this.blinds.big;

    this.postflopFirstToAct = isHeadsUp ? bbSeat : this.nextOccupiedSeat(this.dealerSeat);
    const preflopFirstToAct = isHeadsUp ? sbSeat : this.nextActingSeat(bbSeat);

    this.actingSeat = preflopFirstToAct;
    this.actionDeadline = nowMs() + this.turnTimeoutMs;
    this.lastHandResult = null;
    this.logAction({ type: 'hand_started', handNumber: this.handNumber, dealerSeat: this.dealerSeat });

    this.maybeAutoAdvance();
  }

  nextDealerSeat(eligible) {
    let idx = this.dealerSeat;
    for (let step = 1; step <= this.maxSeats; step++) {
      idx = (idx + 1) % this.maxSeats;
      const p = this.seats[idx];
      if (p && eligible.includes(p)) return idx;
    }
    return eligible[0].seat;
  }

  postBlind(seatIndex, amount) {
    const p = this.seats[seatIndex];
    const post = Math.min(amount, p.stack);
    p.stack -= post;
    p.currentBet += post;
    p.contributed += post;
    if (p.stack === 0) p.allIn = true;
    this.logAction({ type: 'post_blind', playerId: p.id, amount: post });
  }

  // ---- betting ----

  legalActionsFor(playerId) {
    const p = this.findPlayer(playerId);
    if (!p || this.actingSeat !== p.seat) return [];
    const toCall = this.currentBet - p.currentBet;
    const actions = ['fold'];
    actions.push(toCall > 0 ? 'call' : 'check');
    if (p.stack > 0) actions.push('raise');
    return actions;
  }

  applyAction(playerId, action, amount = 0) {
    const p = this.findPlayer(playerId);
    if (!p) throw new IllegalActionError('Unknown player');
    if (!['preflop', 'flop', 'turn', 'river'].includes(this.street)) {
      throw new IllegalActionError('No hand in progress');
    }
    if (this.actingSeat !== p.seat) throw new IllegalActionError('Not your turn');

    const toCall = this.currentBet - p.currentBet;

    if (action === 'fold') {
      p.folded = true;
      this.logAction({ type: 'fold', playerId });
      if (this.nonFoldedPlayers().length === 1) {
        this.endHandByFold();
        return;
      }
      this.advanceTurn();
      return;
    }

    if (action === 'check') {
      if (toCall > 0) throw new IllegalActionError('Cannot check, must call or fold');
      p.hasActed = true;
      this.logAction({ type: 'check', playerId });
      this.advanceTurn();
      return;
    }

    if (action === 'call') {
      if (toCall <= 0) {
        p.hasActed = true;
        this.logAction({ type: 'check', playerId });
        this.advanceTurn();
        return;
      }
      const callAmount = Math.min(toCall, p.stack);
      p.stack -= callAmount;
      p.currentBet += callAmount;
      p.contributed += callAmount;
      if (p.stack === 0) p.allIn = true;
      p.hasActed = true;
      this.logAction({ type: 'call', playerId, amount: callAmount });
      this.advanceTurn();
      return;
    }

    if (action === 'raise') {
      const raiseTo = amount;
      if (raiseTo <= this.currentBet) throw new IllegalActionError('Raise must exceed current bet');
      const chipsNeeded = raiseTo - p.currentBet;
      if (chipsNeeded > p.stack) throw new IllegalActionError('Not enough chips');
      const raiseIncrement = raiseTo - this.currentBet;
      const isAllIn = chipsNeeded === p.stack;
      if (!isAllIn && raiseIncrement < this.minRaise) {
        throw new IllegalActionError(`Raise must be at least ${this.minRaise} more than the current bet`);
      }
      p.stack -= chipsNeeded;
      p.currentBet = raiseTo;
      p.contributed += chipsNeeded;
      if (p.stack === 0) p.allIn = true;
      this.currentBet = raiseTo;
      if (raiseIncrement >= this.minRaise) this.minRaise = raiseIncrement;
      for (const other of this.playersWhoCanAct()) {
        other.hasActed = other.id === playerId;
      }
      p.hasActed = true;
      this.logAction({ type: 'raise', playerId, amount: raiseTo });
      this.advanceTurn();
      return;
    }

    throw new IllegalActionError(`Unknown action: ${action}`);
  }

  timeoutCurrentActor() {
    if (this.actingSeat === null) return;
    const p = this.seats[this.actingSeat];
    if (!p) return;
    const toCall = this.currentBet - p.currentBet;
    try {
      if (toCall > 0) {
        this.applyAction(p.id, 'fold');
      } else {
        this.applyAction(p.id, 'check');
      }
      this.logAction({ type: 'timeout', playerId: p.id });
    } catch {
      // hand may have already ended concurrently; ignore
    }
  }

  bettingRoundComplete() {
    const acting = this.playersWhoCanAct();
    if (acting.length === 0) return true;
    if (acting.length === 1 && this.nonFoldedPlayers().length > 1) return true; // everyone else all-in
    return acting.every((p) => p.hasActed && p.currentBet === this.currentBet);
  }

  advanceTurn() {
    if (this.bettingRoundComplete()) {
      this.advanceStreet();
      return;
    }
    const next = this.nextActingSeat(this.actingSeat);
    this.actingSeat = next;
    this.actionDeadline = nowMs() + this.turnTimeoutMs;
  }

  resetBettingRound() {
    this.currentBet = 0;
    this.minRaise = this.blinds.big;
    for (const p of this.occupiedSeats()) {
      p.currentBet = 0;
      p.hasActed = false;
    }
  }

  advanceStreet() {
    if (this.nonFoldedPlayers().length <= 1) {
      this.endHandByFold();
      return;
    }
    if (this.street === 'river') {
      this.goToShowdown();
      return;
    }
    const idx = STREETS.indexOf(this.street);
    this.street = STREETS[idx + 1];
    if (this.street === 'flop') this.dealCommunity(3);
    else this.dealCommunity(1);
    this.resetBettingRound();
    this.logAction({ type: 'street', street: this.street, community: this.community.slice() });
    this.maybeAutoAdvance();
  }

  maybeAutoAdvance() {
    const canAct = this.playersWhoCanAct();
    if (canAct.length <= 1 && this.nonFoldedPlayers().length > 1) {
      // everyone (or all but one) is all-in — deal out the board with no more betting
      this.actingSeat = null;
      this.actionDeadline = null;
      this.advanceStreet();
      return;
    }
    this.actingSeat = this.street === 'preflop' ? this.actingSeat : this.nextActingSeat(this.dealerSeat);
    this.actionDeadline = nowMs() + this.turnTimeoutMs;
  }

  dealCommunity(n) {
    for (let i = 0; i < n; i++) this.community.push(this.deck.pop());
  }

  contributionsSnapshot() {
    return this.occupiedSeats().map((p) => ({ id: p.id, contributed: p.contributed, folded: p.folded }));
  }

  // Pays out the 2-7 bounty for any winner(s) of this hand holding the
  // qualifying cards: every other player dealt into the hand pays
  // blinds.big * bounty27Multiplier to them (capped at what they have left,
  // so nobody's stack goes negative). Returns null when nothing was paid.
  applyBounty27(winnerIds) {
    if (!this.bounty27Enabled) return null;
    const amount = this.blinds.big * this.bounty27Multiplier;
    const payouts = [];
    for (const winnerId of new Set(winnerIds)) {
      const winner = this.findPlayer(winnerId);
      if (!winner || !isTwoSevenOffsuit(winner.holeCards)) continue;
      const payers = this.occupiedSeats().filter((p) => p.dealtIn && p.id !== winnerId);
      let collected = 0;
      for (const payer of payers) {
        const paid = Math.min(amount, payer.stack);
        payer.stack -= paid;
        collected += paid;
      }
      winner.stack += collected;
      const payerIds = payers.map((p) => p.id);
      this.logAction({ type: 'bounty27', winnerId, amount: collected, payerIds });
      payouts.push({ winnerId, amount: collected, payerIds });
    }
    return payouts.length ? payouts : null;
  }

  endHandByFold() {
    const winner = this.nonFoldedPlayers()[0];
    const pots = computeSidePots(this.contributionsSnapshot());
    const totalAwarded = pots.reduce((sum, pot) => sum + pot.amount, 0);
    if (winner) winner.stack += totalAwarded;
    const bounty27 = winner ? this.applyBounty27([winner.id]) : null;

    // Rabbit hunt: the hand ended before all five community cards were
    // dealt (folded out on the flop/turn/etc) — reveal what the rest of the
    // board would have been, drawn from the same already-shuffled deck so
    // it's the real would-have-been cards, not a fresh random draw. Purely
    // cosmetic: money was already awarded above based on the actual fold.
    let rabbitHunt = null;
    if (this.rabbitHuntEnabled && this.community.length < 5) {
      const extra = [];
      while (this.community.length + extra.length < 5 && this.deck.length > 0) extra.push(this.deck.pop());
      if (extra.length > 0) rabbitHunt = { community: [...this.community, ...extra] };
    }

    this.street = 'hand_complete';
    this.actingSeat = null;
    this.actionDeadline = null;
    this.lastHandResult = {
      wonWithoutShowdown: true,
      community: this.community.slice(),
      pots: pots.map((pot) => ({ amount: pot.amount, winnerIds: winner ? [winner.id] : [] })),
      totalPot: totalAwarded,
      showdownHands: [],
      bounty27,
      rabbitHunt,
    };
    this.logAction({ type: 'hand_complete', winnerIds: winner ? [winner.id] : [], amount: totalAwarded, wonWithoutShowdown: true });
  }

  goToShowdown() {
    this.street = 'showdown';
    const contenders = this.nonFoldedPlayers();
    const results = contenders.map((p) => {
      const { score, cards } = bestHand([...p.holeCards, ...this.community]);
      return { id: p.id, score, cards, description: describeHand(score) };
    });

    const pots = computeSidePots(this.contributionsSnapshot());
    const awarded = [];
    for (const pot of pots) {
      const eligible = results.filter((r) => pot.eligiblePlayerIds.includes(r.id));
      if (eligible.length === 0) continue;
      let bestScore = eligible[0].score;
      for (const r of eligible) if (compareScore(r.score, bestScore) > 0) bestScore = r.score;
      const winners = eligible.filter((r) => compareScore(r.score, bestScore) === 0);
      const share = Math.floor(pot.amount / winners.length);
      let remainder = pot.amount - share * winners.length;
      // odd chip(s) go to the winner(s) closest to the left of the dealer button
      const orderedWinners = winners.slice().sort((a, b) => {
        const seatA = this.findPlayer(a.id).seat;
        const seatB = this.findPlayer(b.id).seat;
        const relA = (seatA - this.dealerSeat + this.maxSeats) % this.maxSeats;
        const relB = (seatB - this.dealerSeat + this.maxSeats) % this.maxSeats;
        return relA - relB;
      });
      for (const w of orderedWinners) {
        const extra = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder -= 1;
        this.findPlayer(w.id).stack += share + extra;
      }
      awarded.push({ amount: pot.amount, winnerIds: winners.map((w) => w.id) });
    }

    const bounty27 = this.applyBounty27(awarded.flatMap((a) => a.winnerIds));

    this.street = 'hand_complete';
    this.actingSeat = null;
    this.actionDeadline = null;
    this.lastHandResult = {
      wonWithoutShowdown: false,
      community: this.community.slice(),
      pots: awarded,
      totalPot: awarded.reduce((sum, pot) => sum + pot.amount, 0),
      showdownHands: results.map((r) => ({ id: r.id, cards: r.cards, description: r.description })),
      bounty27,
      rabbitHunt: null,
    };
    this.logAction({ type: 'hand_complete', winnerIds: awarded.flatMap((a) => a.winnerIds), amount: this.lastHandResult.totalPot, wonWithoutShowdown: false });
  }

  // ---- state snapshot (full, unredacted — caller redacts per-viewer) ----

  getState() {
    return {
      code: this.code,
      maxSeats: this.maxSeats,
      blinds: this.blinds,
      pendingBlinds: this.pendingBlinds,
      startingStack: this.startingStack,
      rabbitHuntEnabled: this.rabbitHuntEnabled,
      bounty27Enabled: this.bounty27Enabled,
      bounty27Multiplier: this.bounty27Multiplier,
      hostId: this.hostId,
      dealerSeat: this.dealerSeat,
      street: this.street,
      community: this.community.slice(),
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      actingSeat: this.actingSeat,
      actionDeadline: this.actionDeadline,
      handNumber: this.handNumber,
      lastHandResult: this.lastHandResult,
      actionLog: this.actionLog.slice(-30),
      // Sum of contributed, not currentBet — currentBet resets to 0 at the
      // start of every street, so it alone would make the pot look like it
      // shrinks back to nothing each time betting moves to a new street.
      pot: this.occupiedSeats().reduce((sum, p) => sum + p.contributed, 0),
      seats: this.seats.map((p) => p && ({
        id: p.id,
        name: p.name,
        seat: p.seat,
        stack: p.stack,
        holeCards: p.holeCards,
        folded: p.folded,
        allIn: p.allIn,
        sittingOut: p.sittingOut,
        currentBet: p.currentBet,
        connected: p.connected,
        dealtIn: !!p.dealtIn,
      })),
    };
  }
}
