import { Platform } from 'react-native';
import * as BackgroundFetch from 'expo-background-task';
import * as Device from 'expo-device';
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
import { ensureLocaleLoaded, translateInstant, Locale } from '@/hooks/useI18n';
import { settingsService } from '@/services/settings-service';
import { checkChangelogUpdates } from '@/utils/changelogUtils';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import packageJson from '../package.json';
import { createAutoDbBackupNow } from './db-auto-backup';
import { installConsoleLoggerBridge } from './console-logger-hook';
import { logger, saveTaskToFile } from './logger';

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

const MIN_INTERVAL_MINUTES = 15;

async function runTask(
  taskName: string,
  fn: () => Promise<TaskRunResult>,
  startedMessage?: string
): Promise<typeof BackgroundFetch.BackgroundTaskResult.Success | typeof BackgroundFetch.BackgroundTaskResult.Failed> {
  installConsoleLoggerBridge();
  await saveTaskToFile(taskName, 'started', startedMessage ?? `${taskName} started`);

  try {
    const result = await fn();
    await saveTaskToFile(taskName, 'completed', result.message, result.meta);
    return BackgroundFetch.BackgroundTaskResult.Success;
  } catch (e) {
    await saveTaskToFile(taskName, 'failed', `${taskName} failed`, { error: String(e) });
    return BackgroundFetch.BackgroundTaskResult.Failed;
  }
}

