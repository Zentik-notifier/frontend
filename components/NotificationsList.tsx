import { useAppContext } from "@/contexts/AppContext";
import {
  NotificationsProvider,
  useNotificationsContext,
} from "@/contexts/NotificationsContext";
import { NotificationFragment } from "@/generated/gql-operations-generated";
import {
  useBatchDeleteNotifications,
  useBatchMarkAsRead,
  useInfiniteNotifications,
  refreshNotificationQueries,
  useAllNotificationIds,
} from "@/hooks/notifications";
import { NotificationQueryResult } from "@/types/notifications";
import { useI18n } from "@/hooks/useI18n";
import type { NotificationVisualization as RQFilters } from "@/services/settings-service";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { useQueryClient } from "@tanstack/react-query";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
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
import NotificationItem from "./NotificationItem";
import NotificationFilters from "./NotificationFilters";
import { useBadgeSync } from "@/hooks/useBadgeSync";
import IosBridgeService from "@/services/ios-bridge";
import { FlatList } from "react-native-gesture-handler";

interface NotificationsListProps {
  bucketId?: string;
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
  bucketId,
  hideBucketInfo = false,
  emptyStateMessage,
  emptyStateSubtitle,
  customHeader,
  listStyle,
}: NotificationsListProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    userSettings: { settings },
  } = useAppContext();

  // React Query hooks
  const batchMarkAsReadMutation = useBatchMarkAsRead();
  const batchDeleteMutation = useBatchDeleteNotifications();
  const queryClient = useQueryClient();
  const { hasUnreadNotifications } = useBadgeSync();

  const [visibleItems, setVisibileItems] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasUnreadAbove, setHasUnreadAbove] = useState(false);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);
  const [firstVisibleIndex, setFirstVisibleIndex] = useState(0);
  const [lastVisibleIndex, setLastVisibleIndex] = useState(0);
  const [limit, setLimit] = useState(50); // Start with 50 items
  const [isLoadingNewFilter, setIsLoadingNewFilter] = useState(false);

  const {
    state: { selectionMode, selectedItems },
    handleCloseSelectionMode,
    handleSetAllNotificationIds,
    dispatch,
  } = useNotificationsContext();

  useEffect(() => {
    if (!hasUnreadNotifications) {
      setHasUnreadAbove(false);
      setHasUnreadBelow(false);
    }
  }, [hasUnreadNotifications]);

  const {
    userSettings: {
      settings: { notificationVisualization },
    },
  } = useAppContext();

  // Build filters from user settings
  const queryFilters = useMemo((): RQFilters => {
    const filters: any = {};

    // Add bucket filter if provided
    if (bucketId) {
      filters.bucketId = bucketId;
    }

    // Apply user settings filters
    if (notificationVisualization?.hideRead) {
      filters.isRead = false;
    }

    if (notificationVisualization.showOnlyWithAttachments) {
      filters.hasAttachments = true;
    }

    if (notificationVisualization.searchQuery) {
      filters.searchQuery = notificationVisualization.searchQuery;
    }

    // Handle time range filters
    if (notificationVisualization.timeRange) {
      const now = new Date();

      switch (notificationVisualization.timeRange) {
        case "today":
          filters.createdAfter = new Date(
            now.setHours(0, 0, 0, 0)
          ).toISOString();
          break;
        case "thisWeek":
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          filters.createdAfter = weekAgo.toISOString();
          break;
        case "thisMonth":
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          filters.createdAfter = monthAgo.toISOString();
          break;
        case "custom":
          if (notificationVisualization.customTimeRange?.from) {
            filters.createdAfter =
              notificationVisualization.customTimeRange.from;
          }
          if (notificationVisualization.customTimeRange?.to) {
            filters.createdBefore =
              notificationVisualization.customTimeRange.to;
          }
          break;
      }
    }

    // Apply selected bucket IDs filter
    if (
      notificationVisualization.selectedBucketIds &&
      notificationVisualization.selectedBucketIds.length > 0 &&
      !bucketId
    ) {
      // If we have selected buckets and we're not already filtering by a specific bucket
      // This filter needs to be applied client-side or you need a new query parameter
      // For now we'll handle it in the client-side filtering
    }

    return filters;
  }, [bucketId, notificationVisualization]);

  // Build sort from user settings
  const querySort = useMemo(() => {
    const sortPreference = notificationVisualization.sortBy || "newest";

    return {
      field: "createdAt" as const,
      direction:
        sortPreference === "oldest" ? ("asc" as const) : ("desc" as const),
    };
  }, [notificationVisualization.sortBy]);

  // Track previous filters to detect when new data has arrived
  const prevFiltersRef = useRef(JSON.stringify(queryFilters));
  const prevSortRef = useRef(JSON.stringify(querySort));

  // Fetch notifications with React Query Infinite
  // No autoSync - sync only happens on app startup
  // Push notifications will add items to cache and invalidate queries
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useInfiniteNotifications({
    filters: queryFilters,
    sort: querySort,
    pagination: { limit },
    refetchInterval: 20000, // Refresh from local DB every 10 seconds
  });

  // Load all notification IDs for select-all functionality
  const { data: allNotificationIds } = useAllNotificationIds({
    filters: queryFilters,
  });

  // Flatten all pages into single array
  const notifications = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(
      (page: NotificationQueryResult) => page.notifications
    );
  }, [data]);

  // Clear loading state when new data arrives that matches current filters
  useEffect(() => {
    const currentFiltersStr = JSON.stringify(queryFilters);
    const currentSortStr = JSON.stringify(querySort);

    // If filters/sort changed and we have new data
    if (isLoadingNewFilter && notifications.length >= 0) {
      // Clear loading state - data has been updated
      setIsLoadingNewFilter(false);
      prevFiltersRef.current = currentFiltersStr;
      prevSortRef.current = currentSortStr;
    }
  }, [notifications, queryFilters, querySort, isLoadingNewFilter]);

  useEffect(() => {
    if (allNotificationIds) {
      handleSetAllNotificationIds(allNotificationIds);
    }
  }, [allNotificationIds, handleSetAllNotificationIds]);

  // Reset when filters change - invalidate query instead of changing limit
  useEffect(() => {
    // Query will automatically refetch due to key change
    setIsLoadingNewFilter(true);
    setLimit(50);
  }, [queryFilters, querySort]);

  // Update loading state

  // Track currently visible item ids and debounce marking as read
  const visibleIdsRef = useRef<Set<string>>(new Set());
  const everVisibleIdsRef = useRef<Set<string>>(new Set()); // Set di tutte le notifiche mai visibili
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didUserScrollRef = useRef(false);
  const listRef = useRef<any>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

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

      // Aggiungi tutte le notifiche attualmente visibili al set di quelle mai visibili
      visibleIds.forEach((id) => everVisibleIdsRef.current.add(id));

      // Determina il primo e ultimo indice visibile
      const firstVisibleItem = viewableItems[0];
      const secondVisibleItem = viewableItems[1];
      const lastVisibleItem = viewableItems[viewableItems.length - 1];

      if (
        firstVisibleItem &&
        firstVisibleItem.index !== null &&
        firstVisibleItem.index !== undefined
      ) {
        const firstIndex = firstVisibleItem.index;
        setFirstVisibleIndex(firstIndex);
      }

      if (
        secondVisibleItem &&
        secondVisibleItem.index !== null &&
        secondVisibleItem.index !== undefined
      ) {
        const secondIndex = secondVisibleItem.index;

        const hasUnread = notifications
          .slice(0, secondIndex)
          .some((n: NotificationFragment) => !n.readAt);
        setHasUnreadAbove(hasUnread);
      }

      if (
        lastVisibleItem &&
        lastVisibleItem.index !== null &&
        lastVisibleItem.index !== undefined
      ) {
        const lastIndex = lastVisibleItem.index;
        setLastVisibleIndex(lastIndex);

        // Controlla se ci sono notifiche non lette dopo questo indice
        const hasUnread = notifications
          .slice(lastIndex + 1)
          .some((n: NotificationFragment) => !n.readAt);
        setHasUnreadBelow(hasUnread);
      }

      try {
        const secondId = notifications[1]?.id;
        setShowScrollTop(secondId ? !visibleSet.has(secondId) : false);
      } catch {}

      if (settings.notificationsPreferences?.markAsReadMode !== "on-view")
        return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (!didUserScrollRef.current) return;
        didUserScrollRef.current = false;
        const candidates: string[] = [];
        for (const n of notifications) {
          if (everVisibleIdsRef.current.has(n.id) && !n.readAt) {
            candidates.push(n.id);
          }
        }
        if (candidates.length > 0) {
          batchMarkAsReadMutation.mutate({
            notificationIds: candidates,
            readAt: new Date().toISOString(),
          });
          everVisibleIdsRef.current.clear();
        }
      }, 1000);
    },
    [
      settings.notificationsPreferences?.markAsReadMode,
      batchMarkAsReadMutation,
      notifications,
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

    const notificationIds = Array.from(selectedItems);
    console.log(
      `[NotificationsList] Deleting ${notificationIds.length} notifications`
    );

    Alert.alert(
      t("notifications.deleteSelected.title"),
      t("notifications.deleteSelected.message", { count }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            handleCloseSelectionMode();
            batchDeleteMutation.mutate({ notificationIds });
          },
        },
      ]
    );
  }, [selectedItems, batchDeleteMutation, t, handleCloseSelectionMode]);

  // Funzione per cambiare lo stato di lettura delle notifiche selezionate
  const handleToggleReadStatus = useCallback(async () => {
    const count = selectedItems.size;

    if (count === 0) return;

    const notificationIds = Array.from(selectedItems);
    console.log(
      `[NotificationsList] Toggling read status for ${notificationIds.length} notifications`
    );

    const selectedNotifications = notifications.filter(
      (n: NotificationFragment) => selectedItems.has(n.id)
    );
    const hasUnreadNotifications = selectedNotifications.some(
      (n: NotificationFragment) => !n.readAt
    );

    try {
      batchMarkAsReadMutation.mutate({
        notificationIds,
        readAt: hasUnreadNotifications ? new Date().toISOString() : null,
      });
      handleCloseSelectionMode();
    } catch (error) {
      console.error("Error toggling read status:", error);
    }
  }, [
    selectedItems,
    notifications,
    batchMarkAsReadMutation,
    handleCloseSelectionMode,
  ]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshNotificationQueries(queryClient);
      await refetch();
    } catch (error) {
      console.error("[NotificationsListRQ] Pull-to-refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: NotificationFragment }) => {
      const isSelected = selectedItems.has(item.id);

      return (
        <NotificationItem
          notification={item}
          isItemVisible={visibleItems.has(item.id)}
          hideBucketInfo={hideBucketInfo}
          isMultiSelectionMode={selectionMode}
          isSelected={isSelected}
          noBucketRouting={!!bucketId}
          onToggleSelection={() => toggleItemSelection(item.id)}
          enableHtmlRendering={notificationVisualization.enableHtmlRendering}
        />
      );
    },
    [
      selectedItems,
      selectionMode,
      hideBucketInfo,
      visibleItems,
      notificationVisualization.enableHtmlRendering,
    ]
  );

  // Memoized key extractor
  const keyExtractor = useCallback((item: NotificationFragment) => item.id, []);

  // Handle loading more notifications
  const handleLoadMore = useCallback(() => {
    if (isFetchingNextPage || isLoading || !hasNextPage) return;
    // console.log('[NotificationsList] Loading next page...');
    fetchNextPage();
  }, [isFetchingNextPage, isLoading, hasNextPage, fetchNextPage]);

  const renderEmptyState = () => (
    <Surface
      style={[styles.emptyState, { backgroundColor: theme.colors.background }]}
      elevation={0}
    >
      {isLoading || (isFetching && notifications.length === 0) ? (
        <>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[
              styles.emptyText,
              { color: theme.colors.onSurfaceVariant, marginTop: 16 },
            ]}
          >
            {t("common.loading")}
          </Text>
        </>
      ) : error ? (
        <>
          <Icon source="alert-circle" size={48} color={theme.colors.error} />
          <Text
            style={[
              styles.emptyText,
              { color: theme.colors.error, marginTop: 16 },
            ]}
          >
            {t("common.error")}
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {error.message}
          </Text>
        </>
      ) : (
        <>
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
        </>
      )}
    </Surface>
  );

  const renderListFooter = () => {
    // Show loading when fetching next page
    if (isFetchingNextPage) {
      return (
        <View style={styles.listFooter}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text
            style={[
              styles.listFooterText,
              { color: theme.colors.onSurfaceVariant, marginTop: 8 },
            ]}
          >
            {t("common.loading")}...
          </Text>
        </View>
      );
    }

    // Show message if no more pages
    if (!hasNextPage && notifications.length > 0) {
      return (
        <View style={styles.listFooter}>
          <Text
            style={[
              styles.listFooterText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {t("notifications.endOfList")} ({notifications.length})
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.outerContainer}>
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
            totalNotifications={notifications.length}
            onToggleReadStatus={handleToggleReadStatus}
            onDeleteSelected={handleDeleteSelected}
            onRefresh={handleRefresh}
            refreshing={isRefreshing || isFetching || isLoadingNewFilter}
          />
        </View>

        {customHeader}

        {/* <FlatList */}
        <FlashList
          ref={listRef}
          data={notifications}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          extraData={{
            selectedItems: Array.from(selectedItems),
            selectionMode,
            visibleItems: Array.from(visibleItems),
          }}
          onViewableItemsChanged={onViewableItemsChanged}
          onScroll={() => {
            didUserScrollRef.current = true;
          }}
          scrollEventThrottle={16}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
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

        {hasUnreadAbove && (
          <TouchableRipple
            onPress={() => {
              try {
                const firstUnreadIndex = notifications.findIndex(
                  (n: NotificationFragment, idx: number) =>
                    idx < firstVisibleIndex && !n.readAt
                );
                if (firstUnreadIndex !== -1) {
                  listRef.current?.scrollToIndex({
                    index: firstUnreadIndex,
                    animated: true,
                  });
                }
              } catch (error) {
                console.error("Error scrolling to unread:", error);
              }
            }}
            style={[
              styles.unreadBadgeTop,
              {
                backgroundColor: theme.colors.primaryContainer,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <View style={styles.unreadBadgeContent}>
              <Icon
                source="chevron-up"
                size={16}
                color={theme.colors.primary}
              />
              <Icon
                source="email-mark-as-unread"
                size={16}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.unreadBadgeText,
                  { color: theme.colors.primary },
                ]}
              >
                {t("notifications.unreadAbove")}
              </Text>
            </View>
          </TouchableRipple>
        )}

        {hasUnreadBelow && (
          <TouchableRipple
            onPress={() => {
              try {
                const firstUnreadIndex = notifications.findIndex(
                  (n: NotificationFragment, idx: number) =>
                    idx > lastVisibleIndex && !n.readAt
                );
                if (firstUnreadIndex !== -1) {
                  listRef.current?.scrollToIndex({
                    index: firstUnreadIndex,
                    animated: true,
                  });
                }
              } catch (error) {
                console.error("Error scrolling to unread:", error);
              }
            }}
            style={[
              styles.unreadBadgeBottom,
              {
                backgroundColor: theme.colors.primaryContainer,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <View style={styles.unreadBadgeContent}>
              <Icon
                source="email-mark-as-unread"
                size={16}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.unreadBadgeText,
                  { color: theme.colors.primary },
                ]}
              >
                {t("notifications.unreadBelow")}
              </Text>
              <Icon
                source="chevron-down"
                size={16}
                color={theme.colors.primary}
              />
            </View>
          </TouchableRipple>
        )}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    position: "relative",
  },
  container: {
    flex: 1,
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
  unreadBadgeTop: {
    position: "absolute",
    top: 70,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  unreadBadgeBottom: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  unreadBadgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
