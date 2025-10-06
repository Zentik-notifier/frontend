// sw-template.js

// Importa le librerie di Workbox (verranno caricate da CDN)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Questo è un segnaposto. Workbox CLI lo sostituirà con l'elenco dei file da precache.
// NON MODIFICARE QUESTA LINEA
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

// --- LOGICA PER LE NOTIFICHE PUSH ---

// Common IndexedDB helper function
async function withIndexedDB(successCallback, mode = 'readonly', storeName = 'keyvalue') {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('zentik-storage', 6);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      try {
        successCallback(store, resolve, reject);
      } catch (error) {
        reject(error);
      }
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('keyvalue')) {
        db.createObjectStore('keyvalue');
      }
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications');
      }
      if (!db.objectStoreNames.contains('media_item')) {
        db.createObjectStore('media_item');
      }
      if (!db.objectStoreNames.contains('cache_item')) {
        db.createObjectStore('cache_item');
      }
    };
  });
}

// IndexedDB helper for service worker
async function storeIntentInIndexedDB(intentData) {
  return withIndexedDB((store, resolve, reject) => {
    const putRequest = store.put(JSON.stringify(intentData), 'pending_navigation_intent');

    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () => reject(putRequest.error);
  }, 'readwrite');
}

// Priority order for media types: IMAGE > GIF > VIDEO > AUDIO
function getMediaTypePriority(mediaType) {
  const priorities = {
    'IMAGE': 1,
    'GIF': 2,
    'VIDEO': 3,
    'AUDIO': 4
  };
  return priorities[mediaType?.toUpperCase()] || 999;
}

// Select the first attachment based on priority
function selectFirstAttachmentForPrefetch(attachmentData) {
  // Filter out invalid attachments
  console.log('[Service Worker] Selecting first attachment for prefetch:', attachmentData);
  const validAttachments = attachmentData.filter(attachment =>
    attachment &&
    attachment.url &&
    attachment.mediaType &&
    typeof attachment.url === 'string' &&
    attachment.url.startsWith('http')
  );

  if (validAttachments.length === 0) {
    return null;
  }

  // Sort by priority and return the first one
  validAttachments.sort((a, b) => {
    const priorityA = getMediaTypePriority(a.mediaType);
    const priorityB = getMediaTypePriority(b.mediaType);
    return priorityA - priorityB;
  });

  return validAttachments[0];
}

// Generate cache key for cache_item table - must match React app implementation
function generateCacheItemKey(url, mediaType) {
  return `${String(mediaType).toUpperCase()}_${url}`;
}

// Generate cache key for media_item table - must match React app implementation
function generateMediaCacheKey(url, mediaType) {
  // Generate hash like React app does
  function generateLongHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash * 31 + char) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  // Get file extension like React app does
  function getFileExtension(url, mediaType) {
    switch (mediaType) {
      case 'VIDEO':
        return 'mp4';
      case 'IMAGE':
        return 'jpg';
      case 'GIF':
        return 'gif';
      case 'AUDIO':
        return 'mp3';
      default:
        return 'jpg';
    }
  }

  const hash = generateLongHash(url);
  const safeFileName = `${String(mediaType).toLowerCase()}_${hash}`;
  const extension = getFileExtension(url, mediaType);
  return `${String(mediaType).toUpperCase()}/${safeFileName}.${extension}`;
}

