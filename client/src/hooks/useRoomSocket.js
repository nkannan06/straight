import { useEffect, useRef, useState, useCallback } from 'react';
import { SERVER_WS_URL } from '../lib/config.js';

const PING_INTERVAL_MS = 20_000;
const RECONNECT_DELAYS_MS = [500, 1000, 2000, 4000, 8000];

// Manages one room's WebSocket connection: join, reconnection with backoff,
// and a small typed API for sending player/host actions.
export function useRoomSocket({ code, playerId, name }) {
  const [state, setState] = useState(null);
  const [nextHandAt, setNextHandAt] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting | open | reconnecting | closed
  const [error, setError] = useState(null);
  const [kicked, setKicked] = useState(false);

  const wsRef = useRef(null);
  const attemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const pingTimerRef = useRef(null);
  const stoppedRef = useRef(false);

  const connect = useCallback(() => {
    if (stoppedRef.current || !code || !playerId) return;
    setStatus((prev) => (prev === 'open' ? prev : 'reconnecting'));
    const ws = new WebSocket(SERVER_WS_URL);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      attemptRef.current = 0;
      setStatus('open');
      setError(null);
      ws.send(JSON.stringify({ type: 'join_room', code, playerId, name }));
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, PING_INTERVAL_MS);
    });

    ws.addEventListener('message', (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type === 'room_state') {
        setState(msg.state);
        setNextHandAt(msg.nextHandAt ?? null);
      } else if (msg.type === 'error') {
        setError(msg.message);
      } else if (msg.type === 'kicked') {
        setKicked(true);
        stoppedRef.current = true;
        ws.close();
      }
    });

    ws.addEventListener('close', () => {
      clearInterval(pingTimerRef.current);
      if (stoppedRef.current) {
        setStatus('closed');
        return;
      }
      setStatus('reconnecting');
      const delay = RECONNECT_DELAYS_MS[Math.min(attemptRef.current, RECONNECT_DELAYS_MS.length - 1)];
      attemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    });

    ws.addEventListener('error', () => {
      ws.close();
    });
  }, [code, playerId, name]);

  useEffect(() => {
    stoppedRef.current = false;
    connect();
    return () => {
      stoppedRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      clearInterval(pingTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((message) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
  }, []);

  const sendAction = useCallback((action, amount = 0) => send({ type: 'player_action', action, amount }), [send]);
  const hostStartGame = useCallback(() => send({ type: 'host_start_game' }), [send]);
  const hostResetGame = useCallback(() => send({ type: 'host_reset_game' }), [send]);
  const hostSetBlinds = useCallback((blinds) => send({ type: 'host_set_blinds', blinds }), [send]);
  const hostSetGameOptions = useCallback((options) => send({ type: 'host_set_game_options', ...options }), [send]);
  const hostKickPlayer = useCallback((targetPlayerId) => send({ type: 'host_kick_player', targetPlayerId }), [send]);
  // A deliberate exit, not a network drop — tells the server to actually
  // free the seat (and tear the room down if that empties it) rather than
  // just marking this connection disconnected and waiting to see if it
  // reconnects.
  const leaveRoom = useCallback(() => send({ type: 'leave_room' }), [send]);

  return {
    state,
    nextHandAt,
    status,
    error,
    kicked,
    clearError: () => setError(null),
    sendAction,
    hostStartGame,
    hostResetGame,
    hostSetBlinds,
    hostSetGameOptions,
    hostKickPlayer,
    leaveRoom,
  };
}
