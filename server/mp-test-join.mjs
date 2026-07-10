import WebSocket from 'ws';

const ws = new WebSocket('wss://straight-production.up.railway.app/ws');
const playerId = 'claude-test-player-' + Date.now();

ws.on('open', () => {
  console.log('connected, joining room...');
  ws.send(JSON.stringify({ type: 'join_room', code: 'SEVL74', playerId, name: 'Claude (test)' }));
});

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.type === 'room_state') {
    const s = msg.state;
    console.log(`[state] street=${s.street} seats=${s.seats.filter(Boolean).map(p => p.name + (p.connected ? '' : '(disc)')).join(', ')}`);
  } else if (msg.type === 'error') {
    console.log('[error]', msg.message);
  } else {
    console.log('[msg]', msg.type);
  }
});

ws.on('close', () => console.log('closed'));
ws.on('error', (e) => console.log('ws error:', e.message));

// Keep alive for the test window
setTimeout(() => {
  console.log('closing test connection');
  ws.close();
  process.exit(0);
}, 15000);
