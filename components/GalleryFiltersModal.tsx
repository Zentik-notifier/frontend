import { Colors } from "@/constants/Colors";
import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
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

  const selectAllMediaTypes = () => {
    onMediaTypesChange(new Set(availableMediaTypes));
  };

  const deselectAllMediaTypes = () => {
    onMediaTypesChange(new Set());
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
              Filtri Galleria
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
                Tipi di Media
              </ThemedText>
              
              {/* Select/Deselect All Actions */}
              <View
                style={[
                  styles.sectionActions,
                  { borderBottomColor: Colors[colorScheme].borderLight },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { borderColor: Colors[colorScheme].tint },
                  ]}
                  onPress={selectAllMediaTypes}
                >
                  <ThemedText
                    style={[
                      styles.actionButtonText,
                      { color: Colors[colorScheme].tint },
                    ]}
                  >
                    {t("medias.filters.selectAll")}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { borderColor: Colors[colorScheme].tint },
                  ]}
                  onPress={deselectAllMediaTypes}
                >
                  <ThemedText
                    style={[
                      styles.actionButtonText,
                      { color: Colors[colorScheme].tint },
                    ]}
                  >
                    {t("medias.filters.deselectAll")}
                  </ThemedText>
                </TouchableOpacity>
              </View>

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

            {/* Gallery Settings Section */}
            <View style={styles.section}>
              <ThemedText
                style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}
              >
                {t("gallerySettings.title")}
              </ThemedText>

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
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>

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
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>
            </View>
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
  sectionActions: {
    flexDirection: "row",
    paddingBottom: 16,
    marginBottom: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  actionButton: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
});
