import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/services/app-context";
import { useGallery } from "@/contexts/GalleryContext";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Icon,
  Modal,
  Portal,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import SimpleSlider from "./SimpleSlider";
import { MediaTypeIcon } from "./MediaTypeIcon";

const availableMediaTypes = Object.values(MediaType);

export default function GalleryFiltersModal() {
  const theme = useTheme();
  const { t } = useI18n();
  const { userSettings } = useAppContext();

  // Use gallery context
  const {
    state: { selectedMediaTypes, showFiltersModal },
    handleMediaTypesChange,
    handleHideFiltersModal,
  } = useGallery();

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

  return (
    <Portal>
      <Modal
        visible={showFiltersModal}
        onDismiss={handleHideFiltersModal}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View
            style={[styles.header, { borderBottomColor: theme.colors.outline }]}
          >
            <View style={styles.headerLeft}>
              <Icon source="filter" size={24} color={theme.colors.primary} />
              <Text
                style={[styles.headerTitle, { color: theme.colors.onSurface }]}
              >
                {t("filters.title")}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableRipple
                style={[
                  styles.closeButton,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
                onPress={handleHideFiltersModal}
              >
                <Icon source="close" size={20} color={theme.colors.onSurface} />
              </TouchableRipple>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Media Types Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {t("medias.filters.selectMediaTypes")}
                </Text>
                <TouchableRipple
                  style={[
                    styles.selectAllButton,
                    {
                      borderColor: theme.colors.outline,
                      backgroundColor: isAllSelected
                        ? theme.colors.primary
                        : theme.colors.surface,
                    },
                  ]}
                  onPress={
                    isAllSelected ? deselectAllMediaTypes : selectAllMediaTypes
                  }
                >
                  <View>
                    <Icon
                      source={isAllSelected ? "close" : "check-all"}
                      size={18}
                      color={
                        isAllSelected
                          ? theme.colors.onPrimary
                          : theme.colors.onSurfaceVariant
                      }
                    />
                  </View>
                </TouchableRipple>
              </View>

              {/* Media Type Options */}
              {availableMediaTypes.map((mediaType) => (
                <TouchableRipple
                  key={mediaType}
                  style={[
                    styles.optionItem,
                    { borderBottomColor: theme.colors.outline },
                  ]}
                  onPress={() => toggleMediaType(mediaType)}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionLeft}>
                      <MediaTypeIcon
                        mediaType={mediaType}
                        size={18}
                        showLabel
                        textStyle={{ fontSize: 14 }}
                      />
                    </View>

                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: theme.colors.outline },
                        selectedMediaTypes.has(mediaType) && [
                          styles.checkboxSelected,
                          {
                            backgroundColor: theme.colors.primary,
                            borderColor: theme.colors.primary,
                          },
                        ],
                      ]}
                    >
                      {selectedMediaTypes.has(mediaType) && (
                        <Icon
                          source="check"
                          size={14}
                          color={theme.colors.onPrimary}
                        />
                      )}
                    </View>
                  </View>
                </TouchableRipple>
              ))}
            </View>

            {/* Gallery Settings Section */}
            {/* Auto Play Setting */}
            <TouchableRipple
              style={styles.settingItem}
              onPress={() => {
                userSettings.updateGallerySettings({
                  autoPlay: !userSettings.settings.gallery.autoPlay,
                });
              }}
            >
              <View style={styles.settingItemContent}>
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
                      size={14}
                      color={theme.colors.onPrimary}
                    />
                  )}
                </View>
              </View>
            </TouchableRipple>

            {/* Grid Size Slider */}
            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text
                  style={[
                    styles.settingLabel,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {t("gallerySettings.gridSize")}
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("gallerySettings.gridSizeDescription")}
                </Text>
              </View>
            </View>
            <SimpleSlider
              value={userSettings.settings.gallery.gridSize}
              min={2}
              max={5}
              step={1}
              onChange={(v) => userSettings.setGalleryGridSize?.(v)}
            />

            {/* Show Faulty Medias Setting */}
            <TouchableRipple
              style={styles.settingItem}
              onPress={() => {
                userSettings.updateGallerySettings({
                  showFaultyMedias:
                    !userSettings.settings.gallery.showFaultyMedias,
                });
              }}
            >
              <View style={styles.settingItemContent}>
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
                      size={14}
                      color={theme.colors.onPrimary}
                    />
                  )}
                </View>
              </View>
            </TouchableRipple>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    marginVertical: 16,
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
  optionItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  settingItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  settingItemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    opacity: 0.7,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    // Stile gestito dinamicamente
  },
});
