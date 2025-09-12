import { Colors } from "@/constants/Colors";
import { useGetBucketData } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { useMassMarkNotificationsAsRead } from "@/hooks/useNotifications";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { useUserSettings, userSettings } from "@/services/user-settings";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import BucketIcon from "./BucketIcon";
import MessageBuilder from "./MessageBuilder";
import NotificationsList from "./NotificationsList";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import Icon from "./ui/Icon";
import NotificationSnoozeButton from "./NotificationSnoozeButton";

interface BucketDetailProps {
  bucketId: string;
}

export default function BucketDetail({ bucketId }: BucketDetailProps) {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [isMessageBuilderVisible, setIsMessageBuilderVisible] = useState(false);
  const { massMarkAsRead, loading: markAllAsReadLoading } =
    useMassMarkNotificationsAsRead();

  const { notifications } = useAppContext();
  const {
    settings: { notificationFilters },
  } = useUserSettings();
  const { bucket } = useGetBucketData(bucketId);

  // Filter notifications for this bucket
  const bucketNotifications = useMemo(() => {
    return notifications.filter(
      (notification) => notification.message?.bucket?.id === bucketId
    );
  }, [notifications, bucketId]);

  // Calculate unread notifications
  const unreadNotifications = useMemo(() => {
    return bucketNotifications.filter((notification) => !notification.readAt);
  }, [bucketNotifications]);

  const filteredNotifications = useMemo(() => {
    if (!bucketNotifications) return [];

    // Apply global filters (including bucket filter since we're already in a bucket context)
    let filtered = bucketNotifications.filter((notification) => {
      return userSettings.shouldFilterNotification(notification, false);
    });

    // Apply sorting based on global settings
    const comparator = userSettings.getNotificationSortComparator();
    filtered = filtered.sort(comparator);

    return filtered;
  }, [bucketNotifications, notificationFilters, userSettings]);

  const handleMessageSent = () => {
    console.log("Message sent successfully to bucket:", bucketId);
    setIsMessageBuilderVisible(false);
  };

  const handleMarkAllAsRead = async () => {
    if (unreadNotifications.length === 0) return;

    const unreadIds = unreadNotifications.map((n) => n.id);
    try {
      await massMarkAsRead(unreadIds);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleCopyBucketId = async () => {
    try {
      await Clipboard.setStringAsync(bucketId);
      Alert.alert(t("common.copied"), bucketId);
    } catch (e) {
      Alert.alert(t("common.error"), t("common.error"));
    }
  };

  const renderBucketHeader = () => (
    <View
      style={[
        styles.bucketHeader,
        { backgroundColor: Colors[colorScheme].background },
      ]}
    >
      <View style={styles.bucketInfo}>
        <BucketIcon bucketId={bucketId} size="xl" noRouting />

        <View style={styles.bucketDetails}>
          <ThemedText
            style={[styles.bucketName, { color: Colors[colorScheme].text }]}
          >
            {bucket?.name}
          </ThemedText>
          {bucket?.description && (
            <ThemedText
              style={[
                styles.bucketDescription,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {bucket.description}
            </ThemedText>
          )}

          {/* Statistics */}
          <View style={styles.bucketStats}>
            <View style={styles.statItem}>
              <Icon name="notifications" size="xs" color="secondary" />
              <ThemedText
                style={[
                  styles.statText,
                  { color: Colors[colorScheme].textSecondary },
                ]}
              >
                {bucketNotifications.length} {t("buckets.item.messages")}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      {/* Action Block (Top row: mark/edit/copy; Bottom row: snooze) */}
      <View style={styles.actionBlock}>
        <View style={styles.actionTopRow}>
          {/* Mark All as Read Button */}
          <TouchableOpacity
            style={[
              styles.markAllButton,
              {
                backgroundColor:
                  unreadNotifications.length > 0
                    ? "#0a7ea4"
                    : Colors[colorScheme].backgroundSecondary,
              },
            ]}
            onPress={handleMarkAllAsRead}
            disabled={unreadNotifications.length === 0 || markAllAsReadLoading}
            activeOpacity={0.7}
          >
            <View style={styles.markAllButtonContent}>
              {markAllAsReadLoading ? (
                <ActivityIndicator
                  size="small"
                  color={
                    unreadNotifications.length > 0
                      ? "#fff"
                      : Colors[colorScheme].tabIconDefault
                  }
                />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-done"
                    size={16}
                    color={
                      unreadNotifications.length > 0
                        ? "#fff"
                        : Colors[colorScheme].tabIconDefault
                    }
                  />
                  {unreadNotifications.length > 0 && (
                    <ThemedText style={styles.markAllButtonText}>
                      {unreadNotifications.length}
                    </ThemedText>
                  )}
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Edit Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: Colors[colorScheme].backgroundSecondary,
              },
            ]}
            onPress={() =>
              router.push(
                `/(mobile)/private/edit-bucket?bucketId=${bucketId}` as any
              )
            }
          >
            <Ionicons
              name="pencil"
              size={16}
              color={Colors[colorScheme].tabIconDefault}
            />
          </TouchableOpacity>

          {/* Copy Bucket ID Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: Colors[colorScheme].backgroundSecondary,
              },
            ]}
            onPress={handleCopyBucketId}
          >
            <Ionicons
              name="copy"
              size={16}
              color={Colors[colorScheme].tabIconDefault}
            />
          </TouchableOpacity>
        </View>

        {/* Snooze Button - bottom row */}
        <View style={styles.actionBottomRow}>
          <NotificationSnoozeButton
            bucketId={bucketId}
            variant="detail"
            showText
          />
        </View>
      </View>
    </View>
  );

  const renderMessageBuilderToggle = () => (
    <View
      style={[
        styles.messageBuilderToggleContainer,
        { backgroundColor: Colors[colorScheme].background },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.messageBuilderToggleButton,
          {
            backgroundColor: Colors[colorScheme].backgroundCard,
            borderColor: Colors[colorScheme].border,
          },
        ]}
        onPress={() => setIsMessageBuilderVisible(!isMessageBuilderVisible)}
      >
        <Ionicons
          name="add-circle-outline"
          size={24}
          color={Colors[colorScheme].tint}
        />
        <ThemedText
          style={[
            styles.messageBuilderToggleText,
            { color: Colors[colorScheme].text },
          ]}
        >
          {t("buckets.composeMessage")}
        </ThemedText>
        <Ionicons
          name={isMessageBuilderVisible ? "chevron-up" : "chevron-down"}
          size={20}
          color={Colors[colorScheme].textSecondary}
        />
      </TouchableOpacity>
    </View>
  );

  if (!bucket) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      {/* Sticky Header with Bucket Info */}
      <View style={styles.stickyHeader}>{renderBucketHeader()}</View>

      {/* Notifications List */}
      <NotificationsList
        notifications={filteredNotifications}
        hideBucketInfo
        customHeader={
          <View
            style={[
              styles.filtersContainer,
              { backgroundColor: Colors[colorScheme].background },
            ]}
          />
        }
      />

      {/* Message Builder Toggle */}
      {renderMessageBuilderToggle()}

      {/* Message Builder */}
      {isMessageBuilderVisible && (
        <View
          style={[
            styles.messageBuilderContainer,
            { backgroundColor: Colors[colorScheme].background },
          ]}
        >
          {/* Header del MessageBuilder con indicatore di chiusura */}
          <View
            style={[
              styles.messageBuilderHeader,
              { borderBottomColor: Colors[colorScheme].border },
            ]}
          >
            <View style={styles.messageBuilderDragHandle} />
            <TouchableOpacity
              style={styles.messageBuilderCloseButton}
              onPress={() => setIsMessageBuilderVisible(false)}
            >
              <Ionicons
                name="close"
                size={24}
                color={Colors[colorScheme].textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.messageBuilderScrollView}
            contentContainerStyle={styles.messageBuilderScrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            <MessageBuilder
              initialBucketId={bucketId}
              onMessageSent={handleMessageSent}
              compact={true}
            />
          </ScrollView>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyHeader: {
    backgroundColor: "white",
    zIndex: 1,
  },

  bucketHeader: {
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  bucketInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  bucketDetails: {
    flex: 1,
  },
  bucketName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  bucketDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  bucketStats: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  filtersContainer: {},
  messageBuilderToggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  messageBuilderToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  messageBuilderToggleText: {
    fontSize: 16,
    fontWeight: "600",
  },
  messageBuilderContainer: {
    position: "absolute",
    bottom: 70,
    left: 0,
    right: 0,
    maxHeight: "60%",
    zIndex: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  messageBuilderScrollView: {
    flex: 1,
  },
  messageBuilderScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  messageBuilderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  messageBuilderDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
    alignSelf: "center",
  },
  messageBuilderCloseButton: {
    padding: 4,
    borderRadius: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
  },
  actionBlock: {
    flexDirection: "column",
    gap: 8,
  },
  actionTopRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  actionBottomRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  markAllButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
  },
  markAllButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  markAllButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
  },
});
