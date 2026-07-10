import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft, IconMinus, IconPlus, IconShare, IconCopy } from '../components/icons.jsx';
import { useToast } from '../components/Toast.jsx';
import { useProfile } from '../hooks/useProfile.js';
import { createRoom } from '../lib/api.js';
import { parseDollarsToCents, formatMoney } from '../lib/money.js';
import { BLIND_PRESETS } from '../lib/blindPresets.js';
import { copyToClipboard } from '../lib/clipboard.js';

const TABLE_SIZES = [2, 4, 6, 8];

export function CreateGameScreen() {
  const navigate = useNavigate();
  const showToast = useToast();
  const profile = useProfile();
  const [blindsIdx, setBlindsIdx] = useState(1); // -1 means custom
  const [customSmall, setCustomSmall] = useState('1');
  const [customBig, setCustomBig] = useState('2');
  const [stackCents, setStackCents] = useState(100_000); // $1,000
  const [tableSize, setTableSize] = useState(6);
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState(null);

  const isCustomBlinds = blindsIdx === -1;
  const customSmallCents = parseDollarsToCents(customSmall);
  const customBigCents = parseDollarsToCents(customBig);
  const customBlindsValid = Number.isFinite(customSmallCents) && Number.isFinite(customBigCents) &&
    customSmallCents > 0 && customBigCents > customSmallCents;
  const blinds = isCustomBlinds ? { small: customSmallCents, big: customBigCents } : BLIND_PRESETS[blindsIdx];
  const bigBlindCount = blinds.big > 0 ? Math.round(stackCents / blinds.big) : 0;
  const canCreate = !isCustomBlinds || customBlindsValid;

  // Step by 1 big blind at a time so the stepper scales naturally whether
  // you're buying in for $20 at 10c/20c or $2,000 at $5/$10.
  const stackStep = Math.max(blinds.big > 0 ? blinds.big : 100, 1);
  const stackMin = Math.max(stackStep * 10, 100);
  const stackMax = Math.max(stackStep * 1000, 1_000_000);

  // Once the host actually changes blinds (not on first render), snap the
  // stack to a sensible 100-big-blind default — otherwise switching from
  // $5/$10 to $0.10/$0.20 would leave a $1,000 (5,000bb!) stack that the
  // +/- stepper could take thousands of clicks to fix.
  const stackAutoScaled = useRef(false);
  useEffect(() => {
    if (!stackAutoScaled.current) {
      stackAutoScaled.current = true;
      return;
    }
    if (Number.isFinite(blinds.big) && blinds.big > 0) setStackCents(blinds.big * 100);
  }, [blinds.big]);

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    try {
      const { code } = await createRoom({ maxSeats: tableSize, blinds: { small: blinds.small, big: blinds.big }, startingStack: stackCents });
      setCreatedCode(code);
      localStorage.setItem('straight.lastRoom', JSON.stringify({ code, name: `${profile.name}'s Game` }));
    } catch {
      showToast('Could not reach the server. Is it running?');
    } finally {
      setCreating(false);
    }
  }

  // No deep-link URL here on purpose — window.location.origin resolves to
  // capacitor://localhost inside the native app (meaningless outside it),
  // and there's no hosted web build for a /join route to land on even from
  // a browser. Sharing the plain room code plays to what already works:
  // typing it into "Join with Code".
  async function handleShare() {
    if (!createdCode) return;
    const text = `Join my Straight table — open the app and enter code: ${createdCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join my Straight table', text });
        return;
      } catch {
        return; // user cancelled share sheet — no-op
      }
    }
    showToast((await copyToClipboard(createdCode)) ? 'Code copied' : `Share this code: ${createdCode}`);
  }

  async function handleCopy() {
    if (!createdCode) return;
    showToast((await copyToClipboard(createdCode)) ? 'Code copied' : `Share this code: ${createdCode}`);
  }

  return (
    <div className="flex h-full flex-col px-5 safe-top">
      <div className="mb-2 flex items-center">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-text-primary">
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-center font-display text-title text-text-primary">New Game</h1>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <section className="mt-4">
          <h2 className="mb-2 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Blinds</h2>
          <div className="grid grid-cols-3 gap-2">
            {BLIND_PRESETS.map((b, i) => (
              <button
                key={b.label}
                type="button"
                disabled={!!createdCode}
                onClick={() => setBlindsIdx(i)}
                className={
                  'rounded-btn border py-3 font-sans text-subheadline font-medium ' +
                  (i === blindsIdx ? 'border-accent-gold text-accent-gold' : 'border-white/15 text-text-secondary')
                }
              >
                {b.label}
              </button>
            ))}
            <button
              type="button"
              disabled={!!createdCode}
              onClick={() => setBlindsIdx(-1)}
              className={
                'rounded-btn border py-3 font-sans text-subheadline font-medium ' +
                (isCustomBlinds ? 'border-accent-gold text-accent-gold' : 'border-white/15 text-text-secondary')
              }
            >
              Custom
            </button>
          </div>

          {isCustomBlinds && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <label className="mb-1 block font-sans text-[11px] text-text-tertiary">Small blind ($)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step={0.01}
                  disabled={!!createdCode}
                  value={customSmall}
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
                  disabled={!!createdCode}
                  value={customBig}
                  onChange={(e) => setCustomBig(e.target.value)}
                  className="tabular-money w-full rounded-btn border border-white/15 bg-bg-elevated-2 px-3 py-2.5 font-sans text-body text-text-primary outline-none focus:border-accent-gold"
                />
              </div>
            </div>
          )}
          {isCustomBlinds && !customBlindsValid && (
            <p className="mt-2 font-sans text-[12px] text-fold">Big blind must be greater than small blind, both above zero.</p>
          )}
        </section>

        <section className="mt-6">
          <h2 className="mb-2 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Starting Stack</h2>
          <div className="flex items-center justify-between rounded-card border border-white/10 bg-bg-elevated px-3 py-4">
            <button
              type="button"
              disabled={!!createdCode}
              onClick={() => setStackCents((s) => Math.max(stackMin, s - stackStep))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-elevated-2 text-text-primary"
            >
              <IconMinus className="h-4 w-4" />
            </button>
            <div className="text-center">
              <div className="tabular-money font-display text-title text-accent-gold">{formatMoney(stackCents)}</div>
              <div className="font-sans text-subheadline text-text-secondary">{bigBlindCount} big blinds</div>
            </div>
            <button
              type="button"
              disabled={!!createdCode}
              onClick={() => setStackCents((s) => Math.min(stackMax, s + stackStep))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-elevated-2 text-text-primary"
            >
              <IconPlus className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Table Size</h2>
          <div className="grid grid-cols-4 gap-2">
            {TABLE_SIZES.map((n) => (
              <button
                key={n}
                type="button"
                disabled={!!createdCode}
                onClick={() => setTableSize(n)}
                className={
                  'rounded-btn border py-3 font-sans text-subheadline font-medium ' +
                  (n === tableSize ? 'border-accent-gold text-accent-gold' : 'border-white/15 text-text-secondary')
                }
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {createdCode && (
          <section className="mt-6">
            <h2 className="mb-2 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Invite Code</h2>
            <div className="flex items-center justify-between rounded-card border border-dashed border-accent-gold/50 px-4 py-4">
              <span className="tabular-money font-display text-headline tracking-[0.15em] text-text-primary">
                {createdCode.slice(0, 3)}·{createdCode.slice(3)}
              </span>
              <div className="flex gap-3">
                <button type="button" onClick={handleCopy} aria-label="Copy invite link" className="text-accent-gold">
                  <IconCopy className="h-5 w-5" />
                </button>
                <button type="button" onClick={handleShare} aria-label="Share invite link" className="text-accent-gold">
                  <IconShare className="h-5 w-5" />
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="safe-bottom pb-6 pt-2">
        {createdCode ? (
          <button
            type="button"
            onClick={() => navigate(`/lobby/${createdCode}`)}
            className="w-full rounded-btn bg-accent-gold py-4 text-center font-sans font-semibold text-text-on-ivory shadow-glow-gold active:scale-[0.99]"
          >
            Go to Lobby
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !canCreate}
            className="w-full rounded-btn bg-accent-gold py-4 text-center font-sans font-semibold text-text-on-ivory shadow-glow-gold active:scale-[0.99] disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create & Share'}
          </button>
        )}
      </div>
    </div>
  );
}
