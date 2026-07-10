import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconChevronLeft } from '../components/icons.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { initialsForName, colorForName } from '../hooks/useProfile.js';
import { fetchRoomPreview } from '../lib/api.js';
import { formatMoney } from '../lib/money.js';

const CODE_LENGTH = 6;

export function JoinGameScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deepLinkCode = (searchParams.get('code') || '').toUpperCase().slice(0, CODE_LENGTH);
  const fromDeepLink = deepLinkCode.length === CODE_LENGTH;

  const [digits, setDigits] = useState(() => {
    const arr = new Array(CODE_LENGTH).fill('');
    for (let i = 0; i < deepLinkCode.length; i++) arr[i] = deepLinkCode[i];
    return arr;
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(fromDeepLink);
  const [notFound, setNotFound] = useState(false);
  const inputsRef = useRef([]);

  const code = digits.join('');

  useEffect(() => {
    if (code.length !== CODE_LENGTH) {
      setPreview(null);
      setNotFound(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    fetchRoomPreview(code)
      .then((data) => {
        if (cancelled) return;
        if (data.exists) setPreview(data);
        else {
          setPreview(null);
          setNotFound(true);
        }
      })
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [code]);

  function updateDigit(index, value) {
    const char = value.slice(-1).toUpperCase();
    setDigits((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
    if (char && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  return (
    <div className="flex h-full flex-col px-5 safe-top">
      <div className="mb-2 flex items-center">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-text-primary">
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-center font-display text-title text-text-primary">Join Game</h1>
        <div className="w-8" />
      </div>

      {!fromDeepLink && (
        <>
          <p className="mt-6 text-center font-sans text-body text-text-secondary">
            Enter the 6-character code
            <br />
            your host shared with you.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                value={d}
                onChange={(e) => updateDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                maxLength={1}
                inputMode="text"
                autoCapitalize="characters"
                className={
                  'h-14 w-11 rounded-btn border bg-transparent text-center font-display text-headline text-text-primary outline-none ' +
                  (d ? 'border-accent-gold text-accent-gold' : 'border-white/20')
                }
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-8 flex-1">
        {loading && <p className="text-center font-sans text-subheadline text-text-tertiary">Looking for table…</p>}
        {notFound && !loading && (
          <p className="text-center font-sans text-subheadline text-fold">No table found with that code.</p>
        )}
        {preview && (
          <>
            {!fromDeepLink && (
              <p className="mb-3 text-center font-sans text-caption uppercase tracking-[0.06em] text-accent-olive">
                ✓ Table found
              </p>
            )}
            <div className="rounded-card border border-white/10 bg-bg-elevated px-5 py-6 text-center">
              <div className="flex justify-center">
                <Avatar
                  name={preview.hostName || 'Host'}
                  initials={initialsForName(preview.hostName || 'Host')}
                  color={colorForName(preview.hostName || 'Host')}
                  size="lg"
                  isHost
                />
              </div>
              <h2 className="mt-4 font-display text-title text-text-primary">
                {fromDeepLink ? `Join ${preview.hostName}'s table?` : `${preview.hostName}'s Game`}
              </h2>
              <p className="mt-1 font-sans text-subheadline text-text-secondary">
                hosted by {preview.hostName} · {formatMoney(preview.blinds.small)}/{formatMoney(preview.blinds.big)}
              </p>
              <div className="mt-4 flex justify-center -space-x-2">
                {preview.players.slice(0, 4).map((p) => (
                  <div key={p.name} className="ring-2 ring-bg-elevated rounded-full">
                    <Avatar name={p.name} initials={initialsForName(p.name)} color={colorForName(p.name)} size="sm" />
                  </div>
                ))}
                {preview.playerCount > 4 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-elevated-2 text-[11px] text-text-secondary ring-2 ring-bg-elevated">
                    +{preview.playerCount - 4}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="safe-bottom pb-6 pt-2">
        <button
          type="button"
          disabled={!preview}
          onClick={() => navigate(`/lobby/${code}`)}
          className="w-full rounded-btn bg-accent-gold py-4 text-center font-sans font-semibold text-text-on-ivory shadow-glow-gold active:scale-[0.99] disabled:opacity-40"
        >
          Join Table
        </button>
      </div>
    </div>
  );
}
