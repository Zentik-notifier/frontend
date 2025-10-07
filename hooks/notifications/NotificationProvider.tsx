/**
 * Notification Provider with React Query
 * Manages notifications state using react-query with local DB sync
 */

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { openSharedCacheDb, openWebStorageDb } from '@/services/db-setup';
import { upsertNotificationsBatch } from '@/services/notifications-repository';
import { NotificationFragment } from '@/generated/gql-operations-generated';

// ====================
// QUERY CLIENT CONFIGURATION
// ====================

/**
 * Create and configure QueryClient for notifications
 */
export function createNotificationQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Offline-first: use stale data while refetching
        staleTime: 30000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime in v4)
        
        // Retry configuration
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Network mode: offlineFirst allows queries to run even when offline
        networkMode: 'offlineFirst',
        
        // Refetch configuration
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
      },
      mutations: {
        // Network mode for mutations
        networkMode: 'offlineFirst',
        
        // Retry configuration
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

// ====================
// CONTEXT
// ====================

interface NotificationContextValue {
  queryClient: QueryClient;
  isInitialized: boolean;
  syncWithLocalDB: (notifications: NotificationFragment[]) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * Hook to access notification context
 */
export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}

// ====================
// PROVIDER
// ====================

interface NotificationProviderProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  enableDevTools?: boolean;
  onInitialized?: () => void;
}

/**
 * Notification Provider Component
 * Provides react-query client and manages DB initialization
 * 
 * @example
 * ```tsx
 * import { NotificationProvider } from '@/hooks/notifications/NotificationProvider';
 * 
 * function App() {
 *   return (
 *     <NotificationProvider>
 *       <YourApp />
 *     </NotificationProvider>
 *   );
 * }
 * ```
 */
export function NotificationProvider({
  children,
  queryClient: providedQueryClient,
  enableDevTools = false,
  onInitialized,
}: NotificationProviderProps) {
  // Use provided query client or create a new one
  const queryClientRef = useRef<QueryClient>(
    providedQueryClient || createNotificationQueryClient()
  );
  const queryClient = queryClientRef.current;

  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize local database
  useEffect(() => {
    let mounted = true;

    async function initializeDB() {
      try {
        // Initialize the appropriate database based on platform
        if (Platform.OS === 'web') {
          await openWebStorageDb();
          console.log('[NotificationProvider] IndexedDB initialized');
        } else {
          await openSharedCacheDb();
          console.log('[NotificationProvider] SQLite initialized');
        }

        if (mounted) {
          setIsInitialized(true);
          onInitialized?.();
        }
      } catch (error) {
        console.error('[NotificationProvider] Failed to initialize DB:', error);
        // Still mark as initialized to allow app to function
        // (may fallback to API-only mode)
        if (mounted) {
          setIsInitialized(true);
          onInitialized?.();
        }
      }
    }

    initializeDB();

    return () => {
      mounted = false;
    };
  }, [onInitialized]);

  /**
   * Utility function to sync notifications with local DB
   * Can be used by components to manually trigger sync
   */
  const syncWithLocalDB = async (notifications: NotificationFragment[]) => {
    if (notifications.length === 0) return;

    try {
      await upsertNotificationsBatch(notifications);
      console.log(`[NotificationProvider] Synced ${notifications.length} notifications to local DB`);
    } catch (error) {
      console.error('[NotificationProvider] Failed to sync with local DB:', error);
    }
  };

  const contextValue: NotificationContextValue = {
    queryClient,
    isInitialized,
    syncWithLocalDB,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </NotificationContext.Provider>
  );
}

// ====================
// EXPORT HOOKS INDEX
// ====================

/**
 * Export all notification hooks for convenience
 */
export {
  useNotifications,
  useNotification,
  useBucketNotifications,
  useNotificationStats,
  useBucketStats,
  useUnreadCountsByBucket,
  notificationKeys,
  prefetchNotifications,
  prefetchBucketNotifications,
} from './useNotificationQueries';

export {
  useCreateNotification,
  useUpdateNotification,
  useMarkAsRead,
  useMarkAsUnread,
  useBatchMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useBatchDeleteNotifications,
  useClearAllNotifications,
  useOptimisticMarkAsRead,
} from './useNotificationMutations';
