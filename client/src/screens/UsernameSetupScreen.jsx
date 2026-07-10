import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { checkUsernameAvailable } from '../lib/auth.js';
import { SequenceLogo } from '../components/SequenceLogo.jsx';

// Shown once, right after a brand-new account is created via Apple/Google
// sign-in. The server already assigned an auto-generated username so this
// screen is skippable — it just gives new users an explicit chance to pick
// their own before entering the app.
export function UsernameSetupScreen() {
  const auth = useAuth();
  const autoUsername = auth.user?.username || '';
  const [value, setValue] = useState(autoUsername);
  const [status, setStatus] = useState('idle'); // idle | checking | available | taken
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const clean = value.trim().toLowerCase();
    if (!clean || clean === autoUsername) {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailable(clean, auth.user?.id);
        setStatus(result.available ? 'available' : 'taken');
        setReason(result.reason || '');
      } catch {
        setStatus('idle');
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleContinue = async () => {
    const clean = value.trim().toLowerCase();
    if (clean && clean !== autoUsername) {
      if (status !== 'available') return;
      setSubmitting(true);
      try {
        await auth.claimUsername(clean);
      } catch (err) {
        setStatus('taken');
        setReason(err.message);
        setSubmitting(false);
        return;
      }
    }
    auth.finishOnboarding();
  };

  const canContinue = status !== 'checking' && (status === 'idle' || status === 'available') && !submitting;

  return (
    <div className="flex h-full flex-col justify-center px-6">
      <div className="mb-9 flex flex-col items-center">
        <SequenceLogo />
        <h1 className="mt-5 font-display text-title text-text-primary">Pick your username</h1>
        <p className="mt-2 max-w-[280px] text-center font-sans text-subheadline text-text-secondary">
          This is how friends will find and add you. You can change it later in your profile.
        </p>
      </div>

      <div className="mb-1.5 flex items-center rounded-btn border border-white/15 bg-bg-elevated-2 px-4 py-3.5">
        <span className="font-sans text-body text-text-tertiary">@</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
          maxLength={20}
          autoFocus
          className="w-full bg-transparent font-sans text-body text-text-primary outline-none"
        />
      </div>
      <div className="mb-6 min-h-[18px]">
        {status === 'checking' && <p className="font-sans text-[12px] text-text-tertiary">Checking availability…</p>}
        {status === 'available' && <p className="font-sans text-[12px] text-accent-olive">@{value} is available</p>}
        {status === 'taken' && <p className="font-sans text-[12px] text-fold">{reason || 'Already taken'}</p>}
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!canContinue}
        className="rounded-btn bg-accent-gold py-4 text-center font-sans font-semibold text-text-on-ivory shadow-glow-gold active:scale-[0.99] disabled:opacity-60"
      >
        {submitting ? 'Please wait…' : 'Continue'}
      </button>
    </div>
  );
}
