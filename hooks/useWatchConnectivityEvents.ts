import IosBridgeService from '@/services/ios-bridge';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useMarkAsRead, useMarkAsUnread, useDeleteNotification } from './notifications';
import { useSettings } from './useSettings';

/**
 * Hook to handle events from Apple Watch
 * 
 * Supports two types of events:
 * 1. WatchConnectivity events - Direct Watch-to-iOS communication (refresh, CRUD operations)
 * 2. CloudKit events - Cross-device sync via CloudKit Subscriptions
 * 
 * Watch events are already processed natively (SQLite + CloudKit updated in WatchConnectivityManager.swift)
 * React Native only needs to sync with backend GraphQL API and update React Query cache
 */
export function useWatchConnectivityEvents() {
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  
  // Mutation hooks that handle backend sync + React Query cache updates
  // We use skipLocalDb and skipCloudKit options for Watch events (native already updated those)
  const markAsRead = useMarkAsRead();
  const markAsUnread = useMarkAsUnread();
  const deleteNotification = useDeleteNotification();

  useEffect(() => {
    console.log('[WatchSync] Initializing Watch event listeners...');

    // ========== WatchConnectivity Events ==========
    
    // Listen for Watch refresh requests (Watch requests full sync)
    const unsubscribeRefresh = IosBridgeService.onWatchRefresh(async (event) => {
      console.log('[WatchSync] ⌚→📱 Watch requested full refresh');
      try {
        // Trigger FULL sync to CloudKit in batches (syncs all notifications)
        const result = await IosBridgeService.syncAllToCloudKitFull();
        if (result.success) {
          console.log(`[WatchSync] ✅ Full sync completed: ${result.bucketsCount} buckets, ${result.notificationsCount} notifications`);
        } else {
          console.error('[WatchSync] ❌ Full sync failed');
        }
      } catch (error) {
        console.error('[WatchSync] ❌ Failed to perform full sync to CloudKit:', error);
      }
    });

        // Listen for Watch notification read events (direct Watch communication)
    // NOTE: iOS native code already updated SQLite + CloudKit in background (WatchConnectivityManager.swift)
    // We only need to sync to backend (GraphQL) and update React Query cache here
    const unsubscribeWatchRead = IosBridgeService.onWatchNotificationRead(async (event) => {
      console.log('[WatchSync] ⌚→📱 Watch marked as read (WatchConnectivity):', event.notificationId);
      try {
        // Use hook with skipLocalDb and skipCloudKit options
        // This will: 1) Update React Query cache, 2) Sync to backend GraphQL
        // But skip: SQLite update (native did it), CloudKit update (native did it)
        await markAsRead.mutateAsync({
          notificationId: event.notificationId,
          skipLocalDb: false,      // ❌ Skip SQLite (already done by native)
          skipCloudKit: true,     // ❌ Skip CloudKit (already done by native)
          readAt: event.readAt,   // Use timestamp from Watch
        } as any);
        
        // Invalidate app state to recalculate unreadCount from updated SQLite DB
        // Note: We don't invalidate ['notifications', 'lists'] because the mutation's onSuccess already updates the cache
        // But we need to invalidate ['app-state'] to recalculate stats from SQLite
        await queryClient.invalidateQueries({ queryKey: ['app-state'] });
        
        console.log('[WatchSync] ✅ Synced to backend + updated React Query cache + invalidated app-state');
      } catch (error) {
        console.error('[WatchSync] ❌ Failed to sync read status:', error);
      }
    });

    // Listen for Watch notification unread events (direct Watch communication)
    const unsubscribeWatchUnread = IosBridgeService.onWatchNotificationUnread(async (event) => {
      console.log('[WatchSync] ⌚→📱 Watch marked as unread (WatchConnectivity):', event.notificationId);
      try {
        // Use hook with skipLocalDb and skipCloudKit options
        await markAsUnread.mutateAsync({
          notificationId: event.notificationId,
          skipLocalDb: false,      // ❌ Skip SQLite (already done by native)
          skipCloudKit: true,     // ❌ Skip CloudKit (already done by native)
        } as any);
        
        // Invalidate app state to recalculate unreadCount from updated SQLite DB
        // Note: We don't invalidate ['notifications', 'lists'] because the mutation's onSuccess already updates the cache
        // But we need to invalidate ['app-state'] to recalculate stats from SQLite
        await queryClient.invalidateQueries({ queryKey: ['app-state'] });
        
        console.log('[WatchSync] ✅ Synced to backend + updated React Query cache + invalidated app-state');
      } catch (error) {
        console.error('[WatchSync] ❌ Failed to sync unread status:', error);
      }
    });

    // Listen for Watch notification deleted events (direct Watch communication)
    const unsubscribeWatchDeleted = IosBridgeService.onWatchNotificationDeleted(async (event) => {
      console.log('[WatchSync] ⌚→📱 Watch deleted notification (WatchConnectivity):', event.notificationId);
      try {
        // Use hook with skipLocalDb and skipCloudKit options
        // Native code already deleted from SQLite + CloudKit
        await deleteNotification.mutateAsync({
          notificationId: event.notificationId,
          skipLocalDb: true,      // ❌ Skip SQLite (already done by native)
          skipCloudKit: true,     // ❌ Skip CloudKit (already done by native)
        } as any);
        
        // Invalidate app state to recalculate unreadCount from updated SQLite DB
        // Note: We don't invalidate ['notifications', 'lists'] because the mutation's onSuccess already updates the cache
        // But we need to invalidate ['app-state'] to recalculate stats from SQLite
        await queryClient.invalidateQueries({ queryKey: ['app-state'] });
        
        console.log('[WatchSync] ✅ Synced deletion to backend + updated React Query cache + invalidated app-state');
      } catch (error) {
        console.error('[WatchSync] ❌ Failed to sync deletion:', error);
      }
    });

    // ========== CloudKit Events ==========
    
    // Listen for CloudKit notification read events (from Watch via CloudKit)
    // const unsubscribeCloudKitRead = IosBridgeService.onCloudKitNotificationRead(async (event) => {
    //   console.log('📱 [WatchSync] ========== CLOUDKIT EVENT RECEIVED ==========');
    //   console.log('[WatchSync] ☁️→📱 Notification marked as read via CloudKit:', event.notificationId);
    //   console.log('[WatchSync] Event data:', JSON.stringify(event, null, 2));
      
    //   try {
    //     await markAsRead.mutateAsync(event.notificationId);
    //     console.log('[WatchSync] ✅ Synced CloudKit read status to backend');
    //   } catch (error) {
    //     console.error('[WatchSync] ❌ Failed to sync CloudKit read status:', error);
    //   }
    // });

    // // Listen for CloudKit notification unread events (from Watch via CloudKit)
    // const unsubscribeCloudKitUnread = IosBridgeService.onCloudKitNotificationUnread(async (event) => {
    //   console.log('📱 [WatchSync] ========== CLOUDKIT EVENT RECEIVED ==========');
    //   console.log('[WatchSync] ☁️→📱 Notification marked as unread via CloudKit:', event.notificationId);
    //   console.log('[WatchSync] Event data:', JSON.stringify(event, null, 2));
      
    //   try {
    //     await markAsUnread.mutateAsync(event.notificationId);
    //     console.log('[WatchSync] ✅ Synced CloudKit unread status to backend');
    //   } catch (error) {
    //     console.error('[WatchSync] ❌ Failed to sync CloudKit unread status:', error);
    //   }
    // });

    // // Listen for CloudKit notification deleted events (from Watch via CloudKit)
    // const unsubscribeCloudKitDeleted = IosBridgeService.onCloudKitNotificationDeleted(async (event) => {
    //   console.log('📱 [WatchSync] ========== CLOUDKIT EVENT RECEIVED ==========');
    //   console.log('[WatchSync] ☁️→📱 Notification deleted via CloudKit:', event.notificationId);
    //   console.log('[WatchSync] Event data:', JSON.stringify(event, null, 2));
      
    //   try {
    //     await deleteNotification.mutateAsync(event.notificationId);
    //     console.log('[WatchSync] ✅ Synced CloudKit deletion to backend');
    //   } catch (error) {
    //     console.error('[WatchSync] ❌ Failed to sync CloudKit deletion:', error);
    //   }
    // });

    console.log('[WatchSync] Watch event listeners active ✅');

    return () => {
      console.log('[WatchSync] Removing Watch event listeners...');
      // Remove WatchConnectivity listeners
      unsubscribeRefresh();
      unsubscribeWatchRead();
      unsubscribeWatchUnread();
      unsubscribeWatchDeleted();
      // Remove CloudKit listeners
      // unsubscribeCloudKitRead();
      // unsubscribeCloudKitUnread();
      // unsubscribeCloudKitDeleted();
    };
  }, []); // Empty deps - setup once on mount, mutations are stable
}
