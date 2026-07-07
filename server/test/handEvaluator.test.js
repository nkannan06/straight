import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, freshDeck, shuffle } from '../deck.js';
import { evaluate5, bestHand, compareScore, describeHand, CATEGORY } from '../handEvaluator.js';

function cards(spec) {
  // spec: "As Kd Qh Jc Ts" style shorthand -> rank+suit tokens separated by space
  return spec.split(' ').map((tok) => {
    const suit = tok.slice(-1);
    const rank = tok.slice(0, -1) === '10' ? 'T' : tok.slice(0, -1);
    return makeCard(rank, suit);
  });
}

describe('evaluate5 category detection', () => {
  test('royal flush', () => {
    const score = evaluate5(cards('As Ks Qs Js Ts'));
    assert.equal(score.category, CATEGORY.STRAIGHT_FLUSH);
    assert.equal(score.ranks[0], 14);
    assert.equal(describeHand(score), 'Royal Flush');
  });

  test('straight flush (not royal)', () => {
    const score = evaluate5(cards('9h 8h 7h 6h 5h'));
    assert.equal(score.category, CATEGORY.STRAIGHT_FLUSH);
    assert.equal(score.ranks[0], 9);
  });

  test('wheel straight flush (steel wheel)', () => {
    const score = evaluate5(cards('As 2s 3s 4s 5s'));
    assert.equal(score.category, CATEGORY.STRAIGHT_FLUSH);
    assert.equal(score.ranks[0], 5);
  });

  test('four of a kind', () => {
    const score = evaluate5(cards('Kd Kh Ks Kc 2c'));
    assert.equal(score.category, CATEGORY.QUADS);
    assert.deepEqual(score.ranks, [13, 2]);
  });

  test('full house', () => {
    const score = evaluate5(cards('Kd Kh Ks 2c 2d'));
    assert.equal(score.category, CATEGORY.FULL_HOUSE);
    assert.deepEqual(score.ranks, [13, 2]);
    assert.equal(describeHand(score), 'Full House, Kings full of Twos');
  });

  test('flush', () => {
    const score = evaluate5(cards('2h 5h 9h Jh Kh'));
    assert.equal(score.category, CATEGORY.FLUSH);
    assert.deepEqual(score.ranks, [13, 11, 9, 5, 2]);
  });

  test('straight', () => {
    const score = evaluate5(cards('9h 8c 7d 6s 5h'));
    assert.equal(score.category, CATEGORY.STRAIGHT);
    assert.equal(score.ranks[0], 9);
  });

  test('wheel straight (A-2-3-4-5 plays as 5-high)', () => {
    const score = evaluate5(cards('Ah 2c 3d 4s 5h'));
    assert.equal(score.category, CATEGORY.STRAIGHT);
    assert.equal(score.ranks[0], 5);
  });

  test('trips', () => {
    const score = evaluate5(cards('7h 7c 7d Kh 2s'));
    assert.equal(score.category, CATEGORY.TRIPS);
    assert.deepEqual(score.ranks, [7, 13, 2]);
  });

  test('two pair', () => {
    const score = evaluate5(cards('Kh Kc 7d 7h 2s'));
    assert.equal(score.category, CATEGORY.TWO_PAIR);
    assert.deepEqual(score.ranks, [13, 7, 2]);
  });

  test('one pair', () => {
    const score = evaluate5(cards('Kh Kc 9d 7h 2s'));
    assert.equal(score.category, CATEGORY.PAIR);
    assert.deepEqual(score.ranks, [13, 9, 7, 2]);
  });

  test('high card', () => {
    const score = evaluate5(cards('Kh 9c 7d 5h 2s'));
    assert.equal(score.category, CATEGORY.HIGH_CARD);
    assert.deepEqual(score.ranks, [13, 9, 7, 5, 2]);
  });
});

describe('category ordering (compareScore)', () => {
  test('quads beats full house', () => {
    const quads = evaluate5(cards('2d 2h 2s 2c 9h'));
    const fh = evaluate5(cards('Ad Ah As Kc Kh'));
    assert.ok(compareScore(quads, fh) > 0);
  });

  test('straight flush beats quads', () => {
    const sf = evaluate5(cards('5h 6h 7h 8h 9h'));
    const quads = evaluate5(cards('Ad Ah As Ac Kh'));
    assert.ok(compareScore(sf, quads) > 0);
  });

  test('flush beats straight', () => {
    const flush = evaluate5(cards('2h 5h 9h Jh Kh'));
    const straight = evaluate5(cards('9h 8c 7d 6s 5h'));
    assert.ok(compareScore(flush, straight) > 0);
  });

  test('full house beats flush', () => {
    const fh = evaluate5(cards('Kd Kh Ks 2c 2d'));
    const flush = evaluate5(cards('2h 5h 9h Jh Kh'));
    assert.ok(compareScore(fh, flush) > 0);
  });
});

