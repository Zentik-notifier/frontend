import { ApolloClient, ApolloProvider } from "@apollo/client";
import React, { useEffect, useState } from "react";
import { initApolloClient } from "../config/apollo-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface GraphQLProviderProps {
  children: React.ReactNode;
}

export const QueryProviders: React.FC<GraphQLProviderProps> = ({
  children,
}) => {
  const [client, setClient] = React.useState<ApolloClient<any> | null>(null);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000,
          },
        },
      })
  );

  useEffect(() => {
    (async () => {
      const apolloClient = await initApolloClient();
      setClient(apolloClient);
    })();
  }, []);

  if (!client) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ApolloProvider client={client}>{children}</ApolloProvider>
    </QueryClientProvider>
  );
};
