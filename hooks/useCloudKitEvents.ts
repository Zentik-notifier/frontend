/**
 * Hook to listen to CloudKit events from native bridge
 * Handles CloudKit subscription notifications and updates SQLite/React Query
 */

import { useEffect } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import iosBridgeService from '@/services/ios-bridge';
import { notificationKeys } from './notifications/useNotificationQueries';

const { CloudKitSyncBridge } = NativeModules;

export function useCloudKitEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (Platform.OS !== 'ios' || !CloudKitSyncBridge) {
      return;
    }

    const eventEmitter = new NativeEventEmitter(CloudKitSyncBridge);

    const handleNotificationUpdated = async (event: { notificationId: string }) => {
      console.log('[CloudKitEvents] Notification updated:', event.notificationId);

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
      console.log('[CloudKitEvents] Notification deleted:', event.notificationId);

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

    const handleRecordChanged = async (event: {
      recordType: string;
      recordId: string;
      reason: 'recordCreated' | 'recordUpdated' | 'recordDeleted';
      recordData?: any;
    }) => {
      console.log('[CloudKitEvents] Record changed:', event);

      try {
        // Perform incremental sync to fetch the updated record and update SQLite
        const result = await iosBridgeService.syncFromCloudKitIncremental(false);
        
        if (result.success) {
          console.log(`[CloudKitEvents] ✅ Incremental sync completed - Updated: ${result.updatedCount} records`);
          
          // Invalidate React Query to refresh UI
          if (event.recordType === 'Notification') {
            queryClient.invalidateQueries({ queryKey: notificationKeys.detail(event.recordId) });
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
            queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
            queryClient.invalidateQueries({ queryKey: ['app-state'] });
          } else if (event.recordType === 'Bucket') {
            queryClient.invalidateQueries({ queryKey: notificationKeys.bucketsStats() });
            queryClient.invalidateQueries({ queryKey: ['app-state'] });
          }
        } else {
          console.warn('[CloudKitEvents] ⚠️ Incremental sync failed');
        }
      } catch (error) {
        console.error('[CloudKitEvents] ❌ Error handling record change:', error);
      }
    };

    const handleSyncProgress = async (event: {
      step?: 'zone_creation' | 'schema_initialization' | 'sync_notifications' | 'sync_buckets';
      currentItem: number;
      totalItems: number;
      itemType: 'notification' | 'bucket' | '';
      phase: 'starting' | 'syncing' | 'completed';
    }) => {
      const step = event.step || 'unknown';
      console.log(`[CloudKitEvents] Sync progress [${step}]: ${event.currentItem}/${event.totalItems} ${event.itemType} (${event.phase})`);
      
      // You can update UI here, e.g., show progress bar
      // Example: updateProgressBar(event.currentItem, event.totalItems, event.itemType, event.step);
    };

    const handleNotificationsBatchUpdated = async (event: { notificationIds: string[]; count: number }) => {
      console.log(`[CloudKitEvents] Batch notifications updated: ${event.count} notifications`);

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
    
    return () => {
      subscription1.remove();
      subscription2.remove();
      subscription3.remove();
      subscription4.remove();
      subscription5.remove();
    };
  }, [queryClient]);
}
