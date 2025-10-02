// sw-template.js

// Importa le librerie di Workbox (verranno caricate da CDN)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Questo è un segnaposto. Workbox CLI lo sostituirà con l'elenco dei file da precache.
// NON MODIFICARE QUESTA LINEA
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

// --- LOGICA PER LE NOTIFICHE PUSH ---

// IndexedDB helper for service worker
function storeIntentInIndexedDB(intentData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zentik-storage', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['keyvalue'], 'readwrite');
      const store = transaction.objectStore('keyvalue');

      const putRequest = store.put(JSON.stringify(intentData), 'pending_navigation_intent');

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('keyvalue')) {
        db.createObjectStore('keyvalue');
      }
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications');
      }
    };
  });
}

// Store pending notification for processing when app opens
async function storePendingNotification(notificationData) {
  try {
    const pendingNotifications = await getPendingNotifications();
    
    // Add new notification
    pendingNotifications.push({
      notificationId: notificationData.notificationId,
      title: notificationData.title,
      body: notificationData.body,
      subtitle: notificationData.subtitle,
      bucketId: notificationData.bucketId,
      bucketName: notificationData.bucketName,
      bucketIconUrl: notificationData.bucketIconUrl,
      tapAction: notificationData.tapAction,
      actions: notificationData.actions,
      attachmentData: notificationData.attachmentData,
      timestamp: notificationData.timestamp || Date.now()
    });

    // Limit to last 50 notifications
    const limitedNotifications = pendingNotifications.length > 50 
      ? pendingNotifications.slice(-50) 
      : pendingNotifications;

    await savePendingNotifications(limitedNotifications);
    console.log('[Service Worker] ✅ Pending notification stored:', notificationData.notificationId);
  } catch (error) {
    console.error('[Service Worker] Failed to store pending notification:', error);
    throw error;
  }
}

