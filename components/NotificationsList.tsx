import {
  NotificationsProvider,
  useNotificationsContext,
} from "@/contexts/NotificationsContext";
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
import { useAppContext } from "@/contexts/AppContext";
import { userSettings } from "@/services/user-settings";
import { FlashList } from "@shopify/flash-list";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  RefreshControl,
  StyleSheet,
  View,
  ViewToken,
} from "react-native";
import {
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import NotificationFilters from "./NotificationFilters";
import NotificationItem, {
  getNotificationItemHeight,
} from "./NotificationItem";

interface NotificationsListProps {
  notifications: NotificationFragment[];
  hideBucketInfo?: boolean;
  emptyStateMessage?: string;
  emptyStateSubtitle?: string;
  customHeader?: React.ReactNode;
  listStyle?: any;
}

export function NotificationsListWithContext(props: NotificationsListProps) {
  return (
    <NotificationsProvider>
      <NotificationsList {...props} />
    </NotificationsProvider>
  );
}

export default function NotificationsList({
  notifications,
  hideBucketInfo = false,
  emptyStateMessage,
  emptyStateSubtitle,
  customHeader,
  listStyle,
}: NotificationsListProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { refetchNotifications } = useAppContext();
  const {
    setMainLoading,
    userSettings: { settings },
  } = useAppContext();

  const { massDelete: massDeleteNotifications, loading: isMassDeleteLoading } =
    useMassDeleteNotifications();
  const { massMarkAsRead } = useMassMarkNotificationsAsRead();
  const { massMarkAsUnread } = useMassMarkNotificationsAsUnread();

  const [visibleItems, setVisibileItems] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    state: { selectionMode, selectedItems },
    handleCloseSelectionMode,
    handleSetAllNotifications,
    dispatch,
  } = useNotificationsContext();

  useEffect(() => {
    handleSetAllNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    setMainLoading(isMassDeleteLoading);
  }, [isMassDeleteLoading]);

  const {
    userSettings: {
      settings: { notificationFilters },
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
  }, [
    notifications,
    notificationFilters,
    hideBucketInfo,
    settings.isCompactMode,
  ]);

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
    dispatch({ type: "SET_SELECTED_ITEMS", payload: newSelection });
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
            handleCloseSelectionMode();
            massDeleteNotifications(notificationIds).catch(console.error);
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

      // return <Text>{item.message.title}</Text>

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

  const renderEmptyState = () => (
    <Surface
      style={[styles.emptyState, { backgroundColor: theme.colors.background }]}
      elevation={0}
    >
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
    <Surface
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        listStyle,
      ]}
      elevation={0}
    >
      <View style={styles.filtersWrapper}>
        <NotificationFilters
          totalNotifications={filteredNotifications.length}
          onToggleReadStatus={handleToggleReadStatus}
          onDeleteSelected={handleDeleteSelected}
        />
      </View>

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
              backgroundColor: theme.colors.primary,
            },
          ]}
        >
          <Icon source="arrow-up" size={20} color={theme.colors.onPrimary} />
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
