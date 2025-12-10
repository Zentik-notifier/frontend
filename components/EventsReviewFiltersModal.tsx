import {
  EventType,
  useGetAllUsersQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useEventsReviewContext } from "@/contexts/EventsReviewContext";
import React, { useState, useEffect, useMemo } from "react";
import { StyleSheet, View, ScrollView, Dimensions } from "react-native";
import {
  Button,
  Icon,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import Selector from "./ui/Selector";

export default function EventsReviewFiltersModal() {
  const { data: usersData } = useGetAllUsersQuery();
  const { t } = useI18n();
  const theme = useTheme();

  const {
    state: { filters: savedFilters, showFiltersModal, activeFiltersCount, fixedUserId },
    handleHideFiltersModal,
    handleSetFilters,
    handleClearFilters,
  } = useEventsReviewContext();

  // Local state for filters
  const [localFilters, setLocalFilters] = useState(savedFilters);

  // Sync local state when modal opens or saved filters change
  useEffect(() => {
    if (showFiltersModal) {
      setLocalFilters(savedFilters);
    }
  }, [showFiltersModal, savedFilters]);

  const eventTypeOptions = useMemo(
    () =>
      Object.values(EventType).map((value) => ({
        id: value,
        name: value,
      })),
    []
  );

  const userOptions = useMemo(() => {
    const options = (usersData?.users ?? []).map((u) => ({
      id: u.id as string,
      name: u.username || u.email || u.id,
      description: u.email || undefined,
    }));
    return options;
  }, [usersData]);

  const applyFilters = () => {
    handleSetFilters(localFilters);
    handleHideFiltersModal();
  };

  const clearAllFilters = () => {
    setLocalFilters({
      selectedType: undefined,
      userId: fixedUserId || undefined,
      objectId: "",
      targetId: "",
    });
  };

  const hasChanges = JSON.stringify(localFilters) !== JSON.stringify(savedFilters);
  const hasActiveFilters = activeFiltersCount > 0;

  const deviceHeight = Dimensions.get("window").height;
  const containerStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 24,
    maxHeight: deviceHeight * 0.8,
  } as const;

  return (
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
            <Button
              mode="text"
              onPress={handleHideFiltersModal}
              style={styles.closeButton}
              icon="close"
              compact
            >
              {t("common.close")}
            </Button>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: 20,
          }}
        >
          {/* Event Type Selector */}
          <View style={styles.section}>
            <Selector
              label={t("eventsReview.filters.type")}
              placeholder={t("common.all")}
              options={eventTypeOptions}
              selectedValue={localFilters.selectedType}
              onValueChange={(value) =>
                setLocalFilters((prev) => ({ ...prev, selectedType: value }))
              }
              isSearchable
              searchPlaceholder={t("common.search")}
            />
          </View>

          {/* User Selector - Only show if userId is not fixed */}
          {!fixedUserId && (
            <View style={styles.section}>
              <Selector
                label={t("eventsReview.filters.userId")}
                placeholder={t("common.all")}
                options={userOptions}
                selectedValue={localFilters.userId}
                onValueChange={(value) =>
                  setLocalFilters((prev) => ({ ...prev, userId: value }))
                }
                isSearchable
                searchPlaceholder={t("common.search")}
              />
            </View>
          )}

          {/* Object ID Input */}
          <View style={styles.section}>
            <TextInput
              mode="outlined"
              label={t("eventsReview.filters.objectId")}
              placeholder={t("eventsReview.filters.objectId")}
              value={localFilters.objectId}
              onChangeText={(value) =>
                setLocalFilters((prev) => ({ ...prev, objectId: value }))
              }
              left={<TextInput.Icon icon="magnify" />}
              right={
                localFilters.objectId.length > 0 ? (
                  <TextInput.Icon
                    icon="close-circle"
                    onPress={() =>
                      setLocalFilters((prev) => ({ ...prev, objectId: "" }))
                    }
                  />
                ) : undefined
              }
            />
          </View>

          {/* Target ID Input */}
          <View style={styles.section}>
            <TextInput
              mode="outlined"
              label={t("eventsReview.filters.targetId")}
              placeholder={t("eventsReview.filters.targetId")}
              value={localFilters.targetId}
              onChangeText={(value) =>
                setLocalFilters((prev) => ({ ...prev, targetId: value }))
              }
              left={<TextInput.Icon icon="cellphone" />}
              right={
                localFilters.targetId.length > 0 ? (
                  <TextInput.Icon
                    icon="close-circle"
                    onPress={() =>
                      setLocalFilters((prev) => ({ ...prev, targetId: "" }))
                    }
                  />
                ) : undefined
              }
            />
          </View>

          {hasActiveFilters && (
            <View
              style={[styles.footer, { borderTopColor: theme.colors.outline }]}
            >
              <View style={styles.footerContent}>
                <Icon source="filter" size={16} color={theme.colors.primary} />
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
  closeButton: {
    minWidth: 0,
  },
  section: {
    marginBottom: 20,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
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
