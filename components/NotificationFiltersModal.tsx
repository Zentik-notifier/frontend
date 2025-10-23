import { useAppState } from "@/hooks/notifications";
import { useI18n } from "@/hooks/useI18n";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useAppContext } from "@/contexts/AppContext";
import { NotificationVisualization } from "@/services/settings-service";
import { useNotificationsContext } from "@/contexts/NotificationsContext";
import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Dimensions } from "react-native";
import { DatePickerModal } from "react-native-paper-dates";
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
import MultiBucketSelector from "./MultiBucketSelector";

export default function NotificationVisualizationModal() {
  const { data: appState } = useAppState();
  const bucketsWithStats = appState?.buckets || [];
  const { t } = useI18n();
  const { datePickerLocale } = useDateFormat();
  const {
    userSettings: { settings, setNotificationVisualization },
  } = useAppContext();
  const savedFilters = settings.notificationVisualization;

  // Use notifications context
  const {
    state: { showFiltersModal, hideBucketSelector, activeFiltersCount },
    handleHideFiltersModal,
  } = useNotificationsContext();

  // Local state for filters
  const [localFilters, setLocalFilters] =
    useState<NotificationVisualization>(savedFilters);

  // Local state for date range picker modal
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);

  // Sync local state when modal opens or saved filters change
  useEffect(() => {
    if (showFiltersModal) {
      setLocalFilters(savedFilters);
    }
  }, [showFiltersModal, savedFilters]);

  const onBucketsChange = (bucketIds: string[]) => {
    setLocalFilters((prev) => ({ ...prev, selectedBucketIds: bucketIds }));
  };

  const handleHideReadChange = (hideRead: boolean) => {
    setLocalFilters((prev) => ({ ...prev, hideRead }));
  };

  const handleAttachmentsOnlyChange = (showOnlyWithAttachments: boolean) => {
    setLocalFilters((prev) => ({ ...prev, showOnlyWithAttachments }));
  };

  const handleSortByChange = (sortBy: "newest" | "oldest" | "priority") => {
    setLocalFilters((prev) => ({ ...prev, sortBy }));
  };

  const handleTimeRangeChange = (
    timeRange: "all" | "today" | "thisWeek" | "thisMonth" | "custom"
  ) => {
    setLocalFilters((prev) => ({ ...prev, timeRange }));
  };

  const handleCustomTimeRangeChange = (from: string, to: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      timeRange: "custom",
      customTimeRange: { from, to },
    }));
  };

  const handleLoadOnlyVisibleChange = (loadOnlyVisible: boolean) => {
    setLocalFilters((prev) => ({ ...prev, loadOnlyVisible }));
  };

  const handleHtmlRenderingChange = (enableHtmlRendering: boolean) => {
    setLocalFilters((prev) => ({ ...prev, enableHtmlRendering }));
  };

  const clearAllFilters = () => {
    setLocalFilters({
      hideRead: false,
      timeRange: "all",
      customTimeRange: undefined,
      selectedBucketIds: [],
      searchQuery: localFilters.searchQuery,
      sortBy: "newest",
      showOnlyWithAttachments: false,
      loadOnlyVisible: false,
      enableHtmlRendering: true,
      isCompactMode: localFilters.isCompactMode,
    });
  };

  const applyFilters = () => {
    setNotificationVisualization(localFilters);
    handleHideFiltersModal();
  };

  const hasChanges =
    JSON.stringify(localFilters) !== JSON.stringify(savedFilters);

  const hasActiveFilters = activeFiltersCount > 0;

  const theme = useTheme();

  const deviceHeight = Dimensions.get("window").height;
  const containerStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
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
                <MultiBucketSelector
                  selectedBucketIds={localFilters.selectedBucketIds}
                  onBucketsChange={onBucketsChange}
                  buckets={bucketsWithStats as any}
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
                      backgroundColor: localFilters.hideRead
                        ? theme.colors.secondaryContainer
                        : theme.colors.elevation?.level1 ||
                          theme.colors.surface,
                    },
                  ]}
                  onPress={() => handleHideReadChange(!localFilters.hideRead)}
                >
                  <View style={styles.quickFilterContent}>
                    <Icon
                      source={
                        localFilters.hideRead ? "eye-off" : "eye-off-outline"
                      }
                      size={20}
                      color={
                        localFilters.hideRead
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                    />
                    <View style={styles.quickFilterTextContainer}>
                      <Text
                        style={[
                          styles.quickFilterText,
                          {
                            color: localFilters.hideRead
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
                      backgroundColor: localFilters.showOnlyWithAttachments
                        ? theme.colors.secondaryContainer
                        : theme.colors.elevation?.level1 ||
                          theme.colors.surface,
                    },
                  ]}
                  onPress={() =>
                    handleAttachmentsOnlyChange(
                      !localFilters.showOnlyWithAttachments
                    )
                  }
                >
                  <View style={styles.quickFilterContent}>
                    <Icon
                      source="paperclip"
                      size={20}
                      color={
                        localFilters.showOnlyWithAttachments
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                    />
                    <View style={styles.quickFilterTextContainer}>
                      <Text
                        style={[
                          styles.quickFilterText,
                          {
                            color: localFilters.showOnlyWithAttachments
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
                          localFilters.sortBy === value
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
                          localFilters.sortBy === value
                            ? theme.colors.onPrimary
                            : theme.colors.onSurfaceVariant
                        }
                      />
                      <Text
                        style={[
                          styles.sortButtonText,
                          {
                            color:
                              localFilters.sortBy === value
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

            {/* Time Range */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                {t("filters.timeRange")}
              </Text>
              <Text
                style={[
                  styles.sectionDescription,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {t("filters.timeRangeDescription")}
              </Text>
              <View style={styles.sortButtons}>
                {[
                  {
                    value: "all",
                    label: t("filters.all"),
                    icon: "all-inclusive",
                  },
                  {
                    value: "today",
                    label: t("filters.today"),
                    icon: "calendar-today",
                  },
                  {
                    value: "thisWeek",
                    label: t("filters.thisWeek"),
                    icon: "calendar-week",
                  },
                  {
                    value: "thisMonth",
                    label: t("filters.thisMonth"),
                    icon: "calendar-month",
                  },
                  {
                    value: "custom",
                    label: t("filters.customRange"),
                    icon: "calendar-range",
                  },
                ].map(({ value, label, icon }) => (
                  <TouchableRipple
                    key={value}
                    style={[
                      styles.sortButton,
                      {
                        borderColor: theme.colors.outline,
                        backgroundColor:
                          localFilters.timeRange === value
                            ? theme.colors.primary
                            : theme.colors.elevation?.level1 ||
                              theme.colors.surface,
                      },
                    ]}
                    onPress={() => {
                      if (value === "custom") {
                        handleTimeRangeChange("custom");
                        setShowDateRangePicker(true);
                      } else {
                        handleTimeRangeChange(value as any);
                      }
                    }}
                  >
                    <View style={styles.sortButtonContent}>
                      <Icon
                        source={icon as any}
                        size={18}
                        color={
                          localFilters.timeRange === value
                            ? theme.colors.onPrimary
                            : theme.colors.onSurfaceVariant
                        }
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.sortButtonText,
                            {
                              color:
                                localFilters.timeRange === value
                                  ? theme.colors.onPrimary
                                  : theme.colors.onSurface,
                            },
                          ]}
                        >
                          {label}
                        </Text>
                        {value === "custom" &&
                          localFilters.timeRange === "custom" &&
                          localFilters.customTimeRange?.from &&
                          localFilters.customTimeRange?.to && (
                            <Text
                              style={[
                                styles.sortButtonSubtext,
                                {
                                  color: theme.colors.onPrimary,
                                },
                              ]}
                            >
                              {new Date(
                                localFilters.customTimeRange.from
                              ).toLocaleDateString()}{" "}
                              -{" "}
                              {new Date(
                                localFilters.customTimeRange.to
                              ).toLocaleDateString()}
                            </Text>
                          )}
                      </View>
                    </View>
                  </TouchableRipple>
                ))}
              </View>
            </View>

            {/* Performance & Display */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                {t("filters.performance")}
              </Text>
              <View style={styles.quickFiltersGrid}>
                {/* Load Only Visible */}
                <TouchableRipple
                  style={[
                    styles.quickFilter,
                    {
                      borderColor: theme.colors.outline,
                      backgroundColor: localFilters.loadOnlyVisible
                        ? theme.colors.secondaryContainer
                        : theme.colors.elevation?.level1 || theme.colors.surface,
                    },
                  ]}
                  onPress={() =>
                    handleLoadOnlyVisibleChange(!localFilters.loadOnlyVisible)
                  }
                >
                  <View style={styles.quickFilterContent}>
                    <Icon
                      source="speedometer"
                      size={20}
                      color={
                        localFilters.loadOnlyVisible
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                    />
                    <View style={styles.quickFilterTextContainer}>
                      <Text
                        style={[
                          styles.quickFilterText,
                          {
                            color: localFilters.loadOnlyVisible
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

                {/* HTML Rendering */}
                <TouchableRipple
                  style={[
                    styles.quickFilter,
                    {
                      borderColor: theme.colors.outline,
                      backgroundColor: localFilters.enableHtmlRendering
                        ? theme.colors.secondaryContainer
                        : theme.colors.elevation?.level1 || theme.colors.surface,
                    },
                  ]}
                  onPress={() =>
                    handleHtmlRenderingChange(!localFilters.enableHtmlRendering)
                  }
                >
                  <View style={styles.quickFilterContent}>
                    <Icon
                      source={"code-tags"}
                      size={20}
                      color={
                        localFilters.enableHtmlRendering
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                    />
                    <View style={styles.quickFilterTextContainer}>
                      <Text
                        style={[
                          styles.quickFilterText,
                          {
                            color: localFilters.enableHtmlRendering
                              ? theme.colors.primary
                              : theme.colors.onSurface,
                          },
                        ]}
                      >
                        {t("filters.enableHtmlRendering")}
                      </Text>
                      <Text
                        style={[
                          styles.quickFilterDescription,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {t("filters.enableHtmlRenderingDescription")}
                      </Text>
                    </View>
                  </View>
                </TouchableRipple>
              </View>
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
                    {activeFiltersCount === 1
                      ? t("filters.activeFilters", {
                          count: activeFiltersCount,
                        })
                      : t("filters.activeFiltersPlural", {
                          count: activeFiltersCount,
                        })}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View
            style={[
              styles.applyButtonContainer,
              { borderTopColor: theme.colors.outline },
            ]}
          >
            {hasActiveFilters && (
              <Button
                mode="outlined"
                onPress={clearAllFilters}
                icon="refresh"
                style={styles.clearButton}
              >
                {t("filters.clearAll")}
              </Button>
            )}
            <Button
              mode="contained"
              onPress={applyFilters}
              disabled={!hasChanges}
              icon="check"
              style={styles.applyButton}
            >
              {t("common.apply")}
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Date Range Picker Modal */}
      <DatePickerModal
        locale={datePickerLocale}
        mode="range"
        visible={showDateRangePicker}
        onDismiss={() => setShowDateRangePicker(false)}
        startDate={
          localFilters.customTimeRange?.from
            ? new Date(localFilters.customTimeRange.from)
            : undefined
        }
        endDate={
          localFilters.customTimeRange?.to
            ? new Date(localFilters.customTimeRange.to)
            : undefined
        }
        onConfirm={({ startDate, endDate }) => {
          setShowDateRangePicker(false);
          if (startDate && endDate) {
            handleCustomTimeRangeChange(
              startDate.toISOString(),
              endDate.toISOString()
            );
          }
        }}
      />
    </>
  );
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 18,
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
  sortButtonSubtext: {
    fontSize: 12,
    fontWeight: "400",
    marginTop: 2,
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
  applyButtonContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 12,
  },
  clearButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
});
