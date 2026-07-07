import { RANKS, SUITS, makeCard } from './deck.js';
import { bestHand, compareScore } from './handEvaluator.js';

function fullDeck() {
  const cards = [];
  for (const suit of SUITS) for (const rank of RANKS) cards.push(makeCard(rank, suit));
  return cards;
}

function cardKey(c) {
  return `${c.rank}${c.suit}`;
}

// Fast (non-cryptographic) shuffle — equity estimation is a statistical
// approximation, not a fairness-critical deal, so Math.random is fine here
// and much cheaper than the crypto shuffle used for real dealing.
function fastShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Monte Carlo equity: given the hero's hole cards, the known board, and a
// number of opponents, sample random completions of the deck and report the
// hero's win/tie rate. Powers both the practice-mode hint meter and the AI's
// decision-making.
export function estimateEquity({ holeCards, board = [], numOpponents = 1, iterations = 300 }) {
  const known = new Set([...holeCards, ...board].map(cardKey));
  const remaining = fullDeck().filter((c) => !known.has(cardKey(c)));
  const boardNeeded = 5 - board.length;

  let wins = 0;
  let ties = 0;

  for (let i = 0; i < iterations; i++) {
    const pool = fastShuffle(remaining);
    let cursor = 0;
    const opponents = [];
    for (let o = 0; o < numOpponents; o++) {
      opponents.push([pool[cursor++], pool[cursor++]]);
    }
    const fullBoard = [...board, ...pool.slice(cursor, cursor + boardNeeded)];

    const heroScore = bestHand([...holeCards, ...fullBoard]).score;
    let heroBeatsAll = true;
    let tiesBest = false;
    for (const oppHole of opponents) {
      const oppScore = bestHand([...oppHole, ...fullBoard]).score;
      const cmp = compareScore(heroScore, oppScore);
      if (cmp < 0) {
        heroBeatsAll = false;
        break;
      }
      if (cmp === 0) tiesBest = true;
    }
    if (heroBeatsAll) {
      if (tiesBest) ties++;
      else wins++;
    }
  }

  return {
    win: wins / iterations,
    tie: ties / iterations,
    iterations,
  };
}
