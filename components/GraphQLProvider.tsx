import { ApolloClient, ApolloProvider } from "@apollo/client";
import React, { useEffect } from "react";
import {
  initApolloClient,
  loadNotificationsFromPersistedCache,
} from "../config/apollo-client";
import { usePendingNotificationIntents } from "@/hooks/usePendingNotificationIntents";

interface GraphQLProviderProps {
  children: React.ReactNode;
}

/**
 * GraphQL Provider that wraps the app with Apollo Client
 * Should be placed inside AuthProvider but outside individual screens
 */
export const GraphQLProvider: React.FC<GraphQLProviderProps> = ({
  children,
}) => {
  const { processPendingNotificationIntents } = usePendingNotificationIntents();
  const [client, setClient] = React.useState<ApolloClient<any> | null>(null);

  useEffect(() => {
    (async () => {
      const apolloClient = await initApolloClient();
      setClient(apolloClient);
      await processPendingNotificationIntents(apolloClient);
      await loadNotificationsFromPersistedCache();
    })();
  }, []);

  if (!client) {
    return null;
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};
