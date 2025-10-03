import {
  SystemAccessTokenFragment,
  useGetSystemAccessTokensQuery,
  useRevokeSystemAccessTokenMutation,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import PaperScrollView from "./ui/PaperScrollView";
import SwipeableItem from "./SwipeableItem";
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  FAB,
  Icon,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";

export default function SystemAccessTokens() {
  const theme = useTheme();
  const { navigateToCreateSystemAccessToken } = useNavigationUtils();
  const { t } = useI18n();
  const { formatDate: formatDateService } = useDateFormat();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const disabledActions = isOfflineAuth || isBackendUnreachable;

  const { data, loading, refetch } = useGetSystemAccessTokensQuery();
  const [revokeSystemToken] = useRevokeSystemAccessTokenMutation();

  const handleRefresh = async () => {
    await refetch();
  };

  const tokens = data?.listSystemTokens || [];
  const sortedTokens = useEntitySorting(tokens, "desc");

  const deleteToken = async (id: string) => {
    try {
      await revokeSystemToken({ variables: { id } });
      await handleRefresh();
    } catch (error) {
      console.error("Error deleting token:", error);
      setErrorMessage(t("systemAccessTokens.deleteError"));
      setShowErrorDialog(true);
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
        <View style={[styles.tokenItem, isExpired && styles.expiredToken]}>
          <View style={styles.tokenHeader}>
            <Text variant="titleMedium" style={styles.tokenName}>
              {item.description ||
                (item.requester
                  ? item.requester.username ||
                    item.requester.email ||
                    item.requester.id
                  : null) ||
                item.id}
            </Text>
            {isExpired && (
              <View style={styles.expiredBadge}>
                <Text variant="bodySmall" style={styles.expiredText}>
                  {t("systemAccessTokens.item.expired")}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.tokenDetails}>
            <Text variant="bodySmall" style={styles.tokenDetail}>
              {t("systemAccessTokens.item.created")}:{" "}
              {formatTokenDate(item.createdAt)}
            </Text>

            <Text variant="bodySmall" style={styles.tokenDetail}>
              {t("systemAccessTokens.item.calls")}: {item.calls}/
              {item.maxCalls || "-"}
            </Text>

            {item.requester ? (
              <Text variant="bodySmall" style={styles.tokenDetail}>
                {t("systemAccessTokens.item.requester")}:{" "}
                {item.requester.username ||
                  item.requester.email ||
                  item.requester.id}
              </Text>
            ) : null}

            {item.description ? (
              <Text variant="bodySmall" style={styles.tokenDetail}>
                {t("systemAccessTokens.item.description")}: {item.description}
              </Text>
            ) : null}

            {item.expiresAt && (
              <Text
                variant="bodySmall"
                style={[styles.tokenDetail, isExpired && styles.expiredDetail]}
              >
                {t("systemAccessTokens.item.expires")}:{" "}
                {formatTokenDate(item.expiresAt)}
              </Text>
            )}
          </View>
        </View>
      </SwipeableItem>
    );
  };

  const disabledAdd = disabledActions;

  return (
    <View style={styles.container}>
      <PaperScrollView onRefresh={handleRefresh} loading={loading}>
        {sortedTokens.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              source="key"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="headlineSmall" style={styles.emptyText}>
              {t("systemAccessTokens.noTokensTitle")}
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {t("systemAccessTokens.noTokensSubtext")}
            </Text>
          </View>
        ) : (
          <View style={styles.tokensContainer}>
            {sortedTokens.map((item) => renderTokenItem(item))}
          </View>
        )}
      </PaperScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigateToCreateSystemAccessToken()}
        disabled={disabledAdd}
      />

      {/* Error Dialog */}
      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
        >
          <Dialog.Title>{t("common.error")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{errorMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowErrorDialog(false)}>
              {t("common.ok")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  headerTitle: {
    flex: 1,
    fontWeight: "600",
  },
  refreshButton: {
    minWidth: 48,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
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
  tokenItem: {
    padding: 16,
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
    fontWeight: "600",
  },
  tokenDetails: {
    gap: 4,
  },
  tokenDetail: {
    opacity: 0.7,
  },
  expiredDetail: {
    color: "#ff6b6b",
    opacity: 1,
  },
});
