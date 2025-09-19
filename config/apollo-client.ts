import { GetNotificationsDocument, GetNotificationsQuery } from '@/generated/gql-operations-generated';
import { authService } from '@/services/auth-service';
import { getStoredDeviceToken } from '@/services/auth-storage';
import { userSettings } from '@/services/user-settings';
import { processJsonToCache } from '@/utils/cache-data-processor';
import { ApolloClient, createHttpLink, InMemoryCache, makeVar, NormalizedCacheObject, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { loadDevMessages, loadErrorMessages } from "@apollo/client/dev";
import AsyncStorage from 'expo-sqlite/kv-store';
import { createClient } from 'graphql-ws';
import { ApiConfigService } from '../services/api-config';

if (__DEV__) {
  loadDevMessages();
  loadErrorMessages();
}

// Get the base URL from environment or custom setting
const getBaseUrl = () => {
  const apiUrl = ApiConfigService.getApiUrlSync();
  return apiUrl.replace('http://', '').replace('https://', '');
};

// Create HTTP link for queries and mutations - function to allow recreation
const createHttpLinkDynamic = () => createHttpLink({
  uri: `${ApiConfigService.getApiUrlSync()}/api/v1/graphql`,
});

export const subscriptionsEnabledVar = makeVar<boolean>(false);

// Create WebSocket link - function to allow recreation
const createWsLinkDynamic = () => {
  const wsProtocol = ApiConfigService.getApiUrlSync().startsWith('https') ? 'wss' : 'ws';
  return new GraphQLWsLink(
    createClient({
      url: `${wsProtocol}://${getBaseUrl()}/api/v1/graphql`,
      connectionParams: async () => {
        const validToken = await authService.ensureValidToken();
        const deviceToken = await getStoredDeviceToken();
        return { authorization: validToken ? `Bearer ${validToken}` : '', deviceToken };
      },
    })
  );
};

// Auth link to add authentication headers with proactive token refresh
const authLink = setContext(async (_, { headers }) => {
  const validToken = await authService.ensureValidToken();
  const deviceToken = await getStoredDeviceToken();
  return {
    headers: {
      ...headers,
      authorization: validToken ? `Bearer ${validToken}` : '',
      deviceToken,
    },
  };
});

// Create split link - function to allow recreation
const createSplitLinkDynamic = () => {
  const httpLink = createHttpLinkDynamic();
  const wsLink = createWsLinkDynamic();

  return split(
    ({ query }) => {
      const definition = getMainDefinition(query) as any;
      const isSub = definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
      return subscriptionsEnabledVar() && isSub;
    },
    wsLink,
    authLink.concat(httpLink)
  );
};

// Error link for handling authentication errors
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const error of graphQLErrors) {
      console.error(`GraphQL error: Message: ${error.message}, Location: ${JSON.stringify(error.locations)}, Path: ${error.path}`);
    }
  }
  if (networkError) {
    console.error('GraphQL Network error:', networkError);
  }
});

