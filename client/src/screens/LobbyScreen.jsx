import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconChevronLeft, IconCrown, IconShare, IconPlus } from '../components/icons.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { HostControlsSheet } from '../components/HostControlsSheet.jsx';
import { ReconnectingOverlay } from '../components/ReconnectingOverlay.jsx';
import { useToast } from '../components/Toast.jsx';
import { useProfile, initialsForName, colorForName } from '../hooks/useProfile.js';
import { useRoomSocket } from '../hooks/useRoomSocket.js';
import { copyToClipboard } from '../lib/clipboard.js';
import { formatMoney } from '../lib/money.js';

export function LobbyScreen() {
  const { code } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const profile = useProfile();
  const socket = useRoomSocket({ code, playerId: profile.playerId, name: profile.name });
  const [hostSheetOpen, setHostSheetOpen] = useState(false);

  const { state, status, error, kicked, clearError, hostStartGame, hostSetBlinds, hostResetGame, hostKickPlayer } = socket;
  const isHost = state?.hostId === profile.playerId;
  const players = state ? state.seats.filter(Boolean) : [];
  const [fatalError, setFatalError] = useState(null);

  useEffect(() => {
    if (state) {
      const hostPlayer = state.seats.find((s) => s && s.id === state.hostId);
      localStorage.setItem('straight.lastRoom', JSON.stringify({ code, name: `${hostPlayer?.name || 'Host'}'s Game` }));
    }
  }, [state, code]);

  useEffect(() => {
    if (state && state.street !== 'lobby') navigate(`/table/${code}`, { replace: true });
  }, [state, code, navigate]);

  useEffect(() => {
    if (!error) return;
    if (!state) setFatalError(error);
    else showToast(error);
    clearError();
  }, [error, state, showToast, clearError]);

  useEffect(() => {
    if (kicked) {
      showToast("You were removed from the table");
      navigate('/');
    }
  }, [kicked, navigate, showToast]);

  // No deep-link URL here on purpose — window.location.origin resolves to
  // capacitor://localhost inside the native app (meaningless outside it),
  // and there's no hosted web build for a /join route to land on even from
  // a browser. Sharing the plain room code plays to what already works:
  // typing it into "Join with Code".
  async function handleShare() {
    const text = `Join my Straight table — open the app and enter code: ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join my Straight table', text });
        return;
      } catch {
        return; // cancelled
      }
    }
    showToast((await copyToClipboard(code)) ? 'Code copied' : `Share this code: ${code}`);
  }

  if (fatalError && !state) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="font-display text-title text-text-primary">Couldn't join this table</p>
        <p className="font-sans text-subheadline text-text-secondary">{fatalError}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-2 rounded-btn bg-accent-gold px-6 py-3 font-sans font-semibold text-text-on-ivory"
        >
          Return Home
        </button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-5">
        <p className="font-sans text-subheadline text-text-tertiary">Connecting to table…</p>
      </div>
    );
  }

  const hostPlayer = players.find((p) => p.id === state.hostId);
  const emptySeatCount = state.maxSeats - players.length;

  return (
    <div className="relative flex h-full flex-col px-5 safe-top">
      <div className="mb-2 flex items-center">
        <button type="button" onClick={() => navigate('/')} className="p-1 text-text-primary">
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-center font-display text-title text-text-primary">Lobby</h1>
        {isHost ? (
          <button type="button" onClick={() => setHostSheetOpen(true)} className="p-1 text-text-primary">
            •••
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-card border border-white/10 bg-bg-elevated px-4 py-4">
        <div>
          <h2 className="font-display text-headline text-text-primary">{hostPlayer?.name}'s Game</h2>
          <p className="mt-0.5 font-sans text-subheadline text-text-secondary">
            {formatMoney(state.blinds.small)}/{formatMoney(state.blinds.big)} · {formatMoney(state.startingStack)} buy-in · {state.maxSeats} seats
          </p>
        </div>
        <button type="button" onClick={handleShare} className="flex flex-col items-end gap-1 text-right">
          <span className="font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Code</span>
          <span className="tabular-money flex items-center gap-1.5 font-display text-headline text-accent-gold">
            {code}
            <IconShare className="h-3.5 w-3.5" />
          </span>
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h3 className="font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">Players</h3>
        <span className="font-sans text-subheadline text-text-secondary">
          {players.length} of {state.maxSeats}
        </span>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto pb-4">
        {players.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-btn border border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar name={p.name} initials={initialsForName(p.name)} color={colorForName(p.name)} size="sm" />
              <div>
                <span className="font-sans text-body font-medium text-text-primary">{p.name}</span>
                {p.id === state.hostId ? (
                  <div className="flex items-center gap-1 text-accent-gold">
                    <IconCrown className="h-3 w-3" />
                    <span className="font-sans text-[12px]">Host</span>
                  </div>
                ) : (
                  <div className="font-sans text-[12px] text-text-tertiary">
                    {p.connected ? 'Ready' : 'Disconnected'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {Array.from({ length: emptySeatCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={handleShare}
            className="flex items-center justify-between rounded-btn border border-dashed border-white/15 px-4 py-3 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-white/20 text-text-tertiary">
                <IconPlus className="h-4 w-4" />
              </div>
              <span className="font-sans text-body text-text-tertiary">Empty seat</span>
            </div>
            <span className="font-sans text-[13px] text-accent-gold">Invite</span>
          </button>
        ))}
      </div>

      <div className="safe-bottom pb-6 pt-2">
        {isHost ? (
          <button
            type="button"
            disabled={players.length < 2}
            onClick={hostStartGame}
            className="w-full rounded-btn bg-accent-gold py-4 text-center font-sans font-semibold text-text-on-ivory shadow-glow-gold active:scale-[0.99] disabled:opacity-40"
          >
            Start Game
          </button>
        ) : (
          <div className="w-full rounded-btn border border-white/10 py-4 text-center font-sans text-subheadline text-text-tertiary">
            Waiting for host to start…
          </div>
        )}
      </div>

      <HostControlsSheet
        open={hostSheetOpen}
        onClose={() => setHostSheetOpen(false)}
        table={state}
        myPlayerId={profile.playerId}
        onSetBlinds={hostSetBlinds}
        onResetGame={hostResetGame}
        onKickPlayer={hostKickPlayer}
      />
      <ReconnectingOverlay show={status === 'reconnecting'} />
    </div>
  );
}
