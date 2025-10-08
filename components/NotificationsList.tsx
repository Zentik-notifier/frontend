/**
 * NotificationsList with React Query Integration
 * Maintains existing filter system while using new react-query hooks
 */

import {
  NotificationsProvider,
  useNotificationsContext,
} from "@/contexts/NotificationsContext";
import { NotificationFragment } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import {
  useInfiniteNotifications,
  useBatchMarkAsRead,
  useBatchDeleteNotifications,
  useMarkAsRead,
  useRefreshNotifications,
} from "@/hooks/notifications";
import { useAppContext } from "@/contexts/AppContext";
import { userSettings } from "@/services/user-settings";
import { FlashList } from "@shopify/flash-list";
import { useQueryClient } from "@tanstack/react-query";
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
  ActivityIndicator,
} from "react-native";
import {
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import NotificationFilters from "./NotificationFilters";
import NotificationItem from "./NotificationItem";
import type { NotificationFilters as RQFilters } from "@/types/notifications";

interface NotificationsListProps {
  bucketId?: string;
  hideBucketInfo?: boolean;
  emptyStateMessage?: string;
  emptyStateSubtitle?: string;
  customHeader?: React.ReactNode;
  listStyle?: any;
}

export function NotificationsListWithContext(
  props: NotificationsListProps
) {
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
    setMainLoading,
    userSettings: { settings },
  } = useAppContext();

  // React Query hooks
  const batchMarkAsReadMutation = useBatchMarkAsRead();
  const batchDeleteMutation = useBatchDeleteNotifications();
  const refreshWithSync = useRefreshNotifications();

  const [visibleItems, setVisibileItems] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasUnreadAbove, setHasUnreadAbove] = useState(false);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);
  const [firstVisibleIndex, setFirstVisibleIndex] = useState(0);
  const [lastVisibleIndex, setLastVisibleIndex] = useState(0);
  const [limit, setLimit] = useState(50); // Start with 50 items

  const {
    state: { selectionMode, selectedItems },
    handleCloseSelectionMode,
    handleSetAllNotifications,
    dispatch,
  } = useNotificationsContext();

  const {
    userSettings: {
      settings: { notificationFilters },
    },
  } = useAppContext();

  // Build filters from user settings
  const queryFilters = useMemo((): RQFilters => {
    const filters: RQFilters = {};

    // Add bucket filter if provided
    if (bucketId) {
      filters.bucketId = bucketId;
    }

    // Apply user settings filters
    if (notificationFilters?.hideRead) {
      filters.isRead = false;
    }

    if (notificationFilters?.showOnlyWithAttachments) {
      filters.hasAttachments = true;
    }

    if (notificationFilters?.searchQuery) {
      filters.searchQuery = notificationFilters.searchQuery;
    }

    // Handle time range filters
    if (notificationFilters?.timeRange) {
      const now = new Date();

      switch (notificationFilters.timeRange) {
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
          if (notificationFilters.customTimeRange?.from) {
            filters.createdAfter = notificationFilters.customTimeRange.from;
          }
          if (notificationFilters.customTimeRange?.to) {
            filters.createdBefore = notificationFilters.customTimeRange.to;
          }
          break;
      }
    }

    // Apply selected bucket IDs filter
    if (
      notificationFilters?.selectedBucketIds &&
      notificationFilters.selectedBucketIds.length > 0 &&
      !bucketId
    ) {
      // If we have selected buckets and we're not already filtering by a specific bucket
      // This filter needs to be applied client-side or you need a new query parameter
      // For now we'll handle it in the client-side filtering
    }

    return filters;
  }, [bucketId, notificationFilters]);

  // Build sort from user settings
  const querySort = useMemo(() => {
    const sortPreference = notificationFilters?.sortBy || "newest";

    return {
      field: "createdAt" as const,
      direction:
        sortPreference === "oldest" ? ("asc" as const) : ("desc" as const),
    };
  }, [notificationFilters?.sortBy]);

  // Fetch notifications with React Query Infinite
  // No autoSync - sync only happens on app startup
  // Push notifications will add items to cache and invalidate queries
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteNotifications({
    filters: queryFilters,
    sort: querySort,
    pageSize: limit,
    refetchInterval: 10000, // Refresh from local DB every 10 seconds
  });

  // Flatten all pages into single array
  const notifications = useMemo(() => {
    return data?.pages.flatMap((page) => page.notifications) || [];
  }, [data?.pages]);

  const filteredNotifications = notifications;

  // Reset when filters change - invalidate query instead of changing limit
  useEffect(() => {
    // Query will automatically refetch due to key change
    setLimit(50);
  }, [queryFilters, querySort]);

  // Update context with current notifications
  //   useEffect(() => {
  //     handleSetAllNotifications(filteredNotifications);
  //   }, [filteredNotifications]);

  // Update loading state
  useEffect(() => {
    setMainLoading(batchDeleteMutation.isPending);
  }, [batchDeleteMutation.isPending, setMainLoading]);

  // Track currently visible item ids and debounce marking as read
  const visibleIdsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didUserScrollRef = useRef(false);
  const listRef = useRef<any>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Configuration for viewability tracking
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  }).current;

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

      // Determina il primo e ultimo indice visibile
      const firstVisibleItem = viewableItems[0];
      const lastVisibleItem = viewableItems[viewableItems.length - 1];

      if (
        firstVisibleItem &&
        firstVisibleItem.index !== null &&
        firstVisibleItem.index !== undefined
      ) {
        const firstIndex = firstVisibleItem.index;
        setFirstVisibleIndex(firstIndex);

        // Controlla se ci sono notifiche non lette prima di questo indice
        const hasUnread = filteredNotifications
          .slice(0, firstIndex)
          .some((n) => !n.readAt);
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
        const hasUnread = filteredNotifications
          .slice(lastIndex + 1)
          .some((n) => !n.readAt);
        setHasUnreadBelow(hasUnread);
      }

      try {
        const firstId = filteredNotifications[1]?.id;
        setShowScrollTop(firstId ? !visibleSet.has(firstId) : false);
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
        for (const n of filteredNotifications) {
          if (visibleIdsRef.current.has(n.id) && !n.readAt) {
            candidates.push(n.id);
          }
        }
        if (candidates.length > 0) {
          batchMarkAsReadMutation.mutate({
            notificationIds: candidates,
            readAt: new Date().toISOString(),
          });
        }
      }, 1000);
    },
    [
      settings.notificationsPreferences?.markAsReadMode,
      batchMarkAsReadMutation,
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
            batchDeleteMutation.mutate({ notificationIds });
          },
        },
      ]
    );
  }, [selectedItems, batchDeleteMutation, t, handleCloseSelectionMode]);

  // Funzione per cambiare lo stato di lettura delle notifiche selezionate
  const handleToggleReadStatus = useCallback(async () => {
    if (selectedItems.size === 0) return;

    const selectedNotifications = filteredNotifications.filter((n) =>
      selectedItems.has(n.id)
    );
    const hasUnreadNotifications = selectedNotifications.some((n) => !n.readAt);
    const notificationIds = Array.from(selectedItems);

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
    filteredNotifications,
    batchMarkAsReadMutation,
    handleCloseSelectionMode,
  ]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshWithSync(refetch);
    } catch (error) {
      console.error('[NotificationsListRQ] Pull-to-refresh error:', error);
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
          onToggleSelection={() => toggleItemSelection(item.id)}
        />
      );
    },
    [selectedItems, selectionMode, hideBucketInfo, visibleItems]
  );

  // Memoized key extractor
  const keyExtractor = useCallback((item: NotificationFragment) => item.id, []);

  // Handle loading more notifications with infinite query
  const handleLoadMore = useCallback(() => {
    if (isFetchingNextPage || isLoading) return;
    if (!hasNextPage) return;

    fetchNextPage();
  }, [isFetchingNextPage, isLoading, hasNextPage, fetchNextPage]);

  const renderEmptyState = () => (
    <Surface
      style={[styles.emptyState, { backgroundColor: theme.colors.background }]}
      elevation={0}
    >
      {isLoading ? (
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

    // Show end of list when no more pages
    if (!hasNextPage && filteredNotifications.length > 0) {
      return (
        <View style={styles.listFooter}>
          <Text
            style={[
              styles.listFooterText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {t("notifications.endOfList")} ({filteredNotifications.length})
          </Text>
        </View>
      );
    }

    return null;
  };

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
          onRefresh={handleRefresh}
          refreshing={isRefreshing || isFetching}
        />
      </View>

      {customHeader}

      <FlashList
        ref={listRef}
        data={filteredNotifications}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
              const firstUnreadIndex = filteredNotifications.findIndex(
                (n, idx) => idx < firstVisibleIndex && !n.readAt
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
            <Icon source="chevron-up" size={16} color={theme.colors.primary} />
            <Icon
              source="email-mark-as-unread"
              size={16}
              color={theme.colors.primary}
            />
            <Text
              style={[styles.unreadBadgeText, { color: theme.colors.primary }]}
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
              const firstUnreadIndex = filteredNotifications.findIndex(
                (n, idx) => idx > lastVisibleIndex && !n.readAt
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
              style={[styles.unreadBadgeText, { color: theme.colors.primary }]}
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
  );
}

const styles = StyleSheet.create({
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