// Common method to handle notification actions (used by both tapAction and action buttons)
async function handleNotificationAction(actionType, actionValue, notificationData, event) {
  console.log('[Service Worker] Handling action:', actionType, actionValue);

  const notificationId = notificationData?.notificationId;
  const bucketId = notificationData?.bucketId;

  switch (actionType) {
    case 'NAVIGATE':
      // Navigate to external URL or internal route
      event.waitUntil(
        (async () => {
          try {
            const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            
            if (clientList.length > 0) {
              // App is open, send navigation message
              const focusedClient = clientList.find(client => client.focused) || clientList[0];
              focusedClient.postMessage({
                type: 'notification-tap-action',
                action: 'NAVIGATE',
                value: actionValue,
                notificationId: notificationId,
                bucketId: bucketId,
                data: notificationData
              });
              await focusedClient.focus();
            } else {
              // App not open, handle external vs internal URLs
              const isExternalUrl = actionValue.startsWith('http://') || actionValue.startsWith('https://');

              if (isExternalUrl) {
                // For external URLs, open in new tab/window
                console.log('[Service Worker] Opening external URL:', actionValue);
                if (self.clients.openWindow) {
                  try {
                    await self.clients.openWindow(actionValue);
                  } catch (error) {
                    console.error('[Service Worker] Failed to open external URL:', error);
                    // Fallback: open app and send message
                    const newClient = await self.clients.openWindow('/');
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
                  }
                }
              } else {
                // For internal routes, store intent and open app
                console.log('[Service Worker] Storing navigation intent:', actionValue);
                if (self.clients.openWindow) {
                  // Store navigation intent
                  const intentData = {
                    type: 'NAVIGATE',
                    value: actionValue,
                    notificationId: notificationId,
                    bucketId: bucketId,
                    timestamp: Date.now()
                  };

                  try {
                    await storeIntentInIndexedDB(intentData);
                    console.log('[Service Worker] Stored navigation intent:', intentData);
                    // Open app and let it handle the intent from IndexedDB
                    await self.clients.openWindow('/');
                  } catch (error) {
                    console.error('[Service Worker] Failed to store intent:', error);
                    // Still open app even if storage fails
                    await self.clients.openWindow('/');
                  }
                }
              }
            }
          } catch (error) {
            console.error('[Service Worker] Error in NAVIGATE action:', error);
          }
        })()
      );
      break;

    case 'OPEN_NOTIFICATION':
      // Open notification detail page
      const value = actionValue || notificationId;
      event.waitUntil(
        (async () => {
          try {
            const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            
            if (clientList.length > 0) {
              const focusedClient = clientList.find(client => client.focused) || clientList[0];
              focusedClient.postMessage({
                type: 'notification-tap-action',
                action: 'OPEN_NOTIFICATION',
                value: notificationId,
                notificationId: notificationId,
                bucketId: bucketId,
                data: notificationData
              });
              await focusedClient.focus();
            } else {
              // App is closed, store intent and open app
              if (self.clients.openWindow) {
                // Store the notification intent
                const intentData = {
                  type: 'OPEN_NOTIFICATION',
                  notificationId: notificationId,
                  value: notificationId,
                  bucketId: bucketId,
                  timestamp: Date.now()
                };

                try {
                  await storeIntentInIndexedDB(intentData);
                  console.log('[Service Worker] Stored notification intent:', intentData);
                  // Open app and let it handle the intent from IndexedDB
                  await self.clients.openWindow('/');
                } catch (error) {
                  console.error('[Service Worker] Failed to store intent:', error);
                  // Still open app even if storage fails
                  await self.clients.openWindow('/');
                }
              }
            }
          } catch (error) {
            console.error('[Service Worker] Error in OPEN_NOTIFICATION action:', error);
          }
        })()
      );
      break;

    case 'BACKGROUND_CALL':
      // Execute background API call
      event.waitUntil(
        (async () => {
          try {
            const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            
            if (clientList.length > 0) {
              // App is open, send message to app
              const focusedClient = clientList.find(client => client.focused) || clientList[0];
              focusedClient.postMessage({
                type: 'notification-tap-action',
                action: 'BACKGROUND_CALL',
                value: actionValue,
                notificationId: notificationId,
                bucketId: bucketId,
                data: notificationData
              });
              await focusedClient.focus();
            } else {
              // App is closed, execute background call directly
              const [method, url] = actionValue.split('::');

              if (!url) {
                console.error('[Service Worker] ❌ Invalid background call format:', actionValue);
                return;
              }

              console.log(`[Service Worker] 📞 Executing background call: ${method || 'GET'} ${url}`);

              try {
                const response = await fetch(url, {
                  method: method || 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });

                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                console.log('[Service Worker] ✅ Background call executed successfully');
              } catch (error) {
                console.error('[Service Worker] ❌ Failed to execute background call:', error);
              }
            }
          } catch (error) {
            console.error('[Service Worker] Error in BACKGROUND_CALL action:', error);
          }
        })()
      );
      break;

    case 'MARK_AS_READ':
      // Mark notification as read
      event.waitUntil(
        (async () => {
          try {
            await executeApiCall(`/notifications/${notificationId}/read`, 'PATCH');
            console.log('[Service Worker] ✅ Notification marked as read:', notificationId);
            
            // Notify app to refresh cache
            const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            if (clientList.length > 0) {
              const focusedClient = clientList.find(client => client.focused) || clientList[0];
              focusedClient.postMessage({
                type: 'notification-action-completed',
                action: 'MARK_AS_READ',
                notificationId: notificationId,
                success: true
              });
            }
          } catch (error) {
            console.error('[Service Worker] ❌ Failed to mark notification as read:', error);
          }
        })()
      );
      break;

    case 'DELETE':
      // Delete notification
      event.waitUntil(
        (async () => {
          try {
            await executeApiCall(`/notifications/${notificationId}`, 'DELETE');
            console.log('[Service Worker] ✅ Notification deleted from server:', notificationId);

            // Also remove from local IndexedDB cache
            await removeNotificationFromCache(notificationId);
            console.log('[Service Worker] ✅ Notification removed from local cache:', notificationId);
            
            // Also remove from pending notifications if it exists
            await removePendingNotification(notificationId);
            console.log('[Service Worker] ✅ Pending notification removed for notification:', notificationId);
            
            // Notify app to refresh cache
            const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            if (clientList.length > 0) {
              const focusedClient = clientList.find(client => client.focused) || clientList[0];
              focusedClient.postMessage({
                type: 'notification-action-completed',
                action: 'DELETE',
                notificationId: notificationId,
                success: true
              });
            }
          } catch (error) {
            console.error('[Service Worker] ❌ Failed to delete notification:', error);
          }
        })()
      );
      break;

    case 'SNOOZE': {
      const minutes = parseInt(actionValue, 10);
      if (isNaN(minutes) || minutes <= 0) {
        console.error('[Service Worker] ❌ Invalid snooze duration:', actionValue);
        return;
      }

      event.waitUntil(
        (async () => {
          try {
            await executeApiCall(`/buckets/${bucketId}/snooze-minutes`, 'POST', { minutes });
            console.log(`[Service Worker] ✅ Bucket ${bucketId} snoozed for ${minutes} minutes`);
          } catch (error) {
            console.error('[Service Worker] ❌ Failed to snooze bucket:', error);
          }
        })()
      );
      break;
    }

    case 'WEBHOOK':
      event.waitUntil(
        (async () => {
          try {
            await executeApiCall(`/webhooks/${actionValue}/execute`, 'POST');
            console.log('[Service Worker] ✅ Webhook executed:', actionValue);
          } catch (error) {
            console.error('[Service Worker] ❌ Failed to execute webhook:', error);
          }
        })()
      );
      break;

    default:
      console.warn('[Service Worker] Unknown action type:', actionType);
      // Fallback to default URL navigation
      event.waitUntil(
        (async () => {
          try {
            const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            
            if (clientList.length > 0) {
              const focusedClient = clientList.find(client => client.focused) || clientList[0];
              focusedClient.postMessage({
                type: 'notification-click',
                url: actionValue || '/',
                notificationId: notificationId,
                bucketId: bucketId,
                data: notificationData
              });
              await focusedClient.focus();
            } else {
              if (self.clients.openWindow) {
                // Try to open the actionValue if it's a valid URL, otherwise fallback to '/'
                const fallbackUrl = actionValue || '/';
                try {
                  await self.clients.openWindow(fallbackUrl);
                } catch (error) {
                  console.error('[Service Worker] Failed to open fallback URL:', error);
                  await self.clients.openWindow('/');
                }
              }
            }
          } catch (error) {
            console.error('[Service Worker] Error in default action:', error);
          }
        })()
      );
  }
}

