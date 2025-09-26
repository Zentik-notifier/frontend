import { useGallery } from "@/contexts/GalleryContext";
import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useAppContext } from "@/services/app-context";
import { formatFileSize } from "@/utils";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
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
  const [showStatsTooltip, setShowStatsTooltip] = useState(false);
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
  } = useGallery();
  const totalItems = filteredMedia.length;

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
              : () => handleSelectAll([]) // Will be overridden by parent
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

  const renderStatsTooltip = () => {
    if (!cacheStats || !showStatsTooltip) return null;

    return (
      <Modal
        visible={showStatsTooltip}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatsTooltip(false)}
      >
        <Pressable
          style={styles.tooltipOverlay}
          onPress={() => setShowStatsTooltip(false)}
        >
          <View
            style={[
              styles.tooltipContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              style={[styles.tooltipTitle, { color: theme.colors.onSurface }]}
            >
              Statistiche per Tipo
            </Text>
            {Object.entries(cacheStats.itemsByType).map(([type, count]) => (
              <View key={type} style={styles.tooltipItem}>
                <MediaTypeIcon
                  mediaType={type as MediaType}
                  size={20}
                  showLabel
                  textStyle={{ fontSize: 14 }}
                />
                <Text
                  style={[
                    styles.tooltipCount,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {count}
                </Text>
              </View>
            ))}
          </View>
        </Pressable>
      </Modal>
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
                <TouchableRipple
                  style={styles.infoButton}
                  onPress={() => setShowStatsTooltip(true)}
                >
                  <Icon
                    source="information"
                    size={20}
                    color={theme.colors.primary}
                  />
                </TouchableRipple>
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

      {renderStatsTooltip()}

      {/* Filters Modal */}
      {/* <GalleryFiltersModal /> */}
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
  // Tooltip styles
  tooltipOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  tooltipContainer: {
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  tooltipItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  tooltipCount: {
    fontSize: 14,
    fontWeight: "500",
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
});
