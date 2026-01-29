import { Platform } from 'react-native';
import * as BackgroundFetch from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { apolloClient } from '@/config/apollo-client';
import {
  ChangelogsForModalQuery,
  GetBackendVersionDocument,
  GetNotificationsDocument,
  GetNotificationsQuery,
  NotificationDeliveryType,
  NotificationFragment,
} from '@/generated/gql-operations-generated';
import { translateInstant, Locale } from '@/hooks/useI18n';
import { settingsService } from '@/services/settings-service';
import { checkChangelogUpdates } from '@/utils/changelogUtils';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import packageJson from '../package.json';
import { createAutoDbBackupNow } from './db-auto-backup';
import { installConsoleLoggerBridge } from './console-logger-hook';
import { saveTaskToFile } from './logger';

export const DB_AUTO_BACKUP_TASK = 'zentik-db-auto-backup';
export const NOTIFICATION_REFRESH_TASK = 'zentik-notifications-refresh';
export const CHANGELOG_CHECK_TASK = 'zentik-changelog-check';
export const NO_PUSH_CHECK_TASK = 'zentik-no-push-check';
export const CLOUDKIT_SYNC_TASK = 'zentik-cloudkit-sync';

const isWeb = Platform.OS === 'web';

type TaskRunResult = {
  message: string;
  meta?: Record<string, any>;
};

async function runTask(taskName: string, fn: () => Promise<TaskRunResult>, startedMessage?: string) {
  installConsoleLoggerBridge();
  await saveTaskToFile(taskName, 'started', startedMessage ?? `${taskName} started`);

  try {
    const result = await fn();
    await saveTaskToFile(taskName, 'completed', result.message, result.meta);
  } catch (e) {
    console.warn(`[Tasks] ${taskName} failed:`, e);
    await saveTaskToFile(taskName, 'failed', `${taskName} failed`, { error: String(e) });
  }
}

// Global references for task callbacks (set by hooks during runtime)
let globalCleanupCallback:
  | ((options: { force: boolean; onRotateDeviceKeys?: () => Promise<boolean> }) => Promise<void>)
  | null = null;
let globalRegisterDeviceCallback: (() => Promise<boolean>) | null = null;
let globalUpdateReceivedNotificationsCallback:
  | ((variables: { id: string }) => Promise<any>)
  | null = null;

export function setPushBackgroundTaskCallbacks(callbacks: {
  cleanup: (options: { force: boolean; onRotateDeviceKeys?: () => Promise<boolean> }) => Promise<void>;
  registerDevice: () => Promise<boolean>;
  updateReceivedNotifications: (variables: { id: string }) => Promise<any>;
}): void {
  globalCleanupCallback = callbacks.cleanup;
  globalRegisterDeviceCallback = callbacks.registerDevice;
  globalUpdateReceivedNotificationsCallback = callbacks.updateReceivedNotifications;
}

