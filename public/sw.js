/* Basic Service Worker for Web Push */
/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Zentik';
    event.waitUntil(self.registration.showNotification(title, data));
  } catch (e) {
    // Fallback if non-JSON payload
    event.waitUntil(self.registration.showNotification('Zentik', { body: event.data && event.data.text() }));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification && event.notification.data;
  const action = event.action; // e.g. 'NAVIGATE:/path' or other action

  // Try to broadcast the action to open clients first
  const broadcastToClients = async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      try {
        client.postMessage({ type: 'notification-action', action, data });
      } catch (e) {}
    }
    return clientList;
  };

  event.waitUntil(
    (async () => {
      const clients = await broadcastToClients();
      // If it's a navigation action or there are no clients, open/focus window
      if (!clients.length || (action && action.startsWith('NAVIGATE:'))) {
        const url = (action && action.startsWith('NAVIGATE:')) ? action.substring('NAVIGATE:'.length) : (data && data.url ? data.url : '/');
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      } else {
        // Focus the first client
        for (const client of clients) {
          if ('focus' in client) return client.focus();
        }
      }
    })()
  );
});


