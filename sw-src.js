/* global self, workbox */
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

// Take over immediately
clientsClaim();
self.skipWaiting();

// Injected by workbox at build time
precacheAndRoute(self.__WB_MANIFEST || []);

// Custom listeners: keep your existing code below
self.addEventListener('message', (event) => {
  // Example: postMessage from app to trigger actions
  if (!event || !event.data) return;
  if (event.data.type === 'PING') {
    event.ports && event.ports[0] && event.ports[0].postMessage('PONG');
  }
});

self.addEventListener('push', (event) => {
  // Forward raw push payload to window clients or show notification
  const data = (event && event.data && event.data.json && event.data.json()) || {};
  const title = data.title || 'Zentik';
  const options = data.options || { body: data.body, data };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'notification-action', data: event.notification?.data });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});