describe('kicker tiebreaks', () => {
  test('pair of kings, ace kicker beats pair of kings, queen kicker', () => {
    const a = evaluate5(cards('Kh Kc Ad 7h 2s'));
    const b = evaluate5(cards('Kd Ks Qc 7d 2h'));
    assert.ok(compareScore(a, b) > 0);
  });

  test('two pair with better second pair wins', () => {
    const a = evaluate5(cards('Kh Kc 9d 9h 2s'));
    const b = evaluate5(cards('Kd Ks 7c 7h Ah'));
    assert.ok(compareScore(a, b) > 0);
  });

  test('identical two pair, kicker decides', () => {
    const a = evaluate5(cards('Kh Kc 9d 9h Ah'));
    const b = evaluate5(cards('Kd Ks 9c 9s 2h'));
    assert.ok(compareScore(a, b) > 0);
  });

  test('exact tie returns 0', () => {
    const a = evaluate5(cards('Kh 9d 7c 5h 2s'));
    const b = evaluate5(cards('Kd 9h 7s 5c 2h'));
    assert.equal(compareScore(a, b), 0);
  });
});

describe('bestHand over 7 cards', () => {
  test('picks best 5 of 7, ignoring weaker board pair', () => {
    // hole: A A, board: A K K 2 3 -> best is trip aces + kicker K, not two pair
    const hole = cards('Ah As');
    const board = cards('Ad Kh Kc 2s 3d');
    const result = bestHand([...hole, ...board]);
    assert.equal(result.score.category, CATEGORY.FULL_HOUSE);
    assert.deepEqual(result.score.ranks, [14, 13]);
  });

  test('uses board-only straight when hole cards do not improve it', () => {
    const hole = cards('2c 3c');
    const board = cards('9h 8d 7s 6h 5d');
    const result = bestHand([...hole, ...board]);
    assert.equal(result.score.category, CATEGORY.STRAIGHT);
    assert.equal(result.score.ranks[0], 9);
  });

  test('flush over straight when both available across 7 cards', () => {
    const hole = cards('Ah 2h');
    const board = cards('3h 4h 5s 6h 9h');
    const result = bestHand([...hole, ...board]);
    assert.equal(result.score.category, CATEGORY.FLUSH);
  });
});

describe('randomized comparisons (deck integrity + evaluator sanity)', () => {
  test('shuffled deck has 52 unique cards every time', () => {
    for (let i = 0; i < 20; i++) {
      const deck = shuffle(freshDeck());
      assert.equal(deck.length, 52);
      const unique = new Set(deck.map((c) => `${c.rank}${c.suit}`));
      assert.equal(unique.size, 52);
    }
  });

  test('bestHand is transitive/consistent across many random 7-card hands', () => {
    for (let trial = 0; trial < 200; trial++) {
      const deck = shuffle(freshDeck());
      const sevenA = deck.slice(0, 7);
      const sevenB = deck.slice(7, 14);
      const a = bestHand(sevenA);
      const b = bestHand(sevenB);
      const cmp = compareScore(a.score, b.score);
      const reverseCmp = compareScore(b.score, a.score);
      // self-comparison must always be 0
      assert.equal(compareScore(a.score, a.score), 0);
      assert.equal(compareScore(b.score, b.score), 0);
      // antisymmetry (normalize -0 to 0 so exact ties don't trip Object.is-based assert.equal)
      assert.equal(Math.sign(cmp) || 0, -(Math.sign(reverseCmp) || 0) || 0);
    }
  });

  test('adding a better card to the board never decreases best score', () => {
    for (let trial = 0; trial < 50; trial++) {
      const deck = shuffle(freshDeck());
      const hole = deck.slice(0, 2);
      const board5 = deck.slice(2, 7);
      const before = bestHand([...hole, ...board5.slice(0, 4)]);
      const after = bestHand([...hole, ...board5]);
      assert.ok(compareScore(after.score, before.score) >= 0);
    }
  });
});
