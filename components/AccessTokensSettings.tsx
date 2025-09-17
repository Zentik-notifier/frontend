import { Colors } from "@/constants/Colors";
import {
  AccessTokenListDto,
  useGetUserAccessTokensQuery,
  useRevokeAccessTokenMutation,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import SwipeableItem from "./SwipeableItem";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { AppLoader } from "./ui/AppLoader";

interface AccessTokensSettingsProps {
  refreshing?: boolean;
}

export function AccessTokensSettings({
  refreshing,
}: AccessTokensSettingsProps) {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { t } = useI18n();
  const { formatDate: formatDateService } = useDateFormat();
  const {
    setMainLoading,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const disabledAdd = isOfflineAuth || isBackendUnreachable;

  // GraphQL queries and mutations
  const { data, loading, refetch } = useGetUserAccessTokensQuery();
  const [revokeAccessToken] = useRevokeAccessTokenMutation();

  useEffect(() => setMainLoading(loading), [loading]);

  const tokens = data?.getUserAccessTokens || [];
  const sortedTokens = useEntitySorting(tokens, "desc");

  // Refetch data when refreshing prop changes
  useEffect(() => {
    if (refreshing) {
      console.log("AccessTokensSettings: Refreshing data...");
    }
    refetch();
  }, [refreshing, refetch]);

  const deleteToken = async (tokenId: string) => {
    try {
      await revokeAccessToken({
        variables: { tokenId },
      });
      refetch(); // Refresh the list
    } catch (error) {
      console.error("Error deleting token:", error);
      Alert.alert(t("common.error"), t("accessTokens.deleteError"));
    }
  };

  const formatTokenDate = (dateString: string) => {
    return formatDateService(dateString);
  };

  const renderTokenItem = (item: AccessTokenListDto) => {
    const isExpired =
      item.isExpired ||
      (item.expiresAt && new Date(item.expiresAt) < new Date());

    return (
      <SwipeableItem
        key={item.id}
        marginHorizontal={0}
        marginBottom={8}
        rightAction={
          !(isOfflineAuth || isBackendUnreachable)
            ? {
                icon: "delete",
                label: t("accessTokens.item.delete"),
                backgroundColor: "#ff6b6b",
                onPress: () => deleteToken(item.id),
                showAlert: {
                  title: t("accessTokens.item.deleteTokenTitle"),
                  message: t("accessTokens.item.deleteTokenMessage"),
                  confirmText: t("accessTokens.item.deleteTokenConfirm"),
                  cancelText: t("common.cancel"),
                },
              }
            : undefined
        }
      >
        <ThemedView
          style={[
            styles.tokenItem,
            {
              backgroundColor: Colors[colorScheme ?? "light"].backgroundCard,
            },
            isExpired && styles.expiredToken,
          ]}
        >
          <View style={styles.tokenHeader}>
            <ThemedText style={styles.tokenName}>{item.name}</ThemedText>
            {isExpired && (
              <View style={styles.expiredBadge}>
                <ThemedText style={styles.expiredText}>
                  {t("accessTokens.item.expired")}
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.tokenDetails}>
            <ThemedText style={styles.tokenDetail}>
              {t("accessTokens.item.created")}:{" "}
              {formatTokenDate(item.createdAt)}
            </ThemedText>

            {item.lastUsed && (
              <ThemedText style={styles.tokenDetail}>
                {t("accessTokens.item.lastUsed")}:{" "}
                {formatTokenDate(item.lastUsed)}
              </ThemedText>
            )}

            {!item.lastUsed && (
              <ThemedText style={[styles.tokenDetail, { fontStyle: "italic" }]}>
                {t("accessTokens.item.neverUsed")}
              </ThemedText>
            )}

            {item.expiresAt && (
              <ThemedText
                style={[styles.tokenDetail, isExpired && styles.expiredDetail]}
              >
                {t("accessTokens.item.expires")}:{" "}
                {formatTokenDate(item.expiresAt)}
              </ThemedText>
            )}
          </View>
        </ThemedView>
      </SwipeableItem>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>{t("accessTokens.title")}</ThemedText>
        <TouchableOpacity
          style={[
            styles.createButton,
            {
              backgroundColor: disabledAdd
                ? Colors[colorScheme ?? "light"].buttonDisabled
                : Colors[colorScheme ?? "light"].tint,
            },
          ]}
          onPress={() => router.push("/(mobile)/private/create-access-token")}
          disabled={disabledAdd}
        >
          <Ionicons
            name="add"
            size={24}
            color={
              disabledAdd
                ? Colors[colorScheme ?? "light"].textSecondary
                : "white"
            }
          />
        </TouchableOpacity>
      </View>

      <ThemedText style={styles.description}>
        {t("accessTokens.description")}
      </ThemedText>

      {sortedTokens.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <Ionicons
            name="key-outline"
            size={64}
            color={Colors[colorScheme ?? "light"].icon}
          />
          <ThemedText style={styles.emptyText}>
            {t("accessTokens.noTokensTitle")}
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            {t("accessTokens.noTokensSubtext")}
          </ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.tokensContainer}>
          {sortedTokens.map((item) => renderTokenItem(item))}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: "center",
  },
  tokensContainer: {
    flex: 1,
  },
  tokenItem: {
    padding: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  expiredToken: {
    opacity: 0.6,
    borderColor: "#ff6b6b",
  },
  tokenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  expiredBadge: {
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expiredText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  tokenDetails: {
    gap: 4,
  },
  tokenDetail: {
    fontSize: 13,
    opacity: 0.7,
  },
  expiredDetail: {
    color: "#ff6b6b",
    opacity: 1,
  },
});
