import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useAppContext } from "@/services/app-context";
import { CacheItem, mediaCache } from "@/services/media-cache";
import { saveMediaToGallery } from "@/services/media-gallery";
import { formatFileSize } from "@/utils";
import { GalleryProvider, useGallery } from "@/contexts/GalleryContext";
import React, { useMemo, useState, useEffect } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from "react-native";
import {
  Surface,
  Text,
  TouchableRipple,
  Icon,
  useTheme,
} from "react-native-paper";
import { CachedMedia } from "./CachedMedia";
import FullScreenMediaViewer from "./FullScreenMediaViewer";
import GalleryFilters from "./GalleryFilters";
import { MediaTypeIcon } from "./MediaTypeIcon";

export function GallerySectionWithContext() {
  return (
    <GalleryProvider>
      <GallerySection />
    </GalleryProvider>
  );
}

export default function GallerySection() {
  const theme = useTheme();
  const { t } = useI18n();
  const { userSettings } = useAppContext();
  const [fullscreenIndex, setFullscreenIndex] = useState<number>(-1);

  const {
    state: { selectionMode, selectedItems, filteredMedia, sections, flatOrder },
    dispatch,
  } = useGallery();
  console.log("sections", sections);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const { updateStats, cacheStats } = useGetCacheStats();
  const numColumns = userSettings.settings.gallery.gridSize;

  const itemWidth = useMemo(() => {
    if (containerWidth === 0) {
      // Fallback to screen width if container width is not available yet
      const screenWidth = Dimensions.get("window").width;
      const horizontalPadding = 32; // 16px padding on each side
      const availableWidth = screenWidth - horizontalPadding;
      return availableWidth / numColumns;
    }

    const horizontalPadding = 32; // 16px padding on each side
    const availableWidth = containerWidth - horizontalPadding;
    return availableWidth / numColumns;
  }, [numColumns, containerWidth]);

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    dispatch({ type: "SET_SELECTED_ITEMS", payload: newSelection });
  };

  const renderStatsCard = () => {
    if (!cacheStats) return null;

    return (
      <Surface
        style={[
          styles.statsCard,
          {
            backgroundColor: theme.colors.surface,
          },
        ]}
        elevation={2}
      >
        <View style={styles.statsHeader}>
          <Icon source="chart-line" size={24} color={theme.colors.primary} />
          <Text style={[styles.statsTitle, { color: theme.colors.onSurface }]}>
            {t("medias.stats.title")}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {cacheStats.totalItems}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {t("medias.stats.totalItems")}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {formatFileSize(cacheStats.totalSize)}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {t("medias.stats.totalSize")}
            </Text>
          </View>
        </View>

        <View style={styles.statsContent}>
          <View style={styles.statsLeftColumn}>
            {Object.keys(cacheStats.itemsByType).length > 0 && (
              <View
                style={[
                  styles.typeBreakdown,
                  { borderTopColor: theme.colors.outline },
                ]}
              >
                <Text
                  style={[
                    styles.typeBreakdownTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {t("medias.stats.byType")}
                </Text>
                <View style={styles.typeList}>
                  {Object.entries(cacheStats.itemsByType).map(
                    ([type, count]) => (
                      <View key={type} style={styles.typeItem}>
                        <MediaTypeIcon
                          mediaType={type as MediaType}
                          style={styles.typeLabel}
                          showLabel
                        />
                        <Text
                          style={[
                            styles.typeCount,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            )}
          </View>

          <View style={styles.statsRightColumn}>
            <View
              style={[
                styles.gallerySettings,
                { borderTopColor: theme.colors.outline },
              ]}
            >
              <Text
                style={[
                  styles.typeBreakdownTitle,
                  { color: theme.colors.onSurface },
                ]}
              >
                {t("gallerySettings.title")}
              </Text>

              <TouchableRipple
                style={styles.settingItem}
                onPress={() => {
                  userSettings.updateGallerySettings({
                    autoPlay: !userSettings.settings.gallery.autoPlay,
                  });
                }}
              >
                <View>
                  <View style={styles.settingContent}>
                    <Text
                      style={[
                        styles.settingLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {t("gallerySettings.autoPlay")}
                    </Text>
                    <Text
                      style={[
                        styles.settingDescription,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {t("gallerySettings.autoPlayDescription")}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: userSettings.settings.gallery.autoPlay
                          ? theme.colors.primary
                          : theme.colors.surfaceVariant,
                        borderColor: theme.colors.outline,
                      },
                    ]}
                  >
                    {userSettings.settings.gallery.autoPlay && (
                      <Icon
                        source="check"
                        size={16}
                        color={theme.colors.onPrimary}
                      />
                    )}
                  </View>
                </View>
              </TouchableRipple>

              <TouchableRipple
                style={styles.settingItem}
                onPress={() => {
                  userSettings.updateGallerySettings({
                    showFaultyMedias:
                      !userSettings.settings.gallery.showFaultyMedias,
                  });
                }}
              >
                <View>
                  <View style={styles.settingContent}>
                    <Text
                      style={[
                        styles.settingLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {t("gallerySettings.showFaultyMedias")}
                    </Text>
                    <Text
                      style={[
                        styles.settingDescription,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {t("gallerySettings.showFaultyMediasDescription")}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: userSettings.settings.gallery
                          .showFaultyMedias
                          ? theme.colors.primary
                          : theme.colors.surfaceVariant,
                        borderColor: theme.colors.outline,
                      },
                    ]}
                  >
                    {userSettings.settings.gallery.showFaultyMedias && (
                      <Icon
                        source="check"
                        size={16}
                        color={theme.colors.onPrimary}
                      />
                    )}
                  </View>
                </View>
              </TouchableRipple>
            </View>
          </View>
        </View>
      </Surface>
    );
  };

  const renderMediaRow = ({ item }: { item: CacheItem[] }) => {
    return (
      <View style={styles.gridRow}>
        {item.map((mediaItem) => {
          const isSelected = selectedItems.has(mediaItem.key);
          const checkSize = itemWidth * 0.5;
          return (
            <Pressable
              key={mediaItem.key}
              style={[
                styles.gridItem,
                { width: itemWidth, height: itemWidth },
                isSelected && [
                  styles.gridItemSelected,
                  { borderColor: theme.colors.primary },
                ],
              ]}
            >
              <View style={{ flex: 1 }}>
                <CachedMedia
                  url={mediaItem.url}
                  mediaType={mediaItem.mediaType}
                  useThumbnail={!userSettings.settings.gallery.autoPlay}
                  ignoreClicks={selectionMode}
                  style={styles.gridMediaThumbnail}
                  originalFileName={mediaItem.originalFileName}
                  videoProps={{
                    isMuted: true,
                    autoPlay: true,
                  }}
                  imageProps={{ cachePolicy: "none" }}
                  audioProps={{ showControls: true }}
                  noAutoDownload
                  showMediaIndicator
                  isCompact
                  onPress={() => {
                    if (selectionMode) {
                      toggleItemSelection(mediaItem.key);
                    } else {
                      const index = flatOrder.findIndex(
                        (m) => m.key === mediaItem.key
                      );
                      setFullscreenIndex(index);
                    }
                  }}
                />
                {isSelected && (
                  <>
                    <View style={styles.selectedOverlay} pointerEvents="none" />
                    <View style={styles.selectedCenter} pointerEvents="none">
                      <Icon source="check" size={checkSize} color="#ffffff" />
                    </View>
                  </>
                )}
              </View>
            </Pressable>
          );
        })}
        {Array.from({ length: numColumns - item.length }).map((_, index) => (
          <View
            key={`empty-${index}`}
            style={[styles.gridItemContainer, { width: itemWidth }]}
          />
        ))}
      </View>
    );
  };

  const renderSectionHeader = ({ section }: any) => (
    <View style={styles.dateSection}>
      <Text
        style={[styles.dateSectionTitle, { color: theme.colors.onBackground }]}
      >
        {section.title}
      </Text>
    </View>
  );

  const renderEmptyState = () => {
    return (
      <Surface
        style={[
          styles.emptyState,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Icon
          source="cloud-download-outline"
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
        <Text style={[styles.emptyTitle, { color: theme.colors.onBackground }]}>
          {t("medias.empty.title")}
        </Text>
        <Text
          style={[
            styles.emptySubtitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {t("medias.empty.message")}
        </Text>
      </Surface>
    );
  };

  return (
    <Surface
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      <GalleryFilters />

      <SectionList
        sections={sections}
        keyExtractor={(row, index) => `${row[0]?.key || "row"}-${index}`}
        renderItem={renderMediaRow}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={[
          styles.galleryContainer,
          filteredMedia.length === 0 && styles.emptyListContainer,
        ]}
        windowSize={3}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={updateStats}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        stickySectionHeadersEnabled={false}
      />

      {fullscreenIndex >= 0 && flatOrder[fullscreenIndex] && (
        <FullScreenMediaViewer
          visible={true}
          url={flatOrder[fullscreenIndex].url}
          mediaType={flatOrder[fullscreenIndex].mediaType}
          originalFileName={flatOrder[fullscreenIndex].originalFileName}
          notificationDate={flatOrder[fullscreenIndex].notificationDate}
          onClose={() => setFullscreenIndex(-1)}
          onDeleted={() => {
            if (flatOrder.length === 1) {
              setFullscreenIndex(-1);
            } else if (fullscreenIndex >= flatOrder.length - 1) {
              setFullscreenIndex(fullscreenIndex - 1);
            }
          }}
          enableSwipeNavigation={flatOrder.length > 1}
          onSwipeLeft={() =>
            setFullscreenIndex((fullscreenIndex + 1) % flatOrder.length)
          }
          onSwipeRight={() =>
            setFullscreenIndex(
              fullscreenIndex === 0 ? flatOrder.length - 1 : fullscreenIndex - 1
            )
          }
          currentPosition={`${fullscreenIndex + 1} / ${flatOrder.length}`}
        />
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  galleryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  emptyListContainer: {
    justifyContent: "flex-start",
    alignItems: "stretch",
    paddingTop: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
  dateSection: {
    marginBottom: 10,
    marginTop: 10,
  },
  dateSectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    paddingHorizontal: 16,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  gridItemContainer: {},
  gridItem: {
    overflow: "hidden",
  },
  gridItemSelected: {
    borderWidth: 2,
  },
  selectedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  selectedCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  gridMediaThumbnail: {
    width: "100%",
    height: "100%",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  // Stats content layout
  statsContent: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
  },
  statsLeftColumn: {
    flex: 1,
  },
  statsRightColumn: {
    flex: 1,
  },
  gallerySettings: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  // Fullscreen modal styles
  fullscreenModal: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenTopButtons: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    flexDirection: "row",
    gap: 8,
  },
  fullscreenTopButton: {
    borderRadius: 16,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenContent: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenMedia: {
    width: "90%",
    maxHeight: "70%",
    aspectRatio: 1,
  },
  fullscreenInfo: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 12,
    padding: 16,
  },
  fullscreenTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  fullscreenMetadata: {
    flexDirection: "row",
    alignItems: "center",
  },
  fullscreenMetadataText: {
    fontSize: 14,
  },
  // Date section styles
  typeBreakdown: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  typeBreakdownTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  typeList: {
    gap: 8,
  },
  typeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeLabel: {
    flex: 1,
    fontSize: 14,
  },
  typeCount: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Stats card styles (re-added)
  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignSelf: "stretch",
    width: "100%",
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});