// Define tasks in global scope (best-effort) so the OS can launch them.
if (!isWeb) {
  try {
    TaskManager.defineTask(DB_AUTO_BACKUP_TASK, async () => {
      await runTask(
        DB_AUTO_BACKUP_TASK,
        async () => {
          const backup = await createAutoDbBackupNow({ keepCopies: 3 });
          return {
            message: 'DB auto-backup task completed',
            meta: {
              backupUri: backup?.uri,
              backupName: backup?.name,
              timestamp: backup?.timestamp,
            },
          };
        },
        'DB auto-backup task started'
      );
    });
  } catch (e) {
    console.warn('[Tasks] Failed to define DB auto-backup task:', e);
  }

  try {
    TaskManager.defineTask(NOTIFICATION_REFRESH_TASK, async () => {
      await runTask(
        NOTIFICATION_REFRESH_TASK,
        async () => {
          if (!globalCleanupCallback || !globalRegisterDeviceCallback) {
            throw new Error('Cleanup/register callbacks not available yet');
          }

          await globalCleanupCallback({
            force: true,
            onRotateDeviceKeys: globalRegisterDeviceCallback as () => Promise<boolean>,
          });

          return { message: 'Notifications refresh task completed successfully' };
        },
        'Notifications refresh task started'
      );
    });
  } catch (e) {
    console.warn('[Tasks] Failed to define notifications refresh task:', e);
  }

  try {
    TaskManager.defineTask(CHANGELOG_CHECK_TASK, async () => {
      await runTask(
        CHANGELOG_CHECK_TASK,
        async () => {
          const apiBase = settingsService.getApiBaseWithPrefix().replace(/\/$/, '');

          let changelogData: ChangelogsForModalQuery | undefined;
          try {
            const res = await fetch(`${apiBase}/changelogs`);
            if (!res.ok) {
              console.warn('[ChangelogBackgroundTask] Failed to fetch changelogs via REST:', res.status);
            } else {
              const list = (await res.json()) as ChangelogsForModalQuery['changelogs'];
              changelogData = { changelogs: list };
            }
          } catch (e) {
            console.warn('[ChangelogBackgroundTask] Error fetching changelogs via REST', e);
          }

          let backendVersion: string | null | undefined = undefined;
          try {
            if (apolloClient) {
              const backendRes = await apolloClient.query({
                query: GetBackendVersionDocument,
                fetchPolicy: 'network-only',
              });
              backendVersion = (backendRes.data as any)?.getBackendVersion;
            }
          } catch (e) {
            console.warn('[ChangelogBackgroundTask] Failed to fetch backend version', e);
          }

          const showNativeVersion = Platform.OS !== 'web';
          const nativeVersion = showNativeVersion
            ? Constants.expoConfig?.version || 'unknown'
            : undefined;
          const appVersion = (packageJson as any).version || 'unknown';

          const { latestEntry, unreadIds, shouldOpenModal } = checkChangelogUpdates(changelogData, {
            appVersion,
            backendVersion,
            nativeVersion,
          });

          if (!shouldOpenModal || !latestEntry || unreadIds.length === 0) {
            return {
              message: 'No new changelog entries to show',
              meta: { appVersion, backendVersion, nativeVersion },
            };
          }

          const settings = settingsService.getSettings();
          const locale = (settings.locale || 'en-EN') as Locale;

          const title = translateInstant(locale, 'changelog.backgroundNotificationTitle') as string;
          const bodyTemplate = translateInstant(locale, 'changelog.backgroundNotificationBody') as string;

          const body =
            (bodyTemplate.includes('{{version}}') && latestEntry.uiVersion
              ? bodyTemplate.replace('{{version}}', latestEntry.uiVersion)
              : bodyTemplate) || latestEntry.description;

          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data: { changelogId: latestEntry.id },
            },
            trigger: null,
          });

          return {
            message: 'Changelog notification scheduled',
            meta: {
              changelogId: latestEntry.id,
              unreadCount: unreadIds.length,
              appVersion,
              backendVersion,
            },
          };
        },
        'Changelog check task started'
      );
    });
  } catch (e) {
    console.warn('[Tasks] Failed to define changelog task:', e);
  }

  try {
    TaskManager.defineTask(NO_PUSH_CHECK_TASK, async () => {
      await runTask(
        NO_PUSH_CHECK_TASK,
        async () => {
          if (!apolloClient) {
            throw new Error('Apollo client not available');
          }

          const result = await apolloClient.query<GetNotificationsQuery>({
            query: GetNotificationsDocument,
            fetchPolicy: 'network-only',
          });
          const notifications: NotificationFragment[] = result.data?.notifications || [];

          if (notifications.length === 0) {
            return { message: 'No notifications found', meta: { notificationCount: 0 } };
          }

          const noPushUnreceived: NotificationFragment[] = notifications.filter(
            (notification: NotificationFragment) =>
              notification.message.deliveryType === NotificationDeliveryType.NoPush &&
              !notification.receivedAt
          );

          if (noPushUnreceived.length === 0) {
            return {
              message: 'No unreceived NO_PUSH notifications found',
              meta: { totalNotifications: notifications.length, unreceivedCount: 0 },
            };
          }

          for (const notification of noPushUnreceived) {
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: notification.message.title,
                  body: notification.message.body || notification.message.subtitle || '',
                  data: {
                    id: notification.id,
                    route: `/notification/${notification.id}`,
                    bucketId: notification.message.bucket.id,
                    bucketColor: notification.message.bucket.color,
                    deliveryType: notification.message.deliveryType,
                  },
                },
                trigger: null,
              });
            } catch (error) {
              console.warn(`[NoPushCheckTask] Failed to schedule notification for ${notification.id}:`, error);
            }
          }

          const latestNotificationId = noPushUnreceived[0].id;
          let markedReceived = false;
          if (globalUpdateReceivedNotificationsCallback) {
            try {
              await globalUpdateReceivedNotificationsCallback({ id: latestNotificationId });
              markedReceived = true;
            } catch (e) {
              console.warn('[NoPushCheckTask] Failed to mark notifications as received:', e);
            }
          }

          return {
            message: `Processed ${noPushUnreceived.length} NO_PUSH notifications`,
            meta: {
              totalNotifications: notifications.length,
              processedCount: noPushUnreceived.length,
              latestNotificationId,
              markedReceived,
              hasUpdateCallback: !!globalUpdateReceivedNotificationsCallback,
            },
          };
        },
        'NO_PUSH check task started'
      );
    });
  } catch (e) {
    console.warn('[Tasks] Failed to define NO_PUSH check task:', e);
  }

  try {
    TaskManager.defineTask(CLOUDKIT_SYNC_TASK, async () => {
      await runTask(
        CLOUDKIT_SYNC_TASK,
        async () => {
          if (Platform.OS !== 'ios') {
            return { message: 'CloudKit sync task skipped (not iOS)' };
          }
          const { default: iosBridgeService } = await import('@/services/ios-bridge');
          const result = await iosBridgeService.retryNSENotificationsToCloudKit();
          return {
            message: 'CloudKit sync task completed',
            meta: { pushedCount: result.count, success: result.success },
          };
        },
        'CloudKit sync task started'
      );
    });
  } catch (e) {
    console.warn('[Tasks] Failed to define CloudKit sync task:', e);
  }
}

