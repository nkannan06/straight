// Money is stored everywhere in this app — client state, WS messages, the
// server's Table — as integer cents. That's what lets $0.10/$0.20 micro
// stakes and $5/$10 blinds share the same engine math without floating-point
// drift (0.1 + 0.2 !== 0.3 in JS, but 10 + 20 === 30 always). Only these
// helpers, at the UI's edges, ever talk in decimal dollars.

// "12.50", "0.1", 5 -> 1250, 10, 500. NaN for empty/invalid/negative input.
export function parseDollarsToCents(input) {
  if (input === '' || input === null || input === undefined) return NaN;
  const num = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(num) || num < 0) return NaN;
  return Math.round(num * 100);
}

// Cents -> a plain decimal string suitable for pre-filling a text input, e.g.
// 1250 -> "12.5", 10 -> "0.1", 500 -> "5".
export function centsToDollarInputString(cents) {
  if (!Number.isFinite(cents)) return '';
  return String(cents / 100);
}

// Cents -> a display string, e.g. 1250 -> "$12.50", 500 -> "$5", 10 -> "$0.10".
// Pass { symbol: false } for the bare-number style used in seat stack labels.
export function formatMoney(cents, { symbol = true } = {}) {
  if (!Number.isFinite(cents)) return symbol ? '$0' : '0';
  const dollars = cents / 100;
  const hasFractionalCents = Math.round(cents) % 100 !== 0;
  const formatted = hasFractionalCents
    ? dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : dollars.toLocaleString();
  return symbol ? `$${formatted}` : formatted;
}
