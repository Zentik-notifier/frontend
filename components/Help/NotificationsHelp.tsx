import { useI18n } from "@/hooks/useI18n";
import { NotificationDeliveryType } from "@/generated/gql-operations-generated";
import { useNotificationUtils } from "@/hooks";
import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Icon,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

export default function NotificationsHelp() {
  const theme = useTheme();
  const { t } = useI18n();
  const { getDeliveryTypeIcon, getDeliveryTypeColor } = useNotificationUtils();

  const deliveryTypes = [
    NotificationDeliveryType.Critical,
    NotificationDeliveryType.Silent,
    NotificationDeliveryType.NoPush,
  ];

  return (
    <View style={styles.container}>
      {/* Swipe Actions Section */}
      <Surface style={[styles.section, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View style={styles.sectionHeader}>
          <Icon
            source="gesture"
            size={20}
            color={theme.colors.primary}
          />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t("notificationsHelp.swipeActions.title")}
          </Text>
        </View>
        <Text variant="bodyMedium" style={styles.sectionDescription}>
          {t("notificationsHelp.swipeActions.description")}
        </Text>

        <View style={styles.actionItem}>
          <Icon source="chevron-left" size={18} color={theme.colors.primary} />
          <View style={styles.actionContent}>
            <Text variant="labelLarge">
              {t("notificationsHelp.swipeActions.left")}
            </Text>
            <Text variant="bodySmall" style={styles.actionDescription}>
              {t("notificationsHelp.swipeActions.leftDescription")}
            </Text>
          </View>
        </View>

        <View style={styles.actionItem}>
          <Icon source="chevron-right" size={18} color={theme.colors.error} />
          <View style={styles.actionContent}>
            <Text variant="labelLarge">
              {t("notificationsHelp.swipeActions.right")}
            </Text>
            <Text variant="bodySmall" style={styles.actionDescription}>
              {t("notificationsHelp.swipeActions.rightDescription")}
            </Text>
          </View>
        </View>

        <View style={styles.actionItem}>
          <Icon source="dots-vertical" size={18} color={theme.colors.primary} />
          <View style={styles.actionContent}>
            <Text variant="labelLarge">
              {t("notificationsHelp.swipeActions.menu")}
            </Text>
            <Text variant="bodySmall" style={styles.actionDescription}>
              {t("notificationsHelp.swipeActions.menuDescription")}
            </Text>
          </View>
        </View>
      </Surface>

      {/* Border Color Priority Section */}
      <Surface style={[styles.section, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View style={styles.sectionHeader}>
          <Icon source="format-color-fill" size={20} color={theme.colors.primary} />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t("notificationsHelp.borderColor.title")}
          </Text>
        </View>
        <Text variant="bodyMedium" style={styles.sectionDescription}>
          {t("notificationsHelp.borderColor.description")}
        </Text>

        {deliveryTypes.map((type) => {
          const color = getDeliveryTypeColor(type);
          const icon = getDeliveryTypeIcon(type);
          return (
            <View key={type} style={styles.priorityItem}>
              <View
                style={[
                  styles.colorIndicator,
                  { backgroundColor: color || theme.colors.outline },
                ]}
              />
              <Icon
                source={icon as any}
                size={18}
                color={theme.colors.onSurface}
              />
              <View style={styles.priorityContent}>
                <Text variant="labelLarge">
                  {t(`notificationDetail.deliveryTypes.${type}` as any)}
                </Text>
                <Text variant="bodySmall" style={styles.priorityDescription}>
                  {t(`notificationsHelp.borderColor.${type}` as any)}
                </Text>
              </View>
            </View>
          );
        })}
      </Surface>

      {/* Unread Symbol Section */}
      <Surface style={[styles.section, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View style={styles.sectionHeader}>
          <Icon
            source="circle-outline"
            size={20}
            color={theme.colors.primary}
          />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t("notificationsHelp.unreadSymbol.title")}
          </Text>
        </View>
        <View style={styles.unreadIndicatorContainer}>
          <View
            style={[
              styles.unreadIndicator,
              {
                borderTopColor: theme.colors.primary,
                borderRightColor: theme.colors.primary,
              },
            ]}
          />
        </View>
        <Text variant="bodyMedium" style={styles.sectionDescription}>
          {t("notificationsHelp.unreadSymbol.description")}
        </Text>
      </Surface>

      {/* Bucket Icon Section */}
      <Surface style={[styles.section, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View style={styles.sectionHeader}>
          <Icon
            source="folder"
            size={20}
            color={theme.colors.primary}
          />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t("notificationsHelp.bucketIcon.title")}
          </Text>
        </View>
        <Text variant="bodyMedium" style={styles.sectionDescription}>
          {t("notificationsHelp.bucketIcon.description")}
        </Text>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontWeight: "600",
  },
  sectionDescription: {
    marginTop: 4,
    opacity: 0.8,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 8,
  },
  actionContent: {
    flex: 1,
    gap: 4,
  },
  actionDescription: {
    opacity: 0.7,
  },
  priorityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  colorIndicator: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  priorityContent: {
    flex: 1,
    gap: 4,
  },
  priorityDescription: {
    opacity: 0.7,
  },
  unreadIndicatorContainer: {
    alignItems: "flex-end",
    paddingVertical: 12,
  },
  unreadIndicator: {
    width: 40,
    height: 40,
    borderTopWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderTopRightRadius: 8,
  },
});

