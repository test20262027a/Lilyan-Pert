/*
 * Lilyan Pert service worker — background new-order notifications.
 *
 * This is what makes an order audible while the admin panel is in another tab,
 * minimised, or closed: the server pushes to the device, and this worker shows
 * the system notification. It never relies on the page being open.
 *
 * One alert per order per device:
 *   - the page is visible  → the panel itself rings the chosen ringtone and
 *                            raises its toast, so the system card is silent;
 *   - no visible page      → the system card carries the alert (the OS sound),
 *                            and any open page only refreshes its badge.
 * The order id is the notification tag, so a re-delivery of the same order
 * replaces its card instead of stacking a second one.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

async function readPayload(event) {
  try {
    return event.data ? event.data.json() : {};
  } catch {
    return { title: 'Lilyan Pert', body: event.data ? event.data.text() : '' };
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const payload = await readPayload(event);
      if (payload.type && payload.type !== 'new_order' && payload.type !== 'test') return;

      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const visible = windows.some((client) => client.visibilityState === 'visible');

      for (const client of windows) {
        client.postMessage({
          type: 'lilyan:new-order',
          orderId: payload.orderId || null,
          // true when the system card below is the one that made the sound
          quiet: !visible,
        });
      }

      await self.registration.showNotification(payload.title || 'Lilyan Pert', {
        body: payload.body || '',
        icon: payload.icon || '/apple-touch-icon.png',
        badge: '/apple-touch-icon.png',
        // Silent exactly when the open panel is already ringing.
        silent: visible && payload.type === 'new_order',
        tag: payload.orderId ? `order-${payload.orderId}` : 'lilyan-message',
        renotify: true,
        data: { url: payload.url || '/', orderId: payload.orderId || null },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url = '/', orderId = null } = event.notification.data || {};

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        // The open panel routes in place: the order opens in the existing
        // details modal, with no full page reload and no lost state.
        client.postMessage({ type: 'lilyan:open-order', orderId, url });
        try {
          await client.focus();
          return;
        } catch {
          /* a window we cannot focus — try the next one */
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