// Create cache with dynamic URL resolution
const createCacheDynamic = () => new InMemoryCache({
  dataIdFromObject: (object: any) => {
    if (object.id) {
      return `${object.__typename}:${object.id}`;
    }
    return undefined;
  },
  typePolicies: {
    // Message: {
    //   merge(existing, incoming) {
    //     const safeExisting = (existing ?? {}) as Record<string, any>;
    //     const safeIncoming = (incoming ?? {}) as Record<string, any>;
    //     const result: Record<string, any> = { ...safeIncoming };
    //     for (const key of Object.keys(safeExisting)) {
    //       const value = safeExisting[key];
    //       if (value !== undefined && value !== null) {
    //         result[key] = value;
    //       }
    //     }
    //     return result as any;
    //   },
    // },
    MessageAttachment: {
      fields: {
        url: {
          read(existing, { readField }) {
            if (existing != null) return existing;
            const attachmentUuid = readField<string>('attachmentUuid');
            if (attachmentUuid) {
              const base = ApiConfigService.getApiUrlSync().replace(/\/$/, '');
              return `${base}/api/v1/attachments/${attachmentUuid}/download/public`;
            }
            return existing ?? null;
          },
        },
      },
    },
    Notification: {
      merge(existing, incoming) {
        const safeExisting = (existing ?? {}) as Record<string, any>;
        const safeIncoming = (incoming ?? {}) as Record<string, any>;
        const result: Record<string, any> = { ...safeIncoming };
        for (const key of Object.keys(safeExisting)) {
          const value = safeExisting[key];
          if (value !== undefined && value !== null) {
            result[key] = value;
          }
        }
        return result as any;
      },
      fields: {
        readAt: {
          merge(existing, incoming) {
            return existing !== undefined ? existing : (incoming ?? null);
          },
        },
        receivedAt: {
          merge(existing, incoming) {
            return existing !== undefined ? existing : (incoming ?? null);
          },
        },
      },
    },
    Query: {
      fields: {
        notifications: {
          keyArgs: false,
          merge(existing = [], incoming = [], { readField }) {
            try {
              // console.debug('[Apollo] Merge Query.notifications', {
              //   existingCount: Array.isArray(existing) ? existing.length : 0,
              //   incomingCount: Array.isArray(incoming) ? incoming.length : 0,
              // });
            } catch { }
            const byId = new Map<string, any>();

            for (const item of existing) {
              const id = readField<string>('id', item);
              if (id && !byId.has(id)) byId.set(id, item);
            }

            for (const item of incoming) {
              const id = readField<string>('id', item);
              if (id && !byId.has(id)) byId.set(id, item);
            }

            // Filter out dangling notifications (receivedAt null but older than 24 hours)
            // These are notifications that were dismissed or marked as read in the content extension
            // but haven't been synced with the UI yet
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            const filteredArray = Array.from(byId.values()).filter((notification) => {
              const receivedAt = readField<string>('receivedAt', notification);
              const createdAt = readField<string>('createdAt', notification);

              // Keep notifications that have receivedAt set
              if (receivedAt) {
                return true;
              }

              // Keep notifications that are recent (less than 24 hours old)
              if (createdAt && new Date(createdAt) > twentyFourHoursAgo) {
                return true;
              }

              // Filter out dangling notifications (receivedAt null and older than 24 hours)
              const id = readField<string>('id', notification);
              console.log(`🗑️ [Apollo] Filtering out dangling notification ${id} (created: ${createdAt}, receivedAt: ${receivedAt})`);
              return false;
            });

            // Compose merged array and sort by createdAt desc
            const mergedArray = filteredArray;
            const max = userSettings.getMaxCachedNotifications?.() ?? 500;

            mergedArray.sort((a, b) => {
              const aCreated = readField<string>('createdAt', a);
              const bCreated = readField<string>('createdAt', b);
              const aTime = aCreated ? Date.parse(aCreated) : 0;
              const bTime = bCreated ? Date.parse(bCreated) : 0;
              return bTime - aTime;
            });

            const limited = max > 0 ? mergedArray.slice(0, max) : mergedArray;

            // console.log(`📊 [Apollo] Filtered notifications: ${byId.size} -> ${filteredArray.length} (removed ${byId.size - filteredArray.length} dangling), limited to ${limited.length}`);
            return limited;
          },
        },
      },
    },
  },
});

// Create cache instance
const cache = createCacheDynamic();

export let apolloClient: ApolloClient<any> | null = null;
// export let persistor: CachePersistor<NormalizedCacheObject> | null = null;

/**
 * Controlla e pulisce le notifiche orfane dalla cache Apollo
 */
const checkAndCleanOrphanedNotifications = (client: ApolloClient<NormalizedCacheObject>) => {
  try {
    console.log('🧹 [Apollo Setup] Checking for orphaned notifications...');

    const cache = client.cache;

    // Leggi le notifiche dalla query GetNotifications
    let queryNotificationIds: Set<string> = new Set();
    try {
      const queryData = cache.readQuery<GetNotificationsQuery>({
        query: GetNotificationsDocument
      });
      if (queryData?.notifications) {
        queryNotificationIds = new Set(queryData.notifications.map(n => n.id));
        console.log(`📊 [Apollo Setup] Found ${queryNotificationIds.size} notifications in GetNotifications query`);
      }
    } catch (error) {
      console.log('📊 [Apollo Setup] GetNotifications query not found in cache yet, skipping cleanup');
      return; // Se la query non esiste ancora, non fare cleanup
    }

    const cacheData = cache.extract(true);
    const allCacheNotificationIds: string[] = [];

    Object.entries(cacheData).forEach(([key, entity]: [string, any]) => {
      if (entity && entity.__typename === 'Notification' && entity.id) {
        allCacheNotificationIds.push(entity.id);
      }
    });

    console.log(`📊 [Apollo Setup] Found ${allCacheNotificationIds.length} notifications in raw cache`);

    const orphanedIds = allCacheNotificationIds.filter(id => !queryNotificationIds.has(id));

    if (orphanedIds.length === 0) {
      console.log('✅ [Apollo Setup] No orphaned notifications found');
      return;
    }

    console.log(`🧹 [Apollo Setup] Found ${orphanedIds.length} orphaned notifications, cleaning up...`);

    // Rimuovi le notifiche orfane dalla cache
    let cleanedCount = 0;
    orphanedIds.forEach(id => {
      try {
        cache.evict({ id: cache.identify({ __typename: 'Notification', id }) });
        cleanedCount++;
      } catch (error) {
        console.warn(`⚠️ [Apollo Setup] Failed to evict orphaned notification ${id}:`, error);
      }
    });

    // Garbage collect per rimuovere riferimenti dangling
    cache.gc();

    console.log(`✅ [Apollo Setup] Cleaned ${cleanedCount}/${orphanedIds.length} orphaned notifications from cache`);

    // Log finale delle statistiche
    const finalCacheData = cache.extract(true as any) as Record<string, any>;
    const finalNotificationCount = Object.keys(finalCacheData).filter(key =>
      finalCacheData[key] && finalCacheData[key].__typename === 'Notification'
    ).length;

    console.log(`📊 [Apollo Setup] Cache cleanup complete - Final notification count: ${finalNotificationCount}`);

  } catch (error) {
    console.error('❌ [Apollo Setup] Error during orphaned notifications cleanup:', error);
  }
};

