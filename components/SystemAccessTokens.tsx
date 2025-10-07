import { useAppContext } from "@/contexts/AppContext";
import {
  SystemAccessTokenFragment,
  useGetSystemAccessTokensQuery,
  useRevokeSystemAccessTokenMutation,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  Icon,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";
import SwipeableItem from "./SwipeableItem";
import PaperScrollView from "./ui/PaperScrollView";

export default function SystemAccessTokens() {
  const theme = useTheme();
  const { navigateToCreateSystemAccessToken, navigateToEditSystemAccessToken } =
    useNavigationUtils();
  const { t } = useI18n();
  const { formatDate: formatDateService } = useDateFormat();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const disabledActions = isOfflineAuth || isBackendUnreachable;

  const { data, loading, refetch, error } = useGetSystemAccessTokensQuery();
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
        <Pressable
          style={[styles.tokenItem, isExpired && styles.expiredToken]}
          onPress={() =>
            !disabledActions && navigateToEditSystemAccessToken(item.id)
          }
        >
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
            <View style={styles.headerActions}>
              {isExpired && (
                <View style={styles.expiredBadge}>
                  <Text variant="bodySmall" style={styles.expiredText}>
                    {t("systemAccessTokens.item.expired")}
                  </Text>
                </View>
              )}
            </View>
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
        </Pressable>
      </SwipeableItem>
    );
  };

  const disabledAdd = disabledActions;

  return (
    <View style={styles.container}>
      <PaperScrollView
        onAdd={
          disabledAdd ? undefined : () => navigateToCreateSystemAccessToken()
        }
        onRefresh={handleRefresh}
        loading={loading}
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
