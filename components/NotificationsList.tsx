import { Colors } from "@/constants/Colors";
import { NotificationFragment } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import {
  useMassDeleteNotifications,
  useMassMarkNotificationsAsRead,
  useMassMarkNotificationsAsUnread,
} from "@/hooks/useNotifications";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { userSettings } from "@/services/user-settings";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import NotificationFilters from "./NotificationFilters";
import SwipeableNotificationItem from "./SwipeableNotificationItem";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { FlatList } from "react-native-gesture-handler";

interface NotificationsListProps {
  notifications: NotificationFragment[];
  hideBucketInfo?: boolean;
  isLoadingMore?: boolean;
  emptyStateMessage?: string;
  emptyStateSubtitle?: string;
  customHeader?: React.ReactNode;
  contentContainerStyle?: any;
  listStyle?: any;
}

export default function NotificationsList({
  notifications,
  hideBucketInfo = false,
  isLoadingMore = false,
  emptyStateMessage,
  emptyStateSubtitle,
  customHeader,
  contentContainerStyle,
  listStyle,
}: NotificationsListProps) {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { refetchNotifications } = useAppContext();

  // Hook per operazioni di massa
  const { massDelete: massDeleteNotifications, loading: deleteLoading } =
    useMassDeleteNotifications();
  const { massMarkAsRead, loading: markAsReadLoading } =
    useMassMarkNotificationsAsRead();
  const { massMarkAsUnread, loading: markAsUnreadLoading } =
    useMassMarkNotificationsAsUnread();

  // Stati per multi-selezione
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    userSettings: {
      settings: { notificationFilters, isCompactMode },
      setIsCompactMode,
    },
  } = useAppContext();

  // Filter and sort notifications based on user settings
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];

    let filtered = notifications.filter((notification) => {
      return userSettings.shouldFilterNotification(
        notification,
        hideBucketInfo
      );
    });

    // Apply sorting
    const comparator = userSettings.getNotificationSortComparator();
    filtered = filtered.sort(comparator);

    return filtered;
  }, [notifications, notificationFilters, hideBucketInfo, isCompactMode]);

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  // Funzione per eliminare notifiche selezionate
  const handleDeleteSelected = useCallback(async () => {
    const count = selectedItems.size;
    if (count === 0) return;

    Alert.alert(
      t("notifications.deleteSelected.title"),
      t("notifications.deleteSelected.message", { count }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            const notificationIds = Array.from(selectedItems);
            await massDeleteNotifications(notificationIds);
            handleCloseSelectionMode();
          },
        },
      ]
    );
  }, [selectedItems, massDeleteNotifications, t]);

  // Funzione per cambiare lo stato di lettura delle notifiche selezionate
  const handleToggleReadStatus = useCallback(async () => {
    if (selectedItems.size === 0) return;

    const selectedNotifications = filteredNotifications.filter((n) =>
      selectedItems.has(n.id)
    );
    const hasUnreadNotifications = selectedNotifications.some((n) => !n.readAt);
    const notificationIds = Array.from(selectedItems);

    try {
      if (hasUnreadNotifications) {
        // Marca come lette
        await massMarkAsRead(notificationIds);
      } else {
        // Marca come non lette
        await massMarkAsUnread(notificationIds);
      }
      handleCloseSelectionMode();
    } catch (error) {
      console.error("Error toggling read status:", error);
    }
  }, [selectedItems, filteredNotifications, massMarkAsRead, massMarkAsUnread]);

  const handleToggleCompactMode = () => {
    setIsCompactMode(!isCompactMode);
  };

  const handleSelectAll = () => {
    setSelectedItems(new Set(filteredNotifications.map((n) => n.id)));
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleCloseSelectionMode = () => {
    setSelectionMode(false);
    setSelectedItems(new Set());
  };

  const handleToggleMultiSelection = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      handleCloseSelectionMode();
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchNotifications();
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: NotificationFragment }) => {
      const isSelected = selectedItems.has(item.id);

      return (
        <SwipeableNotificationItem
          notification={item}
          hideBucketInfo={hideBucketInfo}
          isMultiSelectionMode={selectionMode}
          isSelected={isSelected}
          onToggleSelection={() => toggleItemSelection(item.id)}
        />
      );
    },
    [selectedItems, selectionMode, hideBucketInfo]
  );

  // Memoized key extractor
  const keyExtractor = useCallback((item: NotificationFragment) => item.id, []);

  const renderSelectionBar = () => (
    <View
      style={[
        styles.selectionBar,
        {
          borderBottomColor: Colors[colorScheme].border,
          backgroundColor: Colors[colorScheme].background,
        },
      ]}
    >
      <View style={styles.leftControls}>
        <TouchableOpacity
          style={[
            styles.selectionButton,
            {
              borderColor: Colors[colorScheme].border,
              backgroundColor: Colors[colorScheme].backgroundCard,
            },
          ]}
          onPress={handleCloseSelectionMode}
        >
          <ThemedText
            style={[
              styles.selectionCountText,
              { color: Colors[colorScheme].text },
            ]}
          >
            {t("common.cancel")}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectionCountBadge,
            {
              borderColor: Colors[colorScheme].border,
              backgroundColor: Colors[colorScheme].tint,
            },
          ]}
          onPress={
            selectedItems.size === filteredNotifications.length
              ? handleDeselectAll
              : handleSelectAll
          }
        >
          <ThemedText
            style={[
              styles.selectionCountText,
              { color: Colors[colorScheme].background },
            ]}
          >
            {selectedItems.size}
          </ThemedText>
          <ThemedText
            style={[
              styles.selectionCountText,
              {
                color: Colors[colorScheme].background,
                fontSize: 12,
                marginLeft: 4,
                opacity: 0.9,
              },
            ]}
          >
            {selectedItems.size === filteredNotifications.length
              ? t("notifications.deselectAll")
              : t("notifications.selectAll")}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.rightControls}>
        <TouchableOpacity
          style={[
            styles.selectionButton,
            {
              borderColor:
                selectedItems.size === 0
                  ? Colors[colorScheme].borderLight
                  : Colors[colorScheme].border,
              backgroundColor:
                selectedItems.size === 0
                  ? Colors[colorScheme].backgroundSecondary
                  : Colors[colorScheme].backgroundCard,
              opacity: selectedItems.size === 0 ? 0.5 : 1,
            },
          ]}
          onPress={handleToggleReadStatus}
          disabled={
            selectedItems.size === 0 || markAsReadLoading || markAsUnreadLoading
          }
        >
          {markAsReadLoading || markAsUnreadLoading ? (
            <ActivityIndicator size="small" color={Colors[colorScheme].text} />
          ) : (
            (() => {
              const selectedNotifications = filteredNotifications.filter((n) =>
                selectedItems.has(n.id)
              );
              const hasUnreadNotifications = selectedNotifications.some(
                (n) => !n.readAt
              );
              return hasUnreadNotifications ? (
                // Icona per "segna come letto" - doppio checkmark verde
                <Ionicons
                  name="checkmark-done"
                  size={20}
                  color={
                    selectedItems.size === 0
                      ? Colors[colorScheme].textMuted
                      : Colors[colorScheme].success
                  }
                />
              ) : (
                // Icona per "segna come non letto" - doppio checkmark rosso
                <Ionicons
                  name="checkmark-done"
                  size={20}
                  color={
                    selectedItems.size === 0
                      ? Colors[colorScheme].textMuted
                      : Colors[colorScheme].error
                  }
                />
              );
            })()
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectionButton,
            {
              borderColor:
                selectedItems.size === 0
                  ? Colors[colorScheme].borderLight
                  : Colors[colorScheme].border,
              backgroundColor:
                selectedItems.size === 0
                  ? Colors[colorScheme].backgroundSecondary
                  : Colors[colorScheme].backgroundCard,
              opacity: selectedItems.size === 0 ? 0.5 : 1,
            },
          ]}
          onPress={handleDeleteSelected}
          disabled={selectedItems.size === 0 || deleteLoading}
        >
          {deleteLoading ? (
            <ActivityIndicator size="small" color={Colors[colorScheme].text} />
          ) : (
            <Ionicons
              name="trash-outline"
              size={20}
              color={
                selectedItems.size === 0
                  ? Colors[colorScheme].textSecondary
                  : Colors[colorScheme].error
              }
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <ThemedView style={styles.emptyState}>
      <ThemedText style={styles.emptyText}>
        {emptyStateMessage || t("home.emptyState.noNotifications")}
      </ThemedText>
      {emptyStateSubtitle && (
        <ThemedText style={styles.emptySubtitle}>
          {emptyStateSubtitle}
        </ThemedText>
      )}
    </ThemedView>
  );

  const renderListFooter = () => (
    <View style={styles.listFooter}>
      <ThemedText
        style={[
          styles.listFooterText,
          { color: Colors[colorScheme].textSecondary },
        ]}
      >
        {t("notifications.endOfList")}
      </ThemedText>
    </View>
  );

  const renderLoadingFooter = () => (
    <View style={styles.loadingFooter}>
      <ActivityIndicator size="small" color={Colors[colorScheme].tint} />
      <ThemedText
        style={[
          styles.loadingText,
          { color: Colors[colorScheme].textSecondary },
        ]}
      >
        {t("common.loading")}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={[styles.container, listStyle]}>
      {/* Barra di selezione (visibile solo in modalità selezione) */}
      {selectionMode && renderSelectionBar()}

      {/* Filtri (nascosti durante multi-select) */}
      {!selectionMode && (
        <NotificationFilters
          onToggleCompactMode={handleToggleCompactMode}
          isCompactMode={isCompactMode}
          hideBucketSelector={hideBucketInfo}
          onToggleMultiSelection={handleToggleMultiSelection}
          selectedCount={selectedItems.size}
          isMultiSelectionMode={selectionMode}
        />
      )}

      {customHeader}

      <FlatList
        data={filteredNotifications}
        windowSize={3}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors[colorScheme ?? "light"].tint]}
            tintColor={Colors[colorScheme ?? "light"].tint}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, contentContainerStyle]}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderListFooter}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.4,
    marginTop: 8,
  },
  // Stili per la barra di selezione
  selectionBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectionCountBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  selectionCountText: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectionButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  listFooter: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  listFooterText: {
    fontSize: 14,
    opacity: 0.6,
    fontStyle: "italic",
  },
  loadingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
});
