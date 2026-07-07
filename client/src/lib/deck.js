// Uses the standard Web Crypto API (globalThis.crypto), available natively in
// both Node 19+ and all browsers — no imports, so this file is safe to copy
// unmodified between /server and /client/src/lib.

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const SUITS = ['s', 'h', 'd', 'c'];

// rank value: 2=2 ... A=14
export function rankValue(rank) {
  return RANKS.indexOf(rank) + 2;
}

export function makeCard(rank, suit) {
  return { rank, suit, value: rankValue(rank) };
}

export function freshDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push(makeCard(rank, suit));
    }
  }
  return cards;
}

// Cryptographically-random integer in [0, max), rejection-sampled to avoid modulo bias.
function randomInt(max) {
  if (max <= 0) return 0;
  const bytesNeeded = Math.ceil(Math.log2(max) / 8) || 1;
  const maxUnbiased = Math.floor(256 ** bytesNeeded / max) * max;
  const buf = new Uint8Array(bytesNeeded);
  let value;
  do {
    globalThis.crypto.getRandomValues(buf);
    value = 0;
    for (let i = 0; i < bytesNeeded; i++) value = value * 256 + buf[i];
  } while (value >= maxUnbiased);
  return value % max;
}

// Fisher-Yates shuffle using crypto randomness
export function shuffle(deck) {
  const cards = deck.slice();
  for (let i = cards.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function shuffledDeck() {
  return shuffle(freshDeck());
}

export function cardToString(card) {
  return `${card.rank}${card.suit}`;
}
