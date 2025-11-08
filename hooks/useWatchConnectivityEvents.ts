import { useEffect } from 'react';
import IosBridgeService from '@/services/ios-bridge';
import { useMarkAsRead, useMarkAsUnread, useDeleteNotification } from './notifications';

/**
 * Hook to handle events from Apple Watch
 * Automatically syncs Watch actions with backend and local database
 */
export function useWatchConnectivityEvents() {
  const markAsRead = useMarkAsRead();
  const markAsUnread = useMarkAsUnread();
  const deleteNotification = useDeleteNotification();

  useEffect(() => {
    console.log('[useWatchConnectivity] Initializing Watch event listeners...');

    IosBridgeService.initializeEventListeners({
      onNotificationRead: async ({ notificationId, readAt }) => {
        console.log('[useWatchConnectivity] ⌚→📱 Watch marked as read:', notificationId, readAt);
        try {
          // Update backend and local database
          // Note: markAsRead uses current timestamp, but Watch already updated CloudKit with correct readAt
          await markAsRead.mutateAsync(notificationId);
          console.log('[useWatchConnectivity] ✅ Synced read status to backend');
        } catch (error) {
          console.error('[useWatchConnectivity] ❌ Failed to sync read status:', error);
        }
      },

      onNotificationUnread: async ({ notificationId }) => {
        console.log('[useWatchConnectivity] ⌚→📱 Watch marked as unread:', notificationId);
        try {
          // Update backend and local database
          await markAsUnread.mutateAsync(notificationId);
          console.log('[useWatchConnectivity] ✅ Synced unread status to backend');
        } catch (error) {
          console.error('[useWatchConnectivity] ❌ Failed to sync unread status:', error);
        }
      },

      onNotificationDeleted: async ({ notificationId }) => {
        console.log('[useWatchConnectivity] ⌚→📱 Watch deleted notification:', notificationId);
        try {
          // Delete from backend and local database
          await deleteNotification.mutateAsync(notificationId);
          console.log('[useWatchConnectivity] ✅ Synced deletion to backend');
        } catch (error) {
          console.error('[useWatchConnectivity] ❌ Failed to sync deletion:', error);
        }
      },
    });

    return () => {
      console.log('[useWatchConnectivity] Removing Watch event listeners...');
      IosBridgeService.removeEventListeners();
    };
  }, [markAsRead, markAsUnread, deleteNotification]);
}
