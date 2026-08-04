// Static privacy policy page served at GET /privacy. App Store Connect and
// Sign in with Apple both require a public URL for this (App Review must be
// able to load it with no auth), so it's a plain server-rendered route rather
// than something living in the client bundle behind the app's own auth wall.
//
// Content here is a factual description of what Straight actually stores —
// see server/db.js for the schema this is describing. Keep the two in sync:
// a new column that captures a new kind of personal data needs a line here.
const LAST_UPDATED = 'August 3, 2026';
const CONTACT_EMAIL = 'nitishkannan2024@gmail.com';

export const privacyPageHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Privacy Policy — Straight</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0; padding: 0;
    background: #faf8f3; color: #1e2015;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
  }
  main { max-width: 680px; margin: 0 auto; padding: 48px 24px 96px; }
  h1 { font-size: 28px; margin-bottom: 4px; }
  .updated { color: #6b6a5f; font-size: 14px; margin-bottom: 40px; }
  h2 { font-size: 19px; margin-top: 36px; margin-bottom: 8px; }
  p, li { color: #2e2f24; font-size: 15px; }
  ul { padding-left: 20px; }
  a { color: #b8933f; }
  .note {
    background: #f0ede2; border-left: 3px solid #b8933f;
    padding: 12px 16px; border-radius: 4px; font-size: 14px; margin: 16px 0;
  }
</style>
</head>
<body>
<main>
  <h1>Privacy Policy</h1>
  <p class="updated">Last updated: ${LAST_UPDATED}</p>

  <p>Straight ("the app") is a poker app for playing with friends — no real money changes hands through the app itself; the in-app "ledger" is a self-reported record of buy-ins and cash-outs that friends track between themselves. This page explains what information the app collects, why, and how it's handled.</p>

  <h2>Information you provide</h2>
  <ul>
    <li><strong>Account details</strong> — email address, display name, and username, if you sign up with email and password. Passwords are never stored in plain text; only a salted cryptographic hash is kept.</li>
    <li><strong>Sign in with Apple / Google</strong> — if you use these instead, we receive the identifier and display name the provider gives us. We don't receive your Apple or Google password.</li>
    <li><strong>Gameplay data you create</strong> — friend connections, scheduled games and RSVPs, ledger entries (buy-ins/cash-outs you or your friends record), and hand history from games you play (your cards, the community cards, and the actions taken).</li>
  </ul>

  <h2>Information collected automatically</h2>
  <ul>
    <li><strong>Device push token</strong> — if you enable notifications, so we can deliver alerts like friend requests or your turn in a hand. Sent through Apple's Push Notification service.</li>
    <li><strong>Basic presence</strong> — a timestamp of when you were last active, used only to show friends whether you're currently online.</li>
  </ul>

  <div class="note">Straight does not use third-party analytics, advertising, or tracking SDKs. Nothing collected here is sold or shared with advertisers.</div>

  <h2>How your information is used</h2>
  <ul>
    <li>To operate core features: matching you into games, tracking friend balances, sending scheduled-game reminders and other in-app notifications.</li>
    <li>To keep your account secure (session tokens, sign-in verification).</li>
    <li>We do not use your data for advertising, and we do not sell it to third parties.</li>
  </ul>

  <h2>Who we share it with</h2>
  <p>Your data isn't shared outside the app except with the infrastructure that makes it run:</p>
  <ul>
    <li><strong>Railway</strong> — our cloud hosting provider, which stores the app's database and runs its server.</li>
    <li><strong>Apple</strong> — for Sign in with Apple and for delivering push notifications to your device.</li>
    <li><strong>Google</strong> — for Sign in with Google, if you choose that option.</li>
  </ul>
  <p>Other players only see what the app's features are designed to show them — e.g. friends can see your display name, username, online status, and the game/ledger history you share with them. Strangers cannot see your data.</p>

  <h2>Data retention and deletion</h2>
  <p>We keep your account data for as long as your account exists. To request deletion of your account and associated data, email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> from the address associated with your account, and it will be deleted within a reasonable time.</p>

  <h2>Children's privacy</h2>
  <p>Straight is not directed at children under 13, and we do not knowingly collect personal information from anyone under 13.</p>

  <h2>Changes to this policy</h2>
  <p>If this policy changes, the update will be reflected on this page with a new "last updated" date and, where required, released alongside the app version it applies to.</p>

  <h2>Contact</h2>
  <p>Questions about this policy or your data can be sent to <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
</main>
</body>
</html>`;
