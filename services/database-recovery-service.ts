import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

class SimpleEventEmitter {
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    const index = eventListeners.indexOf(listener);
    if (index > -1) {
      eventListeners.splice(index, 1);
    }
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    eventListeners.forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        console.error(
          `[DatabaseRecoveryService] Error in listener for event "${event}":`,
          error
        );
      }
    });
  }
}

export type DatabaseCorruptionReport = {
  errorMessage?: string;
  errorCode?: any;
  originalError?: any;
  source?: string;
  ts: number;
};

export type DatabaseRecoveryState = {
  visible: boolean;
  isRecovering: boolean;
  lastCorruption: DatabaseCorruptionReport | null;
  recoverySource?: 'local' | 'backend' | 'icloud' | null;
  statusMessage?: string | null;
  progressCurrent?: number | null;
  progressTotal?: number | null;
  lastRecoveryError?: string | null;
  lastBackupFiles?: string[] | null;
  lastExportFile?: string | null;
};

const EVENTS = {
  stateChanged: 'stateChanged',
} as const;

class DatabaseRecoveryService {
  private emitter = new SimpleEventEmitter();

  private state: DatabaseRecoveryState = {
    visible: false,
    isRecovering: false,
    lastCorruption: null,
    recoverySource: null,
    statusMessage: null,
    progressCurrent: null,
    progressTotal: null,
    lastRecoveryError: null,
    lastBackupFiles: null,
    lastExportFile: null,
  };

