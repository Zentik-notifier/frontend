import { GetNotificationsDocument, GetNotificationsQuery, NotificationFragment } from '@/generated/gql-operations-generated';
import { authService } from '@/services/auth-service';
import { settingsService } from '@/services/settings-service';
import { ApolloClient, createHttpLink, InMemoryCache, makeVar, split } from '@apollo/client';
import { loadDevMessages, loadErrorMessages } from "@apollo/client/dev";
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

if (__DEV__) {
  loadDevMessages();
  loadErrorMessages();
}

// Get the base URL from environment or custom setting
const getBaseUrl = () => {
  const apiUrl = settingsService.getApiUrl();
  return apiUrl.replace('http://', '').replace('https://', '');
};

// Create HTTP link for queries and mutations - function to allow recreation
const createHttpLinkDynamic = () => createHttpLink({
  uri: `${settingsService.getApiUrl()}/api/v1/graphql`,
});

export const subscriptionsEnabledVar = makeVar<boolean>(false);

// Create WebSocket link - function to allow recreation
const createWsLinkDynamic = () => {
  const wsProtocol = settingsService.getApiUrl().startsWith('https') ? 'wss' : 'ws';
  return new GraphQLWsLink(
    createClient({
      url: `${wsProtocol}://${getBaseUrl()}/api/v1/graphql`,
      connectionParams: async () => {
        const validToken = await authService.ensureValidToken();
        const deviceToken = settingsService.getAuthData().deviceToken;
        return { authorization: validToken ? `Bearer ${validToken}` : '', deviceToken: deviceToken || undefined };
      },
    })
  );
};

// Auth link to add authentication headers with proactive token refresh
const authLink = setContext(async (_, { headers }) => {
  const validToken = await authService.ensureValidToken();
  const deviceToken = settingsService.getAuthData().deviceToken;
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
});

const cache = createCacheDynamic();

export let apolloClient: ApolloClient<any> | null = null;

export const initApolloClient = async () => {
  await Promise.resolve();

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
    await Promise.resolve();

    console.log('🔄 Reinitializing Apollo Client with new API URL:', settingsService.getApiUrl());

    await apolloClient.clearStore();

    const splitLink = createSplitLinkDynamic();

    apolloClient.setLink(errorLink.concat(splitLink));

    console.log('✅ Apollo Client successfully reinitialized');
  } catch (error) {
    console.error('Failed to reinitialize Apollo Client:', error);
    throw error;
  }
};
