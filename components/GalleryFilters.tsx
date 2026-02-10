import { useAppContext } from "@/contexts/AppContext";
import { useGalleryContext } from "@/contexts/GalleryContext";
import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNotificationUtils } from "@/hooks/useNotificationUtils";
import { useSettings } from "@/hooks/useSettings";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { DEFAULT_MEDIA_TYPES } from "@/services/settings-service";
import { formatFileSize } from "@/utils";
import React, { useEffect } from "react";
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
import PaperMenu, { PaperMenuItem } from "./ui/PaperMenu";
import GalleryFiltersModal from "./GalleryFiltersModal";

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
  const { settings } = useSettings();
  const { cacheStats, updateStats } = useGetCacheStats();
  const { getMediaTypeIcon, getMediaTypeColor, getMediaTypeFriendlyName } = useNotificationUtils();

  useEffect(() => {
    updateStats();
  }, []);

  const {
    state: {
      selectionMode,
      selectedItems,
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

    // Get selected media types from settings
    const savedSelectedTypes = settings.galleryVisualization.selectedMediaTypes;
    const selectedMediaTypes = savedSelectedTypes.length > 0 
      ? savedSelectedTypes 
      : DEFAULT_MEDIA_TYPES;

    // Count if selection differs from defaults
    const defaultSet = new Set(DEFAULT_MEDIA_TYPES);
    const isDefaultSelection = 
      selectedMediaTypes.length === defaultSet.size &&
      selectedMediaTypes.every((type) => (defaultSet as Set<MediaType>).has(type));
    
    if (!isDefaultSelection) {
      count++; // Count as 1 filter, not the number of selected types
    }

    // Count other non-default settings
    if (settings.galleryVisualization.showFaultyMedias) count++;
    if (settings.galleryVisualization.autoPlay) count++;
    if (settings.galleryVisualization.gridSize !== 3) count++;

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

    const statsItems: PaperMenuItem[] = Object.entries(cacheStats.itemsByType).map(
      ([type, count]) => {
        const mediaType = type as MediaType;
        const iconName = getMediaTypeIcon(mediaType);
        const friendlyName = getMediaTypeFriendlyName(mediaType);

        return {
          id: type,
          label: `${friendlyName}: ${count}`,
          icon: iconName,
          onPress: () => {},
        };
      }
    );

    return (
      <PaperMenu
        items={statsItems}
        size="small"
        renderTrigger={(openMenu) => (
          <TouchableRipple onPress={openMenu}>
            <View style={styles.infoButton}>
              <Icon source="information" size={20} color={theme.colors.primary} />
            </View>
          </TouchableRipple>
        )}
      />
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
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  menuItemText: {
    marginLeft: 8,
    fontSize: 14,
  },
});
