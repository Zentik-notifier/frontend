import { ApolloClient, ApolloProvider } from "@apollo/client";
import React, { useEffect } from "react";
import { initApolloClient } from "../config/apollo-client";
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
      // Ensure API URL is loaded before creating Apollo client
      await ApiConfigService.initialize();
      const apolloClient = await initApolloClient();
      setClient(apolloClient);
    })();
  }, []);

  if (!client) {
    return null;
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};