export const initApolloClient = async () => {
  await ApiConfigService.initialize();

  // persistor = new CachePersistor({
  //   cache,
  //   storage: new AsyncStorageWrapper({
  //     getItem: async (key) => {
  //       const value = await AsyncStorage.getItem(key);
  //       return value;
  //     },
  //     setItem: async (key, value) => {
  //       if (value) {
  //         return await AsyncStorage.setItem(key, value);
  //       } else {
  //         return await AsyncStorage.removeItem(key);
  //       }
  //     },
  //     removeItem: async (key) => {
  //       return await AsyncStorage.removeItem(key);
  //     },
  //   }),
  //   maxSize: 0,
  // });

  const splitLink = createSplitLinkDynamic();

  apolloClient = new ApolloClient({
    link: errorLink.concat(splitLink),
    cache,
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
        refetchWritePolicy: 'merge',
        fetchPolicy: "cache-and-network",
      },
      query: {
        errorPolicy: 'all',
      },
    },
  });

  checkAndCleanOrphanedNotifications(apolloClient);

  return apolloClient;
}

const APOLLO_CACHE_KEY = 'apollo-cache-notifications';

export const loadNotificationsFromPersistedCache = async (): Promise<void> => {
  try {
    console.log('📥 [Apollo Cache] Loading notifications from persisted cache...');

    if (!apolloClient) {
      console.warn('⚠️ [Apollo Cache] Apollo client not initialized');
      return;
    }

    const persistedCacheData = await AsyncStorage.getItem(APOLLO_CACHE_KEY);

    if (!persistedCacheData) {
      console.log('📥 [Apollo Cache] No persisted cache found');
      return;
    }

    const successCount = await processJsonToCache(
      apolloClient.cache as InMemoryCache,
      persistedCacheData,
      'Apollo Cache',
      100,
    );

    console.log(`✅ [Apollo Cache] Successfully loaded ${successCount} notifications from persisted cache`);

  } catch (error) {
    console.error('❌ [Apollo Cache] Error loading notifications from persisted cache:', error);
  }
};

/**
 * Salva on-demand le notifiche correnti nella cache persistente
 * utilizzando la stessa chiave del CachePersistor
 */
export const saveNotificationsToPersistedCache = async (): Promise<void> => {
  try {
    console.log('💾 [Apollo Cache] Saving notifications to persisted cache...');

    if (!apolloClient) {
      console.warn('⚠️ [Apollo Cache] Apollo client not initialized');
      return;
    }

    let queryData: GetNotificationsQuery | null = null;
    try {
      queryData = apolloClient.cache.readQuery<GetNotificationsQuery>({
        query: GetNotificationsDocument
      });
    } catch (error) {
      console.warn('⚠️ [Apollo Cache] GetNotifications query not found in cache');
      return;
    }

    if (!queryData?.notifications || queryData.notifications.length === 0) {
      console.log('💾 [Apollo Cache] No notifications to save');
      return;
    }

    const notificationsToSave = queryData.notifications;

    await AsyncStorage.setItem(
      APOLLO_CACHE_KEY,
      JSON.stringify(notificationsToSave)
    );

    console.log(`✅ [Apollo Cache] Successfully saved ${notificationsToSave.length} complete notifications to persisted cache`);
  } catch (error) {
    console.error('❌ [Apollo Cache] Error saving notifications to persisted cache:', error);
  }
};

export const resetApolloCache = async () => {
  if (!apolloClient) return;
  // if (persistor) {
  //   try { persistor.pause(); } catch { }
  // }
  try {
    apolloClient.cache.gc();
    apolloClient.cache.restore({});
    apolloClient.resetStore();
  } catch { }
  try { await apolloClient.clearStore(); } catch { }
  // if (persistor) {
  //   try { await persistor.purge(); } catch { }
  //   try { persistor.resume(); } catch { }
  // }
  await AsyncStorage.removeItem(APOLLO_CACHE_KEY);

};

// Helper function to recreate Apollo client with new API URL
export const reinitializeApolloClient = async () => {
  if (!apolloClient) return;

  try {
    // Reinitialize ApiConfigService to pick up the new URL from storage
    await ApiConfigService.initialize();

    console.log('🔄 Reinitializing Apollo Client with new API URL:', ApiConfigService.getApiUrlSync());

    // Stop the cache persistor
    // if (persistor) {
    //   persistor.pause();
    // }

    // Clear the current cache
    await apolloClient.clearStore();

    // Create new links with updated URL
    const splitLink = createSplitLinkDynamic();

    // Update the Apollo Client link
    apolloClient.setLink(errorLink.concat(splitLink));

    // Resume the cache persistor
    // if (persistor) {
    //   persistor.resume();
    // }

    console.log('✅ Apollo Client successfully reinitialized');
  } catch (error) {
    console.error('Failed to reinitialize Apollo Client:', error);
    throw error;
  }
};