// Prefetch media attachment and save to IndexedDB
async function prefetchMediaAttachment(attachment, notificationId) {
  if (!attachment || !attachment.url || !attachment.mediaType) {
    console.log('[Service Worker] Invalid attachment for prefetch:', attachment);
    return null;
  }

  const { url, mediaType } = attachment;
  const cacheItemKey = generateCacheItemKey(url, mediaType);
  const mediaItemKey = generateMediaCacheKey(url, mediaType);

  console.log(`[Service Worker] Prefetching media attachment: ${mediaType} from ${url}`);
  console.log(`[Service Worker] Cache item key: ${cacheItemKey}`);
  console.log(`[Service Worker] Media item key: ${mediaItemKey}`);

  try {
    // Use backend proxy to fetch the media data (bypasses CORS)
    const credentials = await getApiCredentials();
    if (!credentials) {
      throw new Error('No API credentials available for media proxy');
    }

    const proxyUrl = `${credentials.apiEndpoint}/api/v1/attachments/proxy-media?url=${encodeURIComponent(url)}`;
    console.log(`[Service Worker] Using backend proxy for media: ${proxyUrl}`);

    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${credentials.authToken}`,
        'Accept': 'image/*,video/*,audio/*,*/*',
        'User-Agent': 'Zentik-Notifier-ServiceWorker/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend proxy failed: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const size = arrayBuffer.byteLength;

    console.log(`[Service Worker] Media downloaded: ${size} bytes from ${url}`);

    // Save to media_item table in IndexedDB with media_item key
    await saveMediaItemToIndexedDB(mediaItemKey, arrayBuffer);

    // Update cache_item with download status using cache_item key and media_item key as localPath
    await updateCacheItemForPrefetch(cacheItemKey, url, mediaType, size, notificationId, undefined, mediaItemKey);

    console.log(`[Service Worker] Media prefetched successfully: ${mediaItemKey}`);
    
    // Log successful prefetch
    if (notificationId) {
      logToDatabase(
        'INFO',
        'ServiceWorker',
        '[Media] Media prefetched successfully',
        {
          notificationId: notificationId,
          mediaType: mediaType,
          url: url,
          size: size
        }
      ).catch(e => console.error('[Service Worker] Failed to log prefetch:', e));
    }
    
    return { cacheKey: cacheItemKey, mediaKey: mediaItemKey, size, mediaType };

  } catch (error) {
    console.error(`[Service Worker] Failed to prefetch media attachment:`, error);
    
    // Log prefetch error
    if (notificationId) {
      logToDatabase(
        'ERROR',
        'ServiceWorker',
        '[Media] Failed to prefetch media',
        {
          notificationId: notificationId,
          mediaType: mediaType,
          url: url,
          error: error.message || String(error)
        }
      ).catch(e => console.error('[Service Worker] Failed to log prefetch error:', e));
    }
    
    // Update cache item with error status
    await updateCacheItemForPrefetch(cacheItemKey, url, mediaType, 0, notificationId, error.message);
    throw error;
  }
}

// Save media item to IndexedDB media_item table
async function saveMediaItemToIndexedDB(key, data) {
  return withIndexedDB((store, resolve, reject) => {
    const mediaItem = {
      key,
      data,
    };

    const putRequest = store.put(mediaItem, key);

    putRequest.onsuccess = () => {
      console.log(`[Service Worker] Media item saved to IndexedDB: ${key}`);
      resolve();
    };
    putRequest.onerror = () => reject(putRequest.error);
  }, 'readwrite', 'media_item');
}

// Update cache_item table for prefetched media
async function updateCacheItemForPrefetch(key, url, mediaType, size, notificationId, errorCode = undefined, localPath = undefined) {
  return withIndexedDB((store, resolve, reject) => {
    const cacheItem = {
      key,
      url,
      localPath: localPath, // The media_item key that contains the actual data
      localThumbPath: undefined,
      generatingThumbnail: false,
      timestamp: Date.now(),
      size,
      mediaType,
      originalFileName: undefined,
      downloadedAt: errorCode ? undefined : Date.now(),
      notificationDate: Date.now(),
      isDownloading: false,
      isPermanentFailure: !!errorCode,
      isUserDeleted: false,
      errorCode,
      notificationId
    };

    const putRequest = store.put(cacheItem, key);

    putRequest.onsuccess = () => {
      console.log(`[Service Worker] Cache item updated for prefetch: ${key}`);
      resolve();
    };
    putRequest.onerror = () => reject(putRequest.error);
  }, 'readwrite', 'cache_item');
}

// Save notification to IndexedDB notifications table (same format as notification-repository)
async function storePendingNotification(notificationData) {
  try {
    const now = new Date().toISOString();
    
    // Build NotificationFragment
    const notificationFragment = {
      __typename: 'Notification',
      id: notificationData.notificationId,
      receivedAt: now,
      readAt: null,
      sentAt: now,
      createdAt: now,
      updatedAt: now,
      message: {
        __typename: 'Message',
        id: notificationData.notificationId, // Use same ID for message
        title: notificationData.title || '',
        body: notificationData.body || null,
        subtitle: notificationData.subtitle || null,
        sound: 'default',
        deliveryType: notificationData.deliveryType || 'PUSH',
        locale: null,
        snoozes: null,
        createdAt: now,
        updatedAt: now,
        attachments: (notificationData.attachmentData || []).map(att => ({
          __typename: 'MessageAttachment',
          mediaType: att.mediaType?.toUpperCase() || 'IMAGE',
          url: att.url || null,
          name: att.name || null,
          attachmentUuid: att.attachmentUuid || null,
          saveOnServer: att.saveOnServer !== undefined ? att.saveOnServer : null
        })),
        tapAction: notificationData.tapAction ? {
          __typename: 'NotificationAction',
          type: notificationData.tapAction.type?.toUpperCase() || 'OPEN_NOTIFICATION',
          value: notificationData.tapAction.value || null,
          title: notificationData.tapAction.title || null,
          icon: notificationData.tapAction.icon || null,
          destructive: notificationData.tapAction.destructive || false
        } : null,
        actions: (notificationData.actions || []).map(action => ({
          __typename: 'NotificationAction',
          type: action.type?.toUpperCase() || 'CUSTOM',
          value: action.value || null,
          title: action.title || null,
          icon: action.icon || null,
          destructive: action.destructive || false
        })),
        bucket: {
          __typename: 'Bucket',
          id: notificationData.bucketId || 'default',
          name: notificationData.bucketName || 'Default',
          description: null,
          color: null,
          icon: notificationData.bucketIconUrl || null,
          createdAt: now,
          updatedAt: now,
          isProtected: null,
          isPublic: null
        }
      }
    };
    
    // Prepare data for database
    const dbData = {
      id: notificationFragment.id,
      created_at: notificationFragment.createdAt,
      read_at: notificationFragment.readAt,
      bucket_id: notificationFragment.message.bucket.id,
      has_attachments: notificationFragment.message.attachments && notificationFragment.message.attachments.length > 0 ? 1 : 0,
      fragment: JSON.stringify(notificationFragment)
    };
    
    // Save to IndexedDB notifications table
    await withIndexedDB((store, resolve, reject) => {
      const putRequest = store.put(dbData, dbData.id);
      putRequest.onsuccess = () => {
        console.log('[Service Worker] ✅ Notification saved to IndexedDB:', dbData.id);
        
        // Log successful save
        logToDatabase(
          'INFO',
          'ServiceWorker',
          '[Database] Notification saved to IndexedDB',
          {
            notificationId: dbData.id,
            bucketId: dbData.bucket_id,
            hasAttachments: dbData.has_attachments === 1
          }
        ).catch(e => console.error('[Service Worker] Failed to log save:', e));
        
        resolve();
      };
      putRequest.onerror = () => reject(putRequest.error);
    }, 'readwrite', 'notifications');
    
  } catch (error) {
    console.error('[Service Worker] Failed to save notification to IndexedDB:', error);
    
    // Log error
    logToDatabase(
      'ERROR',
      'ServiceWorker',
      '[Database] Failed to save notification',
      {
        notificationId: notificationData.notificationId,
        error: error.message || String(error)
      }
    ).catch(e => console.error('[Service Worker] Failed to log error:', e));
    
    throw error;
  }
}

// Common method to handle notification actions (used by both tapAction and action buttons)
async function handleNotificationAction(actionType, actionValue, notificationData, event) {
  console.log('[Service Worker] Handling action:', actionType, actionValue);

  const notificationId = notificationData?.notificationId;
  const bucketId = notificationData?.bucketId;
  
  // Log action handling
  if (notificationId) {
    logToDatabase(
      'INFO',
      'ServiceWorker',
      '[Action] Handling notification action',
      {
        notificationId: notificationId,
        actionType: actionType,
        actionValue: actionValue
      }
    ).catch(e => console.error('[Service Worker] Failed to log action:', e));
  }

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

            // Remove from local IndexedDB notifications table
            try {
              await withIndexedDB((store, resolve, reject) => {
                const deleteRequest = store.delete(notificationId);
                deleteRequest.onsuccess = () => {
                  console.log('[Service Worker] ✅ Notification removed from IndexedDB:', notificationId);
                  
                  // Log deletion
                  logToDatabase(
                    'INFO',
                    'ServiceWorker',
                    '[Delete] Notification deleted from database',
                    { notificationId: notificationId }
                  ).catch(e => console.error('[Service Worker] Failed to log deletion:', e));
                  
                  resolve();
                };
                deleteRequest.onerror = () => reject(deleteRequest.error);
              }, 'readwrite', 'notifications');
            } catch (error) {
              console.error('[Service Worker] ⚠️ Failed to remove notification from IndexedDB:', error);
            }

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
            
            // Log error
            logToDatabase(
              'ERROR',
              'ServiceWorker',
              '[Delete] Failed to delete notification',
              {
                notificationId: notificationId,
                error: error.message || String(error)
              }
            ).catch(e => console.error('[Service Worker] Failed to log error:', e));
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
  
  // Log push notification received
  if (notificationId) {
    logToDatabase(
      'INFO',
      'ServiceWorker',
      '[Push] Notification push received',
      {
        notificationId: notificationId,
        bucketId: bucketId,
        hasAttachments: payload.attachments && payload.attachments.length > 0
      }
    ).catch(e => console.error('[Service Worker] Failed to log push received:', e));
  }

  // Build notification options with media attachments and actions
  const options = {
    body: body,
    // icon: '/logo192.png',
    icon: payload.bucketIcon ?? '/logo192.png',
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
      title: `${action.icon ? action.icon + ' ' : ''}${action.title || action.value}`,
    })),
    tag: `notification-${notificationId}`, // Prevent duplicate notifications
    requireInteraction: payload.deliveryType === 'CRITICAL', // Critical notifications stay visible
    silent: payload.deliveryType === 'SILENT' // Silent notifications don't make sound
  };

  console.log('[Service Worker] Showing notification:', title, options);

  // Store notification data for IndexedDB
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
    attachmentData: payload.attachments || [],
    deliveryType: payload.deliveryType || 'PUSH',
    timestamp: Date.now()
  };

  // Show notification, store as pending, notify the app, and prefetch media
  event.waitUntil(
    (async () => {
      try {
        // Show notification
        await self.registration.showNotification(title, options);

        // Save notification to IndexedDB
        try {
          await storePendingNotification(pendingNotificationData);
        } catch (error) {
          console.error('[Service Worker] Failed to save notification to IndexedDB:', error);
        }

        // Prefetch media attachment if available
        try {
          const attachmentData = payload.attachments || [];
          const attachmentToPrefetch = selectFirstAttachmentForPrefetch(attachmentData);

          if (attachmentToPrefetch) {
            console.log(`[Service Worker] Starting prefetch for notification ${notificationId}:`, attachmentToPrefetch.mediaType);
            await prefetchMediaAttachment(attachmentToPrefetch, notificationId);
            console.log(`[Service Worker] Prefetch completed for notification ${notificationId}`);
          } else {
            console.log(`[Service Worker] No suitable attachment found for prefetch in notification ${notificationId}`);
          }
        } catch (error) {
          console.error('[Service Worker] Failed to prefetch media attachment:', error);
          // Don't fail the entire notification process if prefetch fails
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
  return withIndexedDB((store, resolve, reject) => {
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

// Log to IndexedDB app_log table
async function logToDatabase(level, tag, message, metadata = null) {
  try {
    const now = Date.now();
    const logEntry = {
      id: `${now}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
      level: level.toUpperCase(),
      tag: tag,
      message: message,
      meta_json: metadata ? JSON.stringify(metadata) : null,
      timestamp: now
    };
    
    await withIndexedDB((store, resolve, reject) => {
      const addRequest = store.add(logEntry);
      addRequest.onsuccess = () => resolve();
      addRequest.onerror = () => reject(addRequest.error);
    }, 'readwrite', 'app_log');
  } catch (error) {
    // Silent fail to not break SW if logging fails
    console.error('[Service Worker] Failed to log to database:', error);
  }
}

// Common function to get pending notifications from IndexedDB
async function getPendingNotifications() {
  try {
    const result = await getStoredData('pending_notifications');
    return result || [];
  } catch (e) {
    console.error('[Service Worker] Failed to get pending notifications:', e);
    return [];
  }
}

// Common function to save pending notifications to IndexedDB
async function savePendingNotifications(pendingNotifications) {
  return withIndexedDB((store, resolve, reject) => {
    const putRequest = store.put(JSON.stringify(pendingNotifications), 'pending_notifications');
    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () => reject(putRequest.error);
  }, 'readwrite');
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