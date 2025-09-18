import { ApolloClient, ApolloProvider } from "@apollo/client";
import React, { useEffect } from "react";
import { initApolloClient, initPersistedCache } from "../config/apollo-client";
import { ApiConfigService } from "../services/api-config";

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
  const [client, setClient] = React.useState<ApolloClient<any> | null>(null);

  useEffect(() => {
    (async () => {
      await ApiConfigService.initialize();
      const apolloClient = await initApolloClient();
      setClient(apolloClient);

      setTimeout(async () => {
        await initPersistedCache();
      }, 1000);
    })();
  }, []);

  if (!client) {
    return null;
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};
