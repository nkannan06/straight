import WebSocket from 'ws';

const ws = new WebSocket('wss://straight-production.up.railway.app/ws');
const playerId = process.argv[2] || 'claude-test-player-fixed-id';
const code = 'SEVL74';

function send(msg) { ws.send(JSON.stringify(msg)); }

ws.on('open', () => {
  console.log('connected, joining room...');
  send({ type: 'join_room', code, playerId, name: 'Claude (test)' });
});

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.type === 'room_state') {
    const s = msg.state;
    const me = s.seats.find(p => p && p.id === playerId);
    const acting = s.seats.find(p => p && p.seat === s.actingSeat);
    console.log(`[${s.street}] pot=${s.pot} community=${s.community.map(c=>c.rank+c.suit).join(',')} acting=${acting?.name || '-'} myStack=${me?.stack} myBet=${me?.currentBet} toCall=${me ? s.currentBet - me.currentBet : '-'}`);

    if (s.lastHandResult) {
      console.log('  -> hand result:', JSON.stringify(s.lastHandResult.pots));
    }

    if (me && acting && acting.id === playerId && ['preflop','flop','turn','river'].includes(s.street)) {
      const toCall = s.currentBet - me.currentBet;
      setTimeout(() => {
        if (toCall > 0) {
          console.log('  -> calling', toCall);
          send({ type: 'player_action', action: 'call' });
        } else {
          console.log('  -> checking');
          send({ type: 'player_action', action: 'check' });
        }
      }, 1200);
    }
  } else if (msg.type === 'error') {
    console.log('[error]', msg.message);
  } else {
    console.log('[msg]', msg.type);
  }
});

ws.on('close', () => console.log('closed'));
ws.on('error', (e) => console.log('ws error:', e.message));

setTimeout(() => {
  console.log('closing test connection');
  ws.close();
  process.exit(0);
}, 45000);
