import {
  MediaType,
  NotificationFragment,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import {
  useMassDeleteNotifications,
  useMassMarkNotificationsAsRead,
  useMassMarkNotificationsAsUnread,
} from "@/hooks/useNotifications";
import { useAppContext } from "@/services/app-context";
import { userSettings } from "@/services/user-settings";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  RefreshControl,
  StyleSheet,
  View,
  ViewToken,
} from "react-native";
import {
  Surface,
  Text,
  useTheme,
  ActivityIndicator,
  TouchableRipple,
  Icon,
} from "react-native-paper";
import NotificationFilters from "./NotificationFilters";
import NotificationItem, {
  getNotificationItemHeight,
} from "./NotificationItem";
import { FlashList } from "@shopify/flash-list";
// Using Paper Icon instead of custom ui/Icon

interface NotificationsListProps {
  notifications: NotificationFragment[];
  hideBucketInfo?: boolean;
  emptyStateMessage?: string;
  emptyStateSubtitle?: string;
  customHeader?: React.ReactNode;
  contentContainerStyle?: any;
  listStyle?: any;
}

export default function NotificationsList({
  notifications,
  hideBucketInfo = false,
  emptyStateMessage,
  emptyStateSubtitle,
  customHeader,
  contentContainerStyle,
  listStyle,
}: NotificationsListProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { refetchNotifications } = useAppContext();
  const {
    userSettings: { settings },
  } = useAppContext();

  const { massDelete: massDeleteNotifications, loading: deleteLoading } =
    useMassDeleteNotifications();
  const { massMarkAsRead, loading: markAsReadLoading } =
    useMassMarkNotificationsAsRead();
  const { massMarkAsUnread, loading: markAsUnreadLoading } =
    useMassMarkNotificationsAsUnread();

  const [visibleItems, setVisibileItems] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    userSettings: {
      settings: { notificationFilters, isCompactMode },
      setIsCompactMode,
    },
  } = useAppContext();

  // Track currently visible item ids and debounce marking as read
  const visibleIdsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didUserScrollRef = useRef(false);
  const listRef = useRef<any>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Filter and sort notifications based on user settings
  const { filteredNotifications } = useMemo(() => {
    let filtered = (notifications ?? []).filter((notification) => {
      return userSettings.shouldFilterNotification(
        notification,
        hideBucketInfo
      );
    });

    // Apply sorting
    const comparator = userSettings.getNotificationSortComparator();
    filtered = filtered.sort(comparator);

    const maxId = filtered[filtered.length - 1]?.id;

    return { filteredNotifications: filtered, maxId };
  }, [notifications, notificationFilters, hideBucketInfo, isCompactMode]);

  const onViewableItemsChanged = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: ViewToken<NotificationFragment>[];
    }) => {
      const visibleIds = viewableItems.map((vi) => vi.item.id);
      const visibleSet = new Set(visibleIds);
      setVisibileItems(visibleSet);
      visibleIdsRef.current = visibleSet;

      try {
        const firstId = filteredNotifications[0]?.id;
        setShowScrollTop(firstId ? !visibleSet.has(firstId) : false);
      } catch {}

      if (!settings.notificationsPreferences?.markAsReadOnView) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (!didUserScrollRef.current) return;
        didUserScrollRef.current = false;
        const candidates: string[] = [];
        for (const n of filteredNotifications) {
          if (visibleIdsRef.current.has(n.id) && !n.readAt) {
            candidates.push(n.id);
          }
        }
        if (candidates.length > 0) {
          massMarkAsRead(candidates).catch(() => {});
        }
      }, 1000);
    },
    [
      settings.notificationsPreferences?.markAsReadOnView,
      massMarkAsRead,
      filteredNotifications,
    ]
  );

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

  // Predicted item heights (max) to help FlashList pre-compute layouts
  // Compact: only text + optional attachments pills
  // Heights imported from NotificationItem to keep values in sync

  const itemHasMediaAttachments = useCallback((n: NotificationFragment) => {
    const atts = n.message?.attachments ?? [];
    return atts.some((a) =>
      [
        MediaType.Image,
        MediaType.Gif,
        MediaType.Video,
        MediaType.Audio,
      ].includes(a.mediaType)
    );
  }, []);

  // Provide a predictable max size per type so FlashList can pre-measure content length
  const overrideItemLayout = useCallback(
    (layout: { span?: number; size?: number }, item: NotificationFragment) => {
      layout.size = getNotificationItemHeight(item, isCompactMode);
    },
    [isCompactMode]
  );

  const renderItem = useCallback(
    ({ item }: { item: NotificationFragment }) => {
      const isSelected = selectedItems.has(item.id);

      // return <ThemedText>{item.message.title}</ThemedText>

      return (
        <NotificationItem
          notification={item}
          isItemVisible={visibleItems.has(item.id)}
          hideBucketInfo={hideBucketInfo}
          isMultiSelectionMode={selectionMode}
          isSelected={isSelected}
          onToggleSelection={() => toggleItemSelection(item.id)}
        />
      );
    },
    [selectedItems, selectionMode, hideBucketInfo, visibleItems]
  );

  // Memoized key extractor
  const keyExtractor = useCallback((item: NotificationFragment) => item.id, []);

  const renderSelectionBar = () => (
    <Surface
      style={[
        styles.selectionBar,
        {
          borderBottomColor: theme.colors.outline,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <View style={styles.leftControls}>
        <TouchableRipple
          style={[
            styles.selectionButton,
            {
              borderColor: theme.colors.outline,
              backgroundColor:
                theme.colors.elevation?.level1 || theme.colors.surface,
            },
          ]}
          onPress={handleCloseSelectionMode}
        >
          <Text
            style={[
              styles.selectionCountText,
              { color: theme.colors.onSurface },
            ]}
          >
            {t("common.cancel")}
          </Text>
        </TouchableRipple>

        <TouchableRipple
          style={[
            styles.selectionCountBadge,
            {
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={
            selectedItems.size === filteredNotifications.length
              ? handleDeselectAll
              : handleSelectAll
          }
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={[
                styles.selectionCountText,
                { color: theme.colors.onPrimary },
              ]}
            >
              {selectedItems.size}
            </Text>
            <Text
              style={[
                styles.selectionCountText,
                {
                  color: theme.colors.onPrimary,
                  fontSize: 12,
                  marginLeft: 4,
                  opacity: 0.9,
                },
              ]}
            >
              {selectedItems.size === filteredNotifications.length
                ? t("notifications.deselectAll")
                : t("notifications.selectAll")}
            </Text>
          </View>
        </TouchableRipple>
      </View>

      <View style={styles.rightControls}>
        <TouchableRipple
          style={[
            styles.selectionButton,
            {
              borderColor:
                selectedItems.size === 0
                  ? theme.colors.outlineVariant || theme.colors.outline
                  : theme.colors.outline,
              backgroundColor:
                selectedItems.size === 0
                  ? theme.colors.surfaceVariant
                  : theme.colors.elevation?.level1 || theme.colors.surface,
              opacity: selectedItems.size === 0 ? 0.5 : 1,
            },
          ]}
          onPress={handleToggleReadStatus}
          disabled={
            selectedItems.size === 0 || markAsReadLoading || markAsUnreadLoading
          }
        >
          {markAsReadLoading || markAsUnreadLoading ? (
            <ActivityIndicator size={16} color={theme.colors.onSurface} />
          ) : (
            (() => {
              const selectedNotifications = filteredNotifications.filter((n) =>
                selectedItems.has(n.id)
              );
              const hasUnreadNotifications = selectedNotifications.some(
                (n) => !n.readAt
              );
              return hasUnreadNotifications ? (
                <Icon
                  source="check-all"
                  size={20}
                  color={
                    selectedItems.size === 0
                      ? theme.colors.onSurfaceVariant
                      : theme.colors.secondary
                  }
                />
              ) : (
                <Icon
                  source="check-all"
                  size={20}
                  color={
                    selectedItems.size === 0
                      ? theme.colors.onSurfaceVariant
                      : theme.colors.error
                  }
                />
              );
            })()
          )}
        </TouchableRipple>

        <TouchableRipple
          style={[
            styles.selectionButton,
            {
              borderColor:
                selectedItems.size === 0
                  ? theme.colors.outlineVariant || theme.colors.outline
                  : theme.colors.outline,
              backgroundColor:
                selectedItems.size === 0
                  ? theme.colors.surfaceVariant
                  : theme.colors.elevation?.level1 || theme.colors.surface,
              opacity: selectedItems.size === 0 ? 0.5 : 1,
            },
          ]}
          onPress={handleDeleteSelected}
          disabled={selectedItems.size === 0 || deleteLoading}
        >
          {deleteLoading ? (
            <ActivityIndicator size={16} color={theme.colors.onSurface} />
          ) : (
            <Icon
              source="trash-can-outline"
              size={20}
              color={
                selectedItems.size === 0
                  ? theme.colors.onSurfaceVariant
                  : theme.colors.error
              }
            />
          )}
        </TouchableRipple>
      </View>
    </Surface>
  );

  const renderEmptyState = () => (
    <Surface style={[styles.emptyState, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Text
        style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
      >
        {emptyStateMessage || t("home.emptyState.noNotifications")}
      </Text>
      {emptyStateSubtitle && (
        <Text
          style={[
            styles.emptySubtitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {emptyStateSubtitle}
        </Text>
      )}
    </Surface>
  );

  const renderListFooter = () => (
    <View style={styles.listFooter}>
      <Text
        style={[
          styles.listFooterText,
          { color: theme.colors.onSurfaceVariant },
        ]}
      >
        {t("notifications.endOfList")}
      </Text>
    </View>
  );

  // const renderLoadingFooter = () => (
  //   <View style={styles.loadingFooter}>
  //     <ActivityIndicator size="small" color={Colors[colorScheme].tint} />
  //     <ThemedText
  //       style={[
  //         styles.loadingText,
  //         { color: Colors[colorScheme].textSecondary },
  //       ]}
  //     >
  //       {t("common.loading")}
  //     </ThemedText>
  //   </View>
  // );

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }, listStyle]} elevation={0}>
      {selectionMode && renderSelectionBar()}

      {!selectionMode && (
        <View style={styles.filtersWrapper}>
          <NotificationFilters
            onToggleCompactMode={handleToggleCompactMode}
            isCompactMode={isCompactMode}
            hideBucketSelector={hideBucketInfo}
            onToggleMultiSelection={handleToggleMultiSelection}
            selectedCount={selectedItems.size}
            isMultiSelectionMode={selectionMode}
          />
        </View>
      )}

      {customHeader}

      <FlashList
        ref={listRef}
        data={filteredNotifications}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        // overrideItemLayout={overrideItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        onScroll={() => {
          didUserScrollRef.current = true;
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary] as any}
            tintColor={theme.colors.primary as any}
          />
        }
        showsVerticalScrollIndicator
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderListFooter}
      />

      {showScrollTop && (
        <TouchableRipple
          onPress={() => {
            try {
              listRef.current?.scrollToOffset({ offset: 0, animated: true });
            } catch {}
          }}
          style={[
            styles.scrollTopFab,
            {
              backgroundColor: theme.colors.elevation?.level2 || theme.colors.surface,
            },
          ]}
        >
          <Icon source="arrow-up" size={20} color={theme.colors.onSurface} />
        </TouchableRipple>
      )}
    </Surface>
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
  scrollTopFab: {
    position: "absolute",
    right: 16,
    bottom: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  filtersWrapper: {
    marginBottom: 8,
  },
});
