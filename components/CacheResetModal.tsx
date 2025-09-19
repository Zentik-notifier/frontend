import { apolloClient, resetApolloCache } from "@/config/apollo-client";
import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import {
  useGetCacheStats
} from "@/hooks/useMediaCache";
import { useColorScheme } from "@/hooks/useTheme";
import { clearAllAuthData } from "@/services/auth-storage";
import { localNotifications } from "@/services/local-notifications";
import { mediaCache } from "@/services/media-cache";
import { userSettings } from "@/services/user-settings";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "./ThemedText";

interface CacheResetModalProps {
  visible: boolean;
  onClose: () => void;
  totalCacheSize: string;
}

interface CacheEntity {
  id: string;
  title: string;
  description: string;
  icon: string;
  size?: string;
  count?: number;
  selected: boolean;
}

export function CacheResetModal({
  visible,
  onClose,
  totalCacheSize,
}: CacheResetModalProps) {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { cacheStats } = useGetCacheStats();
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(
    new Set()
  );
  const [isResetting, setIsResetting] = useState(false);

  // Get GraphQL cache info
  const getGraphQLCacheInfo = () => {
    try {
      // We'll use a more direct approach to count cached notifications
      const cache = apolloClient?.cache;
      if (cache) {
        // Extract all cached notifications from the cache
        const cacheData = cache.extract();
        let notificationCount = 0;

        // Count notifications in cache
        Object.values(cacheData).forEach((entity: any) => {
          if (entity && entity.__typename === "Notification") {
            notificationCount++;
          }
        });

        return notificationCount;
      }
      return 0;
    } catch {
      return 0;
    }
  };

  const handleCompleteReset = async () => {
    Alert.alert(
      t("appSettings.cacheReset.completeResetTitle"),
      t("appSettings.cacheReset.completeResetMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("appSettings.cacheReset.completeReset"),
          style: "destructive",
          onPress: async () => {
            try {
              setIsResetting(true);

              // Complete reset of all caches and auth storage
              await Promise.all([
                // Stop realtime/populators before purging GQL cache
                Promise.resolve().then(() => localNotifications.cleanup()),
                resetApolloCache(),
                mediaCache.clearCacheComplete(),
                userSettings.resetSettings(),
                clearAllAuthData(),
              ]);

              Alert.alert(
                t("common.success"),
                t("appSettings.cacheReset.completeResetSuccess"),
                [{ text: t("common.ok"), onPress: onClose }]
              );
            } catch (error) {
              console.error("Failed to complete reset:", error);
              Alert.alert(
                t("common.error"),
                t("appSettings.cacheReset.resetError")
              );
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  const cacheEntities: CacheEntity[] = [
    {
      id: "gql",
      title: t("appSettings.cacheReset.graphql"),
      description: t("appSettings.cacheReset.graphqlDescription"),
      icon: "code-slash",
      count: getGraphQLCacheInfo(),
      selected: false,
    },
    {
      id: "media",
      title: t("appSettings.cacheReset.media"),
      description: t("appSettings.cacheReset.mediaDescription"),
      icon: "images",
      size: cacheStats
        ? `${(cacheStats.totalSize / (1024 * 1024)).toFixed(1)} MB`
        : undefined,
      count: cacheStats ? cacheStats.totalItems : undefined,
      selected: false,
    },
    {
      id: "settings",
      title: t("appSettings.cacheReset.settings"),
      description: t("appSettings.cacheReset.settingsDescription"),
      icon: "settings",
      selected: false,
    },
  ];

  const toggleEntity = (entityId: string) => {
    const newSelected = new Set(selectedEntities);
    if (newSelected.has(entityId)) {
      newSelected.delete(entityId);
    } else {
      newSelected.add(entityId);
    }
    setSelectedEntities(newSelected);
  };

  const selectAll = () => {
    setSelectedEntities(new Set(cacheEntities.map((e) => e.id)));
  };

  const deselectAll = () => {
    setSelectedEntities(new Set());
  };

  const handleReset = async () => {
    if (selectedEntities.size === 0) {
      Alert.alert(
        t("appSettings.cacheReset.noSelection"),
        t("appSettings.cacheReset.noSelectionMessage"),
        [{ text: t("common.ok") }]
      );
      return;
    }

    const selectedNames = cacheEntities
      .filter((e) => selectedEntities.has(e.id))
      .map((e) => e.title)
      .join(", ");

    Alert.alert(
      t("appSettings.cacheReset.confirmTitle"),
      t("appSettings.cacheReset.confirmMessage", { entities: selectedNames }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("appSettings.cacheReset.reset"),
          style: "destructive",
          onPress: async () => {
            try {
              setIsResetting(true);

              // Reset selected entities
              if (selectedEntities.has("gql")) {
                // Stop realtime/populators before purging GQL cache
                // localNotifications.cleanup();
                await resetApolloCache();
              }

              if (selectedEntities.has("media")) {
                await mediaCache.clearCache();
              }

              if (selectedEntities.has("settings")) {
                await Promise.all([
                  userSettings.resetSettings(),
                  clearAllAuthData(),
                ]);
              }

              Alert.alert(
                t("common.success"),
                t("appSettings.cacheReset.resetSuccess"),
                [{ text: t("common.ok"), onPress: onClose }]
              );
            } catch (error) {
              console.error("Failed to reset cache:", error);
              Alert.alert(
                t("common.error"),
                t("appSettings.cacheReset.resetError")
              );
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  const renderEntityItem = (entity: CacheEntity) => (
    <TouchableOpacity
      key={entity.id}
      style={[
        styles.entityItem,
        { backgroundColor: Colors[colorScheme].backgroundCard },
        selectedEntities.has(entity.id) && {
          borderColor: Colors[colorScheme].tint,
        },
      ]}
      onPress={() => toggleEntity(entity.id)}
      activeOpacity={0.7}
    >
      <View style={styles.entityInfo}>
        <Ionicons
          name={entity.icon as any}
          size={24}
          color={
            selectedEntities.has(entity.id)
              ? Colors[colorScheme].tint
              : Colors[colorScheme].textSecondary
          }
          style={styles.entityIcon}
        />
        <View style={styles.entityTextContainer}>
          <ThemedText
            style={[styles.entityTitle, { color: Colors[colorScheme].text }]}
          >
            {entity.title}
          </ThemedText>
          <ThemedText
            style={[
              styles.entityDescription,
              { color: Colors[colorScheme].textSecondary },
            ]}
          >
            {entity.description}
          </ThemedText>
          {(entity.size || entity.count !== undefined) && (
            <ThemedText
              style={[styles.entityStats, { color: Colors[colorScheme].tint }]}
            >
              {entity.size && `${entity.size}`}
              {entity.size && entity.count !== undefined && " • "}
              {entity.count !== undefined && `${entity.count} items`}
            </ThemedText>
          )}
        </View>
      </View>
      <View style={styles.entitySelection}>
        <View
          style={[
            styles.checkbox,
            { borderColor: Colors[colorScheme].border },
            selectedEntities.has(entity.id) && {
              backgroundColor: Colors[colorScheme].tint,
              borderColor: Colors[colorScheme].tint,
            },
          ]}
        >
          {selectedEntities.has(entity.id) && (
            <Ionicons name="checkmark" size={16} color="#fff" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: Colors[colorScheme].background },
          ]}
        >
          <View style={styles.modalHeader}>
            <ThemedText
              style={[styles.modalTitle, { color: Colors[colorScheme].text }]}
            >
              {t("appSettings.cacheReset.title")}
            </ThemedText>
            <ThemedText
              style={[
                styles.modalSubtitle,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("appSettings.cacheReset.subtitle", { size: totalCacheSize })}
            </ThemedText>
            <View style={styles.modalStats}>
              <ThemedText
                style={[
                  styles.modalStat,
                  { color: Colors[colorScheme].textSecondary },
                ]}
              >
                {cacheStats &&
                  t("appSettings.cacheReset.mediaInfo", {
                    size: `${(cacheStats.totalSize / (1024 * 1024)).toFixed(
                      1
                    )} MB`,
                    count: cacheStats.totalItems,
                  })}
              </ThemedText>
              <ThemedText
                style={[
                  styles.modalStat,
                  { color: Colors[colorScheme].textSecondary },
                ]}
              >
                {t("appSettings.cacheReset.graphqlInfo", {
                  count: getGraphQLCacheInfo(),
                })}
              </ThemedText>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={Colors[colorScheme].text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.entityList}
            showsVerticalScrollIndicator={false}
          >
            {cacheEntities.map(renderEntityItem)}
          </ScrollView>

          <View style={styles.modalActions}>
            <View style={styles.selectionActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: Colors[colorScheme].tint },
                ]}
                onPress={selectAll}
              >
                <ThemedText style={styles.actionButtonText}>
                  {t("appSettings.cacheReset.selectAll")}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: Colors[colorScheme].textSecondary },
                ]}
                onPress={deselectAll}
              >
                <ThemedText style={styles.actionButtonText}>
                  {t("appSettings.cacheReset.deselectAll")}
                </ThemedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.resetButton,
                { backgroundColor: Colors[colorScheme].error },
                selectedEntities.size === 0 && { opacity: 0.5 },
              ]}
              onPress={handleReset}
              disabled={isResetting || selectedEntities.size === 0}
            >
              <ThemedText style={styles.resetButtonText}>
                {isResetting
                  ? t("appSettings.cacheReset.resetting")
                  : t("appSettings.cacheReset.reset")}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.completeResetButton,
                { backgroundColor: Colors[colorScheme].warning },
                isResetting && { opacity: 0.5 },
              ]}
              onPress={handleCompleteReset}
              disabled={isResetting}
              activeOpacity={0.8}
            >
              <Ionicons name="nuclear" size={20} color="#fff" />
              <ThemedText style={styles.completeResetButtonText}>
                {t("appSettings.cacheReset.completeReset")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
    paddingRight: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  modalStats: {
    marginTop: 12,
    marginBottom: 16,
  },
  modalStat: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
  closeButton: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 8,
  },
  entityList: {
    marginBottom: 20,
  },
  entityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  entityInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  entityIcon: {
    marginRight: 16,
  },
  entityTextContainer: {
    flex: 1,
  },
  entityTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  entityDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  entityStats: {
    fontSize: 12,
    fontWeight: "500",
  },
  entitySelection: {
    marginLeft: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  modalActions: {
    gap: 16,
  },
  selectionActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  resetButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  completeResetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  completeResetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
