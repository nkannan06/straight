import { Capacitor } from '@capacitor/core';
import { getToken } from './auth.js';
import { SERVER_HTTP_URL } from './config.js';

// Real APNs delivery needs an Apple Developer account + push key (deferred).
// Until then this still does the real client-side work — permission
// request, token registration, tap-to-deep-link — against the server's
// already-live /api/push endpoints, so nothing here needs to change once
// credentials land; only server/push.js's send function does.

let started = false;

async function registerToken(token) {
  const authToken = getToken();
  if (!authToken) return;
  await fetch(`${SERVER_HTTP_URL}/api/push/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ platform: Capacitor.getPlatform(), token }),
  }).catch(() => {});
}

export async function initPushNotifications({ onNotificationTap } = {}) {
  if (started || !Capacitor.isNativePlatform()) return;
  started = true;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  const permission = await PushNotifications.checkPermissions();
  if (permission.receive !== 'granted') {
    const requested = await PushNotifications.requestPermissions();
    if (requested.receive !== 'granted') return;
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', (token) => registerToken(token.value));
  PushNotifications.addListener('registrationError', (err) => {
    console.error('[push] registration failed', err);
  });
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    onNotificationTap?.(action.notification?.data);
  });
}
