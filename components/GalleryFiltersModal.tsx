import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/services/app-context";
import { useGallery } from "@/contexts/GalleryContext";
import React from "react";
import { StyleSheet, View, ScrollView, Dimensions } from "react-native";
import {
  Button,
  Icon,
  Modal,
  Portal,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { MediaTypeIcon } from "./MediaTypeIcon";

const availableMediaTypes = Object.values(MediaType);

export default function GalleryFiltersModal() {
  const { t } = useI18n();
  const { userSettings } = useAppContext();

  // Use gallery context
  const {
    state: { selectedMediaTypes, showFiltersModal },
    handleMediaTypesChange,
    handleHideFiltersModal,
  } = useGallery();

  // Get gallery settings from user settings
  const gallerySettings = userSettings.getGallerySettings();

  const toggleMediaType = (mediaType: MediaType) => {
    const newSelectedTypes = new Set(selectedMediaTypes);
    if (newSelectedTypes.has(mediaType)) {
      newSelectedTypes.delete(mediaType);
    } else {
      newSelectedTypes.add(mediaType);
    }
    handleMediaTypesChange(newSelectedTypes);
  };

  const selectAllMediaTypes = () => {
    handleMediaTypesChange(new Set(availableMediaTypes));
  };

  const deselectAllMediaTypes = () => {
    handleMediaTypesChange(new Set());
  };

  const isAllSelected = selectedMediaTypes.size === availableMediaTypes.length;
  const isNoneSelected = selectedMediaTypes.size === 0;

  const handleAutoPlayChange = async (autoPlay: boolean) => {
    await userSettings.updateGallerySettings({ autoPlay });
  };

  const handleShowFaultyMediasChange = async (showFaultyMedias: boolean) => {
    await userSettings.updateGallerySettings({ showFaultyMedias });
  };

  const handleGridSizeChange = async (gridSize: number) => {
    await userSettings.updateGallerySettings({ gridSize });
  };

  const clearAllFilters = async () => {
    handleMediaTypesChange(new Set());
    // Reset gallery settings to defaults
    await userSettings.updateGallerySettings({
      autoPlay: false,
      showFaultyMedias: false,
      gridSize: 3,
    });
  };

  const hasActiveFilters =
    selectedMediaTypes.size > 0 ||
    gallerySettings.autoPlay ||
    gallerySettings.showFaultyMedias ||
    gallerySettings.gridSize !== 3;

  const theme = useTheme();

  const deviceHeight = Dimensions.get("window").height;
  const containerStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 16,
    marginVertical: 24,
    maxHeight: deviceHeight * 0.8,
  } as const;

  return (
    <>
      <Portal>
        <Modal
          visible={showFiltersModal}
          onDismiss={handleHideFiltersModal}
          contentContainerStyle={containerStyle}
          dismissableBackButton
        >
          <View
            style={[
              styles.header,
              {
                borderBottomColor: theme.colors.outline,
                backgroundColor: "transparent",
              },
            ]}
          >
            <View style={styles.headerLeft}>
              <Icon source="filter" size={24} color={theme.colors.primary} />
              <Text style={styles.headerTitle}>{t("gallerySettings.title")}</Text>
            </View>
            <View style={styles.headerRight}>
              {hasActiveFilters && (
                <Button
                  mode="contained-tonal"
                  onPress={clearAllFilters}
                  icon="refresh"
                >
                  {t("filters.clearAll")}
                </Button>
              )}
              <TouchableRipple
                style={[styles.closeButton]}
                onPress={handleHideFiltersModal}
                borderless
              >
                <Icon source="close" size={20} color={theme.colors.onSurface} />
              </TouchableRipple>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: 20,
            }}
          >
            {/* Media Types */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Media Types
                </Text>
                <TouchableRipple
                  style={[
                    styles.selectAllButton,
                    {
                      borderColor: theme.colors.outline,
                      backgroundColor: isAllSelected
                        ? theme.colors.primary
                        : theme.colors.elevation?.level1 || theme.colors.surface,
                    },
                  ]}
                  onPress={isAllSelected ? deselectAllMediaTypes : selectAllMediaTypes}
                >
                  <Icon
                    source={isAllSelected ? "close" : "check"}
                    size={20}
                    color={
                      isAllSelected
                        ? theme.colors.onPrimary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                </TouchableRipple>
              </View>
              <View style={styles.mediaTypesGrid}>
                {availableMediaTypes.map((mediaType) => (
                  <TouchableRipple
                    key={mediaType}
                    style={[
                      styles.mediaTypeItem,
                      {
                        borderColor: theme.colors.outline,
                        backgroundColor: selectedMediaTypes.has(mediaType)
                          ? theme.colors.secondaryContainer
                          : theme.colors.elevation?.level1 || theme.colors.surface,
                      },
                    ]}
                    onPress={() => toggleMediaType(mediaType)}
                  >
                    <View style={styles.mediaTypeContent}>
                      <MediaTypeIcon
                        mediaType={mediaType}
                        size={20}
                        showLabel={false}
                      />
                      <Text
                        style={[
                          styles.mediaTypeText,
                          {
                            color: selectedMediaTypes.has(mediaType)
                              ? theme.colors.primary
                              : theme.colors.onSurface,
                          },
                        ]}
                      >
                        {mediaType}
                      </Text>
                    </View>
                  </TouchableRipple>
                ))}
              </View>
            </View>

            {/* Auto Play Setting */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                {t("gallerySettings.autoPlay")}
              </Text>
              <TouchableRipple
                style={[
                  styles.settingItem,
                  {
                    borderColor: theme.colors.outline,
                    backgroundColor: gallerySettings.autoPlay
                      ? theme.colors.secondaryContainer
                      : theme.colors.elevation?.level1 || theme.colors.surface,
                  },
                ]}
                onPress={() => handleAutoPlayChange(!gallerySettings.autoPlay)}
              >
                <View style={styles.settingItemContent}>
                  <Icon
                    source="play"
                    size={20}
                    color={
                      gallerySettings.autoPlay
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                  <View style={styles.settingItemTextContainer}>
                    <Text
                      style={[
                        styles.settingItemText,
                        {
                          color: gallerySettings.autoPlay
                            ? theme.colors.primary
                            : theme.colors.onSurface,
                        },
                      ]}
                    >
                      {t("gallerySettings.autoPlay")}
                    </Text>
                    <Text
                      style={[
                        styles.settingItemDescription,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {t("gallerySettings.autoPlayDescription")}
                    </Text>
                  </View>
                </View>
              </TouchableRipple>
            </View>

            {/* Show Faulty Medias Setting */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                {t("gallerySettings.showFaultyMedias")}
              </Text>
              <TouchableRipple
                style={[
                  styles.settingItem,
                  {
                    borderColor: theme.colors.outline,
                    backgroundColor: gallerySettings.showFaultyMedias
                      ? theme.colors.secondaryContainer
                      : theme.colors.elevation?.level1 || theme.colors.surface,
                  },
                ]}
                onPress={() =>
                  handleShowFaultyMediasChange(!gallerySettings.showFaultyMedias)
                }
              >
                <View style={styles.settingItemContent}>
                  <Icon
                    source="alert-circle"
                    size={20}
                    color={
                      gallerySettings.showFaultyMedias
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                  <View style={styles.settingItemTextContainer}>
                    <Text
                      style={[
                        styles.settingItemText,
                        {
                          color: gallerySettings.showFaultyMedias
                            ? theme.colors.primary
                            : theme.colors.onSurface,
                        },
                      ]}
                    >
                      {t("gallerySettings.showFaultyMedias")}
                    </Text>
                    <Text
                      style={[
                        styles.settingItemDescription,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {t("gallerySettings.showFaultyMediasDescription")}
                    </Text>
                  </View>
                </View>
              </TouchableRipple>
            </View>

            {/* Grid Size */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                {t("gallerySettings.gridSize")}
              </Text>
              <View style={styles.gridSizeButtons}>
                {[2, 3, 4, 5].map((size) => (
                  <TouchableRipple
                    key={size}
                    style={[
                      styles.gridSizeButton,
                      {
                        borderColor: theme.colors.outline,
                        backgroundColor:
                          gallerySettings.gridSize === size
                            ? theme.colors.primary
                            : theme.colors.elevation?.level1 ||
                              theme.colors.surface,
                      },
                    ]}
                    onPress={() => handleGridSizeChange(size)}
                  >
                    <Text
                      style={[
                        styles.gridSizeButtonText,
                        {
                          color:
                            gallerySettings.gridSize === size
                              ? theme.colors.onPrimary
                              : theme.colors.onSurface,
                        },
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableRipple>
                ))}
              </View>
            </View>

            {hasActiveFilters && (
              <View
                style={[
                  styles.footer,
                  { borderTopColor: theme.colors.outline },
                ]}
              >
                <View style={styles.footerContent}>
                  <Icon
                    source="filter"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.footerText,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {getActiveFiltersCount(selectedMediaTypes, gallerySettings) === 1
                      ? t("filters.activeFilters", {
                          count: getActiveFiltersCount(selectedMediaTypes, gallerySettings),
                        })
                      : t("filters.activeFiltersPlural", {
                          count: getActiveFiltersCount(selectedMediaTypes, gallerySettings),
                        })}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </Modal>
      </Portal>
    </>
  );
}

function getActiveFiltersCount(
  selectedMediaTypes: Set<MediaType>,
  gallerySettings: { autoPlay: boolean; showFaultyMedias: boolean; gridSize: number }
): number {
  let count = 0;
  
  // Count selected media types
  count += selectedMediaTypes.size;
  
  // Count non-default gallery settings
  if (gallerySettings.autoPlay) count++;
  if (gallerySettings.showFaultyMedias) count++;
  if (gallerySettings.gridSize !== 3) count++;
  
  return count;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: "500",
    color: "white",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  selectAllButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  mediaTypesGrid: {
    gap: 12,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  mediaTypeItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: "48%",
  },
  mediaTypeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mediaTypeText: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  settingItemContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  settingItemTextContainer: {
    flex: 1,
    gap: 4,
  },
  settingItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingItemDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  gridSizeButtons: {
    gap: 8,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridSizeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: "22%",
    alignItems: "center",
    justifyContent: "center",
  },
  gridSizeButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "500",
  },
});