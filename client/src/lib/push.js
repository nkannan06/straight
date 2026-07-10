import { Capacitor } from '@capacitor/core';
import { getToken } from './auth.js';
import { SERVER_HTTP_URL } from './config.js';

// Real APNs delivery needs an Apple Developer account + push key (deferred).
// Until then this still does the real client-side work — permission
// request, token registration, tap-to-deep-link — against the server's
// already-live /api/push endpoints, so nothing here needs to change once
// credentials land; only server/push.js's send function does.

// Listeners must only be attached once (attaching twice would double-fire
// every event), but the actual permission/register call must NOT be gated
// the same way — if the very first attempt in this app session failed for
// any reason (permission dismissed, missing capability, transient APNs
// hiccup), a "run once" guard around the whole function would silently
// block every retry until the app is fully force-quit and relaunched, even
// across sign-out/sign-in. So only the listener attachment is one-shot.
let listenersAdded = false;

async function registerToken(token) {
  const authToken = getToken();
  if (!authToken) {
    console.error('[push] got a device token but no auth token yet — cannot register it');
    return;
  }
  try {
    const res = await fetch(`${SERVER_HTTP_URL}/api/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ platform: Capacitor.getPlatform(), token }),
    });
    if (!res.ok) {
      console.error('[push] server rejected device token registration:', res.status, await res.text().catch(() => ''));
      return;
    }
    console.log('[push] device token registered with server');
  } catch (err) {
    console.error('[push] network error registering device token:', err.message);
  }
}

export async function initPushNotifications({ onNotificationTap } = {}) {
  if (!Capacitor.isNativePlatform()) return;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  if (!listenersAdded) {
    listenersAdded = true;
    PushNotifications.addListener('registration', (token) => registerToken(token.value));
    PushNotifications.addListener('registrationError', (err) => {
      console.error('[push] registration failed', err);
    });
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      onNotificationTap?.(action.notification?.data);
    });
  }

  const permission = await PushNotifications.checkPermissions();
  if (permission.receive !== 'granted') {
    const requested = await PushNotifications.requestPermissions();
    if (requested.receive !== 'granted') return;
  }

  // Safe to call every time initPushNotifications runs (e.g. every sign-in)
  // — re-registering for remote notifications is a normal, idempotent iOS
  // operation, not something that needs its own guard.
  await PushNotifications.register();
}
