// Amounts are integer cents (see money.js). Spans real micro-stakes home
// games ($0.10/$0.20) up to $5/$10.
export const BLIND_PRESETS = [
  { label: '$0.10/$0.20', small: 10, big: 20 },
  { label: '$1/$2', small: 100, big: 200 },
  { label: '$2/$5', small: 200, big: 500 },
  { label: '$5/$10', small: 500, big: 1000 },
];
