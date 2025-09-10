import { authService } from '@/services/auth-service';
import { getStoredDeviceToken } from '@/services/auth-storage';
import { userSettings } from '@/services/user-settings';
import { ApolloClient, createHttpLink, InMemoryCache, makeVar, NormalizedCacheObject, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { AsyncStorageWrapper, CachePersistor } from 'apollo3-cache-persist';
import { createClient } from 'graphql-ws';
import { ApiConfigService } from '../services/api-config';
import { loadErrorMessages, loadDevMessages } from "@apollo/client/dev";
import AsyncStorage from 'expo-sqlite/kv-store';

if (__DEV__) {
  // Adds messages only in a dev environment
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
  typePolicies: {
    Message: {
      keyFields: ['id'],
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
    },
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
      keyFields: ['id'],
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
    Bucket: { keyFields: ['id'] },
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
            mergedArray.sort((a, b) => {
              const aCreated = readField<string>('createdAt', a);
              const bCreated = readField<string>('createdAt', b);
              const aTime = aCreated ? Date.parse(aCreated) : 0;
              const bTime = bCreated ? Date.parse(bCreated) : 0;
              return bTime - aTime;
            });

            const max = userSettings.getMaxCachedNotifications?.() ?? 500;
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
export let persistor: CachePersistor<NormalizedCacheObject> | null = null;

export const initApolloClient = async () => {
  await ApiConfigService.initialize();

  persistor = new CachePersistor({
    cache,
    storage: new AsyncStorageWrapper({
      getItem: async (key) => {
        return await AsyncStorage.getItem(key);
      },
      setItem: async (key, value) => {
        if (value) {
          return await AsyncStorage.setItem(key, value);
        } else {
          return await AsyncStorage.removeItem(key);
        }
      },
      removeItem: async (key) => {
        return await AsyncStorage.removeItem(key);
      },
    }),
    maxSize: 0,
  });
  await persistor.restore();

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

  return apolloClient;
}

// Helper function to reset Apollo cache (useful for logout)
export const resetApolloCache = async () => {
  if (!apolloClient) return;
  if (persistor) {
    try { persistor.pause(); } catch { }
  }
  try {
    const snapshot = apolloClient.cache.extract();
    for (const id of Object.keys(snapshot)) {
      try { apolloClient.cache.evict({ id }); } catch { }
    }
    apolloClient.cache.gc();
    apolloClient.cache.restore({});
  } catch { }
  try { await apolloClient.clearStore(); } catch { }
  if (persistor) {
    try { await persistor.purge(); } catch { }
    try { persistor.resume(); } catch { }
  }
};

// Esegue un reset profondo: memoria + disco, pensato per modali di reset
export const purgeApolloCache = async () => {
  await resetApolloCache();
};

// Helper function to recreate Apollo client with new API URL
export const reinitializeApolloClient = async () => {
  if (!apolloClient) return;

  try {
    // Reinitialize ApiConfigService to pick up the new URL from storage
    await ApiConfigService.initialize();

    console.log('🔄 Reinitializing Apollo Client with new API URL:', ApiConfigService.getApiUrlSync());

    // Stop the cache persistor
    if (persistor) {
      persistor.pause();
    }

    // Clear the current cache
    await apolloClient.clearStore();

    // Create new links with updated URL
    const splitLink = createSplitLinkDynamic();

    // Update the Apollo Client link
    apolloClient.setLink(errorLink.concat(splitLink));

    // Resume the cache persistor
    if (persistor) {
      persistor.resume();
    }

    console.log('✅ Apollo Client successfully reinitialized');
  } catch (error) {
    console.error('Failed to reinitialize Apollo Client:', error);
    throw error;
  }
};