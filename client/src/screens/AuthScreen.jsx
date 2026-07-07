import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { SequenceLogo } from '../components/SequenceLogo.jsx';
import { IconApple, IconGoogle } from '../components/icons.jsx';

function SsoButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-btn border border-white/20 py-3.5 text-center font-sans font-medium text-text-primary active:scale-[0.99]"
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </button>
  );
}

export function AuthScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSso = async (provider) => {
    setError('');
    try {
      if (provider === 'apple') await auth.continueWithApple();
      else await auth.continueWithGoogle();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await auth.signUp({ email: email.trim(), password, displayName: displayName.trim() });
      } else {
        await auth.logIn({ email: email.trim(), password });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col justify-center px-6">
      <div className="mb-9 flex flex-col items-center">
        <SequenceLogo />
        <p className="mt-2 max-w-[260px] text-center font-sans text-subheadline text-text-secondary">
          Poker with friends. No stakes, all bragging.
        </p>
      </div>

      <div className="mb-5 flex rounded-btn border border-white/15 bg-bg-elevated p-1">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`flex-1 rounded-[8px] py-2.5 text-center font-sans font-medium transition-colors ${
            mode === 'signin' ? 'bg-accent-gold text-text-on-ivory' : 'text-text-secondary'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 rounded-[8px] py-2.5 text-center font-sans font-medium transition-colors ${
            mode === 'signup' ? 'bg-accent-gold text-text-on-ivory' : 'text-text-secondary'
          }`}
        >
          Create Account
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-2.5">
        <SsoButton icon={IconApple} label="Continue with Apple" onClick={() => handleSso('apple')} />
        <SsoButton icon={IconGoogle} label="Continue with Google" onClick={() => handleSso('google')} />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === 'signup' && (
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            maxLength={20}
            required
            className="w-full rounded-btn border border-white/15 bg-bg-elevated-2 px-4 py-3 font-sans text-body text-text-primary outline-none focus:border-accent-gold"
          />
        )}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          autoComplete="email"
          required
          className="w-full rounded-btn border border-white/15 bg-bg-elevated-2 px-4 py-3 font-sans text-body text-text-primary outline-none focus:border-accent-gold"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          minLength={mode === 'signup' ? 8 : undefined}
          required
          className="w-full rounded-btn border border-white/15 bg-bg-elevated-2 px-4 py-3 font-sans text-body text-text-primary outline-none focus:border-accent-gold"
        />

        {error && <p className="font-sans text-[13px] text-fold">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-btn bg-accent-gold py-4 text-center font-sans font-semibold text-text-on-ivory shadow-glow-gold active:scale-[0.99] disabled:opacity-60"
        >
          {submitting ? 'Please wait…' : mode === 'signup' ? 'Create Account' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
