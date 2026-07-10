# Straight — poker with friends + AI practice mode

A phone-sized (390×844) web app for playing Texas Hold'em with friends over a
private room code, practicing solo against AI opponents, and tracking who
owes who across games — friends, ledger, scheduling, and hand history all
included. Real email/password accounts, an iOS Capacitor wrapper, and a
push-notification pipeline are in place; see "What's next" for what's still
stubbed pending your own Apple Developer / Google Cloud credentials.

## Running it

Two processes, in two terminals.

**Server** (Express + `ws` + `node:sqlite`):

```bash
cd server
npm install
npm run dev
```

Starts on `http://localhost:8787` and logs `Straight server listening on
http://localhost:8787` when ready. `npm start` runs it without the
file-watcher for a one-off run. A `straight.db` SQLite file is created next to
`index.js` on first run — delete it any time to reset all social/ledger data.

**Client** (Vite + React + Tailwind):

```bash
cd client
npm install
npm run dev
```

Starts on `http://localhost:5180`. Open that URL in a browser and resize the
window to roughly 390×844 (or open dev tools' device toolbar) to see it as
intended — it's built as a constrained phone-sized frame, not a responsive
desktop layout.

By default the client talks to `http://localhost:8787`. To point it at a
different server, set `VITE_SERVER_URL` in `client/.env`.

## Tests

The hand evaluator and game engine have a `node --test` suite:

```bash
cd server
npm test
```

There's also a small manual CLI harness for eyeballing engine behavior
without a browser:

```bash
cd server
node test/gameEngine.harness.js
```

## Project layout

```
/straight
  /server
    index.js            # http + ws server, room registry, turn-timer sweep, REST routes
    db.js                # SQLite schema + connection (node:sqlite, no extra deps)
    auth.js                # email/password sign-up/in, sessions, username claim
    push.js                  # device token registry + sendPushNotification (stubbed)
    users.js              # presence (online/offline/in-game), lookup/search
    friends.js             # friend requests, friends list, suggested friends
    activity.js             # per-user activity feed events
    ledger.js                # sessions, buy-in/cash-out, pairwise balances, settle-up
    schedule.js                # scheduled games + RSVPs
    handHistory.js              # per-hand recording (from gameEngine results) + replay data
    achievements.js               # badge definitions + unlock checks
    gameEngine.js        # Table class: betting, side pots, blinds, showdown
    handEvaluator.js
    deck.js
    test/
  /client
    src/
      screens/           # Auth, Home, Friends*, Ledger*, Schedule*, Hand*, Profile,
                          # CreateGame, JoinGame, Lobby, Table, Practice*
      components/        # TabBar/TabShell, Avatar, PlayerSeat, PlayingCard,
                          # ActionBar, WinPercentToggle, AddFriendSheet, ...
      hooks/              # useAuth (session context), useRoomSocket,
                           # usePracticeTable, useProfile, useFriends,
                           # useSchedule, useSocialCounts, ...
      lib/                 # auth.js (client-side auth calls), push.js (Capacitor
                            # push registration), deck.js + handEvaluator.js
                            # (mirrored from /server, byte-for-byte identical),
                            # equity.js, aiPlayer.js, money.js
    ios/                  # Capacitor iOS wrapper (`npm run ios:open` to build + open Xcode)
  /design-reference        # the Claude Design source package this UI matches
```

`deck.js` and `handEvaluator.js` are framework-agnostic plain JS with no
imports beyond each other, by design — they're copied verbatim between
`/server` and `/client/src/lib` so the server (authoritative dealing/scoring)
and the client (practice mode + equity hints) can never disagree about what
beats what. If you change either file, copy it to the other location too.

## Architecture notes

- **Server-authoritative multiplayer.** The client never computes or trusts
  its own cards; `gameEngine.js`'s `Table.applyAction(playerId, action,
  amount)` is the single entrypoint for all betting, and it rejects illegal
  actions (acting out of turn, under-minimum raises, etc.) server-side.
- **Money is integer cents everywhere** — client, WS messages, and the DB.
  `client/src/lib/money.js` converts to/from decimal dollars only at input
  fields and display. This is what lets micro-stakes ($0.10/$0.20) and
  higher-stakes tables share the same exact-integer pot-splitting math with
  no floating-point drift.
- **One WebSocket message shape.** Every state change re-broadcasts a full
  `room_state` snapshot (redacted per-viewer — hole cards are hidden until
  showdown) rather than diffing. At this scale that's simpler and plenty
  fast; if room sizes grew much larger, that's the first thing to optimize.
- **Reconnection.** The client generates a `playerId` on first load and
  persists it (with the room code) in `localStorage`. Closing and reopening
  the tab reconnects with the same `playerId`, and the server rebinds the
  existing seat/stack rather than treating it as a new player.
- **Real accounts.** Email/password sign-up and sign-in (`server/auth.js`,
  `scryptSync`-hashed, session tokens in a `sessions` table with a 60-day
  TTL). Apple/Google buttons are present on the auth screen but call stub
  functions (`client/src/lib/auth.js`'s `continueWithApple`/`continueWithGoogle`)
  that surface a clear "not connected yet" message — swap their bodies for
  real Sign in with Apple / Google Identity Services once you have OAuth
  credentials; nothing else in the app needs to change (`useAuth` and
  `AuthScreen` are already provider-agnostic).
- **Ledger sessions** are opened on the first hand of a game (`host_start_game`)
  and finalized (buy-in vs. final stack recorded) on `host_reset_game` or when
  an empty room is cleaned up. Pairwise "who owes whom" balances are computed
  on the fly per friend pair via debt simplification over shared unsettled
  sessions (see `ledger.js`'s `simplifyDebts`); "All-Time Net" is a separate,
  permanent historical figure that doesn't change when you settle up.
- **Hand history** is recorded from each `Table`'s result the moment a hand
  completes (`handHistory.js`), one row per participant with only their own
  hole cards — never an opponent's. The replay viewer reconstructs board/pot
  state at each step from the recorded action log; it doesn't store
  per-step stack snapshots, so replay doesn't show exact stack sizes at each
  moment, only pot growth and community-card reveals.
- **Practice mode is fully client-side.** `usePracticeTable` runs its own
  local copy of `Table` (no networking) and drives AI turns via
  `aiPlayer.js`, which is itself built on `equity.js`'s Monte Carlo estimator
  — the same estimator also powers the practice-mode hint meter and the
  multiplayer table's private "Win %" toggle (`WinPercentToggle.jsx`), which
  is computed entirely client-side and never sent to the server.
- **Rooms are in-memory** (a `Map` keyed by room code) and swept for cleanup
  after 30 minutes with nobody connected — only the social/ledger/schedule
  data persists in SQLite; live game state does not survive a server restart.

## What's next (deferred, by design, to a later pass)

- **Apple/Google SSO.** The buttons and stub provider functions exist
  (`client/src/lib/auth.js`); wiring them up needs an Apple Developer Program
  enrollment ($99/yr) and a Google Cloud OAuth client. Until then, email/
  password is the only functional path.
- **Real APNs push delivery.** The full pipeline is built — device token
  registration (`/api/push/register`), the Capacitor `PushNotifications`
  plugin wired client-side with permission request + tap-to-deep-link
  (`client/src/lib/push.js`), and server call sites for every notification
  type (friend request/accept, game invite, ledger settle-up, achievement
  unlock, your-turn reminder). `server/push.js`'s `sendPushNotification`
  is currently a stub that logs `[push:stub] ...` instead of delivering —
  flip `PUSH_CONFIGURED` to `true` and add real APNs key/cert delivery there
  once you've generated an APNs auth key in your Apple Developer account.
  Push notifications only fire on a real device/simulator running the
  Capacitor iOS build — `Capacitor.isNativePlatform()` gates them off in the
  browser preview.
- **App Store deployment.** The Capacitor iOS project lives at
  `client/ios/App` (`npm run ios:open` inside `/client` builds the web
  bundle, syncs it, and opens Xcode). Before it can run on a device or ship:
  1. Enroll in the Apple Developer Program and, in Xcode's Signing &
     Capabilities tab for the `App` target, select your team — this is a
     manual step only you can do (there's no credential to hand-edit here).
  2. Add the Push Notifications capability in that same tab once you're
     ready to test real delivery (safe to leave off until then; the app
     doesn't require it to run).
  3. Archive and upload via Xcode Organizer (or `xcodebuild -archive` /
     Transporter) to App Store Connect, fill out the listing, and submit for
     review.
  - **Free vs. paid for a first release:** ship free first. There's no
    working payment/entitlement code in this app yet (no in-app purchase or
    subscription wiring), Apple's review is friendlier to free apps, and you
    get real usage data before deciding what (if anything) is worth charging
    for — the "Straight Plus" card on the Profile tab is already a placeholder
    for that future paid tier, not a functioning paywall.

## Known limitations

- If the same `playerId` connects from two tabs at once (not the normal
  reconnect flow — genuinely two simultaneous connections), only the most
  recently connected tab receives live game-table updates; the older tab's
  view goes stale until it reconnects. Normal single-tab reconnection (the
  actual requirement) works correctly and is covered by manual testing.
- Card-flip/reveal animations rely on `requestAnimationFrame` (via Framer
  Motion) and, like any web animation, are throttled by the browser in
  backgrounded/inactive tabs — expected and harmless for a real, focused
  session.
- `node:sqlite` is still an experimental Node API (stable enough here, but
  worth knowing if you see the experimental-warning log line on server start).
- In production, `STRAIGHT_DB_PATH` must point at a path on a persistent
  volume (e.g. Railway's Volumes feature), not the default location next to
  the code — most hosts give the server a fresh, empty filesystem on every
  deploy, which would otherwise silently wipe every account, friend,
  ledger entry, and hand history record on every redeploy.
- Ledger cash-out for a player who disconnects without the host resetting/
  ending the session falls back to their last-known stack rather than an
  exact "walked away at this exact moment" amount — a reasonable
  approximation for a casual home-game tracker, not a precise audit trail.
