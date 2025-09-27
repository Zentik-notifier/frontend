import { useGalleryContext } from "@/contexts/GalleryContext";
import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useAppContext } from "@/contexts/AppContext";
import { formatFileSize } from "@/utils";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Badge,
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import GalleryFiltersModal from "./GalleryFiltersModal";
import { MediaTypeIcon } from "./MediaTypeIcon";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";

const availableMediaTypes = Object.values(MediaType);

interface CacheStats {
  totalItems: number;
  totalSize: number;
  itemsByType: Record<string, number>;
}

export default function GalleryFilters() {
  const theme = useTheme();
  const { userSettings } = useAppContext();
  const { t } = useI18n();
  const { cacheStats, updateStats } = useGetCacheStats();

  useEffect(() => {
    updateStats();
  }, []);

  const {
    state: {
      selectionMode,
      selectedItems,
      selectedMediaTypes,
      deleteLoading,
      filteredMedia,
    },
    handleToggleMultiSelection,
    handleCloseSelectionMode,
    handleSelectAll,
    handleDeselectAll,
    handleShowFiltersModal,
    handleDeleteSelected,
  } = useGalleryContext();
  const totalItems = filteredMedia?.length ?? 0;

  const getActiveFiltersCount = (): number => {
    let count = 0;

    // Conta se non sono selezionati tutti i tipi di media
    if (selectedMediaTypes.size !== availableMediaTypes.length) count++;

    // Conta se showFaultyMedias è attivo (opzione speciale)
    if (userSettings.settings.gallery.showFaultyMedias) count++;

    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

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
          onPress={
            selectedItems.size === totalItems
              ? handleDeselectAll
              : handleSelectAll
          }
        >
          <View style={styles.selectionBadgeContent}>
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
              {selectedItems.size === totalItems
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
          onPress={handleDeleteSelected}
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

  const renderStatsMenu = () => {
    if (!cacheStats) return null;

    const statsItems = Object.entries(cacheStats.itemsByType).map(
      ([type, count]) => {
        // Get appropriate icon for media type
        let iconName = "image"; // default
        switch (type) {
          case "IMAGE":
            iconName = "image";
            break;
          case "GIF":
            iconName = "gif";
            break;
          case "VIDEO":
            iconName = "video";
            break;
          case "AUDIO":
            iconName = "music";
            break;
          case "ICON":
            iconName = "star";
            break;
        }

        return {
          id: type,
          label: `${type}: ${count}`,
          icon: iconName,
          onPress: () => {}, // No action needed
          disabled: true, // Make it non-clickable
        };
      }
    );

    return (
      <Menu>
        <MenuTrigger>
          <View style={styles.infoButton}>
            <Icon source="information" size={20} color={theme.colors.primary} />
          </View>
        </MenuTrigger>
        <MenuOptions
          optionsContainerStyle={{
            marginTop: 50,
            backgroundColor: theme.colors.surface,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
          }}
        >
          {/* Header */}
          <View
            style={[
              styles.statsHeader,
              { borderBottomColor: theme.colors.outlineVariant },
            ]}
          >
            <Text
              style={[styles.statsTitle, { color: theme.colors.onSurface }]}
            >
              {t("gallery.statsByType")}
            </Text>
          </View>

          {/* Stats Items */}
          {statsItems.map((item, index) => (
            <MenuOption key={index} onSelect={() => item.onPress()}>
              <View style={styles.menuItem}>
                <Icon
                  source={item.icon}
                  size={20}
                  color={theme.colors.onSurface}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            </MenuOption>
          ))}
        </MenuOptions>
      </Menu>
    );
  };

  return (
    <>
      {selectionMode ? (
        renderSelectionBar()
      ) : (
        <View style={styles.container}>
          {/* Cache Stats */}
          {cacheStats && (
            <Surface
              style={[
                styles.statsContainer,
                {
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              elevation={0}
            >
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Icon
                    source="folder-outline"
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.statsText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("gallery.cachedItems", { count: cacheStats.totalItems })}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Icon
                    source="chip"
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.statsText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {formatFileSize(cacheStats.totalSize)}
                  </Text>
                </View>
                {renderStatsMenu()}
              </View>
            </Surface>
          )}

          {/* Right controls */}
          <View style={styles.rightControls}>
            {/* Multi-Selection Toggle */}
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
                      ? theme.colors.primary
                      : theme.colors.surface,
                },
              ]}
              onPress={handleShowFiltersModal}
            >
              <View>
                <Icon
                  source="filter"
                  size={18}
                  color={
                    activeFiltersCount > 0
                      ? theme.colors.onPrimary
                      : theme.colors.onSurfaceVariant
                  }
                />
                {activeFiltersCount > 0 && (
                  <Badge style={styles.filtersBadge}>
                    {activeFiltersCount}
                  </Badge>
                )}
              </View>
            </TouchableRipple>
          </View>
        </View>
      )}

      {/* Filters Modal */}
      <GalleryFiltersModal />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 12,
    minHeight: 60,
  },
  statsContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  statsText: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.8,
  },
  infoButton: {
    padding: 4,
    marginLeft: 8,
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    top: -12,
    right: -16,
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
  // Stats menu styles
  statsHeader: {
    padding: 8,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
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
  selectionCountBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  selectionBadgeContent: {
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
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 16,
  },
});
