const STREET_LABEL = { preflop: 'preflop', flop: 'on the flop', turn: 'on the turn', river: 'on the river' };

// Heuristic, plain-language explanation of the human player's last real
// decision in a hand — deliberately not fabricating false precision beyond
// "roughly N% equity" and a pot-odds-based verdict.
export function generateFeedback(decisionLog, { handDescription, won } = {}) {
  if (!decisionLog.length) return null;
  const last = decisionLog[decisionLog.length - 1];
  const equityPct = Math.round(last.equityBefore * 100);
  const streetLabel = STREET_LABEL[last.street] || last.street;
  const handPhrase = handDescription ? handDescription : last.street === 'preflop' ? 'Your hand' : 'Your hand';

  let verdict;
  if (last.action === 'fold') {
    verdict = last.equityBefore < 0.35
      ? `folding to the raise ${streetLabel} was the disciplined play`
      : `you may have had enough equity to stick around ${streetLabel} — this fold was on the cautious side`;
  } else if (last.action === 'call') {
    const potOdds = last.toCallBefore / (last.potSizeBefore + last.toCallBefore);
    verdict = last.equityBefore >= potOdds
      ? `calling ${streetLabel} was a reasonable, price-justified decision`
      : `calling ${streetLabel} was a bit loose given the price you were laying`;
  } else {
    verdict = last.equityBefore > 0.6
      ? `raising for value ${streetLabel} made sense with a hand this strong`
      : `that raise ${streetLabel} was more of a bluff or semi-bluff — bold, but higher variance`;
  }

  const outcome = won === true ? ' You took down the pot.' : won === false ? ' The pot went the other way this time.' : '';
  return `${handPhrase} (${equityPct}% equity) — ${verdict}.${outcome}`;
}
