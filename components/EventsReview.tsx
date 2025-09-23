import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Icon } from "@/components/ui";
import { Colors } from "@/constants/Colors";
import {
  EventType,
  useGetAllUsersQuery,
  useGetEventsPaginatedQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EventsReview() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  const [selectedType, setSelectedType] = useState<EventType | undefined>(
    undefined
  );
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [objectId, setObjectId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const pageSize = 20;

  const { data: usersData, loading: loadingUsers } = useGetAllUsersQuery({});

  const queryVariables = useMemo(
    () => ({
      query: {
        page: 1,
        limit: pageSize,
        type: selectedType,
        userId,
        objectId: objectId || undefined,
        targetId: targetId || undefined,
      },
    }),
    [selectedType, userId, objectId, targetId, pageSize]
  );

  const {
    data: paginatedData,
    loading: isLoading,
    refetch,
    fetchMore,
  } = useGetEventsPaginatedQuery({
    variables: queryVariables,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
  });

  const events = paginatedData?.events?.events ?? [];
  const hasNextPage = paginatedData?.events?.hasNextPage ?? false;
  const currentPage = paginatedData?.events?.page ?? 1;
  const total = paginatedData?.events?.total ?? 0;

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || isLoading) return;

    const nextPage = currentPage + 1;

    fetchMore({
      variables: {
        query: {
          ...queryVariables.query,
          page: nextPage,
        },
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult?.events) return prev as any;
        return {
          ...prev,
          events: {
            ...fetchMoreResult.events,
            events: [
              ...(prev.events?.events ?? []),
              ...fetchMoreResult.events.events,
            ],
          },
        } as any;
      },
    });
  }, [hasNextPage, isLoading, currentPage, queryVariables.query, fetchMore]);

  const handleClearFilters = useCallback(() => {
    setSelectedType(undefined);
    setUserId(undefined);
    setObjectId("");
    setTargetId("");
  }, []);

  const eventTypeOptions = useMemo(
    () =>
      Object.values(EventType).map((value) => ({
        label: value,
        value,
      })),
    []
  );

  const allEventTypeOptions = useMemo(
    () => [
      { label: t("common.all"), value: undefined as any },
      ...eventTypeOptions,
    ],
    [eventTypeOptions, t]
  );

  const userOptions = useMemo(() => {
    const options = (usersData?.users ?? []).map((u) => ({
      label: u.username || u.email || u.id,
      value: u.id as string,
      subtitle: u.email || undefined,
    }));
    return [{ label: t("common.all"), value: undefined as any }, ...options];
  }, [usersData, t]);

  const userIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of usersData?.users ?? []) {
      map[u.id] = u.username || u.email || u.id;
    }
    return map;
  }, [usersData]);

  const formatTargetId = useCallback(
    (
      targetIdValue: string | null | undefined,
      eventType: EventType
    ): string => {
      if (!targetIdValue) return "-";
      if (
        eventType === EventType.BucketSharing ||
        eventType === EventType.BucketUnsharing
      ) {
        return userIdToName[targetIdValue] || targetIdValue;
      }
      return targetIdValue;
    },
    [userIdToName]
  );

  const formatObjectId = useCallback(
    (
      objectIdValue: string | null | undefined,
      eventType: EventType
    ): string => {
      if (!objectIdValue) return mappedObjectIdPlaceholder(eventType);
      return objectIdValue;
    },
    []
  );

  const getTargetIdLabel = useCallback((eventType: EventType): string => {
    switch (eventType) {
      case EventType.BucketSharing:
        return "shared with:";
      case EventType.BucketUnsharing:
        return "unshared from:";
      case EventType.Notification:
      case EventType.DeviceRegister:
      case EventType.DeviceUnregister:
        return "device:";
      default:
        return "targetId:";
    }
  }, []);

  const getObjectIdLabel = useCallback((eventType: EventType): string => {
    switch (eventType) {
      case EventType.BucketSharing:
      case EventType.BucketUnsharing:
        return "bucket:";
      case EventType.PushPassthrough:
        return "token:";
      default:
        return "objectId:";
    }
  }, []);

  const renderItem = ({ item }: any) => {
    const userDisplay = item.userId
      ? userIdToName[item.userId] || item.userId
      : "-";
    return (
      <View
        style={[
          styles.eventItem,
          { borderColor: Colors[colorScheme ?? "light"].border },
        ]}
      >
        <View style={styles.eventHeader}>
          <ThemedText style={styles.eventType}>{item.type}</ThemedText>
          <ThemedText style={styles.eventDate}>
            {new Date(item.createdAt).toLocaleString()}
          </ThemedText>
        </View>
        <View style={styles.eventMeta}>
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaLabel}>user:</ThemedText>
            <ThemedText style={styles.metaValue}>{userDisplay}</ThemedText>
          </View>
          {item.objectId && (
            <View style={styles.metaRow}>
              <ThemedText style={styles.metaLabel}>
                {getObjectIdLabel(item.type)}
              </ThemedText>
              <ThemedText style={styles.metaValue}>
                {formatObjectId(item.objectId, item.type)}
              </ThemedText>
            </View>
          )}
          {item.targetId && (
            <View style={styles.metaRow}>
              <ThemedText style={styles.metaLabel}>
                {getTargetIdLabel(item.type)}
              </ThemedText>
              <ThemedText style={styles.metaValue}>
                {formatTargetId(item.targetId, item.type)}
              </ThemedText>
            </View>
          )}
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaLabel}>id:</ThemedText>
            <ThemedText style={styles.metaValue}>{item.id}</ThemedText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.pageContent}>
        <View style={styles.header}>
        <View style={styles.statsContainer}>
          <ThemedText style={styles.statsText}>
            {t("common.showing")} {events.length} {t("common.of")} {total}{" "}
            {t("common.results")}
          </ThemedText>
        </View>
      </View>

        <View style={styles.filtersContainer}>
        <ThemedView
          style={[
            styles.searchContainer,
            { backgroundColor: Colors[colorScheme ?? "light"].inputBackground },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={Colors[colorScheme ?? "light"].textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              { color: Colors[colorScheme ?? "light"].text },
            ]}
            placeholder={t("eventsReview.filters.objectId")}
            placeholderTextColor={
              Colors[colorScheme ?? "light"].inputPlaceholder
            }
            value={objectId}
            onChangeText={setObjectId}
          />
          {objectId.length > 0 && (
            <TouchableOpacity
              onPress={() => setObjectId("")}
              style={styles.clearButton}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={Colors[colorScheme ?? "light"].textSecondary}
              />
            </TouchableOpacity>
          )}
        </ThemedView>
        </View>

        <View style={styles.filtersContainer}>
        <ThemedView
          style={[
            styles.searchContainer,
            { backgroundColor: Colors[colorScheme ?? "light"].inputBackground },
          ]}
        >
          <Ionicons
            name="phone-portrait-outline"
            size={18}
            color={Colors[colorScheme ?? "light"].textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              { color: Colors[colorScheme ?? "light"].text },
            ]}
            placeholder={t("eventsReview.filters.targetId")}
            placeholderTextColor={
              Colors[colorScheme ?? "light"].inputPlaceholder
            }
            value={targetId}
            onChangeText={setTargetId}
          />
          {targetId.length > 0 && (
            <TouchableOpacity
              onPress={() => setTargetId("")}
              style={styles.clearButton}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={Colors[colorScheme ?? "light"].textSecondary}
              />
            </TouchableOpacity>
          )}
        </ThemedView>

        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              borderColor: Colors[colorScheme ?? "light"].border,
              backgroundColor: selectedType
                ? Colors[colorScheme ?? "light"].selected
                : Colors[colorScheme ?? "light"].inputBackground,
            },
          ]}
          onPress={() => setShowTypeModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="funnel"
            size={16}
            color={
              selectedType
                ? Colors[colorScheme ?? "light"].tint
                : Colors[colorScheme ?? "light"].textSecondary
            }
          />
          {selectedType && (
            <ThemedView
              style={[
                styles.filterBadge,
                { backgroundColor: Colors[colorScheme ?? "light"].tint },
              ]}
            >
              <ThemedText style={styles.filterBadgeText}>T</ThemedText>
            </ThemedView>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              borderColor: Colors[colorScheme ?? "light"].border,
              backgroundColor: userId
                ? Colors[colorScheme ?? "light"].selected
                : Colors[colorScheme ?? "light"].inputBackground,
            },
          ]}
          onPress={() => setShowUserModal(true)}
          activeOpacity={0.7}
          disabled={loadingUsers}
        >
          <Ionicons
            name="person"
            size={16}
            color={
              userId
                ? Colors[colorScheme ?? "light"].tint
                : Colors[colorScheme ?? "light"].textSecondary
            }
          />
          {userId && (
            <ThemedView
              style={[
                styles.filterBadge,
                { backgroundColor: Colors[colorScheme ?? "light"].tint },
              ]}
            >
              <ThemedText style={styles.filterBadgeText}>U</ThemedText>
            </ThemedView>
          )}
        </TouchableOpacity>

        {(selectedType || userId || objectId || targetId) && (
          <TouchableOpacity
            style={[
              styles.clearFiltersButton,
              {
                borderColor: Colors[colorScheme ?? "light"].border,
                backgroundColor: Colors[colorScheme ?? "light"].inputBackground,
              },
            ]}
            onPress={handleClearFilters}
            activeOpacity={0.7}
          >
            <Ionicons
              name="refresh"
              size={16}
              color={Colors[colorScheme ?? "light"].textSecondary}
            />
          </TouchableOpacity>
        )}
        </View>

        {isLoading && events.length === 0 ? (
          <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <ThemedText style={styles.loadingText}>
            {t("common.loading")}
          </ThemedText>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
          <Icon name="search" size="xl" color="secondary" />
          <ThemedText style={styles.emptyTitle}>
            {t("eventsReview.empty.title")}
          </ThemedText>
          <ThemedText style={styles.emptyDescription}>
            {t("eventsReview.empty.description")}
          </ThemedText>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onRefresh={handleRefresh}
            refreshing={isLoading}
            contentContainerStyle={styles.listContent}
            // onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            ListFooterComponent={() =>
              hasNextPage ? (
                <View style={styles.loadMoreContainer}>
                  {isLoading ? (
                    <ActivityIndicator />
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.loadMoreButton,
                        {
                          backgroundColor:
                            Colors[colorScheme ?? "light"].backgroundCard,
                        },
                      ]}
                      onPress={handleLoadMore}
                    >
                      <ThemedText style={styles.loadMoreText}>
                        {t("common.loadMore")}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              ) : events.length > 0 ? (
                <View style={styles.endOfListContainer}>
                  <ThemedText style={styles.endOfListText}>
                    {t("common.endOfResults")}
                  </ThemedText>
                </View>
              ) : null
            }
          />
        )}

        <Modal
        visible={showTypeModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowTypeModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons
                name="close"
                size={24}
                color={Colors[colorScheme ?? "light"].text}
              />
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>
              {t("eventsReview.filters.type")}
            </ThemedText>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            {allEventTypeOptions.map((option) => (
              <TouchableOpacity
                key={option.value || "all"}
                style={[
                  styles.modalOption,
                  {
                    backgroundColor:
                      selectedType === option.value
                        ? Colors[colorScheme ?? "light"].selected
                        : Colors[colorScheme ?? "light"].background,
                  },
                ]}
                onPress={() => {
                  setSelectedType(option.value);
                  setShowTypeModal(false);
                }}
              >
                <ThemedText style={styles.modalOptionText}>
                  {option.label}
                </ThemedText>
                {selectedType === option.value && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={Colors[colorScheme ?? "light"].tint}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
        </Modal>

        <Modal
        visible={showUserModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowUserModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons
                name="close"
                size={24}
                color={Colors[colorScheme ?? "light"].text}
              />
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>
              {t("eventsReview.filters.userId")}
            </ThemedText>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            {userOptions.map((option) => (
              <TouchableOpacity
                key={option.value || "all"}
                style={[
                  styles.modalOption,
                  {
                    backgroundColor:
                      userId === option.value
                        ? Colors[colorScheme ?? "light"].selected
                        : Colors[colorScheme ?? "light"].background,
                  },
                ]}
                onPress={() => {
                  setUserId(option.value);
                  setShowUserModal(false);
                }}
              >
                <View style={styles.modalOptionContent}>
                  <ThemedText style={styles.modalOptionText}>
                    {option.label}
                  </ThemedText>
                  {"subtitle" in option && option.subtitle && (
                    <ThemedText style={styles.modalOptionSubtitle}>
                      {option.subtitle}
                    </ThemedText>
                  )}
                </View>
                {userId === option.value && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={Colors[colorScheme ?? "light"].tint}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
        </Modal>
      </View>
    </ThemedView>
  );
}

function mappedObjectIdPlaceholder(type: EventType): string {
  switch (type) {
    case EventType.PushPassthrough:
      return "systemTokenId";
    case EventType.Notification:
      return "-";
    case EventType.BucketSharing:
    case EventType.BucketUnsharing:
      return "bucketId";
    case EventType.DeviceRegister:
    case EventType.DeviceUnregister:
      return "-";
    default:
      return "-";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  statsContainer: {
    marginTop: 4,
  },
  statsText: {
    fontSize: 14,
    opacity: 0.7,
  },
  filtersContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: "transparent",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 40,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  clearFiltersButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 22,
  },
  listContent: {
    paddingVertical: 8,
  },
  eventItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  eventType: {
    fontWeight: "700",
    fontSize: 16,
  },
  eventDate: {
    opacity: 0.7,
    fontSize: 14,
  },
  eventMeta: {
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  metaLabel: {
    fontWeight: "600",
    opacity: 0.8,
    fontSize: 14,
    minWidth: 70,
  },
  metaValue: {
    opacity: 0.9,
    fontSize: 14,
    flex: 1,
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadMoreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "500",
  },
  endOfListContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  endOfListText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: "space-between",
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalOptionSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
});