  getState(): DatabaseRecoveryState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.emitter.on(EVENTS.stateChanged, listener);
    return () => this.emitter.off(EVENTS.stateChanged, listener);
  }

  private setState(patch: Partial<DatabaseRecoveryState>) {
    this.state = { ...this.state, ...patch };
    this.emitter.emit(EVENTS.stateChanged);
  }

  private setStep(step: string | null, progress?: { current?: number | null; total?: number | null }) {
    this.setState({
      statusMessage: step,
      progressCurrent: progress?.current ?? null,
      progressTotal: progress?.total ?? null,
    });
  }

  isCorruptionError(error: any): boolean {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    return (
      errorCode === 11 ||
      errorCode === 'ERR_INTERNAL_SQLITE_ERROR' ||
      errorMessage.includes('database disk image is malformed') ||
      errorMessage.includes('malformed') ||
      (errorMessage.includes('finalizeAsync') && errorMessage.includes('Error code 11'))
    );
  }

  notifyCorruption(report: Omit<DatabaseCorruptionReport, 'ts'> & { ts?: number }) {
    const normalized: DatabaseCorruptionReport = {
      ts: report.ts ?? Date.now(),
      errorMessage: report.errorMessage,
      errorCode: report.errorCode,
      originalError: report.originalError,
      source: report.source,
    };

    console.error('[DatabaseRecoveryService] Database corruption detected', {
      source: normalized.source,
      errorCode: normalized.errorCode,
      errorMessage: normalized.errorMessage,
    });

    this.setState({
      lastCorruption: normalized,
      visible: true,
    });
  }

  dismiss() {
    if (this.state.isRecovering) return;
    this.setState({ visible: false });
  }

  /**
   * Recovery handler (salvage-first):
   * 1) Try to snapshot raw DB files (cache.db + wal/shm)
   * 2) Try to export a SQL dump and re-import it into a fresh DB
   * 3) Fallback: delete DB and recreate schema
   */
  async recover(): Promise<void> {
    if (this.state.isRecovering) return;

    this.setState({
      isRecovering: true,
      recoverySource: 'local',
      statusMessage: 'starting',
      progressCurrent: null,
      progressTotal: null,
      lastRecoveryError: null,
      lastBackupFiles: null,
      lastExportFile: null,
    });

    try {
      if (Platform.OS === 'web') {
        // Web uses IndexedDB; we don't delete it automatically here.
        console.warn('[DatabaseRecoveryService] Recovery requested on web; skipping');
        this.setState({ visible: false, statusMessage: null });
        return;
      }

      const {
        backupSQLiteDatabaseFiles,
        exportSQLiteDatabaseToFile,
        importSQLiteDatabaseFromFile,
        deleteSQLiteDatabase,
        openSharedCacheDb,
      } = await import('./db-setup');

      this.setStep('backup', { current: 1, total: 4 });
      try {
        const backupFiles = await backupSQLiteDatabaseFiles();
        this.setState({ lastBackupFiles: backupFiles });
      } catch (backupError: any) {
        console.warn('[DatabaseRecoveryService] Backup step failed (non-fatal):', backupError?.message || backupError);
      }

      this.setStep('export', { current: 2, total: 4 });
      let exportFile: string | null = null;
      try {
        exportFile = await exportSQLiteDatabaseToFile();
        this.setState({ lastExportFile: exportFile });
      } catch (exportError: any) {
        console.warn('[DatabaseRecoveryService] Export step failed (will fallback):', exportError?.message || exportError);
      }

      if (exportFile) {
        this.setStep('import', { current: 3, total: 4 });
        try {
          await importSQLiteDatabaseFromFile(exportFile);
          // Ensure schema is open + ready
          await openSharedCacheDb();
          console.log('[DatabaseRecoveryService] ✅ Recovery completed (export/import)');
          this.setState({ visible: false, statusMessage: null, progressCurrent: null, progressTotal: null });
          return;
        } catch (importError: any) {
          console.warn('[DatabaseRecoveryService] Import step failed (will fallback):', importError?.message || importError);
        }
      }

      this.setStep('reset', { current: 4, total: 4 });
      await deleteSQLiteDatabase();
      await openSharedCacheDb();
      console.log('[DatabaseRecoveryService] ✅ Recovery completed (reset)');
      this.setState({ visible: false, statusMessage: null, progressCurrent: null, progressTotal: null });
    } catch (error: any) {
      console.error('[DatabaseRecoveryService] ❌ Recovery failed:', error?.message || error);
      this.setState({
        lastRecoveryError: error?.message || String(error),
        visible: true,
        statusMessage: null,
        progressCurrent: null,
        progressTotal: null,
      });
    } finally {
      this.setState({ isRecovering: false });
    }
  }

  /**
   * Recovery from backend (server):
   * - Resets local DB (fresh schema)
   * - Downloads buckets + notifications from backend
   * - Persists them into local DB
   */
  async recoverFromBackend(): Promise<void> {
    if (this.state.isRecovering) return;

    this.setState({
      isRecovering: true,
      recoverySource: 'backend',
      statusMessage: 'starting',
      progressCurrent: null,
      progressTotal: null,
      lastRecoveryError: null,
      lastBackupFiles: null,
      lastExportFile: null,
    });

    try {
      if (Platform.OS === 'web') {
        console.warn('[DatabaseRecoveryService] Backend recovery requested on web; skipping');
        this.setState({ visible: false, statusMessage: null, progressCurrent: null, progressTotal: null });
        return;
      }

      const { apolloClient } = await import('@/config/apollo-client');
      const { GetBucketsDocument, GetNotificationsDocument } = await import('@/generated/gql-operations-generated');
      const { saveBuckets } = await import('@/db/repositories/buckets-repository');
      const { upsertNotificationsBatch } = await import('@/services/notifications-repository');
      const { deleteSQLiteDatabase, openSharedCacheDb } = await import('./db-setup');

      if (!apolloClient) {
        throw new Error('Apollo Client not initialized');
      }

      // Step 1: reset DB
      this.setStep('reset', { current: 1, total: 3 });
      await deleteSQLiteDatabase();
      await openSharedCacheDb();

      // Step 2: fetch from backend
      this.setStep('fetch_backend', { current: 2, total: 3 });
      const [bucketsResult, notificationsResult] = await Promise.all([
        apolloClient.query({ query: GetBucketsDocument, fetchPolicy: 'network-only' }),
        apolloClient.query({ query: GetNotificationsDocument, fetchPolicy: 'network-only' }),
      ]);

      const apiBuckets = (bucketsResult.data?.buckets ?? []) as any[];
      const apiNotifications = (notificationsResult.data?.notifications ?? []) as any[];

      // Step 3: persist
      this.setStep('save_backend', { current: 3, total: 3 });
      if (apiBuckets.length > 0) {
        await saveBuckets(apiBuckets as any);
      }
      if (apiNotifications.length > 0) {
        await upsertNotificationsBatch(apiNotifications as any);
      }

      console.log('[DatabaseRecoveryService] ✅ Backend recovery completed', {
        buckets: apiBuckets.length,
        notifications: apiNotifications.length,
      });
      this.setState({ visible: false, statusMessage: null, progressCurrent: null, progressTotal: null });
    } catch (error: any) {
      console.error('[DatabaseRecoveryService] ❌ Backend recovery failed:', error?.message || error);
      this.setState({
        lastRecoveryError: error?.message || String(error),
        visible: true,
        statusMessage: null,
        progressCurrent: null,
        progressTotal: null,
      });
    } finally {
      this.setState({ isRecovering: false });
    }
  }

  /**
   * Recovery from iCloud / CloudKit (iOS only):
   * - Downloads notifications from CloudKit
   * - Upserts them into the local DB
   * IMPORTANT: does NOT fetch/overwrite buckets or other tables.
   */
  async recoverNotificationsFromICloud(): Promise<void> {
    if (this.state.isRecovering) return;

    this.setState({
      isRecovering: true,
      recoverySource: 'icloud',
      statusMessage: 'starting',
      progressCurrent: null,
      progressTotal: null,
      lastRecoveryError: null,
    });

    try {
      if (Platform.OS !== 'ios') {
        throw new Error('iCloud recovery is only available on iOS');
      }

      const iosBridgeService = (await import('@/services/ios-bridge')).default;
      const { getAllBuckets } = await import('@/db/repositories/buckets-repository');
      const { upsertNotificationsBatch } = await import('@/services/notifications-repository');

      this.setStep('fetch_cloudkit', { current: 1, total: 2 });
      const result = await iosBridgeService.fetchAllNotificationsFromCloudKit();
      if (!result.success) {
        throw new Error('CloudKit fetch failed');
      }

      // Buckets must come from local DB; build a lookup for metadata.
      let bucketsById = new Map<string, any>();
      try {
        const localBuckets = await getAllBuckets();
        bucketsById = new Map(localBuckets.map((b: any) => [b.id, b]));
      } catch {
        // If buckets can't be read, we'll still restore notifications with placeholders.
      }

      const nowIso = new Date().toISOString();
      const cloudNotifications = (result.notifications || []) as any[];
      const notificationsForDb = cloudNotifications
        .filter((n) => n && typeof n.id === 'string' && typeof n.bucketId === 'string' && typeof n.title === 'string')
        .map((n) => {
          const bucket = bucketsById.get(n.bucketId) || {};
          const bucketCreatedAt = bucket.createdAt || nowIso;
          const bucketUpdatedAt = bucket.updatedAt || nowIso;
          const createdAt = n.createdAt || nowIso;
          const readAt = n.readAt ?? null;

          const attachments = Array.isArray(n.attachments) ? n.attachments : [];
          const actions = Array.isArray(n.actions) ? n.actions : [];

          return {
            __typename: 'Notification',
            id: n.id,
            receivedAt: null,
            sentAt: null,
            readAt,
            createdAt,
            updatedAt: createdAt,
            message: {
              __typename: 'Message',
              id: `message-${n.id}`,
              title: n.title,
              body: n.body ?? null,
              subtitle: n.subtitle ?? null,
              sound: null,
              deliveryType: 'NORMAL',
              locale: null,
              snoozes: null,
              executionId: null,
              createdAt,
              updatedAt: createdAt,
              attachments: attachments.map((a: any) => ({
                __typename: 'MessageAttachment',
                mediaType: a.mediaType as any,
                url: a.url ?? null,
                name: a.name ?? null,
                attachmentUuid: a.attachmentUuid ?? null,
                saveOnServer: a.saveOnServer ?? null,
              })),
              tapAction: null,
              actions: actions.map((act: any) => ({
                __typename: 'NotificationAction',
                type: act.type as any,
                value: act.value ?? null,
                title: act.label ?? act.title ?? null,
                icon: null,
                destructive: null,
              })),
              bucket: {
                __typename: 'Bucket',
                id: n.bucketId,
                name: bucket.name || `Bucket ${String(n.bucketId).slice(0, 8)}`,
                description: bucket.description ?? null,
                color: bucket.color ?? null,
                icon: bucket.icon ?? null,
                iconAttachmentUuid: bucket.iconAttachmentUuid ?? null,
                iconUrl: bucket.iconUrl ?? null,
                createdAt: bucketCreatedAt,
                updatedAt: bucketUpdatedAt,
                isProtected: bucket.isProtected ?? null,
                isPublic: bucket.isPublic ?? null,
                isAdmin: bucket.isAdmin ?? null,
                preset: bucket.preset ?? null,
              },
            },
          };
        });

      this.setStep('upsert_notifications', { current: 2, total: 2 });
      await upsertNotificationsBatch(notificationsForDb as any);

      console.log('[DatabaseRecoveryService] ✅ iCloud notifications recovery completed', {
        notifications: notificationsForDb.length,
      });
      this.setState({ visible: false, statusMessage: null, progressCurrent: null, progressTotal: null });
    } catch (error: any) {
      console.error('[DatabaseRecoveryService] ❌ iCloud notifications recovery failed:', error?.message || error);
      this.setState({
        lastRecoveryError: error?.message || String(error),
        visible: true,
        statusMessage: null,
        progressCurrent: null,
        progressTotal: null,
      });
    } finally {
      this.setState({ isRecovering: false });
    }
  }
}

export const databaseRecoveryService = new DatabaseRecoveryService();

export function useDatabaseRecoveryState(): DatabaseRecoveryState {
  const [state, setState] = useState<DatabaseRecoveryState>(
    databaseRecoveryService.getState()
  );

  useEffect(() => {
    return databaseRecoveryService.subscribe(() => {
      setState(databaseRecoveryService.getState());
    });
  }, []);

  return state;
}
