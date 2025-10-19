import { useAppContext } from "@/contexts/AppContext";
import {
  AccessTokenListDto,
  useRevokeAccessTokenMutation,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Dialog, Icon, Portal, Text, useTheme } from "react-native-paper";
import SwipeableItem, { MenuItem } from "./SwipeableItem";

interface SwipeableAccessTokenItemProps {
  token: AccessTokenListDto;
}

const SwipeableAccessTokenItem: React.FC<SwipeableAccessTokenItemProps> = ({
  token,
}) => {
  const theme = useTheme();
  const { t } = useI18n();
  const { formatDate } = useDateFormat();
  const { navigateToEditAccessToken } = useNavigationUtils();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const isOffline = isOfflineAuth || isBackendUnreachable;
  const [revokeAccessTokenMutation] = useRevokeAccessTokenMutation();
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  const isExpired = useMemo(
    () =>
      token.isExpired ||
      (token.expiresAt && new Date(token.expiresAt) < new Date()),
    [token.isExpired, token.expiresAt]
  );

  const hasToken = !!token.token;

  const handleEditToken = (tokenId: string) => {
    navigateToEditAccessToken(tokenId);
  };

  const revokeToken = async (tokenId: string) => {
    try {
      await revokeAccessTokenMutation({
        variables: { tokenId },
        refetchQueries: ["GetUserAccessTokens"],
      });
      setDialogMessage(t("accessTokens.deleteSuccessMessage"));
    } catch (error) {
      console.error("Error revoking access token:", error);
      setDialogMessage(t("accessTokens.deleteError"));
      setShowErrorDialog(true);
    }
  };

  const deleteAction = !isOffline
    ? {
        icon: "delete" as const,
        label: t("accessTokens.item.delete"),
        backgroundColor: "#ff4444",
        onPress: () => revokeToken(token.id),
        showAlert: {
          title: t("accessTokens.item.deleteTokenTitle"),
          message: t("accessTokens.item.deleteTokenMessage"),
          confirmText: t("accessTokens.item.deleteTokenConfirm"),
          cancelText: t("common.cancel"),
        },
      }
    : undefined;

  const menuItems = useMemo((): MenuItem[] => {
    const items: MenuItem[] = [];

    if (!isOffline) {
      items.push({
        id: "edit",
        label: t("accessTokens.item.edit"),
        icon: "pencil",
        onPress: () => handleEditToken(token.id),
      });
    }

    return items;
  }, [isOffline, t, token.id, handleEditToken]);

  return (
    <SwipeableItem
      copyId={token.id}
      rightAction={deleteAction}
      menuItems={menuItems}
      showMenu={!isOffline}
    >
      <Pressable onPress={() => handleEditToken(token.id)}>
        <View style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isExpired
                      ? theme.colors.error
                      : theme.colors.primary,
                  },
                ]}
              >
                <Icon
                  source={isExpired ? "clock-alert" : "key"}
                  size={16}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.tokenDetails}>
                <View style={styles.tokenNameRow}>
                  <Text variant="titleMedium" style={styles.itemName}>
                    {token.name}
                  </Text>
                  {hasToken && (
                    <Icon
                      source="content-save"
                      size={14}
                      color={theme.colors.primary}
                    />
                  )}
                </View>
                {isExpired && (
                  <Text
                    variant="bodySmall"
                    style={[styles.statusText, { color: theme.colors.error }]}
                  >
                    {t("accessTokens.item.expired")}
                  </Text>
                )}
                {!isExpired && token.expiresAt && (
                  <Text variant="bodySmall" style={styles.statusText}>
                    {t("accessTokens.item.expires")}:{" "}
                    {formatDate(token.expiresAt)}
                  </Text>
                )}
                {!isExpired && !token.expiresAt && (
                  <Text
                    variant="bodySmall"
                    style={[styles.statusText, { color: theme.colors.primary }]}
                  >
                    {t("accessTokens.item.neverExpires")}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {token.scopes && token.scopes.length > 0 && (
            <View style={styles.scopesInfo}>
              <Icon
                source="lock"
                size={12}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodySmall" style={styles.scopesText}>
                {token.scopes.length} scope
                {token.scopes.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}

          <Text variant="bodySmall" style={styles.itemDetail}>
            {t("accessTokens.item.created")}: {formatDate(token.createdAt)}
          </Text>

          {token.lastUsed && (
            <Text variant="bodySmall" style={styles.itemDetail}>
              {t("accessTokens.item.lastUsed")}: {formatDate(token.lastUsed)}
            </Text>
          )}

          {!token.lastUsed && (
            <Text
              variant="bodySmall"
              style={[styles.itemDetail, { fontStyle: "italic" }]}
            >
              {t("accessTokens.item.neverUsed")}
            </Text>
          )}
        </View>
      </Pressable>

      {/* Error Dialog */}
      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
        >
          <Dialog.Title>{t("common.error")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Text onPress={() => setShowErrorDialog(false)}>
              {t("common.ok")}
            </Text>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SwipeableItem>
  );
};

const styles = StyleSheet.create({
  itemCard: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusBadge: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenDetails: {
    flex: 1,
  },
  tokenNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  itemName: {
    flex: 1,
  },
  statusText: {
    opacity: 0.7,
  },
  scopesInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  scopesText: {
    opacity: 0.6,
    marginLeft: 4,
  },
  itemDetail: {
    opacity: 0.7,
    marginBottom: 4,
  },
});

export default SwipeableAccessTokenItem;
