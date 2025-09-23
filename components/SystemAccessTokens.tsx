import { Colors } from "@/constants/Colors";
import {
  SystemAccessTokenFragment,
  useGetSystemAccessTokensQuery,
  useRevokeSystemAccessTokenMutation,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { useNavigationUtils } from "@/utils/navigation";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import SettingsScrollView from "./SettingsScrollView";
import SwipeableItem from "./SwipeableItem";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

export default function SystemAccessTokens() {
  const colorScheme = useColorScheme();
  const { navigateToCreateSystemAccessToken } = useNavigationUtils();
  const { t } = useI18n();
  const { formatDate: formatDateService } = useDateFormat();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
    setMainLoading,
  } = useAppContext();

  const disabledActions = isOfflineAuth || isBackendUnreachable;

  const { data, loading, refetch } = useGetSystemAccessTokensQuery();
  const [revokeSystemToken] = useRevokeSystemAccessTokenMutation();
  useEffect(() => setMainLoading(loading), [loading]);

  const tokens = data?.listSystemTokens || [];
  const sortedTokens = useEntitySorting(tokens, "desc");

  const deleteToken = async (id: string) => {
    try {
      await revokeSystemToken({ variables: { id } });
      refetch();
    } catch (error) {
      console.error("Error deleting token:", error);
      Alert.alert(t("common.error"), t("systemAccessTokens.deleteError"));
    }
  };

  const formatTokenDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    return formatDateService(dateString);
  };

  const renderTokenItem = (item: SystemAccessTokenFragment) => {
    const isExpired = !!(
      item.expiresAt && new Date(item.expiresAt) < new Date()
    );

    return (
      <SwipeableItem
        key={item.id}
        marginBottom={8}
        rightAction={
          !disabledActions
            ? {
                icon: "delete",
                label: t("systemAccessTokens.item.delete"),
                backgroundColor: "#ff6b6b",
                onPress: () => deleteToken(item.id),
                showAlert: {
                  title: t("systemAccessTokens.item.deleteTokenTitle"),
                  message: t("systemAccessTokens.item.deleteTokenMessage"),
                  confirmText: t("systemAccessTokens.item.deleteTokenConfirm"),
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
            <ThemedText style={styles.tokenName}>
              {item.description ||
                (item.requester
                  ? item.requester.username ||
                    item.requester.email ||
                    item.requester.id
                  : null) ||
                item.id}
            </ThemedText>
            {isExpired && (
              <View style={styles.expiredBadge}>
                <ThemedText style={styles.expiredText}>
                  {t("systemAccessTokens.item.expired")}
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.tokenDetails}>
            <ThemedText style={styles.tokenDetail}>
              {t("systemAccessTokens.item.created")}:{" "}
              {formatTokenDate(item.createdAt)}
            </ThemedText>

            <ThemedText style={styles.tokenDetail}>
              {t("systemAccessTokens.item.calls")}: {item.calls}/
              {item.maxCalls || "-"}
            </ThemedText>

            {item.requester ? (
              <ThemedText style={styles.tokenDetail}>
                {t("systemAccessTokens.item.requester")}:{" "}
                {item.requester.username ||
                  item.requester.email ||
                  item.requester.id}
              </ThemedText>
            ) : null}

            {item.description ? (
              <ThemedText style={styles.tokenDetail}>
                {t("systemAccessTokens.item.description")}: {item.description}
              </ThemedText>
            ) : null}

            {item.expiresAt && (
              <ThemedText
                style={[styles.tokenDetail, isExpired && styles.expiredDetail]}
              >
                {t("systemAccessTokens.item.expires")}:{" "}
                {formatTokenDate(item.expiresAt)}
              </ThemedText>
            )}
          </View>
        </ThemedView>
      </SwipeableItem>
    );
  };

  const disabledAdd = disabledActions;

  return (
    <SettingsScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      onRefresh={refetch}
      headerActions={
        <TouchableOpacity
          style={[
            styles.createButton,
            {
              backgroundColor: disabledAdd
                ? Colors[colorScheme ?? "light"].buttonDisabled
                : Colors[colorScheme ?? "light"].tint,
            },
          ]}
          onPress={() => navigateToCreateSystemAccessToken()}
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
      }
    >
      <ThemedView>
        {sortedTokens.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <Ionicons
              name="key-outline"
              size={64}
              color={Colors[colorScheme ?? "light"].icon}
            />
            <ThemedText style={styles.emptyText}>
              {t("systemAccessTokens.noTokensTitle")}
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              {t("systemAccessTokens.noTokensSubtext")}
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={styles.tokensContainer}>
            {sortedTokens.map((item) => renderTokenItem(item))}
          </View>
        )}
      </ThemedView>
    </SettingsScrollView>
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
