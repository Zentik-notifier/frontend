import { Colors } from "@/constants/Colors";
import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SimpleSlider from "./SimpleSlider";
import { MediaTypeIcon } from "./MediaTypeIcon";
import { ThemedText } from "./ThemedText";

const availableMediaTypes = Object.values(MediaType);

interface GalleryFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  selectedMediaTypes: Set<MediaType>;
  onMediaTypesChange: (types: Set<MediaType>) => void;
}

export default function GalleryFiltersModal({
  visible,
  onClose,
  selectedMediaTypes,
  onMediaTypesChange,
}: GalleryFiltersModalProps) {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { userSettings } = useAppContext();

  const toggleMediaType = (mediaType: MediaType) => {
    const newSelectedTypes = new Set(selectedMediaTypes);
    if (newSelectedTypes.has(mediaType)) {
      newSelectedTypes.delete(mediaType);
    } else {
      newSelectedTypes.add(mediaType);
    }
    onMediaTypesChange(newSelectedTypes);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[
          styles.modalContainer,
          { backgroundColor: Colors[colorScheme].background },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: Colors[colorScheme].border },
          ]}
        >
          <View style={styles.headerLeft}>
            <Ionicons
              name="filter"
              size={24}
              color={Colors[colorScheme].tint}
            />
            <ThemedText style={styles.headerTitle}>
              {t("filters.title")}
            </ThemedText>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: Colors[colorScheme].backgroundSecondary },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close"
                size={20}
                color={Colors[colorScheme].text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Media Types Section */}
          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}
            >
              {t("medias.filters.selectMediaTypes")}
            </ThemedText>

            {/* Media Type Options */}
            {availableMediaTypes.map((mediaType) => (
              <TouchableOpacity
                key={mediaType}
                style={[
                  styles.optionItem,
                  { borderBottomColor: Colors[colorScheme].borderLight },
                ]}
                onPress={() => toggleMediaType(mediaType)}
              >
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
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Gallery Settings Section */}
          {/* Auto Play Setting */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              userSettings.updateGallerySettings({
                autoPlay: !userSettings.settings.gallery.autoPlay,
              });
            }}
          >
            <View style={styles.settingContent}>
              <ThemedText style={styles.settingLabel}>
                {t("gallerySettings.autoPlay")}
              </ThemedText>
              <ThemedText style={styles.settingDescription}>
                {t("gallerySettings.autoPlayDescription")}
              </ThemedText>
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
                <Ionicons name="checkmark" size={14} color="white" />
              )}
            </View>
          </TouchableOpacity>

          {/* Grid Size Slider */}
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <ThemedText style={styles.settingLabel}>
                {t("gallerySettings.gridSize")}
              </ThemedText>
              <ThemedText style={styles.settingDescription}>
                {t("gallerySettings.gridSizeDescription")}
              </ThemedText>
            </View>
          </View>
          <SimpleSlider
            value={userSettings.settings.gallery.gridSize}
            min={3}
            max={7}
            step={1}
            onChange={(v) => userSettings.setGalleryGridSize?.(v)}
          />

          {/* Show Faulty Medias Setting */}
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
              <ThemedText style={styles.settingLabel}>
                {t("gallerySettings.showFaultyMedias")}
              </ThemedText>
              <ThemedText style={styles.settingDescription}>
                {t("gallerySettings.showFaultyMediasDescription")}
              </ThemedText>
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
                <Ionicons name="checkmark" size={14} color="white" />
              )}
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
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
