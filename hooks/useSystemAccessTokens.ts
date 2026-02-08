import {
  SystemAccessTokenFragment,
  useGetSystemAccessTokensQuery,
} from "@/generated/gql-operations-generated";

export type SystemTokenOption = {
  id: string;
  token: string;
  description: string | null;
};

export function useSystemAccessTokens() {
  const { data, loading, error, refetch } = useGetSystemAccessTokensQuery({
    fetchPolicy: "cache-and-network",
  });

  const tokens: SystemTokenOption[] =
    data?.listSystemTokens
      ?.filter(
        (sat: SystemAccessTokenFragment): sat is SystemAccessTokenFragment & {
          token: string;
        } =>
          !!sat.token && (sat.scopes?.includes("passthrough") ?? false)
      )
      .map((sat: SystemAccessTokenFragment & { token: string }) => ({
        id: sat.id,
        token: sat.token,
        description: sat.description ?? null,
      })) ?? [];

  return {
    tokens,
    loading,
    error,
    refetch,
  };
}
