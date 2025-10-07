import { GetNotificationsDocument, GetNotificationsQuery, NotificationFragment } from '@/generated/gql-operations-generated';
import { ApiConfigService } from '@/services/api-config';
import { authService } from '@/services/auth-service';
import { getStoredDeviceToken } from '@/services/auth-storage';
import { getAllNotificationsFromCache } from '@/services/notifications-repository';
import { processJsonToCache } from '@/utils/cache-data-processor';
import { ApolloClient, createHttpLink, InMemoryCache, makeVar, split } from '@apollo/client';
import { loadDevMessages, loadErrorMessages } from "@apollo/client/dev";
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { Platform } from 'react-native';

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
            const byId = new Map<string, any>();

            for (const item of existing) {
              const id = readField<string>('id', item);
              if (id && !byId.has(id)) byId.set(id, item);
            }

            for (const item of incoming) {
              const id = readField<string>('id', item);
              if (id && !byId.has(id)) byId.set(id, item);
            }

            return Array.from(byId.values());
          },
        },
        buckets: {
          keyArgs: false,
          merge(existing = [], incoming = [], { readField }) {
            try {
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

            return Array.from(byId.values());
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


export const initApolloClient = async () => {
  await ApiConfigService.initialize();

  const splitLink = createSplitLinkDynamic();

  apolloClient = new ApolloClient({
    link: errorLink.concat(splitLink),
    cache,
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
        refetchWritePolicy: 'merge',
        fetchPolicy: "cache-first",
        // fetchPolicy: "cache-and-network",
      },
      query: {
        errorPolicy: 'all',
      },
    },
  });

  // Initialize GetNotifications query in cache to an empty array (if missing)
  try {
    const existing = apolloClient.cache.readQuery<GetNotificationsQuery>({
      query: GetNotificationsDocument,
    });
    if (!existing || !Array.isArray(existing.notifications)) {
      apolloClient.cache.writeQuery<GetNotificationsQuery>({
        query: GetNotificationsDocument,
        data: { __typename: 'Query', notifications: [] },
      });
    }
  } catch {
    apolloClient.cache.writeQuery<GetNotificationsQuery>({
      query: GetNotificationsDocument,
      data: { __typename: 'Query', notifications: [] },
    });
  }

  return apolloClient;
}

export const loadNotificationsFromPersistedCache = async (): Promise<void> => {
  try {
    console.log('[Apollo Cache] Loading notifications from persisted cache...');

    if (!apolloClient) {
      console.warn('[Apollo Cache] Apollo client not initialized');
      return;
    }

    let notifications: NotificationFragment[] = [];

    // Load from appropriate database based on platform
    try {
      notifications = await getAllNotificationsFromCache();
    } catch (error) {
      console.error(`[Apollo Cache] Error loading notifications from ${Platform.OS === 'web' ? 'IndexedDB' : 'SQLite'}:`, error);
    }

    if (notifications.length === 0) {
      console.log('[Apollo Cache] No notifications found to load');
      return;
    }

    console.log(`[Apollo Cache] Found ${notifications.length} notifications in ${Platform.OS === 'web' ? 'IndexedDB' : 'SQLite'}`);

    const successCount = await processJsonToCache(
      apolloClient.cache,
      notifications,
      'Apollo Cache',
    );

    console.log(`[Apollo Cache] Successfully loaded ${successCount} notifications from persisted cache`);
  } catch (error) {
    console.error('[Apollo Cache] Error loading notifications from persisted cache:', error);
  }
};

export const resetApolloCache = async () => {
  if (!apolloClient) return;
  try {
    apolloClient.cache.gc();
    apolloClient.cache.restore({});
    apolloClient.resetStore();
  } catch { }
  try { await apolloClient.clearStore(); } catch { }
};

export const reinitializeApolloClient = async (): Promise<void> => {
  if (!apolloClient) return;

  try {
    await ApiConfigService.initialize();

    console.log('🔄 Reinitializing Apollo Client with new API URL:', ApiConfigService.getApiUrlSync());

    await apolloClient.clearStore();

    const splitLink = createSplitLinkDynamic();

    apolloClient.setLink(errorLink.concat(splitLink));

    console.log('✅ Apollo Client successfully reinitialized');
  } catch (error) {
    console.error('Failed to reinitialize Apollo Client:', error);
    throw error;
  }
};
