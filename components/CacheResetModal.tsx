import { apolloClient, resetApolloCache } from "@/config/apollo-client";
import { useI18n } from "@/hooks/useI18n";
import {
  useGetCacheStats
} from "@/hooks/useMediaCache";
import { clearAllNotificationsFromCache } from "@/hooks/notifications/useNotificationQueries";
import { settingsService } from "@/services/settings-service";
import { useSettings } from "@/hooks/useSettings";
import { localNotifications } from "@/services/local-notifications";
import { mediaCache } from "@/services/media-cache-service";
import { getAllNotificationsFromCache } from "@/services/notifications-repository";
import { deleteAllBuckets } from "@/db/repositories/buckets-repository";
import { clearAllLogs } from "@/services/logger";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Checkbox,
  Dialog,
  Icon,
  IconButton,
  Portal,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

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
  const theme = useTheme();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { resetSettings } = useSettings();
  const { cacheStats } = useGetCacheStats();
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(
    new Set()
  );
  const [isResetting, setIsResetting] = useState(false);
  const [showCompleteResetDialog, setShowCompleteResetDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dbNotificationsCount, setDbNotificationsCount] = useState(0);

  // Load notifications count from database
  useEffect(() => {
    const loadNotificationsCount = async () => {
      if (visible) {
        try {
          const notifications = await getAllNotificationsFromCache();
          setDbNotificationsCount(notifications.length);
        } catch (error) {
          console.error("Error loading notifications count from DB:", error);
        }
      }
    };

    loadNotificationsCount();
  }, [visible]);

  const handleCompleteReset = async () => {
    setShowCompleteResetDialog(true);
  };

  const confirmCompleteReset = async () => {
    try {
      setIsResetting(true);
      setShowCompleteResetDialog(false);

      // Complete reset of all caches and auth storage
      await Promise.all([
        // Stop realtime/populators before purging GQL cache
        Promise.resolve().then(() => localNotifications.cleanup()),
        resetApolloCache(),
        clearAllNotificationsFromCache(),
        deleteAllBuckets(),
        mediaCache.clearCacheComplete(),
        clearAllLogs(),
        resetSettings(),
        settingsService.clearAllAuthData(),
      ]);

      setDialogMessage(t("appSettings.cacheReset.completeResetSuccess"));
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Failed to complete reset:", error);
      setDialogMessage(t("appSettings.cacheReset.resetError"));
      setShowErrorDialog(true);
    } finally {
      setIsResetting(false);
    }
  };

  const cacheEntities: CacheEntity[] = [
    {
      id: "notifications",
      title: t("appSettings.cacheReset.notifications"),
      description: t("appSettings.cacheReset.notificationsDescription"),
      icon: "bell",
      count: dbNotificationsCount,
      selected: false,
    },
    {
      id: "media",
      title: t("appSettings.cacheReset.media"),
      description: t("appSettings.cacheReset.mediaDescription"),
      icon: "image-multiple",
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
      icon: "cog",
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
      setDialogMessage(t("appSettings.cacheReset.noSelectionMessage"));
      setShowErrorDialog(true);
      return;
    }

    setShowResetDialog(true);
  };

  const confirmReset = async () => {
    try {
      setIsResetting(true);
      setShowResetDialog(false);

      // Reset selected entities
      if (selectedEntities.has("notifications")) {
        await Promise.all([
          clearAllNotificationsFromCache(queryClient),
          deleteAllBuckets(),
        ]);
      }

      if (selectedEntities.has("media")) {
        await mediaCache.clearCache();
      }

      if (selectedEntities.has("settings")) {
        await Promise.all([
          resetSettings(),
          settingsService.clearAllAuthData(),
        ]);
      }

      setDialogMessage(t("appSettings.cacheReset.resetSuccess"));
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Failed to reset cache:", error);
      setDialogMessage(t("appSettings.cacheReset.resetError"));
      setShowErrorDialog(true);
    } finally {
      setIsResetting(false);
    }
  };

  const renderEntityItem = (entity: CacheEntity) => (
    <Card
      key={entity.id}
      style={[
        styles.entityItem,
        selectedEntities.has(entity.id) && {
          borderColor: theme.colors.primary,
          borderWidth: 2,
        },
      ]}
      elevation={0}
    >
      <TouchableRipple onPress={() => toggleEntity(entity.id)}>
        <Card.Content>
          <View style={styles.entityInfo}>
            <Icon
              source={entity.icon as any}
              size={24}
              color={
                selectedEntities.has(entity.id)
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant
              }
            />
            <View style={styles.entityTextContainer}>
              <Text variant="titleMedium" style={styles.entityTitle}>
                {entity.title}
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.entityDescription, { color: theme.colors.onSurfaceVariant }]}
              >
                {entity.description}
              </Text>
              {(entity.size || entity.count !== undefined) && (
                <Text
                  variant="bodySmall"
                  style={[styles.entityStats, { color: theme.colors.primary }]}
                >
                  {entity.size && `${entity.size}`}
                  {entity.size && entity.count !== undefined && " • "}
                  {entity.count !== undefined && `${entity.count} items`}
                </Text>
              )}
            </View>
            <Checkbox
              status={selectedEntities.has(entity.id) ? "checked" : "unchecked"}
              onPress={() => toggleEntity(entity.id)}
            />
          </View>
        </Card.Content>
      </TouchableRipple>
    </Card>
  );

  const selectedNames = cacheEntities
    .filter((e) => selectedEntities.has(e.id))
    .map((e) => e.title)
    .join(", ");

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onClose}
        style={styles.modalDialog}
      >
        <Dialog.Title>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                {t("appSettings.cacheReset.title")}
              </Text>
              <Text variant="bodyMedium" style={[styles.modalSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {t("appSettings.cacheReset.subtitle", { size: totalCacheSize })}
              </Text>
              <View style={styles.modalStats}>
                <Text variant="bodySmall" style={[styles.modalStat, { color: theme.colors.onSurfaceVariant }]}>
                  {cacheStats &&
                    t("appSettings.cacheReset.mediaInfo", {
                      size: `${(cacheStats.totalSize / (1024 * 1024)).toFixed(1)} MB`,
                      count: cacheStats.totalItems,
                    })}
                </Text>
                <Text variant="bodySmall" style={[styles.modalStat, { color: theme.colors.onSurfaceVariant }]}>
                  {t("appSettings.cacheReset.notificationsInfo", {
                    count: dbNotificationsCount,
                  })}
                </Text>
              </View>
            </View>
            <IconButton
              icon="close"
              size={20}
              onPress={onClose}
              style={styles.closeButton}
            />
          </View>
        </Dialog.Title>

        <Dialog.Content style={{ paddingTop: 16 }}>
          <ScrollView
            style={styles.entityList}
            showsVerticalScrollIndicator={false}
          >
            {cacheEntities.map(renderEntityItem)}
          </ScrollView>

          <View style={styles.modalActions}>
            <View style={styles.selectionActions}>
              <Button
                mode="outlined"
                onPress={selectAll}
                style={styles.actionButton}
              >
                {t("appSettings.cacheReset.selectAll")}
              </Button>
              <Button
                mode="outlined"
                onPress={deselectAll}
                style={styles.actionButton}
              >
                {t("appSettings.cacheReset.deselectAll")}
              </Button>
            </View>

            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              onPress={handleReset}
              disabled={isResetting || selectedEntities.size === 0}
              style={styles.resetButton}
            >
              {isResetting
                ? t("appSettings.cacheReset.resetting")
                : t("appSettings.cacheReset.reset")}
            </Button>

            <Button
              mode="contained"
              buttonColor={theme.colors.errorContainer}
              textColor={theme.colors.onErrorContainer}
              onPress={handleCompleteReset}
              disabled={isResetting}
              style={styles.completeResetButton}
              icon="delete-sweep"
            >
              {t("appSettings.cacheReset.completeReset")}
            </Button>
          </View>
        </Dialog.Content>
      </Dialog>

      {/* Complete Reset Confirmation Dialog */}
      <Dialog
        visible={showCompleteResetDialog}
        onDismiss={() => setShowCompleteResetDialog(false)}
      >
        <Dialog.Title>{t("appSettings.cacheReset.completeResetTitle")}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{t("appSettings.cacheReset.completeResetMessage")}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowCompleteResetDialog(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            mode="contained"
            buttonColor={theme.colors.error}
            onPress={confirmCompleteReset}
          >
            {t("appSettings.cacheReset.completeReset")}
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog
        visible={showResetDialog}
        onDismiss={() => setShowResetDialog(false)}
      >
        <Dialog.Title>{t("appSettings.cacheReset.confirmTitle")}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">
            {t("appSettings.cacheReset.confirmMessage", { entities: selectedNames })}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowResetDialog(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            mode="contained"
            buttonColor={theme.colors.error}
            onPress={confirmReset}
          >
            {t("appSettings.cacheReset.reset")}
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        visible={showSuccessDialog}
        onDismiss={() => {
          setShowSuccessDialog(false);
          onClose();
        }}
      >
        <Dialog.Title>{t("common.success")}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{dialogMessage}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onPress={() => {
              setShowSuccessDialog(false);
              onClose();
            }}
          >
            {t("common.ok")}
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Error Dialog */}
      <Dialog
        visible={showErrorDialog}
        onDismiss={() => setShowErrorDialog(false)}
      >
        <Dialog.Title>{t("common.error")}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{dialogMessage}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowErrorDialog(false)}>
            {t("common.ok")}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalDialog: {
    // maxHeight: "80%",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingEnd: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    margin: 0,
  },
  modalTitle: {
    marginBottom: 4,
  },
  modalSubtitle: {
    lineHeight: 20,
    marginBottom: 8,
  },
  modalStats: {
    marginTop: 8,
  },
  modalStat: {
    textAlign: "left",
    marginBottom: 2,
  },
  entityList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  entityItem: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  entityInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  entityTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  entityTitle: {
    marginBottom: 2,
  },
  entityDescription: {
    lineHeight: 20,
    marginBottom: 4,
  },
  entityStats: {
    fontWeight: "500",
  },
  modalActions: {
    gap: 12,
  },
  selectionActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  resetButton: {
    marginTop: 8,
  },
  completeResetButton: {
    marginTop: 4,
  },
});
