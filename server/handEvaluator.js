// Best-5-of-N Texas Hold'em hand evaluator. Framework-agnostic, no imports —
// safe to copy verbatim between /server and /client/src/lib.

export const CATEGORY = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  TRIPS: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  QUADS: 7,
  STRAIGHT_FLUSH: 8,
};

const CATEGORY_NAMES = {
  0: 'High Card',
  1: 'Pair',
  2: 'Two Pair',
  3: 'Three of a Kind',
  4: 'Straight',
  5: 'Flush',
  6: 'Full House',
  7: 'Four of a Kind',
  8: 'Straight Flush',
};

const RANK_NAMES = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
  8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace',
};
const RANK_NAMES_PLURAL = {
  2: 'Twos', 3: 'Threes', 4: 'Fours', 5: 'Fives', 6: 'Sixes', 7: 'Sevens',
  8: 'Eights', 9: 'Nines', 10: 'Tens', 11: 'Jacks', 12: 'Queens', 13: 'Kings', 14: 'Aces',
};

function combinations(arr, k) {
  const results = [];
  const combo = [];
  function recurse(start) {
    if (combo.length === k) {
      results.push(combo.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      recurse(i + 1);
      combo.pop();
    }
  }
  recurse(0);
  return results;
}

// Evaluates exactly 5 cards. Returns { category, ranks } where `ranks` is a
// descending tiebreak array — compare lexicographically after category.
export function evaluate5(cards) {
  if (cards.length !== 5) throw new Error('evaluate5 requires exactly 5 cards');
  const values = cards.map((c) => c.value).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  const uniqueDesc = [...new Set(values)].sort((a, b) => b - a);
  let straightHigh = null;
  if (uniqueDesc.length === 5) {
    if (uniqueDesc[0] - uniqueDesc[4] === 4) {
      straightHigh = uniqueDesc[0];
    } else if (
      uniqueDesc[0] === 14 && uniqueDesc[1] === 5 && uniqueDesc[2] === 4 &&
      uniqueDesc[3] === 3 && uniqueDesc[4] === 2
    ) {
      straightHigh = 5; // wheel: A-2-3-4-5, plays as a 5-high straight
    }
  }

  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  const groups = [...counts.entries()]
    .map(([v, c]) => [v, c])
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  if (straightHigh && isFlush) return { category: CATEGORY.STRAIGHT_FLUSH, ranks: [straightHigh] };

  if (groups[0][1] === 4) {
    const kicker = groups.find((g) => g[1] === 1)[0];
    return { category: CATEGORY.QUADS, ranks: [groups[0][0], kicker] };
  }

  if (groups[0][1] === 3 && groups[1] && groups[1][1] >= 2) {
    return { category: CATEGORY.FULL_HOUSE, ranks: [groups[0][0], groups[1][0]] };
  }

  if (isFlush) return { category: CATEGORY.FLUSH, ranks: values };

  if (straightHigh) return { category: CATEGORY.STRAIGHT, ranks: [straightHigh] };

  if (groups[0][1] === 3) {
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]).sort((a, b) => b - a);
    return { category: CATEGORY.TRIPS, ranks: [groups[0][0], ...kickers] };
  }

  if (groups[0][1] === 2 && groups[1] && groups[1][1] === 2) {
    const pairs = [groups[0][0], groups[1][0]].sort((a, b) => b - a);
    const kicker = groups.find((g) => g[1] === 1)[0];
    return { category: CATEGORY.TWO_PAIR, ranks: [...pairs, kicker] };
  }

  if (groups[0][1] === 2) {
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]).sort((a, b) => b - a);
    return { category: CATEGORY.PAIR, ranks: [groups[0][0], ...kickers] };
  }

  return { category: CATEGORY.HIGH_CARD, ranks: values };
}

export function compareScore(a, b) {
  if (a.category !== b.category) return a.category - b.category;
  const len = Math.max(a.ranks.length, b.ranks.length);
  for (let i = 0; i < len; i++) {
    const av = a.ranks[i] ?? -1;
    const bv = b.ranks[i] ?? -1;
    if (av !== bv) return av - bv;
  }
  return 0;
}

// Best 5-card hand out of 5, 6, or 7 cards (2 hole + up to 5 board).
export function bestHand(cards) {
  if (cards.length < 5) throw new Error('bestHand requires at least 5 cards');
  let best = null;
  for (const combo of combinations(cards, 5)) {
    const score = evaluate5(combo);
    if (!best || compareScore(score, best.score) > 0) {
      best = { score, cards: combo };
    }
  }
  return best;
}

// Human-readable description, e.g. "Two Pair, Kings & Aces" or "Full House, Kings full of Twos".
export function describeHand(score) {
  const { category, ranks } = score;
  switch (category) {
    case CATEGORY.STRAIGHT_FLUSH:
      return ranks[0] === 14 ? 'Royal Flush' : `Straight Flush, ${RANK_NAMES[ranks[0]]} High`;
    case CATEGORY.QUADS:
      return `Four of a Kind, ${RANK_NAMES_PLURAL[ranks[0]]}`;
    case CATEGORY.FULL_HOUSE:
      return `Full House, ${RANK_NAMES_PLURAL[ranks[0]]} full of ${RANK_NAMES_PLURAL[ranks[1]]}`;
    case CATEGORY.FLUSH:
      return `Flush, ${RANK_NAMES[ranks[0]]} High`;
    case CATEGORY.STRAIGHT:
      return `Straight, ${RANK_NAMES[ranks[0]]} High`;
    case CATEGORY.TRIPS:
      return `Three of a Kind, ${RANK_NAMES_PLURAL[ranks[0]]}`;
    case CATEGORY.TWO_PAIR:
      return `Two Pair, ${RANK_NAMES_PLURAL[ranks[0]]} & ${RANK_NAMES_PLURAL[ranks[1]]}`;
    case CATEGORY.PAIR:
      return `Pair of ${RANK_NAMES_PLURAL[ranks[0]]}`;
    default:
      return `High Card, ${RANK_NAMES[ranks[0]]}`;
  }
}

export function categoryName(category) {
  return CATEGORY_NAMES[category];
}