function secondsToMinutes(seconds: number): number {
  return Math.max(MIN_INTERVAL_MINUTES, Math.ceil(seconds / 60));
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
      return runTask(
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
    logger.warn('Failed to define DB auto-backup task', e, 'Tasks');
  }

  try {
    TaskManager.defineTask(NOTIFICATION_REFRESH_TASK, async () => {
      return runTask(
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
    logger.warn('Failed to define notifications refresh task', e, 'Tasks');
  }

  try {
    TaskManager.defineTask(CHANGELOG_CHECK_TASK, async () => {
      return runTask(
        CHANGELOG_CHECK_TASK,
        async () => {
          const apiBase = settingsService.getApiBaseWithPrefix().replace(/\/$/, '');

          let changelogData: ChangelogsForModalQuery | undefined;
          try {
            const res = await fetch(`${apiBase}/changelogs`);
            if (!res.ok) {
              logger.warn('Failed to fetch changelogs via REST', { status: res.status }, 'ChangelogBackgroundTask');
            } else {
              const list = (await res.json()) as ChangelogsForModalQuery['changelogs'];
              changelogData = { changelogs: list };
            }
          } catch (e) {
            logger.warn('Error fetching changelogs via REST', e, 'ChangelogBackgroundTask');
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
            logger.warn('Failed to fetch backend version', e, 'ChangelogBackgroundTask');
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

          await ensureLocaleLoaded(locale);

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
    logger.warn('Failed to define changelog task', e, 'Tasks');
  }

  try {
    TaskManager.defineTask(NO_PUSH_CHECK_TASK, async () => {
      return runTask(
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
              logger.warn(`Failed to schedule notification for ${notification.id}`, error, 'NoPushCheckTask');
            }
          }

          const latestNotificationId = noPushUnreceived[0].id;
          let markedReceived = false;
          if (globalUpdateReceivedNotificationsCallback) {
            try {
              await globalUpdateReceivedNotificationsCallback({ id: latestNotificationId });
              markedReceived = true;
            } catch (e) {
              logger.warn('Failed to mark notifications as received', e, 'NoPushCheckTask');
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
    logger.warn('Failed to define NO_PUSH check task', e, 'Tasks');
  }

  try {
    TaskManager.defineTask(CLOUDKIT_SYNC_TASK, async () => {
      return runTask(
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
    logger.warn('Failed to define CloudKit sync task', e, 'Tasks');
  }
}

export async function enableDbAutoBackupTask(options?: { intervalMinutes?: number }): Promise<void> {
  if (isWeb) return;

  if (Platform.OS === 'ios' && !Device.isDevice) {
    logger.info('Background tasks unavailable on iOS simulator', undefined, 'Tasks');
    return;
  }

  const intervalMinutes = options?.intervalMinutes ?? 6 * 60;

  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundTaskStatus.Restricted) {
      logger.warn('Background task restricted on this device', { status: BackgroundFetch.BackgroundTaskStatus[status] }, 'Tasks');
      return;
    }

    try {
      await BackgroundFetch.registerTaskAsync(DB_AUTO_BACKUP_TASK, {
        minimumInterval: intervalMinutes,
      });
      logger.info(`DB auto-backup task registered (interval: ${intervalMinutes} min)`, undefined, 'Tasks');
    } catch (e) {
      logger.warn('DB auto-backup registration failed', (e as any)?.message ?? e, 'Tasks');
    }
  } catch (e) {
    logger.warn('Error enabling DB auto-backup', e, 'Tasks');
  }
}

export async function disableDbAutoBackupTask(): Promise<void> {
  if (isWeb) return;
  try {
    await BackgroundFetch.unregisterTaskAsync(DB_AUTO_BACKUP_TASK);
  } catch {}
}

export async function enablePushBackgroundTasks(options?: {
  notificationsRefreshMinimumIntervalSeconds?: number;
  changelogCheckMinimumIntervalMinutes?: number;
  noPushCheckMinimumIntervalMinutes?: number;
  cloudKitSyncMinimumIntervalMinutes?: number;
}): Promise<void> {
  if (isWeb) return;

  if (Platform.OS === 'ios' && !Device.isDevice) {
    logger.info('Background tasks unavailable on iOS simulator', undefined, 'Tasks');
    return;
  }

  const notificationsRefreshMinutes = secondsToMinutes(options?.notificationsRefreshMinimumIntervalSeconds ?? 180);
  const changelogCheckMinutes = options?.changelogCheckMinimumIntervalMinutes ?? 15;
  const noPushCheckMinutes = options?.noPushCheckMinimumIntervalMinutes ?? 15;
  const cloudKitSyncMinutes = options?.cloudKitSyncMinimumIntervalMinutes ?? 15;

  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundTaskStatus.Restricted) {
      logger.warn('Background tasks restricted on this device', { status: BackgroundFetch.BackgroundTaskStatus[status] }, 'Tasks');
      return;
    }

    const registerWithLog = async (taskName: string, minimumIntervalMinutes: number) => {
      if (!TaskManager.isTaskDefined(taskName)) {
        logger.warn(`Cannot register '${taskName}': task is not defined`, undefined, 'Tasks');
        return;
      }

      try {
        await BackgroundFetch.registerTaskAsync(taskName, { minimumInterval: minimumIntervalMinutes });
        logger.info(`${taskName} registered (interval: ${minimumIntervalMinutes} min)`, undefined, 'Tasks');
      } catch (e) {
        logger.warn(`${taskName} registration failed`, (e as any)?.message ?? e, 'Tasks');
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

    await registerWithLog(NOTIFICATION_REFRESH_TASK, notificationsRefreshMinutes);
    await registerWithLog(CHANGELOG_CHECK_TASK, changelogCheckMinutes);
    await registerWithLog(NO_PUSH_CHECK_TASK, noPushCheckMinutes);
    if (Platform.OS === 'ios') {
      await registerWithLog(CLOUDKIT_SYNC_TASK, cloudKitSyncMinutes);
    }
  } catch (error) {
    logger.error('Error enabling push background tasks', error, 'Tasks');
  }
}

export async function initializeBackgroundTasks(): Promise<void> {
  if (isWeb) return;
  await enableDbAutoBackupTask({ intervalMinutes: 6 * 60 });
}

export async function triggerBackgroundTasksForTesting(): Promise<boolean> {
  if (isWeb) return false;
  try {
    return await BackgroundFetch.triggerTaskWorkerForTestingAsync();
  } catch (e) {
    logger.warn('Failed to trigger background tasks for testing', e, 'Tasks');
    return false;
  }
}
