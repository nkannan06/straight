import { useEffect, useState } from 'react';
import { Sheet } from './Sheet.jsx';
import { parseDollarsToCents, centsToDollarInputString } from '../lib/money.js';
import { BLIND_PRESETS } from '../lib/blindPresets.js';

export function HostControlsSheet({ open, onClose, table, myPlayerId, onSetBlinds, onResetGame, onKickPlayer }) {
  const [confirmingKickId, setConfirmingKickId] = useState(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customSmall, setCustomSmall] = useState('');
  const [customBig, setCustomBig] = useState('');

  // This component itself never unmounts (the parent screen always renders
  // it; only Sheet's visual content is conditional), so reset local editing
  // state each time it's opened — otherwise stale typed values (or a stale
  // customMode) could linger from a previous open/close cycle.
  useEffect(() => {
    if (open) {
      setCustomMode(false);
      setCustomSmall('');
      setCustomBig('');
      setConfirmingKickId(null);
      setConfirmingReset(false);
    }
  }, [open]);

  if (!table) return null;
  const players = table.seats.filter(Boolean);

  const effectiveBlinds = table.pendingBlinds || table.blinds;
  const matchesPreset = BLIND_PRESETS.some((b) => b.small === effectiveBlinds.small && b.big === effectiveBlinds.big);
  const showCustomInputs = customMode || !matchesPreset;
  const customSmallCents = customSmall !== '' ? parseDollarsToCents(customSmall) : effectiveBlinds.small;
  const customBigCents = customBig !== '' ? parseDollarsToCents(customBig) : effectiveBlinds.big;
  const customValid = Number.isFinite(customSmallCents) && Number.isFinite(customBigCents) &&
    customSmallCents > 0 && customBigCents > customSmallCents;

  return (
    <Sheet open={open} onClose={onClose} title="Host Controls">
      <section className="mb-5">
        <h3 className="mb-2 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">
          Blinds {table.pendingBlinds ? '(changes next hand)' : ''}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {BLIND_PRESETS.map((b) => {
            const active = table.blinds.small === b.small && table.blinds.big === b.big && !table.pendingBlinds;
            const pending = table.pendingBlinds && table.pendingBlinds.small === b.small && table.pendingBlinds.big === b.big;
            return (
              <button
                key={b.label}
                type="button"
                onClick={() => {
                  setCustomMode(false);
                  onSetBlinds({ small: b.small, big: b.big });
                }}
                className={
                  'rounded-btn border py-2.5 font-sans text-subheadline font-medium ' +
                  (active || pending ? 'border-accent-gold text-accent-gold' : 'border-white/15 text-text-secondary')
                }
              >
                {b.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setCustomMode(true);
              setCustomSmall(centsToDollarInputString(effectiveBlinds.small));
              setCustomBig(centsToDollarInputString(effectiveBlinds.big));
            }}
            className={
              'rounded-btn border py-2.5 font-sans text-subheadline font-medium ' +
              (showCustomInputs ? 'border-accent-gold text-accent-gold' : 'border-white/15 text-text-secondary')
            }
          >
            Custom
          </button>
        </div>

        {showCustomInputs && (
          <div className="mt-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="mb-1 block font-sans text-[11px] text-text-tertiary">Small blind ($)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step={0.01}
                  value={customSmall !== '' ? customSmall : centsToDollarInputString(effectiveBlinds.small)}
                  onChange={(e) => setCustomSmall(e.target.value)}
                  className="tabular-money w-full rounded-btn border border-white/15 bg-bg-elevated-2 px-3 py-2.5 font-sans text-body text-text-primary outline-none focus:border-accent-gold"
                />
              </div>
              <span className="mt-4 font-sans text-text-tertiary">/</span>
              <div className="flex-1">
                <label className="mb-1 block font-sans text-[11px] text-text-tertiary">Big blind ($)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step={0.01}
                  value={customBig !== '' ? customBig : centsToDollarInputString(effectiveBlinds.big)}
                  onChange={(e) => setCustomBig(e.target.value)}
                  className="tabular-money w-full rounded-btn border border-white/15 bg-bg-elevated-2 px-3 py-2.5 font-sans text-body text-text-primary outline-none focus:border-accent-gold"
                />
              </div>
            </div>
            {!customValid && (
              <p className="mt-2 font-sans text-[12px] text-fold">Big blind must be greater than small blind, both above zero.</p>
            )}
            <button
              type="button"
              disabled={!customValid}
              onClick={() => onSetBlinds({ small: customSmallCents, big: customBigCents })}
              className="mt-3 w-full rounded-btn bg-accent-olive py-2.5 font-sans font-semibold text-text-on-ivory disabled:opacity-40"
            >
              Apply Custom Blinds
            </button>
          </div>
        )}
      </section>

      <section className="mb-5">
        <h3 className="mb-2 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Players</h3>
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-btn border border-white/10 px-3 py-2.5">
              <span className="font-sans text-body text-text-primary">{p.name}</span>
              {p.id !== myPlayerId && (
                confirmingKickId === p.id ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onKickPlayer(p.id);
                        setConfirmingKickId(null);
                      }}
                      className="rounded-chip bg-fold px-3 py-1 font-sans text-[13px] font-medium text-ivory"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingKickId(null)}
                      className="rounded-chip border border-white/15 px-3 py-1 font-sans text-[13px] text-text-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingKickId(p.id)}
                    className="font-sans text-[13px] text-fold"
                  >
                    Remove
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        {confirmingReset ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onResetGame();
                setConfirmingReset(false);
              }}
              className="flex-1 rounded-btn bg-fold py-3 font-sans font-semibold text-ivory"
            >
              Confirm reset
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="flex-1 rounded-btn border border-white/15 py-3 font-sans text-text-secondary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="w-full rounded-btn border border-fold/50 py-3 font-sans font-semibold text-fold"
          >
            Reset Game
          </button>
        )}
      </section>
    </Sheet>
  );
}
