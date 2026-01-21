import { useAppContext } from "@/contexts/AppContext";
import {
  AccessTokenListDto,
  useRevokeAccessTokenMutation,
  useGetBucketsQuery,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useMemo } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Chip, Icon, Text, useTheme } from "react-native-paper";
import * as Clipboard from "expo-clipboard";
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
  const [revokeAccessTokenMutation] = useRevokeAccessTokenMutation({
    refetchQueries: ["GetUserAccessTokens", "GetAccessTokensForBucket"],
  });
  const { data: bucketsData } = useGetBucketsQuery();

  const isExpired = useMemo(
    () =>
      token.isExpired ||
      (token.expiresAt && new Date(token.expiresAt) < new Date()),
    [token.isExpired, token.expiresAt]
  );

  const hasToken = !!token.token;

  const scopedBuckets = useMemo(() => {
    if (!token.scopes || token.scopes.length === 0) return [];

    const bucketIds = token.scopes
      .filter((s) => s.startsWith("message-bucket-creation:"))
      .map((s) => s.split(":")[1]);

    return bucketsData?.buckets.filter((b) => bucketIds.includes(b.id)) || [];
  }, [token.scopes, bucketsData]);

  const isWatchToken = useMemo(() => {
    return token.scopes?.includes("watch") ?? false;
  }, [token.scopes]);

  const handleEditToken = (tokenId: string) => {
    navigateToEditAccessToken(tokenId);
  };

  const revokeToken = async (tokenId: string) => {
    try {
      await revokeAccessTokenMutation({
        variables: { tokenId },
        refetchQueries: ["GetUserAccessTokens"],
      });
    } catch (error) {
      console.error("Error revoking access token:", error);
      Alert.alert(t("common.error"), t("accessTokens.deleteError"));
    }
  };

  const copyToken = async () => {
    if (token.token) {
      await Clipboard.setStringAsync(token.token);
      Alert.alert(t("common.success"), t("accessTokens.form.tokenCopied"));
    }
  };

  const deleteAction = !isOffline && !isWatchToken
    ? {
        icon: "delete" as const,
        label: t("accessTokens.item.delete"),
        destructive: true,
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

    if (hasToken) {
      items.push({
        id: "copy-token",
        label: t("accessTokens.item.copyToken" as any),
        icon: "content-copy",
        onPress: copyToken,
      });
    }

    // Disable edit for Watch token - it can only be managed from CloudKit settings
    if (!isOffline && !isWatchToken) {
      items.push({
        id: "edit",
        label: t("accessTokens.item.edit"),
        icon: "pencil",
        onPress: () => handleEditToken(token.id),
      });
    }

    return items;
  }, [isOffline, hasToken, isWatchToken, t, token.id, handleEditToken, copyToken]);

  return (
    <SwipeableItem
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
                  {isWatchToken && (
                    <Icon
                      source="watch"
                      size={14}
                      color={theme.colors.primary}
                    />
                  )}
                </View>
                {isWatchToken && (
                  <Text
                    variant="bodySmall"
                    style={[styles.statusText, { color: theme.colors.primary }]}
                  >
                    {t("accessTokens.item.watchTokenNote")}
                  </Text>
                )}
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

          {scopedBuckets.length > 0 && (
            <View style={styles.bucketsInfo}>
              <Text variant="bodySmall" style={styles.bucketsLabel}>
                {t("accessTokens.item.limitedToBuckets" as any)}:
              </Text>
              <View style={styles.bucketsChips}>
                {scopedBuckets.slice(0, 2).map((bucket) => (
                  <Chip
                    key={bucket.id}
                    textStyle={styles.bucketChipText}
                    icon="folder"
                  >
                    {bucket.name}
                  </Chip>
                ))}
                {scopedBuckets.length > 2 && (
                  <Chip textStyle={styles.bucketChipText}>
                    +{scopedBuckets.length - 2}
                  </Chip>
                )}
              </View>
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
  bucketsInfo: {
    marginBottom: 8,
  },
  bucketsLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  bucketsChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  bucketChipText: {
    fontSize: 11,
  },
  itemDetail: {
    opacity: 0.7,
    marginBottom: 4,
  },
});

export default SwipeableAccessTokenItem;
