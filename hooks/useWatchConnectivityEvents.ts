import IosBridgeService from '@/services/ios-bridge';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useDeleteNotification, useMarkAsRead, useMarkAsUnread } from './notifications';

/**
 * Hook to handle events from Apple Watch via WatchConnectivity
 * 
 * Watch events are already processed natively (SQLite updated in iPhoneWatchConnectivityManager.swift)
 * React Native only needs to sync with backend GraphQL API and update React Query cache
 */
export function useWatchConnectivityEvents() {
  const queryClient = useQueryClient();

  // Mutation hooks that handle backend sync + React Query cache updates
  const markAsRead = useMarkAsRead();
  const markAsUnread = useMarkAsUnread();
  const deleteNotification = useDeleteNotification();

  useEffect(() => {
    console.log('[WatchSync] Initializing Watch event listeners...');

    // Listen for Watch refresh requests (Watch requests full sync)
    // NOTE: The sync is now handled automatically in Swift (iPhoneWatchConnectivityManager)
    // This event is just for logging - the actual data transfer happens in background
    // React Query cache will be automatically refreshed when app returns to foreground
    const unsubscribeRefresh = IosBridgeService.onWatchRefresh(async (event) => {
      console.log('[WatchSync] ⌚→📱 Watch requested full refresh');
      console.log('[WatchSync] ℹ️ Sync handled automatically by native Swift code');
      console.log('[WatchSync] ℹ️ Cache will be refreshed when app returns to foreground');
      
      // DO NOT invalidate queries here - this would cause concurrent DB access
      // while native code is still transferring data to Watch
    });

    // Listen for Watch notification read events
    // NOTE: iOS native code already updated SQLite in background (iPhoneWatchConnectivityManager.swift)
    const unsubscribeWatchRead = IosBridgeService.onWatchNotificationRead(async (event) => {
      console.log('[WatchSync] ⌚→📱 Watch marked as read:', event.notificationId);
      try {
        await markAsRead.mutateAsync({
          notificationId: event.notificationId,
          skipLocalDb: false,
          readAt: event.readAt,
        });

        await queryClient.invalidateQueries({ queryKey: ['app-state'] });

        console.log('[WatchSync] ✅ Synced to backend + updated React Query cache');
      } catch (error) {
        console.error('[WatchSync] ❌ Failed to sync read status:', error);
      }
    });

    // Listen for Watch notification unread events
    const unsubscribeWatchUnread = IosBridgeService.onWatchNotificationUnread(async (event) => {
      console.log('[WatchSync] ⌚→📱 Watch marked as unread:', event.notificationId);
      try {
        await markAsUnread.mutateAsync({
          notificationId: event.notificationId,
          skipLocalDb: false,
        });

        await queryClient.invalidateQueries({ queryKey: ['app-state'] });

        console.log('[WatchSync] ✅ Synced to backend + updated React Query cache');
      } catch (error) {
        console.error('[WatchSync] ❌ Failed to sync unread status:', error);
      }
    });

    // Listen for Watch notification deleted events
    const unsubscribeWatchDeleted = IosBridgeService.onWatchNotificationDeleted(async (event) => {
      console.log('[WatchSync] ⌚→📱 Watch deleted notification:', event.notificationId);
      try {
        await deleteNotification.mutateAsync({
          notificationId: event.notificationId,
          skipLocalDb: false, // Update local SQLite DB so NSE/NCE/Widget see the deletion
        });

        await queryClient.invalidateQueries({ queryKey: ['app-state'] });

        console.log('[WatchSync] ✅ Synced deletion to backend + updated React Query cache');
      } catch (error) {
        console.error('[WatchSync] ❌ Failed to sync deletion:', error);
      }
    });

    console.log('[WatchSync] Watch event listeners active ✅');

    return () => {
      console.log('[WatchSync] Removing Watch event listeners...');
      unsubscribeRefresh();
      unsubscribeWatchRead();
      unsubscribeWatchUnread();
      unsubscribeWatchDeleted();
    };
  }, []);
}
