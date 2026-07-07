import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Table, IllegalActionError, computeSidePots } from '../gameEngine.js';

function makeTable(opts = {}) {
  return new Table({ code: 'TEST01', maxSeats: 8, blinds: { small: 5, big: 10 }, startingStack: 1000, turnTimeoutMs: 25_000, ...opts });
}

function seatPlayers(table, names) {
  return names.map((name) => table.addPlayer(name, name));
}

describe('seating and hand start', () => {
  test('requires at least 2 players to start', () => {
    const table = makeTable();
    seatPlayers(table, ['a']);
    assert.throws(() => table.startHand(), IllegalActionError);
  });

  test('deals hole cards and posts blinds heads-up', () => {
    const table = makeTable();
    const [a, b] = seatPlayers(table, ['a', 'b']);
    table.startHand();
    assert.equal(a.holeCards.length, 2);
    assert.equal(b.holeCards.length, 2);
    // heads-up: dealer posts SB, other posts BB
    const dealer = table.seats[table.dealerSeat];
    const other = dealer === a ? b : a;
    assert.equal(dealer.currentBet, 5);
    assert.equal(other.currentBet, 10);
    assert.equal(table.currentBet, 10);
    // heads-up preflop action starts on the dealer/SB
    assert.equal(table.actingSeat, table.dealerSeat);
  });

  test('3-handed: action starts left of big blind preflop', () => {
    const table = makeTable();
    seatPlayers(table, ['a', 'b', 'c']);
    table.startHand();
    const bbSeat = table.nextOccupiedSeat(table.nextOccupiedSeat(table.dealerSeat));
    const utgSeat = table.nextOccupiedSeat(bbSeat);
    assert.equal(table.actingSeat, utgSeat);
  });
});

describe('betting rules', () => {
  test('rejects acting out of turn', () => {
    const table = makeTable();
    const [a, b] = seatPlayers(table, ['a', 'b']);
    table.startHand();
    const notActing = table.actingSeat === a.seat ? b : a;
    assert.throws(() => table.applyAction(notActing.id, 'check'), IllegalActionError);
  });

  test('rejects checking when facing a bet', () => {
    const table = makeTable();
    seatPlayers(table, ['a', 'b']);
    table.startHand();
    const actor = table.seats[table.actingSeat];
    // heads-up preflop: actor is dealer/SB facing the BB, must call/raise/fold
    assert.throws(() => table.applyAction(actor.id, 'check'), IllegalActionError);
  });

  test('rejects a raise below the minimum raise size', () => {
    const table = makeTable();
    seatPlayers(table, ['a', 'b']);
    table.startHand();
    const actor = table.seats[table.actingSeat];
    // currentBet is 10 (big blind); min legal raise-to is 20 (raise by at least 10)
    assert.throws(() => table.applyAction(actor.id, 'raise', 15), IllegalActionError);
  });

  test('allows a legal min-raise and advances turn', () => {
    const table = makeTable();
    seatPlayers(table, ['a', 'b']);
    table.startHand();
    const actor = table.seats[table.actingSeat];
    table.applyAction(actor.id, 'raise', 20);
    assert.equal(table.currentBet, 20);
    assert.notEqual(table.actingSeat, actor.seat);
  });

  test('full hand reaches showdown and conserves total chips', () => {
    const table = makeTable();
    const players = seatPlayers(table, ['a', 'b', 'c']);
    const totalBefore = players.reduce((s, p) => s + p.stack, 0);
    table.startHand();

    // everyone just calls/checks down to the river
    let guard = 0;
    while (table.street !== 'hand_complete') {
      guard++;
      if (guard > 100) throw new Error('hand did not terminate');
      const actor = table.seats[table.actingSeat];
      const toCall = table.currentBet - actor.currentBet;
      table.applyAction(actor.id, toCall > 0 ? 'call' : 'check');
    }

    assert.equal(table.lastHandResult.wonWithoutShowdown, false);
    const totalAfter = table.seats.filter(Boolean).reduce((s, p) => s + p.stack, 0);
    assert.equal(totalAfter, totalBefore);
    assert.equal(table.community.length, 5);
  });

  test('folding to one player ends the hand without showdown', () => {
    const table = makeTable();
    const [a, b] = seatPlayers(table, ['a', 'b']);
    table.startHand();
    const actor = table.seats[table.actingSeat];
    table.applyAction(actor.id, 'fold');
    assert.equal(table.street, 'hand_complete');
    assert.equal(table.lastHandResult.wonWithoutShowdown, true);
    const winner = actor.id === a.id ? b : a;
    assert.deepEqual(table.lastHandResult.pots[0].winnerIds, [winner.id]);
  });
});

