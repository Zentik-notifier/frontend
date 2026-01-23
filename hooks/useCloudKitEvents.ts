/**
 * Hook to listen to CloudKit events from native bridge
 * Handles CloudKit subscription notifications and updates SQLite/React Query
 */

import { useEffect, useRef } from 'react';
import { AppState, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import iosBridgeService from '@/services/ios-bridge';
import { settingsService } from '@/services/settings-service';
import { notificationKeys } from './notifications/useNotificationQueries';
import type { CloudKitSyncProgressEvent } from '@/types/cloudkit-sync-events';

const { CloudKitSyncBridge } = NativeModules;

export function useCloudKitEvents() {
  const queryClient = useQueryClient();
  const pushSyncInFlightRef = useRef<Promise<any> | null>(null);

  const isDebugEnabled = () => settingsService.getSettings().cloudKitDebug === true;

  useEffect(() => {
    if (Platform.OS !== 'ios' || !CloudKitSyncBridge) {
      return;
    }

    const eventEmitter = new NativeEventEmitter(CloudKitSyncBridge);

    console.log('[CloudKitEvents] Listener registered');

    const handleNotificationUpdated = async (event: { notificationId: string }) => {
      console.log('[CloudKitEvents] cloudKitNotificationUpdated', {
        notificationId: event.notificationId,
        appState: AppState.currentState,
        ts: Date.now(),
      });
      if (isDebugEnabled()) {
        console.log('[CloudKitEvents] Notification updated:', event.notificationId);
      }

      try {
        // Invalidate React Query to refresh UI immediately
        queryClient.invalidateQueries({ queryKey: notificationKeys.detail(event.notificationId) });
        queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
        queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
        queryClient.invalidateQueries({ queryKey: ['app-state'] });
      } catch (error) {
        console.error('[CloudKitEvents] ❌ Error handling notification update:', error);
      }
    };

    const handleNotificationDeleted = async (event: { notificationId: string }) => {
      console.log('[CloudKitEvents] cloudKitNotificationDeleted', {
        notificationId: event.notificationId,
        appState: AppState.currentState,
        ts: Date.now(),
      });
      if (isDebugEnabled()) {
        console.log('[CloudKitEvents] Notification deleted:', event.notificationId);
      }

      try {
        // Invalidate React Query to refresh UI immediately
        queryClient.invalidateQueries({ queryKey: notificationKeys.detail(event.notificationId) });
        queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
        queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
        queryClient.invalidateQueries({ queryKey: ['app-state'] });
      } catch (error) {
        console.error('[CloudKitEvents] ❌ Error handling notification deletion:', error);
      }
    };

    const handleNotificationsBatchDeleted = async (event: { notificationIds: string[]; count: number }) => {
      console.log('[CloudKitEvents] cloudKitNotificationsBatchDeleted', {
        count: event.count,
        idsPreview: event.notificationIds.slice(0, 5),
        appState: AppState.currentState,
        ts: Date.now(),
      });
      if (isDebugEnabled()) {
        console.log(`[CloudKitEvents] Batch notifications deleted: ${event.count} notifications`);
      }

      try {
        // Invalidate React Query to refresh UI immediately
        // Invalidate all notification queries since we don't know which specific ones were deleted
        queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
        queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
        queryClient.invalidateQueries({ queryKey: ['app-state'] });
        
        // Also invalidate individual notification details if needed
        event.notificationIds.forEach((notificationId) => {
          queryClient.invalidateQueries({ queryKey: notificationKeys.detail(notificationId) });
        });
      } catch (error) {
        console.error('[CloudKitEvents] ❌ Error handling batch notification deletion:', error);
      }
    };

    const handleRecordChanged = async (event: {
      recordType: string;
      recordId: string;
      // NOTE: native sends various reasons (e.g. push, push_zone, incremental_changed, ...)
      reason: string;
      recordData?: any;
    }) => {
      console.log('[CloudKitEvents] cloudKitRecordChanged', {
        recordType: event.recordType,
        recordId: event.recordId,
        reason: event.reason,
        hasRecordData: !!event.recordData,
        appState: AppState.currentState,
        ts: Date.now(),
      });
      if (isDebugEnabled()) {
        console.log('[CloudKitEvents] Record changed:', event);
      }

      try {
        const reason = event.reason || '';

        // CRITICAL: CloudKit incremental sync emits `cloudKitRecordChanged` events itself.
        // If we call incremental sync in response to those, it becomes an infinite loop.
        const isIncrementalOutputEvent = reason.startsWith('incremental_');
        const isPushDrivenEvent = reason.startsWith('push') || reason === 'subscription' || reason === 'remote_notification';

        // For incremental output events, just invalidate UI caches (SQLite is already updated by native).
        if (isIncrementalOutputEvent) {
          console.log('[CloudKitEvents] Incremental output event -> invalidate only', {
            recordType: event.recordType,
            recordId: event.recordId,
            reason,
          });
          const recordType = event.recordType;
          if (recordType === 'Notifications' || recordType === 'Notification') {
            queryClient.invalidateQueries({ queryKey: notificationKeys.detail(event.recordId) });
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
            queryClient.invalidateQueries({ queryKey: ['app-state'] });
          } else if (recordType === 'Buckets' || recordType === 'Bucket') {
            queryClient.invalidateQueries({ queryKey: notificationKeys.bucketsStats() });
            queryClient.invalidateQueries({ queryKey: ['app-state'] });
          }
          return;
        }

        // Only push-driven events should trigger an incremental fetch.
        if (!isPushDrivenEvent) {
          console.log('[CloudKitEvents] Non-push event -> ignoring', { reason });
          return;
        }

        // Deduplicate concurrent push events (burst of notifications).
        if (pushSyncInFlightRef.current) {
          // console.log('[CloudKitEvents] Push sync already in-flight; awaiting');
          await pushSyncInFlightRef.current;
          return;
        }

        pushSyncInFlightRef.current = iosBridgeService.syncFromCloudKitIncremental(false);
        console.log('[CloudKitEvents] Starting incremental sync (push-driven)');
        const result = await pushSyncInFlightRef.current;
        pushSyncInFlightRef.current = null;

        console.log('[CloudKitEvents] Incremental sync result', result);
        
        if (result.success) {
          if (isDebugEnabled()) {
            console.log(`[CloudKitEvents] ✅ Incremental sync completed - Updated: ${result.updatedCount} records`);
          }
          
          // Invalidate React Query to refresh UI
          if (event.recordType === 'Notifications' || event.recordType === 'Notification') {
            queryClient.invalidateQueries({ queryKey: notificationKeys.detail(event.recordId) });
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
            queryClient.invalidateQueries({ queryKey: ['app-state'] });
          } else if (event.recordType === 'Buckets' || event.recordType === 'Bucket') {
            queryClient.invalidateQueries({ queryKey: notificationKeys.bucketsStats() });
            queryClient.invalidateQueries({ queryKey: ['app-state'] });
          }
        } else {
          if (isDebugEnabled()) {
            console.warn('[CloudKitEvents] ⚠️ Incremental sync failed');
          }
        }
      } catch (error) {
        pushSyncInFlightRef.current = null;
        console.error('[CloudKitEvents] ❌ Error handling record change:', error);
      }
    };

    const handleSyncProgress = async (event: CloudKitSyncProgressEvent) => {
      const step = event.step || 'unknown';
      if (isDebugEnabled()) {
        console.log(`[CloudKitEvents] Sync progress [${step}]: ${event.currentItem}/${event.totalItems} ${event.itemType} (${event.phase})`);
      }
      
      // You can update UI here, e.g., show progress bar
      // Progress bar should be shown ONLY during:
      // - sync_buckets: uploading/syncing phases
      // - sync_notifications: uploading/syncing phases
      // 
      // Label should show count during:
      // - sync_buckets: found phase ("18 buckets found")
      // - sync_notifications: found phase ("1542 notifications found")
    };

    const handleNotificationsBatchUpdated = async (event: { notificationIds: string[]; count: number }) => {
      console.log('[CloudKitEvents] cloudKitNotificationsBatchUpdated', {
        count: event.count,
        idsPreview: event.notificationIds.slice(0, 5),
        appState: AppState.currentState,
        ts: Date.now(),
      });
      if (isDebugEnabled()) {
        console.log(`[CloudKitEvents] Batch notifications updated: ${event.count} notifications`);
      }

      try {
        // Invalidate React Query to refresh UI immediately
        // Invalidate all notification queries since we don't know which specific ones changed
        queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
        queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
        queryClient.invalidateQueries({ queryKey: ['app-state'] });
        
        // Also invalidate individual notification details if needed
        event.notificationIds.forEach((notificationId) => {
          queryClient.invalidateQueries({ queryKey: notificationKeys.detail(notificationId) });
        });
      } catch (error) {
        console.error('[CloudKitEvents] ❌ Error handling batch notification update:', error);
      }
    };

    const subscription1 = eventEmitter.addListener('cloudKitNotificationUpdated', handleNotificationUpdated);
    const subscription2 = eventEmitter.addListener('cloudKitNotificationDeleted', handleNotificationDeleted);
    const subscription3 = eventEmitter.addListener('cloudKitRecordChanged', handleRecordChanged);
    const subscription4 = eventEmitter.addListener('cloudKitSyncProgress', handleSyncProgress);
    const subscription5 = eventEmitter.addListener('cloudKitNotificationsBatchUpdated', handleNotificationsBatchUpdated);
    const subscription6 = eventEmitter.addListener('cloudKitNotificationsBatchDeleted', handleNotificationsBatchDeleted);
    
    return () => {
      subscription1.remove();
      subscription2.remove();
      subscription3.remove();
      subscription4.remove();
      subscription5.remove();
      subscription6.remove();
    };
  }, [queryClient]);
}
