import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/services/app-context";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Badge, Icon, Surface, TextInput, TouchableRipple, useTheme } from "react-native-paper";
import NotificationFiltersModal from "./NotificationFiltersModal";

interface NotificationFiltersProps {
  onToggleCompactMode: () => void;
  isCompactMode: boolean;
  hideBucketSelector?: boolean;
  onToggleMultiSelection: () => void;
  selectedCount: number;
  isMultiSelectionMode: boolean;
}

export default function NotificationFilters({
  onToggleCompactMode,
  isCompactMode,
  hideBucketSelector = false,
  onToggleMultiSelection,
  selectedCount,
  isMultiSelectionMode,
}: NotificationFiltersProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const {
    userSettings: { settings, setNotificationFilters },
  } = useAppContext();
  const filters = settings.notificationFilters;

  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [internalSearchQuery, setInternalSearchQuery] = useState(
    filters.searchQuery || ""
  );
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Sincronizza lo stato interno con il context esterno solo se non si sta digitando
  useEffect(() => {
    if (!isTypingRef.current) {
      setInternalSearchQuery(filters.searchQuery || "");
    }
  }, [filters.searchQuery]);

  const handleSearchChange = useCallback(
    (searchQuery: string) => {
      isTypingRef.current = true;

      setInternalSearchQuery(searchQuery);

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        setNotificationFilters({ searchQuery });
        isTypingRef.current = false;
      }, 150);
    },
    [setNotificationFilters]
  );

  // Cleanup del timeout quando il componente viene smontato
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (filters.hideRead) count++;
    if (filters.hideOlderThan !== "none") count++;
    if (filters.selectedBucketIds.length > 0) count++; // Any bucket selection (including __general__)
    if (filters.showOnlyWithAttachments) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <>
      <View style={styles.container}>
        {/* Search Input */}
        <Surface style={[styles.searchContainer]} elevation={0}>
          <TextInput
            mode="outlined"
            style={[styles.searchInput, { height: 44 }]}
            contentStyle={{ height: 44, paddingVertical: 0 }}
            textColor={theme.colors.onSurface}
            placeholder={t("home.search.placeholder")}
            value={internalSearchQuery}
            onChangeText={handleSearchChange}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            left={
              <TextInput.Icon
                icon="magnify"
                color={theme.colors.onSurfaceVariant}
              />
            }
            right={
              internalSearchQuery.length > 0 ? (
                <TextInput.Icon
                  icon="close-circle"
                  onPress={() => handleSearchChange("")}
                  forceTextInputFocus={false}
                  color={theme.colors.onSurfaceVariant}
                />
              ) : undefined
            }
            outlineStyle={{ borderRadius: 8, borderWidth: 1, borderColor: theme.colors.outline }}
          />
        </Surface>

        {/* Compact Mode Toggle */}
        <TouchableRipple
          style={[
            styles.compactToggle,
            {
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.surfaceVariant,
            },
          ]}
          onPress={onToggleCompactMode}
        >
          <Icon source={isCompactMode ? "view-list-outline" : "view-grid-outline"} size={18} color={theme.colors.onSurfaceVariant} />
        </TouchableRipple>

        {/* Multi-Selection Toggle Button (seguendo pattern gallery) */}
        <TouchableRipple
          style={[
            styles.multiSelectionToggle,
            {
              borderColor: theme.colors.outline,
              backgroundColor: isMultiSelectionMode
                ? theme.colors.primary
                : theme.colors.surface,
            },
          ]}
          onPress={onToggleMultiSelection}
        >
          <View>
            <Icon
              source={isMultiSelectionMode ? "close" : "check-circle-outline"}
              size={18}
              color={isMultiSelectionMode ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
            />
            {isMultiSelectionMode && selectedCount > 0 && (
              <Badge style={styles.selectionBadge}>{selectedCount}</Badge>
            )}
          </View>
        </TouchableRipple>

        {/* Filters Button */}
        <TouchableRipple
          style={[
            styles.filtersButton,
            {
              borderColor: theme.colors.outline,
              backgroundColor:
                activeFiltersCount > 0
                  ? theme.colors.secondaryContainer
                  : theme.colors.surfaceVariant,
            },
          ]}
          onPress={() => setShowFiltersModal(true)}
        >
          <View>
            <Icon
              source="filter"
              size={18}
              color={activeFiltersCount > 0 ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            {activeFiltersCount > 0 && (
              <Badge style={[styles.filtersBadge]}>{activeFiltersCount}</Badge>
            )}
          </View>
        </TouchableRipple>
      </View>

      {/* Filters Modal */}
      <NotificationFiltersModal
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        hideBucketSelector={hideBucketSelector}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  clearButton: {
    marginLeft: 8,
  },
  filtersButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filtersBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  compactToggle: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  multiSelectionToggle: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  selectionBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