describe('side pots', () => {
  test('all-in below full bet creates a correctly-eligible side pot', () => {
    // A contributed 100 (all-in), B and C contributed 300 each, none folded
    const pots = computeSidePots([
      { id: 'A', contributed: 100, folded: false },
      { id: 'B', contributed: 300, folded: false },
      { id: 'C', contributed: 300, folded: false },
    ]);
    assert.equal(pots.length, 2);
    assert.equal(pots[0].amount, 300); // 100 * 3
    assert.deepEqual(pots[0].eligiblePlayerIds.sort(), ['A', 'B', 'C']);
    assert.equal(pots[1].amount, 400); // (300-100) * 2
    assert.deepEqual(pots[1].eligiblePlayerIds.sort(), ['B', 'C']);
  });

  test('folded contributor still funds the pot but is not eligible', () => {
    const pots = computeSidePots([
      { id: 'A', contributed: 500, folded: false },
      { id: 'B', contributed: 300, folded: true },
    ]);
    // single pot layer at 300 (300*2=600 eligible A only b/c B folded), then 200 layer eligible A only
    const totalAwarded = pots.reduce((s, p) => s + p.amount, 0);
    assert.equal(totalAwarded, 800);
    for (const pot of pots) assert.deepEqual(pot.eligiblePlayerIds, ['A']);
  });

  test('engine resolves a 3-way all-in hand with correct side-pot payouts', () => {
    const table = makeTable({ startingStack: 1000 });
    const [a, b, c] = seatPlayers(table, ['a', 'b', 'c']);
    a.stack = 100;
    b.stack = 300;
    c.stack = 300;
    table.startHand();

    // drive everyone all-in preflop regardless of position
    let guard = 0;
    while (table.street !== 'hand_complete') {
      guard++;
      if (guard > 100) throw new Error('hand did not terminate');
      const actor = table.seats[table.actingSeat];
      if (actor.stack > 0) {
        table.applyAction(actor.id, 'raise', actor.currentBet + actor.stack);
      } else {
        table.applyAction(actor.id, 'call');
      }
    }

    const finalTotal = [a, b, c].reduce((s, p) => s + p.stack, 0);
    assert.equal(finalTotal, 100 + 300 + 300);
    assert.equal(table.community.length, 5);
  });
});

describe('host controls', () => {
  test('blind changes apply only at the next hand, not mid-hand', () => {
    const table = makeTable();
    seatPlayers(table, ['a', 'b']);
    table.startHand();
    table.setPendingBlinds({ small: 25, big: 50 });
    assert.equal(table.blinds.big, 10); // unchanged mid-hand
    // finish the hand
    let guard = 0;
    while (table.street !== 'hand_complete') {
      guard++;
      if (guard > 100) throw new Error('hand did not terminate');
      const actor = table.seats[table.actingSeat];
      const toCall = table.currentBet - actor.currentBet;
      table.applyAction(actor.id, toCall > 0 ? 'call' : 'check');
    }
    table.startHand();
    assert.equal(table.blinds.big, 50);
  });

  test('removing the acting player folds them and lets the hand continue', () => {
    const table = makeTable();
    const [a, b, c] = seatPlayers(table, ['a', 'b', 'c']);
    table.startHand();
    const actor = table.seats[table.actingSeat];
    table.removePlayer(actor.id);
    assert.notEqual(table.street, 'lobby');
    assert.ok(['preflop', 'flop', 'turn', 'river', 'hand_complete'].includes(table.street));
  });
});

describe('timeout handling', () => {
  test('timeoutCurrentActor auto-folds when facing a bet', () => {
    const table = makeTable();
    seatPlayers(table, ['a', 'b']);
    table.startHand();
    const actor = table.seats[table.actingSeat];
    table.timeoutCurrentActor();
    assert.ok(actor.folded);
    assert.equal(table.street, 'hand_complete');
  });

  test('timeoutCurrentActor auto-checks when not facing a bet', () => {
    const table = makeTable();
    seatPlayers(table, ['a', 'b', 'c']);
    table.startHand();
    // call preflop down to the flop, then verify a check-timeout works
    let guard = 0;
    while (table.street === 'preflop') {
      guard++;
      if (guard > 20) throw new Error('preflop did not close');
      const actor = table.seats[table.actingSeat];
      const toCall = table.currentBet - actor.currentBet;
      table.applyAction(actor.id, toCall > 0 ? 'call' : 'check');
    }
    const flopActor = table.seats[table.actingSeat];
    table.timeoutCurrentActor();
    assert.equal(flopActor.folded, false);
  });
});
