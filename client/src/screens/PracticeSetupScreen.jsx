import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft } from '../components/icons.jsx';
import { DIFFICULTIES } from '../lib/aiPlayer.js';

const DIFFICULTY_KEYS = ['easy', 'medium', 'hard'];
const OPPONENT_COUNTS = [2, 3, 4, 5];

export function PracticeSetupScreen() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState('medium');
  const [opponentCount, setOpponentCount] = useState(3);
  const [showHandStrength, setShowHandStrength] = useState(true);
  const [suggestActionEnabled, setSuggestActionEnabled] = useState(true);

  function handleStart() {
    navigate('/practice/play', { state: { difficulty, opponentCount, showHandStrength, suggestActionEnabled } });
  }

  return (
    <div className="flex h-full flex-col px-5 pt-4">
      <div className="mb-2 flex items-center">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-text-primary">
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-center font-display text-title text-text-primary">Practice</h1>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <section className="mt-4">
          <h2 className="mb-2 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Difficulty</h2>
          <div className="flex flex-col gap-2">
            {DIFFICULTY_KEYS.map((key) => {
              const d = DIFFICULTIES[key];
              const active = difficulty === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDifficulty(key)}
                  className={
                    'rounded-card border px-4 py-3 text-left ' +
                    (active ? 'border-accent-gold bg-bg-elevated' : 'border-white/10')
                  }
                >
                  <span className={'font-display text-headline ' + (active ? 'text-accent-gold' : 'text-text-primary')}>
                    {d.label}
                  </span>
                  <p className="mt-0.5 font-sans text-subheadline text-text-secondary">{d.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Opponents</h2>
          <div className="grid grid-cols-4 gap-2">
            {OPPONENT_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setOpponentCount(n)}
                className={
                  'rounded-btn border py-3 font-sans text-subheadline font-medium ' +
                  (n === opponentCount ? 'border-accent-gold text-accent-gold' : 'border-white/15 text-text-secondary')
                }
              >
                {n} AI
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-card border border-white/10 px-4 py-3">
            <div>
              <p className="font-sans text-body text-text-primary">Show hand strength</p>
              <p className="font-sans text-[12px] text-text-tertiary">Live equity % meter above the action bar</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showHandStrength}
              onClick={() => setShowHandStrength((v) => !v)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${showHandStrength ? 'bg-accent-olive' : 'bg-white/15'}`}
            >
              <span
                className="absolute top-0.5 h-6 w-6 rounded-full bg-ivory transition-transform"
                style={{ transform: showHandStrength ? 'translateX(22px)' : 'translateX(2px)' }}
              />
            </button>
          </div>
          <div className="flex items-center justify-between rounded-card border border-white/10 px-4 py-3">
            <div>
              <p className="font-sans text-body text-text-primary">Suggest action</p>
              <p className="font-sans text-[12px] text-text-tertiary">A recommended move, clearly labeled as a suggestion</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={suggestActionEnabled}
              onClick={() => setSuggestActionEnabled((v) => !v)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${suggestActionEnabled ? 'bg-accent-olive' : 'bg-white/15'}`}
            >
              <span
                className="absolute top-0.5 h-6 w-6 rounded-full bg-ivory transition-transform"
                style={{ transform: suggestActionEnabled ? 'translateX(22px)' : 'translateX(2px)' }}
              />
            </button>
          </div>
        </section>
      </div>

      <div className="safe-bottom pb-6 pt-2">
        <button
          type="button"
          onClick={handleStart}
          className="w-full rounded-btn bg-accent-gold py-4 text-center font-sans font-semibold text-text-on-ivory shadow-glow-gold active:scale-[0.99]"
        >
          Start Practice
        </button>
      </div>
    </div>
  );
}
