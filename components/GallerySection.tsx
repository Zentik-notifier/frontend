import { useAppContext } from "@/contexts/AppContext";
import { GalleryProvider, useGalleryContext } from "@/contexts/GalleryContext";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { CacheItem } from "@/services/media-cache-service";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  RefreshControl,
  // SectionList,
  StyleSheet,
  View,
} from "react-native";
import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import { Icon, Surface, Text, useTheme } from "react-native-paper";
import { CachedMedia } from "./CachedMedia";
import FullScreenMediaViewer from "./FullScreenMediaViewer";
import GalleryFilters from "./GalleryFilters";

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
    handleSetSections,
  } = useGalleryContext();
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const { updateStats } = useGetCacheStats();
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
    handleSetSections(sections);
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

  // Build FlashList data from sections (headers + rows)
  const flashData = useMemo(
    () =>
      sections.flatMap((section) => [
        {
          type: "header" as const,
          key: `h-${section.title}`,
          title: section.title,
        },
        ...section.data.map((row: CacheItem[], idx: number) => ({
          type: "row" as const,
          key: `r-${section.title}-${idx}`,
          items: row,
        })),
      ]),
    [sections]
  );

  const renderFlashItem = ({ item }: ListRenderItemInfo<any>) => {
    if (item.type === "header") {
      return (
        <View style={styles.dateSection}>
          <Text
            style={[
              styles.dateSectionTitle,
              { color: theme.colors.onBackground },
            ]}
          >
            {item.title}
          </Text>
        </View>
      );
    }
    // row with media items
    return renderMediaRow({ item: item.items as CacheItem[] });
  };

  const getItemType = (item: any) => item.type;

  return (
    <Surface
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      <GalleryFilters />

      <FlashList
        data={flashData}
        keyExtractor={(item) => item.key}
        renderItem={renderFlashItem}
        contentContainerStyle={[
          styles.galleryContainer,
          filteredMedia.length === 0 && styles.emptyListContainer,
        ]}
        getItemType={getItemType}
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
