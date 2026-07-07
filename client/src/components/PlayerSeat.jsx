import { Avatar } from './Avatar.jsx';
import { initialsForName, colorForName } from '../hooks/useProfile.js';
import { formatMoney } from '../lib/money.js';

export function PlayerSeat({ player, isDealer, isActing, actionDeadline }) {
  const state = player.folded
    ? 'folded'
    : !player.connected
      ? 'disconnected'
      : player.allIn
        ? 'allIn'
        : isActing
          ? 'active'
          : 'idle';

  let statusText;
  if (player.folded) statusText = 'fold';
  else if (player.allIn) statusText = 'ALL-IN';
  else if (player.sittingOut) statusText = 'sitting out';
  else statusText = formatMoney(player.stack, { symbol: false });

  return (
    <div className="flex flex-col items-center gap-1">
      {player.currentBet > 0 && !player.folded && (
        <span className="tabular-money rounded-chip bg-bg-elevated-2 px-1.5 py-0.5 font-sans text-[10px] text-accent-gold">
          {formatMoney(player.currentBet)}
        </span>
      )}
      <Avatar
        name={player.name}
        initials={initialsForName(player.name)}
        color={colorForName(player.name)}
        state={state}
        deadline={isActing ? actionDeadline : null}
        isHost={player.isHost}
      />
      <div className="flex flex-col items-center">
        <span className="max-w-[64px] truncate font-sans text-[11px] font-medium text-text-primary">{player.name}</span>
        <span
          className={
            'tabular-money font-sans text-[11px] ' +
            (player.folded ? 'text-text-tertiary' : player.allIn ? 'font-semibold text-accent-gold' : 'text-text-secondary')
          }
        >
          {statusText}
        </span>
      </div>
      {isDealer && (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ivory font-display text-[9px] font-bold text-text-on-ivory">
          D
        </span>
      )}
    </div>
  );
}
