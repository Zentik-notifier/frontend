import { Colors } from "@/constants/Colors";
import { MediaType } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { formatFileSize } from "@/utils";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import GalleryFiltersModal from "./GalleryFiltersModal";
import { MediaTypeIcon } from "./MediaTypeIcon";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

const availableMediaTypes = Object.values(MediaType);

interface CacheStats {
  totalItems: number;
  totalSize: number;
  itemsByType: Record<string, number>;
}

interface GalleryFiltersProps {
  selectedMediaTypes: Set<MediaType>;
  onMediaTypesChange: (types: Set<MediaType>) => void;
  onToggleMultiSelection: () => void;
  selectedCount: number;
  isMultiSelectionMode: boolean;
  cacheStats: CacheStats | null;
}

export default function GalleryFilters({
  selectedMediaTypes,
  onMediaTypesChange,
  onToggleMultiSelection,
  selectedCount,
  isMultiSelectionMode,
  cacheStats,
}: GalleryFiltersProps) {
  const colorScheme = useColorScheme();
  const { userSettings } = useAppContext();
  const { t } = useI18n();
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showStatsTooltip, setShowStatsTooltip] = useState(false);

  const getActiveFiltersCount = (): number => {
    let count = 0;

    // Conta se non sono selezionati tutti i tipi di media
    if (selectedMediaTypes.size !== availableMediaTypes.length) count++;

    // Conta se showFaultyMedias è attivo (opzione speciale)
    if (userSettings.settings.gallery.showFaultyMedias) count++;

    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

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
              { backgroundColor: Colors[colorScheme].backgroundCard },
            ]}
          >
            <ThemedText style={styles.tooltipTitle}>
              Statistiche per Tipo
            </ThemedText>
            {Object.entries(cacheStats.itemsByType).map(([type, count]) => (
              <View key={type} style={styles.tooltipItem}>
                <MediaTypeIcon
                  mediaType={type as MediaType}
                  size={20}
                  showLabel
                  textStyle={{ fontSize: 14 }}
                />
                <ThemedText style={styles.tooltipCount}>{count}</ThemedText>
              </View>
            ))}
          </View>
        </Pressable>
      </Modal>
    );
  };

  return (
    <>
      <View style={styles.container}>
        {/* Cache Stats */}
        {cacheStats && (
          <View
            style={[
              styles.statsContainer,
              {
                borderColor: Colors[colorScheme].border,
                backgroundColor: Colors[colorScheme].backgroundCard,
              },
            ]}
          >
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons
                  name="folder-outline"
                  size={18}
                  color={Colors[colorScheme].textSecondary}
                />
                <ThemedText style={styles.statsText}>
                  {t("gallery.cachedItems", { count: cacheStats.totalItems })}
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <Ionicons
                  name="hardware-chip-outline"
                  size={18}
                  color={Colors[colorScheme].textSecondary}
                />
                <ThemedText style={styles.statsText}>
                  {formatFileSize(cacheStats.totalSize)}
                </ThemedText>
              </View>
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => setShowStatsTooltip(true)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={Colors[colorScheme].tint}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Right controls */}
        <View style={styles.rightControls}>
          {/* Multi-Selection Toggle */}
          <TouchableOpacity
            style={[
              styles.multiSelectionToggle,
              {
                borderColor: Colors[colorScheme].border,
                backgroundColor: isMultiSelectionMode
                  ? Colors[colorScheme].tint
                  : Colors[colorScheme].background,
              },
            ]}
            onPress={onToggleMultiSelection}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isMultiSelectionMode ? "close" : "checkmark-circle-outline"}
              size={16}
              color={
                isMultiSelectionMode
                  ? "white"
                  : Colors[colorScheme].textSecondary
              }
            />
            {isMultiSelectionMode && selectedCount > 0 && (
              <View
                style={[styles.selectionBadge, { backgroundColor: "white" }]}
              >
                <ThemedText
                  style={[
                    styles.selectionBadgeText,
                    { color: Colors[colorScheme].tint },
                  ]}
                >
                  {selectedCount}
                </ThemedText>
              </View>
            )}
          </TouchableOpacity>

          {/* Filters Button */}
          <TouchableOpacity
            style={[
              styles.filtersButton,
              {
                borderColor: Colors[colorScheme].border,
                backgroundColor:
                  activeFiltersCount > 0
                    ? Colors[colorScheme].selected
                    : Colors[colorScheme].background,
              },
            ]}
            onPress={() => setShowFiltersModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="filter-outline"
              size={16}
              color={
                activeFiltersCount > 0
                  ? Colors[colorScheme].tint
                  : Colors[colorScheme].textSecondary
              }
            />
            {activeFiltersCount > 0 && (
              <ThemedView
                style={[
                  styles.filtersBadge,
                  { backgroundColor: Colors[colorScheme].tint },
                ]}
              >
                <ThemedText style={styles.filtersBadgeText}>
                  {activeFiltersCount}
                </ThemedText>
              </ThemedView>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {renderStatsTooltip()}

      {/* Filters Modal */}
      <GalleryFiltersModal
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        selectedMediaTypes={selectedMediaTypes}
        onMediaTypesChange={onMediaTypesChange}
      />
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
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
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
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionBadgeText: {
    fontSize: 10,
    fontWeight: "600",
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
});
