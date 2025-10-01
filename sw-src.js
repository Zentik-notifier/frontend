// sw-template.js

// Importa le librerie di Workbox (verranno caricate da CDN)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Questo è un segnaposto. Workbox CLI lo sostituirà con l'elenco dei file da precache.
// NON MODIFICARE QUESTA LINEA
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

// --- LOGICA PER LE NOTIFICHE PUSH ---

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


// 1. Evento 'push': si attiva quando il server invia una notifica push
// self.addEventListener('push', (event) => {
//   console.log('[Service Worker] Push Received.');

//   // Estrai i dati dalla notifica. Supponiamo che il server invii un JSON.
//   let payload;
//   if (event.data) {
//     payload = event.data.json();
//   } else {
//     // Fallback se non ci sono dati
//     payload = {
//       title: 'Notifica da Zentik',
//       body: 'Hai un nuovo messaggio!',
//       icon: '/icons/icon-192x192.png', // Assicurati che questa icona esista
//       data: { url: '/' } // URL da aprire al click
//     };
//   }

//   const options = {
//     body: payload.body,
//     icon: payload.icon || '/icons/icon-192x192.png',
//     badge: '/icons/badge-72x72.png', // Icona piccola per la barra di stato
//     data: {
//       url: payload.data.url // L'URL da aprire quando si clicca sulla notifica
//     }
//   };

//   // Mostra la notifica
//   event.waitUntil(self.registration.showNotification(payload.title, options));
// });


// 2. Evento 'notificationclick': si attiva quando l'utente clicca sulla notifica
// self.addEventListener('notificationclick', (event) => {
//   console.log('[Service Worker] Notification click Received.');

//   // Chiudi la notifica
//   event.notification.close();

//   // Apri la finestra dell'app all'URL specificato o alla pagina principale
//   const urlToOpen = event.notification.data.url || '/';

//   event.waitUntil(
//     clients.matchAll({ type: 'window' }).then((clientList) => {
//       // Se l'app è già aperta, mettila a fuoco
//       for (const client of clientList) {
//         if (client.url === urlToOpen && 'focus' in client) {
//           return client.focus();
//         }
//       }
//       // Altrimenti, apri una nuova finestra
//       if (clients.openWindow) {
//         return clients.openWindow(urlToOpen);
//       }
//     })
//   );
// });

// --- GESTIONE DEL CICLO DI VITA DEL SERVICE WORKER (Best Practice) ---

// Forza il nuovo service worker ad attivarsi subito
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Assicura che il service worker prenda il controllo della pagina subito
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});