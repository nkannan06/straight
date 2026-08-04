// Static support page served at GET /support. App Store Connect requires a
// Support URL that's publicly reachable with no auth -- same reasoning as
// privacyPage.js, and deliberately styled to match it.
const CONTACT_EMAIL = 'nitishkannan2024@gmail.com';

export const supportPageHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Support — Straight</title>
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
  .sub { color: #6b6a5f; font-size: 14px; margin-bottom: 40px; }
  h2 { font-size: 19px; margin-top: 36px; margin-bottom: 8px; }
  p, li { color: #2e2f24; font-size: 15px; }
  ul { padding-left: 20px; }
  a { color: #b8933f; }
  .contact {
    background: #f0ede2; border-left: 3px solid #b8933f;
    padding: 16px 20px; border-radius: 4px; margin: 20px 0;
  }
  .contact a { font-weight: 600; font-size: 16px; }
</style>
</head>
<body>
<main>
  <h1>Support</h1>
  <p class="sub">Straight — poker with friends</p>

  <div class="contact">
    <p style="margin:0 0 4px">Need help with anything below, or something not covered here?</p>
    <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
  </div>

  <h2>Signing in</h2>
  <ul>
    <li>You can sign in with email/password, Sign in with Apple, or Sign in with Google. If Apple or Google sign-in fails, try email/password instead and email us the details — which option you used and roughly when it happened.</li>
    <li>Forgot your password? Email us from the address on your account and we'll help you regain access.</li>
  </ul>

  <h2>Games and tables</h2>
  <ul>
    <li>Games are joined with a 6-character room code shared by whoever created the table — no real money is involved; buy-ins and cash-outs are a self-reported record between friends.</li>
    <li>If you get disconnected mid-hand, reopening the app and rejoining with the same room code will reconnect you to your seat.</li>
    <li>Only the host can change blinds, adjust game settings, or remove a player from a table.</li>
  </ul>

  <h2>Friends and the ledger</h2>
  <ul>
    <li>Add friends by username from the Friends tab. Both people need to accept before you're connected.</li>
    <li>The Ledger tab tracks running balances across games with each friend — it's a shared record you and your friends maintain, not a payment system.</li>
  </ul>

  <h2>Reporting a bug</h2>
  <p>Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> with what happened, what you expected instead, and — if you can — the approximate time and your device model. Screenshots help a lot.</p>

  <h2>Account deletion or privacy questions</h2>
  <p>See the <a href="/privacy">Privacy Policy</a>, or email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> directly to request your data be deleted.</p>
</main>
</body>
</html>`;