self.addEventListener('push', (event) => {

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

  console.log('[Service Worker] Push Received:', payload);

  const title = payload.title || 'Zentik';
  const body = payload.body || '';
  const url = payload.url || '/';
  const notificationId = payload.notificationId;
  const bucketId = payload.bucketId;
  const actions = payload.actions || [];

  // Build notification options with media attachments and actions
  const options = {
    body: body,
    icon: '/logo192.png',
    // icon: payload.image ?? payload.bucketIcon,
    image: payload.image ?? payload.bucketIcon,
    badge: '/logo72.png',
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

  // Store notification as pending for processing when app opens
  const pendingNotificationData = {
    notificationId: notificationId,
    title: title,
    body: body,
    subtitle: payload.subtitle,
    bucketId: bucketId,
    bucketName: payload.bucketName,
    bucketIconUrl: payload.bucketIcon,
    tapAction: payload.tapAction,
    actions: actions,
    attachmentData: payload.attachmentData || [],
    timestamp: Date.now()
  };

  // Show notification, store as pending, and notify the app
  event.waitUntil(
    (async () => {
      try {
        // Show notification
        await self.registration.showNotification(title, options);
        
        // Store as pending notification
        try {
          await storePendingNotification(pendingNotificationData);
        } catch (error) {
          console.error('[Service Worker] Failed to store pending notification:', error);
        }
        
        // Notify the app about the new notification
        try {
          const clients = await self.clients.matchAll({ includeUncontrolled: true });
          clients.forEach(client => {
            client.postMessage({
              type: 'notification-received',
              notificationId: notificationId,
              title: title,
              body: body,
              bucketId: bucketId,
              bucketName: payload.bucketName,
              bucketIconUrl: payload.bucketIcon,
              tapAction: payload.tapAction,
              actions: actions,
              timestamp: Date.now()
            });
          });
        } catch (error) {
          console.error('[Service Worker] Failed to notify clients:', error);
        }
      } catch (error) {
        console.error('[Service Worker] Error in push event handler:', error);
      }
    })()
  );
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
      (async () => {
        try {
          const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          
          if (clientList.length > 0) {
            const focusedClient = clientList.find(client => client.focused) || clientList[0];
            focusedClient.postMessage({
              type: 'notification-click',
              url: url,
              notificationId: notificationId,
              bucketId: bucketId,
              data: notificationData
            });
            await focusedClient.focus();
          } else {
            if (self.clients.openWindow) {
              await self.clients.openWindow(url);
            }
          }
        } catch (error) {
          console.error('[Service Worker] Error in default notification click:', error);
        }
      })()
    );
  }
});

