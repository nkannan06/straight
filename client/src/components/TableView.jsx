import { useEffect, useState } from 'react';
import { PlayerSeat } from './PlayerSeat.jsx';
import { PotDisplay } from './PotDisplay.jsx';
import { CommunityCards } from './CommunityCards.jsx';
import { PlayingCard } from './PlayingCard.jsx';
import { ActionBar } from './ActionBar.jsx';
import { ActionLog } from './ActionLog.jsx';
import { RaiseSlider } from './RaiseSlider.jsx';
import { ReconnectingOverlay } from './ReconnectingOverlay.jsx';
import { describeMyHand } from '../lib/describeMyHand.js';
import { useHaptics } from '../hooks/useHaptics.js';
import { formatMoney } from '../lib/money.js';
import { WinPercentToggle } from './WinPercentToggle.jsx';
import { IconChevronLeft } from './icons.jsx';

function useCountdown(deadline) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  useEffect(() => {
    if (!deadline) {
      setSecondsLeft(null);
      return undefined;
    }
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline]);
  return secondsLeft;
}

function potTotal(state) {
  // state.pot (sum of each seat's contributed-this-hand) is authoritative
  // and persists across streets — unlike summing currentBet, which resets
  // to 0 every time betting moves to a new street.
  const settled = state.lastHandResult ? state.lastHandResult.totalPot : 0;
  return state.street === 'hand_complete' ? settled : state.pot;
}

