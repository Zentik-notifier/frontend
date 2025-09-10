import { Colors } from "@/constants/Colors";
import {
  useGetBucketsQuery
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { NotificationFilters } from "@/services/user-settings";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import BucketSelector from "./BucketSelector";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface NotificationFiltersModalProps {
  visible: boolean;
  hideBucketSelector?: boolean;
  onClose: () => void;
}

export default function NotificationFiltersModal({
  visible,
  hideBucketSelector = false,
  onClose,
}: NotificationFiltersModalProps) {
  const { data: bucketsData } = useGetBucketsQuery();
  const buckets = bucketsData?.buckets ?? [];
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const {
    userSettings: { settings, setNotificationFilters },
  } = useAppContext();
  const filters = settings.notificationFilters;

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[
          styles.modalContainer,
          { backgroundColor: Colors[colorScheme].background },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: Colors[colorScheme].border },
          ]}
        >
          <View style={styles.headerLeft}>
            <Ionicons
              name="filter"
              size={24}
              color={Colors[colorScheme].tint}
            />
            <ThemedText style={styles.headerTitle}>
              {t("filters.title")}
            </ThemedText>
          </View>
          <View style={styles.headerRight}>
            {hasActiveFilters && (
              <TouchableOpacity
                style={[
                  styles.clearAllButton,
                  { backgroundColor: Colors[colorScheme].error },
                ]}
                onPress={clearAllFilters}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={16} color="white" />
                <ThemedText style={styles.clearAllText}>
                  {t("filters.clearAll")}
                </ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: Colors[colorScheme].backgroundSecondary },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close"
                size={20}
                color={Colors[colorScheme].text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Bucket Filter */}
          {!hideBucketSelector && (
            <ThemedView style={styles.section}>
              <ThemedText
                style={[
                  styles.sectionTitle,
                  { color: Colors[colorScheme].text },
                ]}
              >
                {t("filters.bucket")}
              </ThemedText>
              <BucketSelector
                selectedBucketId={
                  filters.selectedBucketIds.length === 0
                    ? null // All buckets
                    : filters.selectedBucketIds[0] === ""
                      ? "" // General bucket
                      : filters.selectedBucketIds[0] // Specific bucket
                }
                onBucketChange={handleBucketChange}
                buckets={buckets}
                includeAllOption={true}
                searchable={true}
              />
            </ThemedView>
          )}

          {/* Quick Filters */}
          <ThemedView style={styles.section}>
            <ThemedText
              style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}
            >
              {t("filters.quickFilters")}
            </ThemedText>
            <ThemedView style={styles.quickFiltersGrid}>
              {/* Hide Read Toggle */}
              <TouchableOpacity
                style={[
                  styles.quickFilter,
                  {
                    borderColor: Colors[colorScheme].border,
                    backgroundColor: filters.hideRead
                      ? Colors[colorScheme].selected
                      : Colors[colorScheme].backgroundCard,
                  },
                ]}
                onPress={() => handleHideReadChange(!filters.hideRead)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={filters.hideRead ? "eye-off" : "eye-off-outline"}
                  size={20}
                  color={
                    filters.hideRead
                      ? Colors[colorScheme].tint
                      : Colors[colorScheme].textSecondary
                  }
                />
                <ThemedText
                  style={[
                    styles.quickFilterText,
                    {
                      color: filters.hideRead
                        ? Colors[colorScheme].tint
                        : Colors[colorScheme].text,
                    },
                  ]}
                >
                  {t("filters.hideRead")}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.quickFilterDescription,
                    { color: Colors[colorScheme].textSecondary },
                  ]}
                >
                  {t("filters.hideReadDescription")}
                </ThemedText>
              </TouchableOpacity>

              {/* Attachments Only Toggle */}
              <TouchableOpacity
                style={[
                  styles.quickFilter,
                  {
                    borderColor: Colors[colorScheme].border,
                    backgroundColor: filters.showOnlyWithAttachments
                      ? Colors[colorScheme].selected
                      : Colors[colorScheme].backgroundCard,
                  },
                ]}
                onPress={() =>
                  handleAttachmentsOnlyChange(!filters.showOnlyWithAttachments)
                }
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    filters.showOnlyWithAttachments
                      ? "attach"
                      : "attach-outline"
                  }
                  size={20}
                  color={
                    filters.showOnlyWithAttachments
                      ? Colors[colorScheme].tint
                      : Colors[colorScheme].textSecondary
                  }
                />
                <ThemedText
                  style={[
                    styles.quickFilterText,
                    {
                      color: filters.showOnlyWithAttachments
                        ? Colors[colorScheme].tint
                        : Colors[colorScheme].text,
                    },
                  ]}
                >
                  {t("filters.withMedia")}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.quickFilterDescription,
                    { color: Colors[colorScheme].textSecondary },
                  ]}
                >
                  {t("filters.withMediaDescription")}
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>

          {/* Sort Options */}
          <ThemedView style={styles.section}>
            <ThemedText
              style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}
            >
              {t("filters.sortBy")}
            </ThemedText>
            <ThemedView style={styles.sortButtons}>
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
                // {
                //   value: "priority",
                //   label: t("filters.priority"),
                //   icon: "star",
                // },
              ].map(({ value, label, icon }) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.sortButton,
                    {
                      borderColor: Colors[colorScheme].border,
                      backgroundColor:
                        filters.sortBy === value
                          ? Colors[colorScheme].tint
                          : Colors[colorScheme].backgroundCard,
                    },
                  ]}
                  onPress={() => handleSortByChange(value as any)}
                >
                  <Ionicons
                    name={icon as any}
                    size={18}
                    color={
                      filters.sortBy === value
                        ? "white"
                        : Colors[colorScheme].textSecondary
                    }
                  />
                  <ThemedText
                    style={[
                      styles.sortButtonText,
                      {
                        color:
                          filters.sortBy === value
                            ? "white"
                            : Colors[colorScheme].text,
                      },
                    ]}
                  >
                    {label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ThemedView>
          </ThemedView>

          {/* Hide Older Than */}
          <ThemedView style={styles.section}>
            <ThemedText
              style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}
            >
              {t("filters.hideOlderThan")}
            </ThemedText>
            <ThemedView style={styles.sortButtons}>
              {[
                {
                  value: "none",
                  label: t("filters.showAll"),
                  icon: "infinite",
                },
                { value: "1day", label: t("filters.oneDay"), icon: "calendar" },
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
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.sortButton,
                    {
                      borderColor: Colors[colorScheme].border,
                      backgroundColor:
                        filters.hideOlderThan === value
                          ? Colors[colorScheme].tint
                          : Colors[colorScheme].backgroundCard,
                    },
                  ]}
                  onPress={() => handleHideOlderThanChange(value as any)}
                >
                  <Ionicons
                    name={icon as any}
                    size={18}
                    color={
                      filters.hideOlderThan === value
                        ? "white"
                        : Colors[colorScheme].textSecondary
                    }
                  />
                  <ThemedText
                    style={[
                      styles.sortButtonText,
                      {
                        color:
                          filters.hideOlderThan === value
                            ? "white"
                            : Colors[colorScheme].text,
                      },
                    ]}
                  >
                    {label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ThemedView>
          </ThemedView>
        </ScrollView>

        {/* Footer with active filters count */}
        {hasActiveFilters && (
          <View
            style={[
              styles.footer,
              { borderTopColor: Colors[colorScheme].border },
            ]}
          >
            <View style={styles.footerContent}>
              <Ionicons
                name="funnel"
                size={16}
                color={Colors[colorScheme].tint}
              />
              <ThemedText
                style={[styles.footerText, { color: Colors[colorScheme].text }]}
              >
                {getActiveFiltersCount(filters) === 1
                  ? t("filters.activeFilters", {
                      count: getActiveFiltersCount(filters),
                    })
                  : t("filters.activeFiltersPlural", {
                      count: getActiveFiltersCount(filters),
                    })}
              </ThemedText>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
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
  modalContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  quickFiltersGrid: {
    gap: 12,
  },
  quickFilter: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
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
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
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
