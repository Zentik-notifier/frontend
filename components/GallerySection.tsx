import { Colors } from "@/constants/Colors";
import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { CacheItem, mediaCache } from "@/services/media-cache";
import { saveMediaToGallery } from "@/services/media-gallery";
import { formatFileSize } from "@/utils";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { CachedMedia } from "./CachedMedia";
import FullScreenMediaViewer from "./FullScreenMediaViewer";
import GalleryFilters from "./GalleryFilters";
import { MediaTypeIcon } from "./MediaTypeIcon";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

export default function GallerySection() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { userSettings } = useAppContext();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState<number>(-1);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const { cacheStats, cachedItems, updateStats } = useGetCacheStats();
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<Set<MediaType>>(
    new Set([MediaType.Image, MediaType.Video, MediaType.Gif, MediaType.Audio])
  );
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

  const { filteredMedia, sections, flatOrder } = useMemo(() => {
    const allWithIds = cachedItems.map((item, index) => ({
      ...item,
      notificationDate: item.notificationDate || item.downloadedAt,
    }));

    const filteredMedia = allWithIds.filter((item) => {
      if (!selectedMediaTypes.has(item.mediaType)) return false;
      if (!userSettings.settings.gallery.showFaultyMedias) {
        if (item?.isUserDeleted || item?.isPermanentFailure) return false;
      }
      return true;
    });

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(startOfToday);
    const day = startOfWeek.getDay();
    const diffToMonday = (day + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

    const today: CacheItem[] = [];
    const yesterday: CacheItem[] = [];
    const thisWeek: CacheItem[] = [];
    const older: CacheItem[] = [];

    for (const media of filteredMedia) {
      const ts = media.notificationDate || media.downloadedAt || Date.now();
      if (ts >= startOfToday.getTime()) {
        today.push(media);
      } else if (
        ts >= startOfYesterday.getTime() &&
        ts < startOfToday.getTime()
      ) {
        yesterday.push(media);
      } else if (ts >= startOfWeek.getTime()) {
        thisWeek.push(media);
      } else {
        older.push(media);
      }
    }

    const sortDesc = (a: CacheItem, b: CacheItem) =>
      (b.notificationDate ?? 0) - (a.notificationDate ?? 0);
    today.sort(sortDesc);
    yesterday.sort(sortDesc);
    thisWeek.sort(sortDesc);
    older.sort(sortDesc);

    const buildRows = (items: CacheItem[]) => {
      const rows: CacheItem[][] = [];
      for (let i = 0; i < items.length; i += numColumns) {
        rows.push(items.slice(i, i + numColumns));
      }
      return rows;
    };

    const sections = [
      { title: t("gallery.today"), data: buildRows(today), key: "today" },
      {
        title: t("gallery.yesterday"),
        data: buildRows(yesterday),
        key: "yesterday",
      },
      {
        title: t("gallery.thisWeek"),
        data: buildRows(thisWeek),
        key: "thisWeek",
      },
      { title: t("gallery.older"), data: buildRows(older), key: "older" },
    ].filter((s) => s.data.length > 0);

    // Flat order for fullscreen index mapping
    const flatOrder: CacheItem[] = [
      ...today,
      ...yesterday,
      ...thisWeek,
      ...older,
    ];

    return { filteredMedia, sections, flatOrder };
  }, [
    cachedItems,
    selectedMediaTypes,
    userSettings.settings.gallery.showFaultyMedias,
    numColumns,
    t,
  ]);

  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleToggleMultiSelection = () => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedItems(new Set());
    } else {
      setSelectionMode(true);
    }
  };

  const renderSelectionBar = () => (
    <View
      style={[
        styles.selectionBar,
        {
          borderBottomColor: Colors[colorScheme].border,
          backgroundColor: Colors[colorScheme].background,
        },
      ]}
    >
      <View style={styles.leftControls}>
        <TouchableOpacity
          style={[
            styles.selectionButton,
            {
              borderColor: Colors[colorScheme].border,
              backgroundColor: Colors[colorScheme].backgroundCard,
            },
          ]}
          onPress={() => {
            setSelectedItems(new Set());
            setSelectionMode(false);
          }}
        >
          <ThemedText
            style={[
              styles.selectionCountText,
              { color: Colors[colorScheme].text },
            ]}
          >
            {t("common.cancel")}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectionCountBadge,
            {
              borderColor: Colors[colorScheme].border,
              backgroundColor: Colors[colorScheme].tint,
            },
          ]}
          onPress={
            selectedItems.size === filteredMedia.length
              ? () => setSelectedItems(new Set())
              : () => setSelectedItems(new Set(filteredMedia.map((m) => m.key)))
          }
        >
          <ThemedText
            style={[
              styles.selectionCountText,
              { color: Colors[colorScheme].background },
            ]}
          >
            {selectedItems.size}
          </ThemedText>
          <ThemedText
            style={[
              styles.selectionCountText,
              {
                color: Colors[colorScheme].background,
                fontSize: 12,
                marginLeft: 4,
                opacity: 0.9,
              },
            ]}
          >
            {selectedItems.size === filteredMedia.length
              ? t("medias.filters.deselectAll")
              : t("medias.filters.selectAll")}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.rightControls}>
        <TouchableOpacity
          style={[
            styles.selectionButton,
            {
              borderColor:
                selectedItems.size === 0
                  ? Colors[colorScheme].borderLight
                  : Colors[colorScheme].border,
              backgroundColor:
                selectedItems.size === 0
                  ? Colors[colorScheme].backgroundSecondary
                  : Colors[colorScheme].backgroundCard,
              opacity: selectedItems.size === 0 ? 0.5 : 1,
            },
          ]}
          onPress={async () => {
            const items = filteredMedia.filter((m) => selectedItems.has(m.key));
            for (const item of items) {
              try {
                await saveMediaToGallery(
                  item.url,
                  item.mediaType,
                  item.originalFileName
                );
              } catch (error) {
                console.error("Failed to save media to gallery:", error);
              }
            }
            setSelectedItems(new Set());
            setSelectionMode(false);
          }}
          disabled={selectedItems.size === 0}
        >
          <Ionicons
            name="download-outline"
            size={20}
            color={
              selectedItems.size === 0
                ? Colors[colorScheme].textMuted
                : Colors[colorScheme].tint
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectionButton,
            {
              borderColor:
                selectedItems.size === 0
                  ? Colors[colorScheme].borderLight
                  : Colors[colorScheme].border,
              backgroundColor:
                selectedItems.size === 0
                  ? Colors[colorScheme].backgroundSecondary
                  : Colors[colorScheme].backgroundCard,
              opacity: selectedItems.size === 0 ? 0.5 : 1,
            },
          ]}
          onPress={async () => {
            const count = selectedItems.size;
            if (count === 0) return;
            Alert.alert(
              t("medias.deleteItem.title"),
              t("medias.deleteItem.message"),
              [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("common.delete"),
                  style: "destructive",
                  onPress: async () => {
                    const items = filteredMedia.filter((m) =>
                      selectedItems.has(m.key)
                    );
                    for (const item of items) {
                      await mediaCache.deleteCachedMedia(
                        item.url,
                        item.mediaType
                      );
                    }
                    setSelectedItems(new Set());
                    setSelectionMode(false);
                  },
                },
              ]
            );
          }}
          disabled={selectedItems.size === 0}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={
              selectedItems.size === 0
                ? Colors[colorScheme].textSecondary
                : Colors[colorScheme].error
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStatsCard = () => {
    if (!cacheStats) return null;

    return (
      <View
        style={[
          styles.statsCard,
          {
            backgroundColor: Colors[colorScheme].backgroundCard,
            shadowColor: Colors[colorScheme].shadow,
          },
        ]}
      >
        <View style={styles.statsHeader}>
          <Ionicons
            name="analytics-outline"
            size={24}
            color={Colors[colorScheme].tint}
          />
          <Text
            style={[styles.statsTitle, { color: Colors[colorScheme].text }]}
          >
            {t("medias.stats.title")}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text
              style={[styles.statValue, { color: Colors[colorScheme].tint }]}
            >
              {cacheStats.totalItems}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("medias.stats.totalItems")}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text
              style={[styles.statValue, { color: Colors[colorScheme].tint }]}
            >
              {formatFileSize(cacheStats.totalSize)}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: Colors[colorScheme].textSecondary },
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
                  { borderTopColor: Colors[colorScheme].borderLight },
                ]}
              >
                <Text
                  style={[
                    styles.typeBreakdownTitle,
                    { color: Colors[colorScheme].text },
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
                            { color: Colors[colorScheme].textSecondary },
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
                { borderTopColor: Colors[colorScheme].borderLight },
              ]}
            >
              <Text
                style={[
                  styles.typeBreakdownTitle,
                  { color: Colors[colorScheme].text },
                ]}
              >
                {t("gallerySettings.title")}
              </Text>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  userSettings.updateGallerySettings({
                    autoPlay: !userSettings.settings.gallery.autoPlay,
                  });
                }}
              >
                <View style={styles.settingContent}>
                  <Text
                    style={[
                      styles.settingLabel,
                      { color: Colors[colorScheme].text },
                    ]}
                  >
                    {t("gallerySettings.autoPlay")}
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: Colors[colorScheme].textSecondary },
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
                        ? Colors[colorScheme].tint
                        : Colors[colorScheme].backgroundSecondary,
                      borderColor: Colors[colorScheme].border,
                    },
                  ]}
                >
                  {userSettings.settings.gallery.autoPlay && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => {
                  userSettings.updateGallerySettings({
                    showFaultyMedias:
                      !userSettings.settings.gallery.showFaultyMedias,
                  });
                }}
              >
                <View style={styles.settingContent}>
                  <Text
                    style={[
                      styles.settingLabel,
                      { color: Colors[colorScheme].text },
                    ]}
                  >
                    {t("gallerySettings.showFaultyMedias")}
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: Colors[colorScheme].textSecondary },
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
                        ? Colors[colorScheme].tint
                        : Colors[colorScheme].backgroundSecondary,
                      borderColor: Colors[colorScheme].border,
                    },
                  ]}
                >
                  {userSettings.settings.gallery.showFaultyMedias && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
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
                  { borderColor: Colors[colorScheme].tint },
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
                      <Ionicons
                        name="checkmark"
                        size={checkSize}
                        color="#ffffff"
                      />
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
      <ThemedText style={styles.dateSectionTitle}>{section.title}</ThemedText>
    </View>
  );

  const renderEmptyState = () => {
    return (
      <ThemedView style={styles.emptyState}>
        <Ionicons
          name="cloud-download-outline"
          size={64}
          color={Colors[colorScheme].textMuted}
        />
        <ThemedText style={styles.emptyTitle}>
          {t("medias.empty.title")}
        </ThemedText>
        <ThemedText style={styles.emptySubtitle}>
          {t("medias.empty.message")}
        </ThemedText>
      </ThemedView>
    );
  };

  return (
    <ThemedView 
      style={styles.container}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      {selectionMode && renderSelectionBar()}
      {!selectionMode && (
        <GalleryFilters
          selectedMediaTypes={selectedMediaTypes}
          onMediaTypesChange={setSelectedMediaTypes}
          onToggleMultiSelection={handleToggleMultiSelection}
          selectedCount={selectedItems.size}
          isMultiSelectionMode={selectionMode}
          cacheStats={cacheStats}
        />
      )}

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
            colors={[Colors[colorScheme ?? "light"].tint]}
            tintColor={Colors[colorScheme ?? "light"].tint}
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
    </ThemedView>
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
  selectionBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "space-between",
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
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionCountText: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectionButton: {
    borderWidth: 1,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: "600",
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