export function TableView({
  state,
  myPlayerId,
  headerTitle,
  headerSubtitle,
  onFold,
  onCheck,
  onCall,
  onRaise,
  onOpenMenu,
  onLeave,
  connectionStatus = 'open',
  nextHandAt,
  hintSlot,
  showEquityToggle = true,
}) {
  const [raiseOpen, setRaiseOpen] = useState(false);
  const nextHandSecondsLeft = useCountdown(nextHandAt);
  const buzz = useHaptics();

  const mySeat = state.seats.find((s) => s && s.id === myPlayerId);
  const mySeatIndex = mySeat ? mySeat.seat : -1;
  const opponents = [];
  for (let step = 1; step < state.maxSeats; step++) {
    const idx = (mySeatIndex + step) % state.maxSeats;
    const p = state.seats[idx];
    if (p && p.id !== myPlayerId) opponents.push(p);
  }

  const isMyTurn = mySeat && state.actingSeat === mySeat.seat && ['preflop', 'flop', 'turn', 'river'].includes(state.street);
  const toCall = mySeat ? state.currentBet - mySeat.currentBet : 0;
  const legalActions = isMyTurn
    ? ['fold', toCall > 0 ? 'call' : 'check', ...(mySeat.stack > 0 ? ['raise'] : [])]
    : [];
  const actingPlayer = state.seats.find((s) => s && s.seat === state.actingSeat);
  const nameById = new Map(state.seats.filter(Boolean).map((p) => [p.id, p.name]));

  const handComplete = state.street === 'hand_complete';
  const result = state.lastHandResult;
  const myHandLabel = mySeat && !handComplete ? describeMyHand(mySeat.holeCards, state.community) : null;

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center justify-between px-5 safe-top">
        {onLeave && (
          <button type="button" onClick={onLeave} aria-label="Leave table" className="absolute left-5 safe-top-offset text-text-primary">
            <IconChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div className="text-center flex-1">
          <p className="font-display tracking-[0.15em] text-accent-gold">{headerTitle}</p>
          <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-text-tertiary">{headerSubtitle}</p>
        </div>
        {onOpenMenu && (
          <button type="button" onClick={onOpenMenu} className="absolute right-5 safe-top-offset text-text-primary">
            •••
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-3 px-4">
        {opponents.map((p) => (
          <PlayerSeat
            key={p.id}
            player={{ ...p, isHost: p.id === state.hostId }}
            isDealer={p.seat === state.dealerSeat}
            isActing={state.actingSeat === p.seat}
            actionDeadline={state.actionDeadline}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-col items-center gap-3">
        <PotDisplay total={potTotal(state)} />
        <CommunityCards community={state.community} />
        {handComplete && result?.rabbitHunt && (
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-sans text-[11px] uppercase tracking-[0.06em] text-text-tertiary">
              🐇 Rabbit hunt — the rest of the board
            </span>
            <div className="flex gap-1.5">
              {result.rabbitHunt.community.slice(state.community.length).map((c, i) => (
                <PlayingCard key={i} card={c} size="sm" animate={false} />
              ))}
            </div>
          </div>
        )}
      </div>

      {!handComplete && <div className="mt-3"><ActionLog entries={state.actionLog} nameById={nameById} /></div>}

      <div className="flex flex-1 flex-col items-center justify-end gap-2 px-4 pb-3">
        {handComplete ? (
          <div className="w-full text-center">
            <p className="font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">
              {result?.wonWithoutShowdown ? 'Hand complete' : 'Showdown'}
            </p>
            <p className="mt-1 font-display text-headline text-accent-gold">
              {result?.pots?.length
                ? result.pots
                    .map((pot) => `${pot.winnerIds.map((id) => nameById.get(id) || '?').join(' & ')} wins ${formatMoney(pot.amount)}`)
                    .join(' · ')
                : 'Hand complete'}
            </p>
            {result?.bounty27?.length > 0 && (
              <p className="mt-1 font-sans text-[13px] font-semibold text-accent-gold">
                {result.bounty27
                  .map((b) => `🎯 ${nameById.get(b.winnerId) || '?'} hits the 2-7 bounty! +${formatMoney(b.amount)}`)
                  .join(' · ')}
              </p>
            )}
            {result?.wonWithoutShowdown && result.bounty27?.length > 0 && (
              <div className="mt-4 flex justify-center gap-4">
                {result.bounty27.map((b) => {
                  const seat = state.seats.find((s) => s && s.id === b.winnerId);
                  if (!seat?.holeCards) return null;
                  return (
                    <div key={b.winnerId} className="flex flex-col items-center gap-1.5">
                      <span className="font-sans text-[12px] text-text-secondary">{nameById.get(b.winnerId)}</span>
                      <div className="flex gap-1">
                        {seat.holeCards.map((c, i) => (
                          <PlayingCard key={i} card={c} size="sm" animate={false} />
                        ))}
                      </div>
                      <span className="font-sans text-[11px] uppercase tracking-[0.06em] text-text-tertiary">2-7 offsuit</span>
                    </div>
                  );
                })}
              </div>
            )}
            {result && !result.wonWithoutShowdown && (
              <div className="mt-4 flex justify-center gap-4">
                {result.showdownHands.map((h) => (
                  <div key={h.id} className="flex flex-col items-center gap-1.5">
                    <span className="font-sans text-[12px] text-text-secondary">{nameById.get(h.id)}</span>
                    <div className="flex gap-1">
                      {h.cards.slice(0, 2).map((c, i) => (
                        <PlayingCard key={i} card={c} size="sm" animate={false} />
                      ))}
                    </div>
                    <span className="font-sans text-[11px] uppercase tracking-[0.06em] text-text-tertiary">{h.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          mySeat && (
            <div className="flex flex-col items-center gap-1.5">
              {mySeat.currentBet > 0 && (
                <span className="tabular-money rounded-chip bg-bg-elevated-2 px-1.5 py-0.5 font-sans text-[10px] text-accent-gold">
                  {formatMoney(mySeat.currentBet)}
                </span>
              )}
              {myHandLabel && (
                <span className="font-sans text-caption uppercase tracking-[0.06em] text-text-tertiary">{myHandLabel}</span>
              )}
              <div className="flex gap-2">
                <PlayingCard card={mySeat.holeCards?.[0] || null} faceDown={!mySeat.holeCards} />
                <PlayingCard card={mySeat.holeCards?.[1] || null} faceDown={!mySeat.holeCards} />
              </div>
              <span className="tabular-money font-sans text-[12px] text-text-secondary">
                {formatMoney(mySeat.stack, { symbol: false })} {mySeat.allIn && <span className="font-semibold text-accent-gold">ALL-IN</span>}
              </span>
              {showEquityToggle && (
                <WinPercentToggle
                  holeCards={mySeat.holeCards}
                  community={state.community}
                  numOpponents={opponents.filter((p) => !p.folded).length}
                />
              )}
            </div>
          )
        )}

        {hintSlot}
      </div>

      {handComplete ? (
        <div className="safe-bottom px-4 pb-4">
          <div className="rounded-btn bg-bg-elevated-2 py-3.5 text-center font-sans font-medium text-text-secondary">
            Next hand in {nextHandSecondsLeft ?? '…'}…
          </div>
        </div>
      ) : (
        <ActionBar
          isMyTurn={!!isMyTurn}
          legalActions={legalActions}
          toCall={toCall}
          actingName={actingPlayer?.name}
          onFold={() => { buzz(10); onFold(); }}
          onCheck={() => { buzz(10); onCheck(); }}
          onCall={() => { buzz(10); onCall(); }}
          onOpenRaise={() => { buzz(10); setRaiseOpen(true); }}
        />
      )}

      {mySeat && (
        <RaiseSlider
          open={raiseOpen}
          onClose={() => setRaiseOpen(false)}
          currentBet={state.currentBet}
          minRaise={state.minRaise}
          bigBlind={state.blinds.big}
          myCurrentBet={mySeat.currentBet}
          myStack={mySeat.stack}
          potSize={potTotal(state)}
          onConfirm={(amount) => {
            setRaiseOpen(false);
            buzz([10, 30, 10]);
            onRaise(amount);
          }}
        />
      )}

      <ReconnectingOverlay show={connectionStatus === 'reconnecting'} />
    </div>
  );
}