export async function enableDbAutoBackupTask(options?: { intervalSeconds?: number }): Promise<void> {
  if (isWeb) return;

  const intervalSeconds = options?.intervalSeconds ?? 6 * 60 * 60;

  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundTaskStatus.Restricted) {
      console.warn('[Tasks] Background task restricted on this device');
      return;
    }

    try {
      await BackgroundFetch.registerTaskAsync(DB_AUTO_BACKUP_TASK, {
        minimumInterval: intervalSeconds,
      });
    } catch {
      console.debug('[Tasks] ℹ️ DB auto-backup already registered or not supported');
    }
  } catch (e) {
    console.warn('[Tasks] Error enabling DB auto-backup:', e);
  }
}

export async function disableDbAutoBackupTask(): Promise<void> {
  if (isWeb) return;
  try {
    await BackgroundFetch.unregisterTaskAsync(DB_AUTO_BACKUP_TASK);
  } catch {}
}

export async function enablePushBackgroundTasks(options?: {
  notificationsRefreshMinimumInterval?: number;
  changelogCheckMinimumInterval?: number;
  noPushCheckMinimumInterval?: number;
  cloudKitSyncMinimumInterval?: number;
}): Promise<void> {
  if (isWeb) return;

  const notificationsRefreshMinimumInterval = options?.notificationsRefreshMinimumInterval ?? 180;
  const changelogCheckMinimumInterval = options?.changelogCheckMinimumInterval ?? 15;
  const noPushCheckMinimumInterval = options?.noPushCheckMinimumInterval ?? 15;
  const cloudKitSyncMinimumInterval = options?.cloudKitSyncMinimumInterval ?? 60;

  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundTaskStatus.Restricted) {
      console.warn('[Tasks] Background tasks are restricted on this device');
      return;
    }

    const registerWithLog = async (taskName: string, minimumInterval: number) => {
      if (!TaskManager.isTaskDefined(taskName)) {
        console.warn(`[Tasks] Cannot register '${taskName}': task is not defined`);
        return;
      }

      try {
        await BackgroundFetch.registerTaskAsync(taskName, { minimumInterval });
      } catch (e) {
        console.debug(`[Tasks] ℹ️ ${taskName} already registered or not supported`, e);
      }
    };

    try {
      await BackgroundFetch.unregisterTaskAsync(NOTIFICATION_REFRESH_TASK);
    } catch {}
    try {
      await BackgroundFetch.unregisterTaskAsync(CHANGELOG_CHECK_TASK);
    } catch {}
    try {
      await BackgroundFetch.unregisterTaskAsync(NO_PUSH_CHECK_TASK);
    } catch {}
    try {
      await BackgroundFetch.unregisterTaskAsync(CLOUDKIT_SYNC_TASK);
    } catch {}

    await registerWithLog(NOTIFICATION_REFRESH_TASK, notificationsRefreshMinimumInterval);
    await registerWithLog(CHANGELOG_CHECK_TASK, changelogCheckMinimumInterval);
    await registerWithLog(NO_PUSH_CHECK_TASK, noPushCheckMinimumInterval);
    if (Platform.OS === 'ios') {
      await registerWithLog(CLOUDKIT_SYNC_TASK, cloudKitSyncMinimumInterval);
    }
  } catch (error) {
    console.error('[Tasks] Error enabling push background tasks:', error);
  }
}

export async function initializeBackgroundTasks(): Promise<void> {
  // Best-effort initialization of tasks that do not require hook callbacks.
  await enableDbAutoBackupTask({ intervalSeconds: 6 * 60 * 60 });
}
