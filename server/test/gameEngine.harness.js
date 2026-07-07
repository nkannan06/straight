// Small CLI harness for manually eyeballing engine behavior before wiring
// WebSockets. Run with: node test/gameEngine.harness.js
import { Table } from '../gameEngine.js';

const table = new Table({ code: 'HARNESS', maxSeats: 6, blinds: { small: 5, big: 10 }, startingStack: 500 });
const names = ['Mika', 'Maria', 'Devon', 'Alex', 'Sena'];
for (const name of names) table.addPlayer(name, name);

function randomAction(table) {
  const actor = table.seats[table.actingSeat];
  const toCall = table.currentBet - actor.currentBet;
  const allInTotal = actor.currentBet + actor.stack;
  const canRaise = allInTotal > table.currentBet;
  const roll = Math.random();
  if (toCall > 0 && roll < 0.15) return ['fold'];
  if (!canRaise || roll < 0.75) return [toCall > 0 ? 'call' : 'check'];
  const raiseTo = Math.min(allInTotal, table.currentBet + table.minRaise * (1 + Math.floor(Math.random() * 3)));
  return ['raise', raiseTo];
}

for (let hand = 1; hand <= 5; hand++) {
  const before = table.seats.filter(Boolean).reduce((s, p) => s + p.stack, 0);
  console.log(`\n=== Hand ${hand} (total chips in play: ${before}) ===`);
  table.startHand();
  let guard = 0;
  while (table.street !== 'hand_complete') {
    if (guard++ > 200) throw new Error('hand stuck');
    const actor = table.seats[table.actingSeat];
    const [action, amount] = randomAction(table);
    table.applyAction(actor.id, action, amount);
  }
  const result = table.lastHandResult;
  console.log('Board:', result.community.map((c) => `${c.rank}${c.suit}`).join(' '));
  console.log('Won without showdown:', result.wonWithoutShowdown);
  for (const pot of result.pots) console.log(`  Pot ${pot.amount} -> ${pot.winnerIds.join(', ')}`);
  for (const p of table.seats.filter(Boolean)) console.log(`  ${p.name}: ${p.stack} chips`);
  const after = table.seats.filter(Boolean).reduce((s, p) => s + p.stack, 0);
  if (after !== before) throw new Error(`Chip conservation violated: ${before} -> ${after}`);
}
console.log('\nHarness completed: chips conserved across all hands.');
