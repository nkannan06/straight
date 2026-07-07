import { useState, useEffect } from 'react';
import { Sheet } from './Sheet.jsx';
import { formatMoney, parseDollarsToCents, centsToDollarInputString } from '../lib/money.js';

// Raise-to sheet: slider + quick presets (½ pot, pot, all-in) + type-in amount + confirm.
export function RaiseSlider({ open, onClose, currentBet, minRaise, myCurrentBet, myStack, potSize, onConfirm }) {
  const minRaiseTo = currentBet + minRaise;
  const allInTotal = myCurrentBet + myStack;
  const maxRaiseTo = Math.max(minRaiseTo, allInTotal);
  const [raiseTo, setRaiseTo] = useState(minRaiseTo);
  const [typedAmount, setTypedAmount] = useState('');

  useEffect(() => {
    if (open) {
      const initial = Math.min(minRaiseTo, maxRaiseTo);
      setRaiseTo(initial);
      setTypedAmount(centsToDollarInputString(initial));
    }
  }, [open, minRaiseTo, maxRaiseTo]);

  const setAmount = (cents) => {
    const clamped = Math.min(Math.max(cents, minRaiseTo), maxRaiseTo);
    setRaiseTo(clamped);
    setTypedAmount(centsToDollarInputString(clamped));
  };

  const handleTypedChange = (value) => {
    setTypedAmount(value);
    const cents = parseDollarsToCents(value);
    if (Number.isFinite(cents)) setRaiseTo(Math.min(Math.max(cents, minRaiseTo), maxRaiseTo));
  };

  const handleTypedBlur = () => {
    setTypedAmount(centsToDollarInputString(raiseTo));
  };

  const presets = [
    { label: '½ Pot', value: Math.min(maxRaiseTo, Math.max(minRaiseTo, currentBet + Math.round(potSize * 0.5))) },
    { label: 'Pot', value: Math.min(maxRaiseTo, Math.max(minRaiseTo, currentBet + potSize)) },
    { label: 'All-in', value: allInTotal },
  ];

  return (
    <Sheet open={open} onClose={onClose} title="Raise to">
      <div className="mb-3 flex items-center justify-center gap-1.5">
        <span className="font-display text-title text-accent-gold">$</span>
        <input
          type="number"
          inputMode="decimal"
          value={typedAmount}
          onChange={(e) => handleTypedChange(e.target.value)}
          onBlur={handleTypedBlur}
          className="tabular-money w-40 border-b border-white/20 bg-transparent text-center font-display text-large-title text-accent-gold outline-none focus:border-accent-gold"
        />
      </div>
      <input
        type="range"
        min={minRaiseTo}
        max={maxRaiseTo}
        step={Math.max(1, minRaise)}
        value={Math.min(Math.max(raiseTo, minRaiseTo), maxRaiseTo)}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="mb-4 w-full accent-accent-olive"
      />
      <div className="mb-4 grid grid-cols-3 gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setAmount(p.value)}
            className={
              'rounded-btn border py-2.5 font-sans text-subheadline font-medium ' +
              (raiseTo === p.value ? 'border-accent-gold text-accent-gold' : 'border-white/15 text-text-secondary')
            }
          >
            {p.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onConfirm(raiseTo)}
        className="w-full rounded-btn bg-accent-olive py-4 font-sans font-semibold text-text-on-ivory active:scale-[0.99]"
      >
        Confirm Raise · {formatMoney(raiseTo)}
      </button>
    </Sheet>
  );
}
