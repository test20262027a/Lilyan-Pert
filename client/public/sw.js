/*
 * Lilyan Pert service worker — background new-order notifications.
 *
 * This is what makes an order arrive while the admin panel is in another tab,
 * minimised, or closed: the server pushes to the device, and this worker shows
 * the system notification and plays the operating system's own alert sound.
 * It never relies on a page being open.
 *
 * One alert per order per device:
 *   - the page is visible  → the app raises its own toast and ringtone, so the
 *                            system card is silent;
 *   - no visible page      → the system card carries the alert (the OS sound),
 *                            and any open page only refreshes its badge.
 * The order id is the notification tag, so a re-delivery of the same order
 * replaces its card instead of stacking a second one.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

/*
 * A deliberate pass-through: nothing is cached and nothing is intercepted, so
 * every request still goes straight to the network and a deploy is never held
 * behind a stale copy. Its presence is what makes this worker the installed
 * app's worker — the condition a browser checks before it offers a real
 * Home Screen installation instead of a shortcut that opens in a browser tab.
 */
self.addEventListener('fetch', () => {});

/*
 * The VAPID key is written here by the page when it subscribes, so a renewal
 * can be signed even while no page is open (a push-subscription rotation is
 * announced to the worker alone).
 */
const DB_NAME = 'lilyan-push';
const STORE = 'keys';

function readVapidKey() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const db = request.result;
        try {
          const tx = db.transaction(STORE, 'readonly');
          const get = tx.objectStore(STORE).get('vapid');
          get.onsuccess = () => resolve(get.result || null);
          get.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

function keyToBytes(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/*
 * The browser replaced this device's subscription (Firefox announces it, some
 * browsers silently rotate it). The new endpoint is registered again with the
 * backend, using the session cookie the worker shares with the page.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const key = await readVapidKey();
        if (!key) return;
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyToBytes(key),
        });
        await fetch('/api/manage/push/subscribe', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
      } catch {
        /* the next page load restores it */
      }
    })(),
  );
});

/*
 * Every category the backend can push keeps its own tag, so a review and an
 * order never replace each other's card.
 */
const PUSH_TYPES = { new_order: 'order', review: 'review', activity: 'activity', test: 'test' };

async function readPayload(event) {
  try {
    return event.data ? event.data.json() : {};
  } catch {
    return { title: 'Lilyan Pert', body: event.data ? event.data.text() : '' };
  }
}

function tagOf(payload) {
  const kind = PUSH_TYPES[payload.type] || 'message';
  const entity = payload.orderId || payload.entityId || null;
  return entity ? `${kind}-${entity}` : `lilyan-${kind}`;
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const payload = await readPayload(event);
      if (payload.type && !PUSH_TYPES[payload.type]) return;

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
        // Silent exactly when an open, visible panel is already ringing that
        // same new order; every other card keeps the OS alert sound.
        silent: visible && payload.type === 'new_order',
        // The payload names its own language, so the OS lays the card out with
        // the right direction even for mixed table and product names.
        lang: payload.lang || undefined,
        dir: payload.dir || undefined,
        tag: tagOf(payload),
        renotify: true,
        timestamp: Date.now(),
        data: {
          url: payload.url || '/',
          orderId: payload.orderId || null,
          category: payload.category || payload.type || null,
        },
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
      // No window to reuse: open the app once, already on the target order.
      await self.clients.openWindow(url);
    })(),
  );
});
