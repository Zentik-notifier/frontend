import PaperScrollView from "@/components/ui/PaperScrollView";
import {
  useGetUserAccessTokensQuery,
} from "@/generated/gql-operations-generated";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Icon,
  Text,
  useTheme,
} from "react-native-paper";
import SwipeableAccessTokenItem from "./SwipeableAccessTokenItem";

export function AccessTokensSettings() {
  const theme = useTheme();
  const { navigateToCreateAccessToken } = useNavigationUtils();
  const { t } = useI18n();

  // GraphQL queries
  const { data, loading, refetch, error } = useGetUserAccessTokensQuery();

  const tokens = data?.getUserAccessTokens || [];
  const sortedTokens = useEntitySorting(tokens, "desc");

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <View style={styles.container}>
      <PaperScrollView
        onAdd={() => navigateToCreateAccessToken()}
        loading={loading}
        onRefresh={handleRefresh}
        error={!loading && !!error}
      >
        {sortedTokens.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              source="key"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="headlineSmall" style={styles.emptyText}>
              {t("accessTokens.noTokensTitle")}
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {t("accessTokens.noTokensSubtext")}
            </Text>
          </View>
        ) : (
          <View style={styles.tokensContainer}>
            {sortedTokens.map((item) => (
              <SwipeableAccessTokenItem key={item.id} token={item} />
            ))}
          </View>
        )}
      </PaperScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: "center",
  },
  tokensContainer: {
    flex: 1,
  },
});
