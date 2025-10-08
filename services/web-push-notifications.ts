/*
 Web Push Notifications service (PWA)
 - Attempts to request Notification permission
 - Optionally subscribes to PushManager if supported (requires a service worker and VAPID public key)
 - Exposes a unified API similar to native services
*/

import { DevicePlatform, RegisterDeviceDto, UserDeviceFragment } from '@/generated/gql-operations-generated';
import { NotificationActionCallbacks } from '@/hooks/useNotificationActions';
import { mediaCache } from './media-cache-service';

export interface WebPushInitOptions {
  vapidPublicKey?: string;
  serviceWorkerPath?: string;
}

class WebPushNotificationService {
  private pushSubscription: PushSubscription | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private callbacks: NotificationActionCallbacks | null = null;
  private listenerAttached = false;
  private isInitialized = false;

  async checkPermissions() {
    let isPwa = false;
    let hasPermissions = false;
    if (window && Notification) {
      isPwa = true;
      let finalResult = Notification.permission;
      if (finalResult === 'default') {
        finalResult = await Notification.requestPermission();
      }

      if (finalResult === 'granted') {
        hasPermissions = true;
      } else {
        console.error('[WebPushNotificationService] Web notification permission not granted');
      }
    } else {
      console.error('[WebPushNotificationService] Web app is not PWA');
    }

    return { isPwa, hasPermissions };
  }

