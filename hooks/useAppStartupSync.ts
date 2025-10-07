/**
 * Hook for syncing notifications on app startup
 * Should be called once in the root component
 */

import { useEffect, useState } from 'react';
import { syncNotificationsFromAPI } from '@/hooks/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { notificationKeys } from '@/hooks/notifications';

export interface UseAppStartupSyncOptions {
  /**
   * Enable or disable sync on mount
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Callback when sync completes successfully
   */
  onSuccess?: (count: number) => void;
  
  /**
   * Callback when sync fails
   */
  onError?: (error: Error) => void;
}

export function useAppStartupSync(options: UseAppStartupSyncOptions = {}) {
  const { enabled = true, onSuccess, onError } = options;
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [syncedCount, setSyncedCount] = useState<number>(0);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const performSync = async () => {
      try {
        setIsSyncing(true);
        setSyncError(null);

        console.log('[useAppStartupSync] Starting initial sync...');
        const count = await syncNotificationsFromAPI();
        
        if (!mounted) return;

        setSyncedCount(count);
        console.log(`[useAppStartupSync] Synced ${count} notifications`);

        // Invalidate all queries to refresh UI with new data
        await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        console.log('[useAppStartupSync] Queries invalidated');

        onSuccess?.(count);
      } catch (error) {
        if (!mounted) return;

        const err = error instanceof Error ? error : new Error(String(error));
        setSyncError(err);
        console.error('[useAppStartupSync] Sync failed:', err);
        
        onError?.(err);
      } finally {
        if (mounted) {
          setIsSyncing(false);
        }
      }
    };

    performSync();

    return () => {
      mounted = false;
    };
  }, [enabled, queryClient, onSuccess, onError]);

  return {
    isSyncing,
    syncError,
    syncedCount,
  };
}
