import { useNavigate } from 'react-router-dom';
import { IconDisconnect } from './icons.jsx';

export function ReconnectingOverlay({ show }) {
  const navigate = useNavigate();
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg-primary/95 px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-elevated-2 text-accent-gold">
        <IconDisconnect className="h-7 w-7 animate-pulse" />
      </div>
      <div>
        <p className="font-display text-title text-text-primary">Reconnecting…</p>
        <p className="mt-1 font-sans text-subheadline text-text-secondary">
          Your seat and stack are held. This usually only takes a moment.
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-2 font-sans text-subheadline text-text-tertiary underline underline-offset-2"
      >
        Return home
      </button>
    </div>
  );
}
