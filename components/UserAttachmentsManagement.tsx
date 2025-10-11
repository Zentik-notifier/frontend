import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import { useUserAttachmentsQuery } from "@/generated/gql-operations-generated";
import { useAppContext } from "@/contexts/AppContext";
import { SwipeableAttachmentItem } from "./SwipeableAttachmentItem";

export function UserAttachmentsManagement() {
  const { t } = useI18n();
  const theme = useTheme();
  const { userId } = useAppContext();

  const { data, loading, refetch } = useUserAttachmentsQuery({
    variables: { userId: userId || "" },
    skip: !userId,
    fetchPolicy: "network-only",
  });

  const attachments = data?.userAttachments || [];
  const loadingState = loading;

  const handleRefresh = async () => {
    await refetch();
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    Alert.alert(
      t("common.delete") as string,
      t("userAttachments.confirmDelete") as string,
      [
        {
          text: t("common.cancel") as string,
          style: "cancel",
        },
        {
          text: t("common.delete") as string,
          style: "destructive",
          onPress: async () => {
            try {
              // TODO: Implementare la mutation GraphQL per eliminare l'attachment
              Alert.alert(
                t("common.success") as string,
                t("userAttachments.deleteSuccess") as string
              );
              await refetch();
            } catch (error) {
              console.error("Error deleting attachment:", error);
              Alert.alert(
                t("common.error") as string,
                t("userAttachments.deleteFailed") as string
              );
            }
          },
        },
      ]
    );
  };

  return (
    <PaperScrollView onRefresh={handleRefresh} loading={loadingState}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statItem}>
          <Icon source="paperclip" size={20} color={theme.colors.primary} />
          <Text variant="titleMedium" style={styles.statValue}>
            {attachments.length}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            {t("userAttachments.attachments")}
          </Text>
        </View>
      </View>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon
            source="file-outline"
            size={64}
            color={theme.colors.onSurfaceDisabled}
          />
          <Text
            variant="titleMedium"
            style={[
              styles.emptyText,
              { color: theme.colors.onSurfaceDisabled },
            ]}
          >
            {t("userAttachments.noAttachmentsFound")}
          </Text>
        </View>
      ) : (
        <View>
          {attachments.map((attachment) => (
            <SwipeableAttachmentItem
              key={attachment.id}
              attachment={attachment}
              onDelete={handleDeleteAttachment}
            />
          ))}
        </View>
      )}
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  statValue: {
    fontWeight: "700",
  },
  statLabel: {
    opacity: 0.7,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    textAlign: "center",
  },
});
