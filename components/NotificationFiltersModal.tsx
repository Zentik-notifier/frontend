import { useGetBucketsQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/services/app-context";
import { NotificationFilters } from "@/services/user-settings";
import { useNotifications } from "@/contexts/NotificationsContext";
import React from "react";
import { StyleSheet, View, ScrollView, Dimensions } from "react-native";
import {
  Button,
  Icon,
  Modal,
  Portal,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import BucketSelector from "./BucketSelector";

export default function NotificationFiltersModal() {
  const { data: bucketsData } = useGetBucketsQuery();
  const buckets = bucketsData?.buckets ?? [];
  const { t } = useI18n();
  const {
    userSettings: { settings, setNotificationFilters },
  } = useAppContext();
  const filters = settings.notificationFilters;

  // Use notifications context
  const {
    state: { showFiltersModal, hideBucketSelector },
    handleHideFiltersModal,
  } = useNotifications();

  const handleBucketChange = (bucketId: string | null) => {
    if (bucketId === null) {
      // All buckets selected
      setNotificationFilters({ selectedBucketIds: [] });
    } else if (bucketId === "") {
      // General (no bucket) selected - use empty string
      setNotificationFilters({ selectedBucketIds: [""] });
    } else {
      // Specific bucket selected
      setNotificationFilters({ selectedBucketIds: [bucketId] });
    }
  };

  const handleHideReadChange = (hideRead: boolean) => {
    setNotificationFilters({ hideRead });
  };

  const handleAttachmentsOnlyChange = (showOnlyWithAttachments: boolean) => {
    setNotificationFilters({ showOnlyWithAttachments });
  };

  const handleSortByChange = (sortBy: "newest" | "oldest" | "priority") => {
    setNotificationFilters({ sortBy });
  };

  const handleHideOlderThanChange = (
    hideOlderThan: "none" | "1day" | "1week" | "1month"
  ) => {
    setNotificationFilters({ hideOlderThan });
  };

  const clearAllFilters = () => {
    setNotificationFilters({
      hideRead: false,
      hideOlderThan: "none",
      selectedBucketIds: [], // Reset to "All Buckets"
      searchQuery: filters.searchQuery, // Keep search query
      sortBy: "newest",
      showOnlyWithAttachments: false,
    });
  };

  const hasActiveFilters =
    filters.hideRead ||
    filters.hideOlderThan !== "none" ||
    filters.selectedBucketIds.length > 0 ||
    filters.showOnlyWithAttachments;

  const theme = useTheme();

  const deviceHeight = Dimensions.get("window").height;
  const containerStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 16,
    marginVertical: 24,
    maxHeight: deviceHeight * 0.8,
  } as const;

  return (
    <>
      <Portal>
        <Modal
          visible={showFiltersModal}
          onDismiss={handleHideFiltersModal}
          contentContainerStyle={containerStyle}
          dismissableBackButton
        >
          {/* <SafeAreaView edges={["left", "right", "bottom"]}> */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: theme.colors.outline,
                backgroundColor: "transparent",
              },
            ]}
          >
            <View style={styles.headerLeft}>
              <Icon source="filter" size={24} color={theme.colors.primary} />
              <Text style={styles.headerTitle}>{t("filters.title")}</Text>
            </View>
            <View style={styles.headerRight}>
              {hasActiveFilters && (
                <Button
                  mode="contained-tonal"
                  onPress={clearAllFilters}
                  icon="refresh"
                >
                  {t("filters.clearAll")}
                </Button>
              )}
              <TouchableRipple
                style={[styles.closeButton]}
                onPress={handleHideFiltersModal}
                borderless
              >
                <Icon source="close" size={20} color={theme.colors.onSurface} />
              </TouchableRipple>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: 20,
            }}
          >
            {!hideBucketSelector && (
              <View style={[styles.section, { marginBottom: 8 }]}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {t("filters.bucket")}
                </Text>
                <BucketSelector
                  selectedBucketId={
                    filters.selectedBucketIds.length === 0
                      ? null
                      : filters.selectedBucketIds[0] === ""
                      ? ""
                      : filters.selectedBucketIds[0]
                  }
                  onBucketChange={handleBucketChange}
                  buckets={buckets}
                  includeAllOption
                  searchable
                />
              </View>
            )}

            {/* Quick Filters */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                {t("filters.quickFilters")}
              </Text>
              <View style={styles.quickFiltersGrid}>
                {/* Hide Read */}
                <TouchableRipple
                  style={[
                    styles.quickFilter,
                    {
                      borderColor: theme.colors.outline,
                      backgroundColor: filters.hideRead
                        ? theme.colors.secondaryContainer
                        : theme.colors.elevation?.level1 ||
                          theme.colors.surface,
                    },
                  ]}
                  onPress={() => handleHideReadChange(!filters.hideRead)}
                >
                  <View style={styles.quickFilterContent}>
                    <Icon
                      source={filters.hideRead ? "eye-off" : "eye-off-outline"}
                      size={20}
                      color={
                        filters.hideRead
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                    />
                    <View style={styles.quickFilterTextContainer}>
                      <Text
                        style={[
                          styles.quickFilterText,
                          {
                            color: filters.hideRead
                              ? theme.colors.primary
                              : theme.colors.onSurface,
                          },
                        ]}
                      >
                        {t("filters.hideRead")}
                      </Text>
                      <Text
                        style={[
                          styles.quickFilterDescription,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {t("filters.hideReadDescription")}
                      </Text>
                    </View>
                  </View>
                </TouchableRipple>

                {/* Attachments Only */}
                <TouchableRipple
                  style={[
                    styles.quickFilter,
                    {
                      borderColor: theme.colors.outline,
                      backgroundColor: filters.showOnlyWithAttachments
                        ? theme.colors.secondaryContainer
                        : theme.colors.elevation?.level1 ||
                          theme.colors.surface,
                    },
                  ]}
                  onPress={() =>
                    handleAttachmentsOnlyChange(
                      !filters.showOnlyWithAttachments
                    )
                  }
                >
                  <View style={styles.quickFilterContent}>
                    <Icon
                      source="paperclip"
                      size={20}
                      color={
                        filters.showOnlyWithAttachments
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                    />
                    <View style={styles.quickFilterTextContainer}>
                      <Text
                        style={[
                          styles.quickFilterText,
                          {
                            color: filters.showOnlyWithAttachments
                              ? theme.colors.primary
                              : theme.colors.onSurface,
                          },
                        ]}
                      >
                        {t("filters.withMedia")}
                      </Text>
                      <Text
                        style={[
                          styles.quickFilterDescription,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {t("filters.withMediaDescription")}
                      </Text>
                    </View>
                  </View>
                </TouchableRipple>
              </View>
            </View>

            {/* Sort Options */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                {t("filters.sortBy")}
              </Text>
              <View style={styles.sortButtons}>
                {[
                  {
                    value: "newest",
                    label: t("filters.newestFirst"),
                    icon: "arrow-down",
                  },
                  {
                    value: "oldest",
                    label: t("filters.oldestFirst"),
                    icon: "arrow-up",
                  },
                  // { value: "priority", label: t("filters.priority"), icon: "star" },
                ].map(({ value, label, icon }) => (
                  <TouchableRipple
                    key={value}
                    style={[
                      styles.sortButton,
                      {
                        borderColor: theme.colors.outline,
                        backgroundColor:
                          filters.sortBy === value
                            ? theme.colors.primary
                            : theme.colors.elevation?.level1 ||
                              theme.colors.surface,
                      },
                    ]}
                    onPress={() => handleSortByChange(value as any)}
                  >
                    <View style={styles.sortButtonContent}>
                      <Icon
                        source={icon as any}
                        size={18}
                        color={
                          filters.sortBy === value
                            ? theme.colors.onPrimary
                            : theme.colors.onSurfaceVariant
                        }
                      />
                      <Text
                        style={[
                          styles.sortButtonText,
                          {
                            color:
                              filters.sortBy === value
                                ? theme.colors.onPrimary
                                : theme.colors.onSurface,
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  </TouchableRipple>
                ))}
              </View>
            </View>

            {/* Hide Older Than */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                {t("filters.hideOlderThan")}
              </Text>
              <View style={styles.sortButtons}>
                {[
                  {
                    value: "none",
                    label: t("filters.showAll"),
                    icon: "all-inclusive",
                  },
                  {
                    value: "1day",
                    label: t("filters.oneDay"),
                    icon: "calendar",
                  },
                  {
                    value: "1week",
                    label: t("filters.oneWeek"),
                    icon: "calendar",
                  },
                  {
                    value: "1month",
                    label: t("filters.oneMonth"),
                    icon: "calendar",
                  },
                ].map(({ value, label, icon }) => (
                  <TouchableRipple
                    key={value}
                    style={[
                      styles.sortButton,
                      {
                        borderColor: theme.colors.outline,
                        backgroundColor:
                          filters.hideOlderThan === value
                            ? theme.colors.primary
                            : theme.colors.elevation?.level1 ||
                              theme.colors.surface,
                      },
                    ]}
                    onPress={() => handleHideOlderThanChange(value as any)}
                  >
                    <View style={styles.sortButtonContent}>
                      <Icon
                        source={icon as any}
                        size={18}
                        color={
                          filters.hideOlderThan === value
                            ? theme.colors.onPrimary
                            : theme.colors.onSurfaceVariant
                        }
                      />
                      <Text
                        style={[
                          styles.sortButtonText,
                          {
                            color:
                              filters.hideOlderThan === value
                                ? theme.colors.onPrimary
                                : theme.colors.onSurface,
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  </TouchableRipple>
                ))}
              </View>
            </View>

            {/* Performance */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                {t("filters.performance")}
              </Text>
              <TouchableRipple
                style={[
                  styles.quickFilter,
                  {
                    borderColor: theme.colors.outline,
                    backgroundColor: filters.loadOnlyVisible
                      ? theme.colors.secondaryContainer
                      : theme.colors.elevation?.level1 || theme.colors.surface,
                  },
                ]}
                onPress={() =>
                  setNotificationFilters({
                    loadOnlyVisible: !filters.loadOnlyVisible,
                  })
                }
              >
                <View style={styles.quickFilterContent}>
                  <Icon
                    source="speedometer"
                    size={20}
                    color={
                      filters.loadOnlyVisible
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                  <View style={styles.quickFilterTextContainer}>
                    <Text
                      style={[
                        styles.quickFilterText,
                        {
                          color: filters.loadOnlyVisible
                            ? theme.colors.primary
                            : theme.colors.onSurface,
                        },
                      ]}
                    >
                      {t("filters.loadOnlyVisible")}
                    </Text>
                    <Text
                      style={[
                        styles.quickFilterDescription,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {t("filters.loadOnlyVisibleDescription")}
                    </Text>
                  </View>
                </View>
              </TouchableRipple>
            </View>

            {hasActiveFilters && (
              <View
                style={[
                  styles.footer,
                  { borderTopColor: theme.colors.outline },
                ]}
              >
                <View style={styles.footerContent}>
                  <Icon
                    source="filter"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.footerText,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {getActiveFiltersCount(filters) === 1
                      ? t("filters.activeFilters", {
                          count: getActiveFiltersCount(filters),
                        })
                      : t("filters.activeFiltersPlural", {
                          count: getActiveFiltersCount(filters),
                        })}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
          {/* </SafeAreaView> */}
        </Modal>
      </Portal>
    </>
  );
}

function getActiveFiltersCount(filters: NotificationFilters): number {
  let count = 0;
  if (filters.hideOlderThan !== "none") count++;
  if (filters.selectedBucketIds.length > 0) count++;
  if (filters.showOnlyWithAttachments) count++;
  return count;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: "500",
    color: "white",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  quickFiltersGrid: {
    gap: 12,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  quickFilter: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: "48%",
  },
  quickFilterContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  quickFilterTextContainer: {
    flex: 1,
    gap: 4,
  },
  quickFilterText: {
    fontSize: 16,
    fontWeight: "500",
  },
  quickFilterDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  sortButtons: {
    gap: 8,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: "48%",
  },
  sortButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sortButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