  async initialize(callbacks: NotificationActionCallbacks) {
    let needsPwa = true;
    try {
      this.callbacks = callbacks;

      const { hasPermissions, isPwa } = await this.checkPermissions();
      needsPwa = !isPwa;

      if (!hasPermissions) {
        return { deviceInfo: null, hasPermissionError: true, needsPwa };
      }

      // Register SW and subscribe to push if supported and permitted
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const swPath = '/sw.js';
        const reg = await navigator.serviceWorker.register(swPath);

        console.log('[WebPushNotificationService] ServiceWorker registered status:', reg.active?.state);
        // Ensure active registration
        this.swRegistration = reg.active ? reg : await navigator.serviceWorker.ready;
        this.pushSubscription = await this.swRegistration.pushManager.getSubscription();

        console.log('[WebPushNotificationService] PushSubscription endpoint generated', this.pushSubscription?.endpoint);

        // Attach listener for actions coming from Service Worker
        this.attachServiceWorkerActionListener();
      } else {
        console.error('[WebPushNotificationService] ServiceWorker not found in /sw.js');
      }
    } catch (e) {
      console.error('[WebPushNotificationService] Error initializing:', e);
    } finally {
      this.isInitialized = true;
      return { deviceInfo: this.getDeviceInfo(), hasPermissionError: false, needsPwa };
    }
  }

  getDeviceToken(): string | null {
    return this.pushSubscription?.endpoint ?? null;
  }

  async unregisterDevice() {
    return this.pushSubscription?.unsubscribe();
  }

  async registerDevice(device: UserDeviceFragment) {
    const { hasPermissions } = await this.checkPermissions();
    let infoJson: PushSubscriptionJSON | null = null;

    if (!hasPermissions) {
      return { infoJson, hasPermissionError: true };
    }

    const publicKey = device.publicKey;

    try {
      if (this.pushSubscription) {
        console.log('🔄 Unsubscribing from web push subscription');
        await this.pushSubscription.unsubscribe();
        this.pushSubscription = null;
      }

      if (this.swRegistration && publicKey) {
        const applicationServerKey = this.urlBase64ToUint8Array(publicKey);
        const newSub = await this.swRegistration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });

        const json = newSub?.toJSON();

        console.log('[WebPushNotificationService] New subscription registration', JSON.stringify({
          applicationServerKey,
          publicKey,
          newSub: json
        }));

        infoJson = json;
        this.pushSubscription = await this.swRegistration.pushManager.getSubscription();
      } else {
        console.error('[WebPushNotificationService] Public key not found');
      }
    } catch (e) {
      console.error('[WebPushNotificationService] Registration failed:', e);
    } finally {
      return { infoJson, hasPermissionError: false };
    }
  }

  getDeviceInfo(): RegisterDeviceDto | null {
    const json = (this.pushSubscription && this.pushSubscription.toJSON && this.pushSubscription.toJSON()) || {} as any;
    return {
      deviceName: (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : 'Web',
      deviceModel: 'Web',
      platform: DevicePlatform.Web,
      osVersion: 'web',
      deviceToken: this.getDeviceToken(),
      subscriptionFields: {
        endpoint: json.endpoint || this.pushSubscription?.endpoint || undefined,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      }
    };
  }

  private attachServiceWorkerActionListener() {
    if (typeof window === 'undefined' || this.listenerAttached) return;
    if (!('serviceWorker' in navigator)) return;
    if (!this.callbacks) return;

    const handler = async (event: MessageEvent) => {
      const payload = event.data;
      if (!payload) return;

      console.log('[WebPushNotificationService] Received message:', payload);

      await mediaCache.reloadMetadata();

      // Handle notification-tap-action messages (from tapAction)
      if (payload.type === 'notification-tap-action') {
        const { action, value, notificationId } = payload;

        console.log('[WebPushNotificationService] Handling tap action:', action, value);
        // Execute the action based on type
        try {
          this.callbacks?.executeAction(notificationId || '', {
            __typename: 'NotificationAction',
            type: action as any,
            value,
            title: '',
            icon: '',
            destructive: false,
          } as any);
        } catch (e) {
          console.error('Failed to execute SW tap action', e);
        }
        return;
      }

      // Handle notification-action messages (from action buttons)
      if (payload.type === 'notification-action') {
        const actionStr: string = payload.action || '';
        const notificationId: string | undefined = payload.notificationId;

        // Se non c'è un'azione esplicita, gestiamo il tapAction come navigate
        if (!actionStr && payload?.data?.tapAction?.type === 'NAVIGATE') {
          this.callbacks?.onNavigate?.(payload.data.tapAction.value);
          return;
        }

        // Azione nel formato TYPE:value (es. NAVIGATE:/path)
        const [type, ...rest] = actionStr.split(':');
        const value = rest.join(':');

        // Esegue l'azione raw tramite executeAction costruendo un oggetto compatibile
        try {
          this.callbacks?.executeAction(notificationId || '', {
            __typename: 'NotificationAction',
            type: type as any,
            value,
            title: '',
            icon: '',
            destructive: false,
          } as any);
        } catch (e) {
          console.error('Failed to execute SW notification action', e);
        }
        return;
      }

      // Handle notification-click messages (fallback)
      if (payload.type === 'notification-click') {
        const { url, notificationId } = payload;
        console.log('[WebPushNotificationService] Handling notification click:', url);

        // Navigate to the URL
        if (url && url !== '/') {
          this.callbacks?.onNavigate?.(url);
        }
        return;
      }

      // Handle notification-received messages (new notification arrived)
      if (payload.type === 'notification-received') {
        const { notificationId, title, body, bucketId, bucketName, bucketIconUrl, tapAction, actions, timestamp } = payload;
        console.log('[WebPushNotificationService] New notification received:', {
          notificationId,
          title,
          bucketId,
          bucketName
        });

        if (this.callbacks?.pushNotificationReceived) {
          this.callbacks.pushNotificationReceived(notificationId);
        }

        return;
      }

      // Handle notification-action-completed messages (action completed by service worker)
      if (payload.type === 'notification-action-completed') {
        const { action, notificationId, success, error, invalidateQueries } = payload;
        console.log('[WebPushNotificationService] Action completed by service worker:', {
          action,
          notificationId,
          success,
          error,
          invalidateQueries
        });

        if (success) {
          // Handle specific actions
          if (action === 'DELETE') {
            // Remove notification from GraphQL cache
            if (this.callbacks?.onDelete) {
              this.callbacks.onDelete(notificationId);
            }
          } else if (action === 'MARK_AS_READ') {
            // Mark notification as read in GraphQL cache
            if (this.callbacks?.onMarkAsRead) {
              this.callbacks.onMarkAsRead(notificationId);
            }
          } else {
            // For other actions, refresh the notification list
            if (this.callbacks?.pushNotificationReceived) {
              this.callbacks.pushNotificationReceived(notificationId);
            }
          }
          
          // Invalidate React Query cache if requested
          if (invalidateQueries && this.callbacks?.pushNotificationReceived) {
            // Use pushNotificationReceived to trigger React Query invalidation
            // This will refresh all notification queries
            console.log('[WebPushNotificationService] Invalidating React Query cache');
            this.callbacks.pushNotificationReceived(notificationId);
          }
        } else {
          console.error('[WebPushNotificationService] Action failed:', error);
        }

        return;
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    this.listenerAttached = true;
  }

  private urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  isReady(): boolean {
    return this.isInitialized && !!this.getDeviceToken();
  }
}

export const webPushNotificationService = new WebPushNotificationService();


