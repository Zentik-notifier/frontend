import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import NotificationFiltersModal from "./NotificationFiltersModal";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

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
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const {
    userSettings: { settings, setNotificationFilters },
    notificationsLoading,
  } = useAppContext();
  const filters = settings.notificationFilters;

  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [internalSearchQuery, setInternalSearchQuery] = useState(filters.searchQuery || '');
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Sincronizza lo stato interno con il context esterno solo se non si sta digitando
  useEffect(() => {
    if (!isTypingRef.current) {
      setInternalSearchQuery(filters.searchQuery || '');
    }
  }, [filters.searchQuery]);

  const handleSearchChange = useCallback((searchQuery: string) => {
    isTypingRef.current = true;
    
    setInternalSearchQuery(searchQuery);
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      setNotificationFilters({ searchQuery });
      isTypingRef.current = false;
    }, 150);
  }, [setNotificationFilters]);

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
        <ThemedView
          style={[
            styles.searchContainer,
            { backgroundColor: Colors[colorScheme].inputBackground },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={Colors[colorScheme].textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: Colors[colorScheme].text }]}
            placeholder={t("home.search.placeholder")}
            value={internalSearchQuery}
            onChangeText={handleSearchChange}
            placeholderTextColor={Colors[colorScheme].inputPlaceholder}
          />
          {internalSearchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearchChange("")}
              style={styles.clearButton}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={Colors[colorScheme].textSecondary}
              />
            </TouchableOpacity>
          )}
        </ThemedView>

        {/* Compact Mode Toggle */}
        <TouchableOpacity
          style={[
            styles.compactToggle,
            {
              borderColor: Colors[colorScheme].border,
              backgroundColor: Colors[colorScheme].inputBackground,
            },
          ]}
          onPress={onToggleCompactMode}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isCompactMode ? "list-outline" : "grid-outline"}
            size={16}
            color={Colors[colorScheme].textSecondary}
          />
        </TouchableOpacity>

        {/* Multi-Selection Toggle Button (seguendo pattern gallery) */}
        <TouchableOpacity
          style={[
            styles.multiSelectionToggle,
            {
              borderColor: Colors[colorScheme].border,
              backgroundColor: isMultiSelectionMode
                ? Colors[colorScheme].tint
                : Colors[colorScheme].background,
            },
          ]}
          onPress={onToggleMultiSelection}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isMultiSelectionMode ? "close" : "checkmark-circle-outline"}
            size={16}
            color={
              isMultiSelectionMode
                ? "white"
                : Colors[colorScheme].textSecondary
            }
          />
          {isMultiSelectionMode && selectedCount > 0 && (
            <View
              style={[
                styles.selectionBadge,
                { backgroundColor: "white" },
              ]}
            >
              <ThemedText style={[styles.selectionBadgeText, { color: Colors[colorScheme].tint }]}>
                {selectedCount}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>

        {/* Filters Button */}
        <TouchableOpacity
          style={[
            styles.filtersButton,
            {
              borderColor: Colors[colorScheme].border,
              backgroundColor:
                activeFiltersCount > 0
                  ? Colors[colorScheme].selected
                  : Colors[colorScheme].inputBackground,
            },
          ]}
          onPress={() => setShowFiltersModal(true)}
          activeOpacity={0.7}
          disabled={notificationsLoading}
        >
          {notificationsLoading ? (
            <ActivityIndicator
              size="small"
              color={
                activeFiltersCount > 0
                  ? Colors[colorScheme].tint
                  : Colors[colorScheme].textSecondary
              }
            />
          ) : (
            <Ionicons
              name="filter"
              size={16}
              color={
                activeFiltersCount > 0
                  ? Colors[colorScheme].tint
                  : Colors[colorScheme].textSecondary
              }
            />
          )}
          {activeFiltersCount > 0 && (
            <ThemedView
              style={[
                styles.filtersBadge,
                { backgroundColor: Colors[colorScheme].tint },
              ]}
            >
              <ThemedText style={styles.filtersBadgeText}>
                {activeFiltersCount}
              </ThemedText>
            </ThemedView>
          )}
        </TouchableOpacity>
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
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
    borderRadius: 12,
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
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  compactToggle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  multiSelectionToggle: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
});