import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import { useGalleryContext } from "@/contexts/GalleryContext";
import React, { useState, useEffect } from "react";
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
  } = useGalleryContext();

  // Get gallery settings from user settings - memoize to prevent infinite loops
  const savedGallerySettings = React.useMemo(() => 
    userSettings.getGallerySettings(), 
    [userSettings]
  );

  // Local state for filters
  const [localSelectedMediaTypes, setLocalSelectedMediaTypes] = useState<Set<MediaType>>(selectedMediaTypes);
  const [localGallerySettings, setLocalGallerySettings] = useState(savedGallerySettings);

  // Sync local state when modal opens
  useEffect(() => {
    if (showFiltersModal) {
      setLocalSelectedMediaTypes(new Set(selectedMediaTypes));
      setLocalGallerySettings(userSettings.getGallerySettings());
    }
  }, [showFiltersModal]);

  const toggleMediaType = (mediaType: MediaType) => {
    const newSelectedTypes = new Set(localSelectedMediaTypes);
    if (newSelectedTypes.has(mediaType)) {
      newSelectedTypes.delete(mediaType);
    } else {
      newSelectedTypes.add(mediaType);
    }
    setLocalSelectedMediaTypes(newSelectedTypes);
  };

  const selectAllMediaTypes = () => {
    setLocalSelectedMediaTypes(new Set(availableMediaTypes));
  };

  const deselectAllMediaTypes = () => {
    setLocalSelectedMediaTypes(new Set());
  };

  const isAllSelected = localSelectedMediaTypes.size === availableMediaTypes.length;
  const isNoneSelected = localSelectedMediaTypes.size === 0;

  const handleAutoPlayChange = (autoPlay: boolean) => {
    setLocalGallerySettings(prev => ({ ...prev, autoPlay }));
  };

  const handleShowFaultyMediasChange = (showFaultyMedias: boolean) => {
    setLocalGallerySettings(prev => ({ ...prev, showFaultyMedias }));
  };

  const handleGridSizeChange = (gridSize: number) => {
    setLocalGallerySettings(prev => ({ ...prev, gridSize }));
  };

  const clearAllFilters = () => {
    setLocalSelectedMediaTypes(new Set());
    setLocalGallerySettings({
      autoPlay: false,
      showFaultyMedias: false,
      gridSize: 3,
    });
  };

  const applyFilters = async () => {
    handleMediaTypesChange(localSelectedMediaTypes);
    await userSettings.updateGallerySettings(localGallerySettings);
    handleHideFiltersModal();
  };

  const hasChanges = 
    JSON.stringify(Array.from(localSelectedMediaTypes).sort()) !== JSON.stringify(Array.from(selectedMediaTypes).sort()) ||
    JSON.stringify(localGallerySettings) !== JSON.stringify(savedGallerySettings);

  const hasActiveFilters =
    localSelectedMediaTypes.size > 0 ||
    localGallerySettings.autoPlay ||
    localGallerySettings.showFaultyMedias ||
    localGallerySettings.gridSize !== 3;

  const theme = useTheme();

  const deviceHeight = Dimensions.get("window").height;
  const containerStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
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
                        backgroundColor: localSelectedMediaTypes.has(mediaType)
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
                            color: localSelectedMediaTypes.has(mediaType)
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
                    backgroundColor: localGallerySettings.autoPlay
                      ? theme.colors.secondaryContainer
                      : theme.colors.elevation?.level1 || theme.colors.surface,
                  },
                ]}
                onPress={() => handleAutoPlayChange(!localGallerySettings.autoPlay)}
              >
                <View style={styles.settingItemContent}>
                  <Icon
                    source="play"
                    size={20}
                    color={
                      localGallerySettings.autoPlay
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                  <View style={styles.settingItemTextContainer}>
                    <Text
                      style={[
                        styles.settingItemText,
                        {
                          color: localGallerySettings.autoPlay
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
                    backgroundColor: localGallerySettings.showFaultyMedias
                      ? theme.colors.secondaryContainer
                      : theme.colors.elevation?.level1 || theme.colors.surface,
                  },
                ]}
                onPress={() =>
                  handleShowFaultyMediasChange(!localGallerySettings.showFaultyMedias)
                }
              >
                <View style={styles.settingItemContent}>
                  <Icon
                    source="alert-circle"
                    size={20}
                    color={
                      localGallerySettings.showFaultyMedias
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                  <View style={styles.settingItemTextContainer}>
                    <Text
                      style={[
                        styles.settingItemText,
                        {
                          color: localGallerySettings.showFaultyMedias
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
                          localGallerySettings.gridSize === size
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
                            localGallerySettings.gridSize === size
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
                    {getActiveFiltersCount(localSelectedMediaTypes, localGallerySettings) === 1
                      ? t("filters.activeFilters", {
                          count: getActiveFiltersCount(localSelectedMediaTypes, localGallerySettings),
                        })
                      : t("filters.activeFiltersPlural", {
                          count: getActiveFiltersCount(localSelectedMediaTypes, localGallerySettings),
                        })}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View
            style={[
              styles.applyButtonContainer,
              { borderTopColor: theme.colors.outline },
            ]}
          >
            {hasActiveFilters && (
              <Button
                mode="outlined"
                onPress={clearAllFilters}
                icon="refresh"
                style={styles.clearButton}
              >
                {t("filters.clearAll")}
              </Button>
            )}
            <Button
              mode="contained"
              onPress={applyFilters}
              disabled={!hasChanges}
              icon="check"
              style={styles.applyButton}
            >
              {t("common.apply")}
            </Button>
          </View>
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
  applyButtonContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 12,
  },
  clearButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
});
