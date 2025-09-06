/*
 Web Push Notifications service (PWA)
 - Attempts to request Notification permission
 - Optionally subscribes to PushManager if supported (requires a service worker and VAPID public key)
 - Exposes a unified API similar to native services
*/

import { DevicePlatform, RegisterDeviceDto, UserDeviceFragment } from '@/generated/gql-operations-generated';
import { NotificationActionCallbacks } from '@/hooks/useNotificationActions';

export interface WebPushInitOptions {
  vapidPublicKey?: string;
  serviceWorkerPath?: string;
}

class WebPushNotificationService {
  private ready = false;
  private pushSubscription: PushSubscription | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private callbacks: NotificationActionCallbacks | null = null;
  private listenerAttached = false;

  async initialize(callbacks: NotificationActionCallbacks) {
    if (typeof window === 'undefined') return null;

    try {
      this.callbacks = callbacks;
      // Request Notification permission
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }

      // Register SW and subscribe to push if supported and permitted
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const swPath = '/sw.js';
        const reg = await navigator.serviceWorker.register(swPath);
        // Ensure active registration
        this.swRegistration = reg.active ? reg : await navigator.serviceWorker.ready;
        this.pushSubscription = await this.swRegistration.pushManager.getSubscription();

        // Attach listener for actions coming from Service Worker
        this.attachServiceWorkerActionListener();
      }
      this.ready = true;
      return this.getDeviceInfo();
    } catch (e) {
      this.ready = false;
      console.error('❌ Web Push initialization failed:', e);
      return null;
    }
  }

  isReady() {
    return this.ready;
  }

  getDeviceToken(): string | null {
    return this.pushSubscription?.endpoint ?? null;
  }

  async unregisterDevice() {
    return this.pushSubscription?.unsubscribe();
  }

  async registerDevice(device: UserDeviceFragment) {
    const publicKey = device.publicKey;

    if (this.pushSubscription) {
      this.pushSubscription.unsubscribe();
      this.pushSubscription = null;
    }

    if (this.swRegistration && publicKey && this.callbacks) {
      const applicationServerKey = this.urlBase64ToUint8Array(publicKey);
      this.pushSubscription = await this.swRegistration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });

      if (this.pushSubscription) {
        const json = this.pushSubscription.toJSON();

        const endpoint = json.endpoint || this.pushSubscription?.endpoint || undefined;
        await this.callbacks.useUpdateUserDevice({
          deviceId: device.id,
          subscriptionFields: {
            endpoint,
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
          },
          deviceToken: endpoint
        });
      }

      return this.pushSubscription.endpoint;
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

    const handler = (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || payload.type !== 'notification-action') return;

      const actionStr: string = payload.action || '';
      const notificationId: string | undefined = payload.data?.notificationId;

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
}

export const webPushNotificationService = new WebPushNotificationService();


