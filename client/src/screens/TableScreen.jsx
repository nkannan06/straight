import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TableView } from '../components/TableView.jsx';
import { HostControlsSheet } from '../components/HostControlsSheet.jsx';
import { Sheet } from '../components/Sheet.jsx';
import { useToast } from '../components/Toast.jsx';
import { useProfile } from '../hooks/useProfile.js';
import { useRoomSocket } from '../hooks/useRoomSocket.js';
import { formatMoney } from '../lib/money.js';

function LeaveConfirmSheet({ open, onClose, onConfirm }) {
  return (
    <Sheet open={open} onClose={onClose} title="Leave table?">
      <p className="mb-5 font-sans text-subheadline text-text-secondary">
        You'll be removed from your seat. You can rejoin with the room code if the table is still open.
      </p>
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full rounded-btn bg-fold py-3.5 font-sans font-semibold text-text-on-ivory active:scale-[0.99]"
        >
          Leave Table
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-btn border border-white/20 py-3.5 font-sans font-semibold text-text-primary active:scale-[0.99]"
        >
          Stay
        </button>
      </div>
    </Sheet>
  );
}

export function TableScreen() {
  const { code } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const profile = useProfile();
  const socket = useRoomSocket({ code, playerId: profile.playerId, name: profile.name });
  const [hostSheetOpen, setHostSheetOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [fatalError, setFatalError] = useState(null);
  const { state, status, nextHandAt, error, kicked, clearError, sendAction, hostSetBlinds, hostSetGameOptions, hostResetGame, hostKickPlayer } = socket;

  useEffect(() => {
    if (!error) return;
    if (!state) setFatalError(error);
    else showToast(error);
    clearError();
  }, [error, state, showToast, clearError]);

  useEffect(() => {
    if (kicked) {
      showToast('You were removed from the table');
      navigate('/');
    }
  }, [kicked, navigate, showToast]);

  useEffect(() => {
    if (state && state.street === 'lobby') navigate(`/lobby/${code}`, { replace: true });
  }, [state, code, navigate]);

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
      <div className="flex h-full flex-col items-center justify-center px-5">
        <p className="font-sans text-subheadline text-text-tertiary">Connecting to table…</p>
      </div>
    );
  }

  const isHost = state.hostId === profile.playerId;
  const hostName = state.seats.find((s) => s && s.id === state.hostId)?.name;

  return (
    <>
      <TableView
        state={state}
        myPlayerId={profile.playerId}
        headerTitle="STRAIGHT"
        headerSubtitle={`${hostName ? `${hostName.toUpperCase()}'S GAME` : ''} · ${formatMoney(state.blinds.small)}/${formatMoney(state.blinds.big)}`}
        onFold={() => sendAction('fold')}
        onCheck={() => sendAction('check')}
        onCall={() => sendAction('call')}
        onRaise={(amount) => sendAction('raise', amount)}
        onOpenMenu={isHost ? () => setHostSheetOpen(true) : undefined}
        onLeave={() => setLeaveConfirmOpen(true)}
        connectionStatus={status}
        nextHandAt={nextHandAt}
      />
      <HostControlsSheet
        open={hostSheetOpen}
        onClose={() => setHostSheetOpen(false)}
        table={state}
        myPlayerId={profile.playerId}
        onSetBlinds={hostSetBlinds}
        onSetGameOptions={hostSetGameOptions}
        onResetGame={hostResetGame}
        onKickPlayer={hostKickPlayer}
      />
      <LeaveConfirmSheet
        open={leaveConfirmOpen}
        onClose={() => setLeaveConfirmOpen(false)}
        onConfirm={() => navigate('/')}
      />
    </>
  );
}
