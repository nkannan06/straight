import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile.js';
import { useSchedule } from '../hooks/useSchedule.js';
import { Avatar } from '../components/Avatar.jsx';
import { SequenceLogo } from '../components/SequenceLogo.jsx';
import { Sheet } from '../components/Sheet.jsx';
import { Toggle } from '../components/Toggle.jsx';
import { IconCalendar } from '../components/icons.jsx';

function SettingsSheet({ open, onClose, profile }) {
  const [name, setName] = useState(profile.name);

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <label className="mb-1.5 block font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">
        Display name
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && profile.updateProfile({ name: name.trim() })}
        maxLength={20}
        className="mb-5 w-full rounded-btn border border-white/15 bg-bg-elevated-2 px-4 py-3 font-sans text-body text-text-primary outline-none focus:border-accent-gold"
      />
      <div className="mb-2 flex items-center justify-between">
        <span className="font-sans text-body text-text-primary">Haptics</span>
        <Toggle checked={profile.haptics} onChange={(v) => profile.updateProfile({ haptics: v })} label="Haptics" />
      </div>
    </Sheet>
  );
}

export function HomeScreen() {
  const profile = useProfile();
  const navigate = useNavigate();
  const { games } = useSchedule(profile.playerId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const nextGame = games[0] || null;

  let lastRoom = null;
  try {
    lastRoom = JSON.parse(localStorage.getItem('straight.lastRoom') || 'null');
  } catch {
    lastRoom = null;
  }

  return (
    <div className="flex h-full flex-col px-5 safe-top">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setSettingsOpen(true)} className="flex items-center gap-2">
          <Avatar name={profile.name} initials={profile.initials} color={profile.color} size="sm" />
          <span className="font-sans text-body font-medium text-text-primary">{profile.name}</span>
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <SequenceLogo />
        <p className="max-w-[240px] text-center font-sans text-subheadline text-text-secondary">
          Poker with friends. No stakes, all bragging.
        </p>
      </div>

      <div className="flex flex-col gap-3 pb-8">
        {nextGame && (
          <button
            type="button"
            onClick={() => navigate('/schedule/upcoming')}
            className="flex items-center justify-between rounded-card border border-white/10 bg-bg-elevated px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <IconCalendar className="h-4 w-4 text-accent-gold" />
              <div>
                <p className="font-sans text-[13px] font-medium text-text-primary">{nextGame.name || 'Poker Night'}</p>
                <p className="font-sans text-[11px] text-text-tertiary">
                  {new Date(nextGame.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <span className="font-sans text-[12px] text-accent-gold">View</span>
          </button>
        )}

        {lastRoom && (
          <button
            type="button"
            onClick={() => navigate(`/lobby/${lastRoom.code}`)}
            className="rounded-card border border-accent-gold/40 bg-bg-elevated px-4 py-3 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="font-sans text-caption uppercase tracking-[0.06em] text-accent-gold">Continue</span>
              <span className="flex items-center gap-1 font-sans text-caption text-accent-olive">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-olive" /> live
              </span>
            </div>
            <p className="mt-1 font-display text-headline text-text-primary">{lastRoom.name || 'Your table'}</p>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/create')}
          className="rounded-btn bg-accent-gold py-4 text-center font-sans font-semibold text-text-on-ivory shadow-glow-gold active:scale-[0.99]"
        >
          New Game
        </button>
        <button
          type="button"
          onClick={() => navigate('/join')}
          className="rounded-btn border border-white/20 py-4 text-center font-sans font-semibold text-text-primary active:scale-[0.99]"
        >
          Join with Code
        </button>
        <button
          type="button"
          onClick={() => navigate('/schedule')}
          className="py-1 text-center font-sans text-subheadline text-text-secondary underline underline-offset-4"
        >
          Schedule a Game
        </button>
      </div>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} profile={profile} />
    </div>
  );
}
