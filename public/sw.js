function handleNotificationAction(actionType, actionValue, notificationData, event) {
  console.log('[Service Worker] Handling action:', actionType, actionValue);

  const notificationId = notificationData?.notificationId;
  const bucketId = notificationData?.bucketId;

  switch (actionType) {
    case 'NAVIGATE':
      // Navigate to external URL or internal route
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          if (clientList.length > 0) {
            // App is open, send navigation message
            const focusedClient = clientList.find(client => client.focused) || clientList[0];
            focusedClient.postMessage({
              type: 'notification-tap-action',
              action: 'NAVIGATE',
              value: actionValue,
              notificationId: notificationId,
              bucketId: bucketId,
            });
            return focusedClient.focus();
          } else {
            // App not open, handle external vs internal URLs
            const isExternalUrl = actionValue.startsWith('http://') || actionValue.startsWith('https://');

            if (isExternalUrl) {
              // For external URLs, open in new tab/window
              console.log('[Service Worker] Opening external URL:', actionValue);
              if (self.clients.openWindow) {
                return self.clients.openWindow(actionValue).catch((error) => {
                  console.error('[Service Worker] Failed to open external URL:', error);
                  // Fallback: open app and send message
                  return self.clients.openWindow('/').then((newClient) => {
                    if (newClient) {
                      setTimeout(() => {
                        newClient.postMessage({
                          type: 'notification-tap-action',
                          action: 'NAVIGATE',
                          value: actionValue,
                          notificationId: notificationId,
                          bucketId: bucketId,
                          data: notificationData
                        });
                      }, 1000);
                    }
                  });
                });
              }
            } else {
              // For internal routes, store intent and open app
              console.log('[Service Worker] Storing navigation intent:', actionValue);
              if (self.clients.openWindow) {
                // Store navigation intent
                const intentData = {
                  type: 'navigation',
                  action: 'NAVIGATE',
                  value: actionValue,
                  notificationId: notificationId,
                  bucketId: bucketId,
                  timestamp: Date.now()
                };
                
                // Open app and send intent message after it loads
                return self.clients.openWindow('/').then((newClient) => {
                  if (newClient) {
                    console.log('[Service Worker] Storing navigation intent:', intentData);
                    // Send intent data to the new client after it loads
                    setTimeout(() => {
                      newClient.postMessage({
                        type: 'pending-intent',
                        intent: intentData,
                        data: notificationData
                      });
                    }, 1500); // Wait for app to load
                  }
                });
              }
            }
          }
        })
      );
      break;

    case 'OPEN_NOTIFICATION':
      // Open notification detail page
      const value = actionValue || notificationId;
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          if (clientList.length > 0) {
            const focusedClient = clientList.find(client => client.focused) || clientList[0];
            focusedClient.postMessage({
              type: 'notification-tap-action',
              action: 'OPEN_NOTIFICATION',
              value: notificationId,
              bucketId: bucketId,
              data: notificationData
            });
            return focusedClient.focus();
            } else {
              // App is closed, store intent and open app
              if (self.clients.openWindow) {
                // Store the notification intent
                const intentData = {
                  type: 'notification',
                  notificationId: notificationId,
                  action: 'OPEN_NOTIFICATION',
                  value: value,
                  bucketId: bucketId,
                  timestamp: Date.now()
                };
                
                // Open app and send intent message after it loads
                return self.clients.openWindow('/').then((newClient) => {
                  if (newClient) {
                    console.log('[Service Worker] Storing notification intent:', intentData);
                    // Send intent data to the new client after it loads
                    setTimeout(() => {
                      newClient.postMessage({
                        type: 'pending-intent',
                        intent: intentData,
                        data: notificationData
                      });
                    }, 1500); // Wait for app to load
                  }
                });
              }
            }
        })
      );
      break;

    case 'BACKGROUND_CALL':
      // Execute background API call
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          if (clientList.length > 0) {
            const focusedClient = clientList.find(client => client.focused) || clientList[0];
            focusedClient.postMessage({
              type: 'notification-tap-action',
              action: 'BACKGROUND_CALL',
              value: actionValue,
              notificationId: notificationId,
              bucketId: bucketId,
              data: notificationData
            });
            return focusedClient.focus();
          } else {
            // For background calls, we might want to execute them even if app is closed
            // But for now, just open the app and send the message
            if (self.clients.openWindow) {
              return self.clients.openWindow('/').then((newClient) => {
                if (newClient) {
                  setTimeout(() => {
                    newClient.postMessage({
                      type: 'notification-tap-action',
                      action: 'BACKGROUND_CALL',
                      value: actionValue,
                      notificationId: notificationId,
                      bucketId: bucketId,
                      data: notificationData
                    });
                  }, 1000);
                }
              });
            }
          }
        })
      );
      break;

    case 'MARK_AS_READ':
      // Mark notification as read
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          if (clientList.length > 0) {
            const focusedClient = clientList.find(client => client.focused) || clientList[0];
            focusedClient.postMessage({
              type: 'notification-tap-action',
              action: 'MARK_AS_READ',
              value: actionValue,
              notificationId: notificationId,
              bucketId: bucketId,
              data: notificationData
            });
            return focusedClient.focus();
          }
        })
      );
      break;

    case 'DELETE':
      // Delete notification
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          if (clientList.length > 0) {
            const focusedClient = clientList.find(client => client.focused) || clientList[0];
            focusedClient.postMessage({
              type: 'notification-tap-action',
              action: 'DELETE',
              value: actionValue,
              notificationId: notificationId,
              bucketId: bucketId,
              data: notificationData
            });
            return focusedClient.focus();
          }
        })
      );
      break;

    case 'SNOOZE':
      // Snooze notification
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          if (clientList.length > 0) {
            const focusedClient = clientList.find(client => client.focused) || clientList[0];
            focusedClient.postMessage({
              type: 'notification-tap-action',
              action: 'SNOOZE',
              value: actionValue,
              notificationId: notificationId,
              bucketId: bucketId,
              data: notificationData
            });
            return focusedClient.focus();
          }
        })
      );
      break;

    default:
      console.warn('[Service Worker] Unknown action type:', actionType);
      // Fallback to default URL navigation
      event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          if (clientList.length > 0) {
            const focusedClient = clientList.find(client => client.focused) || clientList[0];
            focusedClient.postMessage({
              type: 'notification-click',
              url: actionValue || '/',
              notificationId: notificationId,
              bucketId: bucketId,
              data: notificationData
            });
            return focusedClient.focus();
          } else {
            if (self.clients.openWindow) {
              // Try to open the actionValue if it's a valid URL, otherwise fallback to '/'
              const fallbackUrl = actionValue || '/';
              return self.clients.openWindow(fallbackUrl).catch((error) => {
                console.error('[Service Worker] Failed to open fallback URL:', error);
                return self.clients.openWindow('/');
              });
            }
          }
        })
      );
  }
}

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received:', event.data);

  let payload;
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      console.error('[Service Worker] Failed to parse push data:', e);
      payload = {};
    }
  } else {
    payload = {};
  }

  const title = payload.title || 'Zentik';
  const body = payload.body || '';
  const icon = payload.icon || '/icons/icon-192x192.png';
  const image = payload.image;
  const url = payload.url || '/';
  const notificationId = payload.notificationId;
  const bucketId = payload.bucketId;
  const actions = payload.actions || [];

  // Build notification options with media attachments and actions
  const options = {
    body: body,
    icon: icon,
    badge: '/icons/badge-72x72.png',
    image: image, // Large image attachment (if available)
    data: {
      url: url,
      notificationId: notificationId,
      bucketId: bucketId,
      tapAction: payload.tapAction,
      actions: actions
    },
    actions: actions.map(action => ({
      action: `${action.type}___${action.value}`,
      title: action.title || action.value,
      icon: action.icon || icon,
    })),
    tag: `notification-${notificationId}`, // Prevent duplicate notifications
    requireInteraction: payload.deliveryType === 'CRITICAL', // Critical notifications stay visible
    silent: payload.deliveryType === 'SILENT' // Silent notifications don't make sound
  };

  console.log('[Service Worker] Showing notification:', title, options);
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click:', event);

  event.notification.close();

  const notificationData = event.notification.data;
  const action = event.action;
  const url = notificationData?.url || '/';
  const notificationId = notificationData?.notificationId;
  const bucketId = notificationData?.bucketId;

  // Handle action buttons (if any were clicked)
  if (action && action !== 'default') {
    console.log('[Service Worker] Action clicked:', action);

    const [actionType, actionValue] = action.split('___');

    console.log('[Service Worker] Parsed action:', actionType, actionValue);

    // Use common handler for action buttons
    handleNotificationAction(actionType, actionValue, notificationData, event);
    return;
  }

  // Handle default notification click (tap on notification body)
  // Execute the tapAction if present, otherwise use default URL navigation
  const tapAction = notificationData?.tapAction;

  if (tapAction) {
    console.log('[Service Worker] Executing tapAction:', tapAction);

    // Use common handler for tapAction
    handleNotificationAction(tapAction.type, tapAction.value, notificationData, event);
  } else {
    // No tapAction, use default URL navigation
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          const focusedClient = clientList.find(client => client.focused) || clientList[0];
          focusedClient.postMessage({
            type: 'notification-click',
            url: url,
            notificationId: notificationId,
            bucketId: bucketId,
            data: notificationData
          });
          return focusedClient.focus();
        } else {
          if (self.clients.openWindow) {
            return self.clients.openWindow(url);
          }
        }
      })
    );
  }
});


// --- GESTIONE DEL CICLO DI VITA DEL SERVICE WORKER (Best Practice) ---

// Forza il nuovo service worker ad attivarsi subito
self.addEventListener('install', () => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Assicura che il service worker prenda il controllo della pagina subito
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(clients.claim());
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'PING') {
    // Respond to ping messages
    event.ports && event.ports[0] && event.ports[0].postMessage('PONG');
  }
});