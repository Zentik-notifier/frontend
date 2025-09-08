import { Colors } from "@/constants/Colors";
import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useNotificationUtils } from "@/hooks/useNotificationUtils";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { mediaCache } from "@/services/media-cache";
import { saveMediaToGallery } from "@/services/media-gallery";
import { formatFileSize } from "@/utils";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CachedMedia } from "./CachedMedia";
import FullScreenMediaViewer from "./FullScreenMediaViewer";
import { MediaTypeIcon } from "./MediaTypeIcon";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

const availableMediaTypes = Object.values(MediaType);

interface CachedMediaItem {
  id: string;
  url: string;
  localPath: string;
  mediaType: MediaType;
  size: number;
  timestamp: number;
  originalFileName?: string;
  downloadedAt: number;
  notificationDate?: number;
}

export default function GallerySection() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { getMediaTypeFriendlyName } = useNotificationUtils();
  const { userSettings } = useAppContext();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState<number>(-1);
  const { cacheStats, cachedItems, updateStats } = useGetCacheStats();
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<Set<MediaType>>(
    new Set([MediaType.Image, MediaType.Video, MediaType.Gif, MediaType.Audio])
  );
  const [showStats, setShowStats] = useState(false);
  const [showMediaTypeSelector, setShowMediaTypeSelector] = useState(false);

  // Numero fisso di colonne per la griglia
  const numColumns = 3;

  const itemWidth = useMemo(() => {
    const screenWidth = Dimensions.get("window").width;
    const horizontalPadding = 32; // 16px padding on each side
    const availableWidth = screenWidth - horizontalPadding;
    return availableWidth / numColumns;
  }, []);

  const { filteredMedia, sections, flatOrder } = useMemo(() => {
    const allWithIds = cachedItems.map((item, index) => ({
      ...item,
      id: `${item.mediaType}_${item.url}_${index}`,
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

    const today: CachedMediaItem[] = [];
    const yesterday: CachedMediaItem[] = [];
    const thisWeek: CachedMediaItem[] = [];
    const older: CachedMediaItem[] = [];

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

    const sortDesc = (a: CachedMediaItem, b: CachedMediaItem) =>
      (b.notificationDate ?? 0) - (a.notificationDate ?? 0);
    today.sort(sortDesc);
    yesterday.sort(sortDesc);
    thisWeek.sort(sortDesc);
    older.sort(sortDesc);

    const buildRows = (items: CachedMediaItem[]) => {
      const rows: CachedMediaItem[][] = [];
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
    const flatOrder: CachedMediaItem[] = [
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

  // Filter functions
  const toggleMediaType = (mediaType: MediaType) => {
    const newSelectedTypes = new Set(selectedMediaTypes);
    if (newSelectedTypes.has(mediaType)) {
      newSelectedTypes.delete(mediaType);
    } else {
      newSelectedTypes.add(mediaType);
    }
    setSelectedMediaTypes(newSelectedTypes);
  };

  const selectAllMediaTypes = () => {
    setSelectedMediaTypes(new Set(availableMediaTypes));
  };

  const deselectAllMediaTypes = () => {
    setSelectedMediaTypes(new Set());
  };

  const getSelectedTypesText = () => {
    const allCount = availableMediaTypes.length;
    const selectedCount = selectedMediaTypes.size;

    if (selectedCount === 0) return t("medias.filters.noType");
    if (selectedCount === allCount) return t("medias.filters.allTypes");

    const selectedTypes = availableMediaTypes.filter((type) =>
      selectedMediaTypes.has(type)
    );
    if (selectedCount <= 2) {
      return selectedTypes
        .map((type) => getMediaTypeFriendlyName(type))
        .join(", ");
    }

    return t("medias.filters.selectedTypesCount", {
      selected: selectedCount,
      total: allCount,
    });
  };

  const renderFiltersBar = () => {
    return (
      <View
        style={[
          styles.filtersBar,
          {
            backgroundColor: Colors[colorScheme].background,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.multiSelectorButton,
            {
              borderColor: Colors[colorScheme].tint,
              backgroundColor: Colors[colorScheme].background,
            },
          ]}
          onPress={() => setShowMediaTypeSelector(true)}
        >
          <Ionicons
            name="filter-outline"
            size={16}
            color={Colors[colorScheme].tint}
          />
          <Text
            style={[
              styles.multiSelectorText,
              { color: Colors[colorScheme].tint },
            ]}
          >
            {getSelectedTypesText()}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={Colors[colorScheme].tint}
          />
        </TouchableOpacity>

        {/* Multi-Selection Button */}
        <TouchableOpacity
          style={[
            styles.multiSelectionToggle,
            {
              borderColor: Colors[colorScheme].border,
              backgroundColor: selectionMode
                ? Colors[colorScheme].tint
                : Colors[colorScheme].background,
            },
          ]}
          onPress={() => {
            if (selectionMode) {
              setSelectionMode(false);
              setSelectedItems(new Set());
            } else {
              setSelectionMode(true);
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={selectionMode ? "close" : "checkmark-circle-outline"}
            size={16}
            color={selectionMode ? "white" : Colors[colorScheme].textSecondary}
          />
          {selectionMode && selectedItems.size > 0 && (
            <View
              style={[
                styles.gallerySelectionBadge,
                { backgroundColor: "white" },
              ]}
            >
              <Text
                style={[
                  styles.gallerySelectionBadgeText,
                  { color: Colors[colorScheme].tint },
                ]}
              >
                {selectedItems.size}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Delete Selected Button (only visible in selection mode with selections) */}
        {selectionMode && selectedItems.size > 0 && (
          <TouchableOpacity
            style={[
              styles.deleteSelectedButton,
              {
                backgroundColor: "#ff4444",
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
                        selectedItems.has(m.id)
                      );
                      for (const it of items) {
                        await mediaCache.deleteCachedMedia(
                          it.url,
                          it.mediaType
                        );
                      }
                      setSelectedItems(new Set());
                      setSelectionMode(false);
                    },
                  },
                ]
              );
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash" size={16} color="white" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.statsToggle,
            {
              borderColor: Colors[colorScheme].border,
              backgroundColor: Colors[colorScheme].background,
            },
          ]}
          onPress={() => setShowStats(!showStats)}
        >
          <Ionicons
            name={showStats ? "eye-outline" : "eye-off-outline"}
            size={20}
            color={Colors[colorScheme].tint}
          />
        </TouchableOpacity>
      </View>
    );
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
              : () => setSelectedItems(new Set(filteredMedia.map((m) => m.id)))
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
            const items = filteredMedia.filter((m) => selectedItems.has(m.id));
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
                      selectedItems.has(m.id)
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

  const renderMediaTypeSelector = () => {
    return (
      <Modal
        visible={showMediaTypeSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMediaTypeSelector(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMediaTypeSelector(false)}
        >
          <View
            style={[
              styles.selectorModal,
              { backgroundColor: Colors[colorScheme].background },
            ]}
          >
            <View
              style={[
                styles.selectorHeader,
                { borderBottomColor: Colors[colorScheme].borderLight },
              ]}
            >
              <Text
                style={[
                  styles.selectorTitle,
                  { color: Colors[colorScheme].text },
                ]}
              >
                {t("medias.filters.selectMediaTypes")}
              </Text>
              <TouchableOpacity onPress={() => setShowMediaTypeSelector(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={Colors[colorScheme].textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.selectorActions,
                { borderBottomColor: Colors[colorScheme].borderLight },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.selectorActionButton,
                  { borderColor: Colors[colorScheme].tint },
                ]}
                onPress={selectAllMediaTypes}
              >
                <Text
                  style={[
                    styles.selectorActionText,
                    { color: Colors[colorScheme].tint },
                  ]}
                >
                  {t("medias.filters.selectAll")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.selectorActionButton,
                  { borderColor: Colors[colorScheme].tint },
                ]}
                onPress={deselectAllMediaTypes}
              >
                <Text
                  style={[
                    styles.selectorActionText,
                    { color: Colors[colorScheme].tint },
                  ]}
                >
                  {t("medias.filters.deselectAll")}
                </Text>
              </TouchableOpacity>
            </View>

            {availableMediaTypes.map((mediaType) => (
              <TouchableOpacity
                key={mediaType}
                style={[
                  styles.selectorItem,
                  { borderBottomColor: Colors[colorScheme].borderLight },
                ]}
                onPress={() => toggleMediaType(mediaType)}
              >
                <View style={styles.selectorItemLeft}>
                  <MediaTypeIcon
                    mediaType={mediaType}
                    size={24}
                    showLabel
                    textStyle={{ fontSize: 16 }}
                  />
                </View>

                <View
                  style={[
                    styles.checkbox,
                    { borderColor: Colors[colorScheme].border },
                    selectedMediaTypes.has(mediaType) && [
                      styles.checkboxSelected,
                      {
                        backgroundColor: Colors[colorScheme].tint,
                        borderColor: Colors[colorScheme].tint,
                      },
                    ],
                  ]}
                >
                  {selectedMediaTypes.has(mediaType) && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    );
  };

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

  const renderMediaRow = ({ item }: { item: CachedMediaItem[] }) => {
    return (
      <View style={styles.gridRow}>
        {item.map((mediaItem) => {
          const isSelected = selectedItems.has(mediaItem.id);
          const checkSize = itemWidth * 0.5;
          return (
            <Pressable
              key={mediaItem.id}
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
                  useThumbnail
                  ignoreClicks={selectionMode}
                  style={styles.gridMediaThumbnail}
                  originalFileName={mediaItem.originalFileName}
                  videoProps={{
                    isMuted: true,
                    autoPlay: userSettings.settings.gallery.autoPlay,
                  }}
                  imageProps={{ cachePolicy: "none" }}
                  audioProps={{ showControls: true }}
                  noAutoDownload
                  showMediaIndicator
                  smallButtons
                  onPress={() => {
                    if (selectionMode) {
                      toggleItemSelection(mediaItem.id);
                    } else {
                      const index = flatOrder.findIndex(
                        (m) => m.id === mediaItem.id
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
    <>
      {selectionMode && renderSelectionBar()}
      {!selectionMode && renderFiltersBar()}

      {renderMediaTypeSelector()}

      <SectionList
        sections={sections}
        keyExtractor={(row, index) => `${row[0]?.id || "row"}-${index}`}
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
        ListHeaderComponent={showStats ? renderStatsCard : null}
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
    </>
  );
}

const styles = StyleSheet.create({
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
  // Filters styles
  filtersBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  statsToggle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
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
  gallerySelectionBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  gallerySelectionBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  deleteSelectedButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  // Multi-selector styles
  multiSelectorButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    flex: 1,
    marginRight: 8,
    height: 44,
  },
  multiSelectorText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  selectorModal: {
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  selectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  selectorActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  selectorActionButton: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorActionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectorItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  selectorItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  selectorItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    // Stile gestito dinamicamente
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