// Helper function to get stored data from IndexedDB
async function getStoredData(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zentik-storage', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['keyvalue'], 'readonly');
      const store = transaction.objectStore('keyvalue');

      const getRequest = store.get(key);
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          try {
            resolve(JSON.parse(getRequest.result));
          } catch (e) {
            resolve(getRequest.result);
          }
        } else {
          resolve(null);
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('keyvalue')) {
        db.createObjectStore('keyvalue');
      }
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications');
      }
    };
  });
}

// Get API endpoint and auth token for making authenticated requests
async function getApiCredentials() {
  try {
    const apiEndpoint = await getStoredData('api_endpoint');
    const authToken = await getStoredData('access_token');

    if (!apiEndpoint || !authToken) {
      console.warn('[Service Worker] Missing API credentials');
      return null;
    }

    return { apiEndpoint, authToken };
  } catch (error) {
    console.error('[Service Worker] Failed to get API credentials:', error);
    return null;
  }
}

// Execute API calls with authentication
async function executeApiCall(endpoint, method = 'GET', body = null) {
  const credentials = await getApiCredentials();
  if (!credentials) {
    throw new Error('No API credentials available');
  }

  const url = `${credentials.apiEndpoint}/api/v1${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${credentials.authToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log('[Service Worker] Making API call:', url, options);

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

// Remove notification from local IndexedDB cache
async function removeNotificationFromCache(notificationId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zentik-storage', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');

      const deleteRequest = store.delete(notificationId);
      deleteRequest.onsuccess = () => {
        console.log('[Service Worker] Removed notification from cache:', notificationId);
        resolve();
      };
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('keyvalue')) {
        db.createObjectStore('keyvalue');
      }
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications');
      }
    };
  });
}

// Common function to get pending notifications from IndexedDB
async function getPendingNotifications() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zentik-storage', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['keyvalue'], 'readonly');
      const store = transaction.objectStore('keyvalue');

      const getRequest = store.get('pending_notifications');
      getRequest.onsuccess = () => {
        let pendingNotifications = [];
        if (getRequest.result) {
          try {
            pendingNotifications = JSON.parse(getRequest.result);
          } catch (e) {
            console.error('[Service Worker] Failed to parse pending notifications:', e);
            pendingNotifications = [];
          }
        }
        resolve(pendingNotifications);
      };
      getRequest.onerror = () => reject(getRequest.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('keyvalue')) {
        db.createObjectStore('keyvalue');
      }
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications');
      }
    };
  });
}

// Common function to save pending notifications to IndexedDB
async function savePendingNotifications(pendingNotifications) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zentik-storage', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['keyvalue'], 'readwrite');
      const store = transaction.objectStore('keyvalue');

      const putRequest = store.put(JSON.stringify(pendingNotifications), 'pending_notifications');
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('keyvalue')) {
        db.createObjectStore('keyvalue');
      }
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications');
      }
    };
  });
}

// Remove pending notification for a specific notification ID
async function removePendingNotification(notificationId) {
  try {
    const pendingNotifications = await getPendingNotifications();
    
    // Filter out the notification to remove
    const filteredNotifications = pendingNotifications.filter(
      notification => notification.notificationId !== notificationId
    );

    if (filteredNotifications.length === pendingNotifications.length) {
      console.log('[Service Worker] No pending notification found for ID:', notificationId);
      return;
    }

    console.log('[Service Worker] Removing pending notification:', notificationId);
    await savePendingNotifications(filteredNotifications);
    console.log('[Service Worker] ✅ Pending notification removed:', notificationId);
  } catch (error) {
    console.error('[Service Worker] Failed to remove pending notification:', error);
    throw error;
  }
}

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