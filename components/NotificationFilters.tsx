import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import { useNotificationsContext } from "@/contexts/NotificationsContext";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Badge,
  Icon,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import NotificationFiltersModal from "./NotificationFiltersModal";

interface NotificationVisualizationProps {
  totalNotifications?: number;
  refreshing?: boolean;
  onToggleReadStatus?: () => void;
  onDeleteSelected?: () => void;
  onRefresh?: () => void;
}

export default function NotificationVisualization({
  totalNotifications = 0,
  refreshing,
  onToggleReadStatus,
  onDeleteSelected,
  onRefresh,
}: NotificationVisualizationProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const {
    userSettings: { settings, setNotificationVisualization, setIsCompactMode },
  } = useAppContext();
  const filters = settings.notificationVisualization;
  const isCompactMode = settings.notificationVisualization.isCompactMode;

  // Use notifications context
  const {
    state: {
      selectionMode,
      selectedItems,
      markAsReadLoading,
      markAsUnreadLoading,
      deleteLoading,
      activeFiltersCount,
    },
    handleToggleMultiSelection,
    handleCloseSelectionMode,
    handleSelectAll,
    handleShowFiltersModal,
  } = useNotificationsContext();
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
        setNotificationVisualization({ searchQuery });
        isTypingRef.current = false;
      }, 150);
    },
    [setNotificationVisualization]
  );

  // Cleanup del timeout quando il componente viene smontato
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleToggleCompactMode = useCallback(async () => {
    await setIsCompactMode(!isCompactMode);
  }, [isCompactMode, setIsCompactMode]);

  const renderSelectionBar = () => (
    <Surface
      style={[
        styles.selectionBar,
        {
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <View style={styles.leftControls}>
        <TouchableRipple
          style={[
            styles.selectionButton,
            {
              borderColor: theme.colors.outline,
              backgroundColor:
                theme.colors.elevation?.level1 || theme.colors.surface,
            },
          ]}
          onPress={handleCloseSelectionMode}
        >
          <Text
            style={[
              styles.selectionCountText,
              { color: theme.colors.onSurface },
            ]}
          >
            {t("common.cancel")}
          </Text>
        </TouchableRipple>

        <TouchableRipple
          style={[
            styles.selectionCountBadge,
            {
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={handleSelectAll}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={[
                styles.selectionCountText,
                { color: theme.colors.onPrimary },
              ]}
            >
              {selectedItems.size}
            </Text>
            <Text
              style={[
                styles.selectionCountText,
                {
                  color: theme.colors.onPrimary,
                  fontSize: 12,
                  marginLeft: 4,
                  opacity: 0.9,
                },
              ]}
            >
              {selectedItems.size === totalNotifications
                ? t("notifications.deselectAll")
                : t("notifications.selectAll")}
            </Text>
          </View>
        </TouchableRipple>
      </View>

      <View style={styles.rightControls}>
        <TouchableRipple
          style={[
            styles.selectionButton,
            {
              borderColor:
                selectedItems.size === 0
                  ? theme.colors.outlineVariant || theme.colors.outline
                  : theme.colors.outline,
              backgroundColor:
                selectedItems.size === 0
                  ? theme.colors.surfaceVariant
                  : theme.colors.elevation?.level1 || theme.colors.surface,
              opacity: selectedItems.size === 0 ? 0.5 : 1,
            },
          ]}
          onPress={onToggleReadStatus}
          disabled={
            selectedItems.size === 0 || markAsReadLoading || markAsUnreadLoading
          }
        >
          {markAsReadLoading || markAsUnreadLoading ? (
            <ActivityIndicator size={16} color={theme.colors.onSurface} />
          ) : (
            <Icon
              source="check-all"
              size={20}
              color={
                selectedItems.size === 0
                  ? theme.colors.onSurfaceVariant
                  : theme.colors.secondary
              }
            />
          )}
        </TouchableRipple>

        <TouchableRipple
          style={[
            styles.selectionButton,
            {
              borderColor:
                selectedItems.size === 0
                  ? theme.colors.outlineVariant || theme.colors.outline
                  : theme.colors.outline,
              backgroundColor:
                selectedItems.size === 0
                  ? theme.colors.surfaceVariant
                  : theme.colors.elevation?.level1 || theme.colors.surface,
              opacity: selectedItems.size === 0 ? 0.5 : 1,
            },
          ]}
          onPress={onDeleteSelected}
          disabled={selectedItems.size === 0 || deleteLoading}
        >
          {deleteLoading ? (
            <ActivityIndicator size={16} color={theme.colors.onSurface} />
          ) : (
            <Icon
              source="trash-can-outline"
              size={20}
              color={
                selectedItems.size === 0
                  ? theme.colors.onSurfaceVariant
                  : theme.colors.error
              }
            />
          )}
        </TouchableRipple>
      </View>
    </Surface>
  );

  return (
    <>
      {selectionMode ? (
        renderSelectionBar()
      ) : (
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
              outlineStyle={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.colors.outline,
              }}
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
            onPress={handleToggleCompactMode}
          >
            <Icon
              source={isCompactMode ? "view-list-outline" : "view-grid-outline"}
              size={18}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableRipple>

          {/* Refresh Button (Web only) */}
          {Platform.OS === "web" && onRefresh && (
            <TouchableRipple
              style={[
                styles.refreshButton,
                {
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.colors.surfaceVariant,
                },
              ]}
              onPress={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size={18} color={theme.colors.primary} />
              ) : (
                <Icon
                  source="refresh"
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                />
              )}
            </TouchableRipple>
          )}

          {/* Multi-Selection Toggle Button (seguendo pattern gallery) */}
          <TouchableRipple
            style={[
              styles.multiSelectionToggle,
              {
                borderColor: theme.colors.outline,
                backgroundColor: selectionMode
                  ? theme.colors.primary
                  : theme.colors.surface,
              },
            ]}
            onPress={handleToggleMultiSelection}
          >
            <View>
              <Icon
                source={selectionMode ? "close" : "check-circle-outline"}
                size={18}
                color={
                  selectionMode
                    ? theme.colors.onPrimary
                    : theme.colors.onSurfaceVariant
                }
              />
              {selectionMode && selectedItems.size > 0 && (
                <Badge style={styles.selectionBadge}>
                  {selectedItems.size}
                </Badge>
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
            onPress={handleShowFiltersModal}
          >
            <View>
              {refreshing && activeFiltersCount > 0 ? (
                <ActivityIndicator size={18} color={theme.colors.primary} />
              ) : (
                <Icon
                  source="filter"
                  size={18}
                  color={
                    activeFiltersCount > 0
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                />
              )}
              {activeFiltersCount > 0 && !refreshing && (
                <Badge style={[styles.filtersBadge]}>
                  {activeFiltersCount}
                </Badge>
              )}
            </View>
          </TouchableRipple>
        </View>
      )}

      {/* Filters Modal */}
      <NotificationFiltersModal />
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
    minHeight: 60,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
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
    top: -12,
    right: -16,
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
  refreshButton: {
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
  },
  selectionBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  // Selection bar styles
  selectionBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 60,
  },
  leftControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectionCountBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  selectionCountText: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectionButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
