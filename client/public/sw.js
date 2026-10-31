/* Service worker for Web Push: new orders only. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Lilyan Pert', body: event.data ? event.data.text() : '' };
  }
  if (payload.type && payload.type !== 'new_order') return;

  const title = payload.title || 'Lilyan Pert';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      tag: payload.orderId ? `order-${payload.orderId}` : 'lilyan-order',
      badge: '/icon-badge.png',
      icon: '/icon-badge.png',
      data: { url: payload.url || '/orders' },
      renotify: true,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/orders';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
