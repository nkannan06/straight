import { bestHand, describeHand } from './handEvaluator.js';

const RANK_NAMES_PLURAL = {
  2: 'Twos', 3: 'Threes', 4: 'Fours', 5: 'Fives', 6: 'Sixes', 7: 'Sevens',
  8: 'Eights', 9: 'Nines', 10: 'Tens', 11: 'Jacks', 12: 'Queens', 13: 'Kings', 14: 'Aces',
};

// A friendly live label for the viewer's own hand: pocket-pair name preflop,
// or the best-hand description once there's a board to combine with.
export function describeMyHand(holeCards, community) {
  if (!holeCards || holeCards.some((c) => !c)) return null;
  if (community.length === 0) {
    if (holeCards[0].value === holeCards[1].value) return `Pocket ${RANK_NAMES_PLURAL[holeCards[0].value]}`;
    return 'Your Hand';
  }
  const { score } = bestHand([...holeCards, ...community]);
  return describeHand(score);
}
