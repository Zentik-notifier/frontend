import {
  AccessTokenListDto,
  useGetUserAccessTokensQuery,
  useRevokeAccessTokenMutation,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import SwipeableItem from "./SwipeableItem";
import SettingsScrollView from "@/components/SettingsScrollView";
import { useNavigationUtils } from "@/utils/navigation";
import {
  Badge,
  Button,
  Card,
  Dialog,
  FAB,
  Icon,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";

export function AccessTokensSettings() {
  const theme = useTheme();
  const { navigateToCreateAccessToken } = useNavigationUtils();
  const { t } = useI18n();
  const { formatDate: formatDateService } = useDateFormat();
  const {
    setMainLoading,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const disabledAdd = isOfflineAuth || isBackendUnreachable;
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // GraphQL queries and mutations
  const { data, loading, refetch } = useGetUserAccessTokensQuery();
  const [revokeAccessToken] = useRevokeAccessTokenMutation();

  useEffect(() => setMainLoading(loading), [loading]);

  const tokens = data?.getUserAccessTokens || [];
  const sortedTokens = useEntitySorting(tokens, "desc");

  const deleteToken = async (tokenId: string) => {
    try {
      await revokeAccessToken({
        variables: { tokenId },
      });
      refetch(); // Refresh the list
    } catch (error) {
      console.error("Error deleting token:", error);
      setErrorMessage(t("accessTokens.deleteError"));
      setShowErrorDialog(true);
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
        <Card
          style={[
            styles.tokenItem,
            isExpired && { borderColor: theme.colors.error, borderWidth: 1 },
          ]}
          elevation={0}
        >
          <Card.Content>
            <View style={styles.tokenHeader}>
              <Text variant="titleMedium" style={styles.tokenName}>
                {item.name}
              </Text>
              {isExpired && (
                <Badge
                  style={[styles.expiredBadge, { backgroundColor: theme.colors.error }]}
                >
                  {t("accessTokens.item.expired")}
                </Badge>
              )}
            </View>

            <View style={styles.tokenDetails}>
              <Text variant="bodySmall" style={styles.tokenDetail}>
                {t("accessTokens.item.created")}:{" "}
                {formatTokenDate(item.createdAt)}
              </Text>

              {item.lastUsed && (
                <Text variant="bodySmall" style={styles.tokenDetail}>
                  {t("accessTokens.item.lastUsed")}:{" "}
                  {formatTokenDate(item.lastUsed)}
                </Text>
              )}

              {!item.lastUsed && (
                <Text variant="bodySmall" style={[styles.tokenDetail, { fontStyle: "italic" }]}>
                  {t("accessTokens.item.neverUsed")}
                </Text>
              )}

              {item.expiresAt && (
                <Text
                  variant="bodySmall"
                  style={[
                    styles.tokenDetail,
                    isExpired && { color: theme.colors.error },
                  ]}
                >
                  {t("accessTokens.item.expires")}:{" "}
                  {formatTokenDate(item.expiresAt)}
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>
      </SwipeableItem>
    );
  };

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <View style={styles.container}>
      <SettingsScrollView onRefresh={handleRefresh}>
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
            {sortedTokens.map((item) => renderTokenItem(item))}
          </View>
        )}
      </SettingsScrollView>

      {/* FAB per creare nuovo token */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigateToCreateAccessToken()}
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
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tokenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tokenName: {
    flex: 1,
    marginRight: 8,
  },
  expiredBadge: {
    // backgroundColor handled by theme
  },
  tokenDetails: {
    gap: 4,
  },
  tokenDetail: {
    // opacity handled by color
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
  },
});
