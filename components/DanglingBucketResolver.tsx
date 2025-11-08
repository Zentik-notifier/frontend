import { NotificationFragment } from "@/generated/gql-operations-generated";
import {
  useAppState,
  useCreateBucket,
  useDeleteBucketWithNotifications,
} from "@/hooks/notifications";
import { notificationKeys } from "@/hooks/notifications/useNotificationQueries";
import { useI18n } from "@/hooks/useI18n";
import {
  getAllNotificationsFromCache,
  upsertNotificationsBatch,
} from "@/services/notifications-repository";
import { useNavigationUtils } from "@/utils/navigation";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  Divider,
  Icon,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";
import BucketSelector from "./BucketSelector";
import PaperScrollView from "./ui/PaperScrollView";

interface DanglingBucketResolverProps {
  id?: string;
}

export default function DanglingBucketResolver({
  id,
}: DanglingBucketResolverProps) {
  const { navigateToBucketDetail, navigateToHome } = useNavigationUtils();
  const theme = useTheme();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Local state for notifications from DB
  const [notifications, setNotifications] = useState<NotificationFragment[]>(
    []
  );

  const [isMigrating, setIsMigrating] = useState(false);
  const [selectedBucketId, setSelectedBucketId] = useState<string>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { createBucket, isLoading: creatingBucket } = useCreateBucket();
  const { deleteBucket: deleteBucketWithNotifications } =
    useDeleteBucketWithNotifications();
  const { data: appState, isLoading: loading, refreshAll } = useAppState();
  const bucketsWithStats = appState?.buckets || [];
  const buckets = bucketsWithStats;

  // Load notifications from local DB
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const allNotifications = await getAllNotificationsFromCache();
        setNotifications(allNotifications);
      } catch (error) {
        console.error(
          "[DanglingBucketResolver] Error loading notifications:",
          error
        );
      }
    };

    loadNotifications();
  }, []);

  // Identifica i dangling buckets (bucket orfani con isOrphan: true)
  const currentDanglingBucket = useMemo(() => {
    return buckets.find(
      (bucket) => bucket.isOrphan === true && bucket.id === id
    );
  }, [buckets, id]);

  // Se il bucket non esiste più (es. dopo cancellazione) e non stiamo caricando, torna home
  useEffect(() => {
    if (
      !currentDanglingBucket &&
      !loading &&
      !isMigrating &&
      buckets.length > 0
    ) {
      console.log("[DanglingBucketResolver] Bucket not found, navigating home");
      navigateToHome();
    }
  }, [
    currentDanglingBucket,
    loading,
    isMigrating,
    buckets.length,
    navigateToHome,
  ]);

  const migrateNotificationsToBucket = async (
    fromBucketId: string,
    toBucketId: string,
    targetBucketName: string,
    targetBucketData?: any // Optional bucket data to avoid lookup
  ) => {
    // Trova tutte le notifiche collegate al dangling bucket
    const danglingNotifications = notifications.filter(
      (notification: NotificationFragment) =>
        notification.message?.bucket?.id === fromBucketId
    );

    if (danglingNotifications.length === 0) {
      throw new Error("No notifications found for the dangling bucket");
    }

    // Use provided bucket data or find from buckets stats
    let targetBucket = targetBucketData;
    if (!targetBucket) {
      targetBucket = buckets.find((b) => b.id === toBucketId);
    }

    if (!targetBucket) {
      throw new Error("Target bucket not found");
    }

    console.log(
      `🔄 Migrating ${danglingNotifications.length} notifications from dangling bucket ${fromBucketId} to bucket ${toBucketId} (${targetBucketName})`
    );

    // Crea le notifiche aggiornate con il nuovo bucket
    const updatedNotifications = danglingNotifications.map(
      (notification: NotificationFragment) => {
        return {
          ...notification,
          message: {
            ...notification.message,
            bucket: {
              id: targetBucket.id,
              name: targetBucket.name,
              description: targetBucket.description ?? null,
              icon: targetBucket.icon ?? null,
              color: targetBucket.color ?? null,
              createdAt: targetBucket.createdAt,
              updatedAt: targetBucket.updatedAt,
              isProtected: targetBucket.isProtected,
              isPublic: targetBucket.isPublic,
              __typename: "Bucket" as const,
            },
          },
        } as NotificationFragment;
      }
    );

    // 1. Aggiorna il database locale
    try {
      await upsertNotificationsBatch(updatedNotifications);
      console.log(
        `💾 Successfully updated ${updatedNotifications.length} notifications in local database`
      );
    } catch (dbError) {
      console.error("Failed to update local database:", dbError);
      throw dbError;
    }

    // 2. Aggiorna React Query cache per tutte le query di notifiche
    try {
      // Invalida tutte le query infinite di notifiche per forzare il refresh
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.lists(),
      });

      // Invalida anche le stats
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.stats(),
      });

      // Refresh bucketsStats from local DB to update counts
      await refreshAll();

      console.log(
        `✅ Successfully migrated ${danglingNotifications.length} notifications to bucket ${targetBucketName} and updated React Query cache`
      );
    } catch (cacheError) {
      console.error("Failed to update React Query cache:", cacheError);
      // Non blocchiamo l'operazione, i dati sono già nel DB
    }

    // 3. Aggiorna lo stato locale
    setNotifications((prev) =>
      prev.map((n) => {
        const updated = updatedNotifications.find((u) => u.id === n.id);
        return updated || n;
      })
    );
  };

  const handleMigrateToExisting = async () => {
    if (!selectedBucketId || !currentDanglingBucket) return;

    const targetBucket = buckets.find((b) => b.id === selectedBucketId);
    if (!targetBucket) return;

    setIsMigrating(true);
    try {
      await migrateNotificationsToBucket(
        currentDanglingBucket.id,
        selectedBucketId,
        targetBucket.name
      );

      Alert.alert(
        t("buckets.migrationSuccess"),
        t("buckets.migrationSuccessMessage", {
          count: currentDanglingBucket.totalMessages,
          bucketName: targetBucket.name,
        }),
        [
          {
            text: t("common.ok"),
            onPress: () => navigateToBucketDetail(selectedBucketId),
          },
        ]
      );
    } catch (error) {
      console.error("Migration error:", error);
      Alert.alert(
        t("buckets.migrationError"),
        t("buckets.migrationErrorMessage", {
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
    } finally {
      setIsMigrating(false);
    }
  };

  const handleCreateNewBucket = async () => {
    if (!currentDanglingBucket) return;

    setIsMigrating(true);
    try {
      // Crea il nuovo bucket utilizzando i dati del dangling bucket
      const newBucketInput = {
        name:
          currentDanglingBucket.name ||
          `Bucket ${currentDanglingBucket.id.slice(0, 8)}`,
        icon: currentDanglingBucket.icon,
        description: currentDanglingBucket.description,
        color: currentDanglingBucket.color || "#0a7ea4",
        isProtected: false,
        isPublic: false,
      };

      console.log(
        "🔄 Creating new bucket from dangling bucket:",
        newBucketInput
      );

      const newBucket = await createBucket({
        name: newBucketInput.name,
        description: newBucketInput.description || undefined,
        color: newBucketInput.color || undefined,
        icon: newBucketInput.icon || undefined,
        isProtected: newBucketInput.isProtected,
        isPublic: newBucketInput.isPublic,
      });

      if (newBucket?.id) {
        console.log("✅ Created new bucket:", newBucket.id);

        // Migra le notifiche al nuovo bucket
        await migrateNotificationsToBucket(
          currentDanglingBucket.id,
          newBucket.id,
          newBucket.name,
          newBucket // Pass the bucket data directly
        );

        Alert.alert(
          t("buckets.bucketCreationSuccess"),
          t("buckets.bucketCreationSuccessMessage", {
            count: currentDanglingBucket.totalMessages,
            bucketName: newBucket.name,
          }),
          [
            {
              text: t("common.ok"),
              onPress: () => navigateToBucketDetail(newBucket.id),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Create bucket error:", error);
      Alert.alert(
        t("buckets.bucketCreationError"),
        t("buckets.bucketCreationErrorMessage", {
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDeleteBucket = async () => {
    if (!currentDanglingBucket) {
      console.error(
        "❌ Cannot delete bucket: currentDanglingBucket is null/undefined"
      );
      return;
    }

    console.log(
      `🗑️ Starting deletion of dangling bucket ${currentDanglingBucket.id} with ${currentDanglingBucket.totalMessages} notifications using useDeleteBucketWithNotifications`
    );

    setIsMigrating(true);
    setShowDeleteDialog(false); // Close dialog immediately

    try {
      await deleteBucketWithNotifications(currentDanglingBucket.id);

      console.log(
        "✅ Bucket deleted successfully via useDeleteBucketWithNotifications!"
      );

      // Update local notifications list
      const allNotifications = await getAllNotificationsFromCache();
      setNotifications(allNotifications);
      console.log(
        `✅ Reloaded ${allNotifications.length} notifications from cache`
      );

      // Navigate home after cleanup is complete
      navigateToHome();
    } catch (error) {
      console.error("❌ Delete bucket error:", error);
      Alert.alert(
        t("common.error"),
        t("buckets.bucketDeletionErrorMessage", {
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
      setIsMigrating(false);
    }
  };

  const handleRefresh = async () => {
    await refreshAll();

    // Reload notifications from DB
    try {
      const allNotifications = await getAllNotificationsFromCache();
      setNotifications(allNotifications);
    } catch (error) {
      console.error(
        "[DanglingBucketResolver] Error reloading notifications:",
        error
      );
    }
  };

  return (
    <PaperScrollView onRefresh={handleRefresh} loading={loading}>
      {/* Gestione caso bucket null */}
      {!currentDanglingBucket ? (
        <Card style={styles.bucketInfoCard} elevation={0}>
          <Card.Content>
            <View style={styles.errorContainer}>
              <View
                style={[
                  styles.bucketIconContainer,
                  { backgroundColor: theme.colors.errorContainer },
                ]}
              >
                <Icon
                  source="alert-circle"
                  size={24}
                  color={theme.colors.onErrorContainer}
                />
              </View>
              <View style={styles.bucketInfo}>
                <Text variant="titleMedium" style={styles.bucketName}>
                  {t("buckets.bucketNotFound")}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.bucketCount,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("buckets.bucketNotFoundDescription")}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <>
          {/* Dangling Bucket Info */}
          <Card style={styles.bucketInfoCard} elevation={0}>
            <Card.Content>
              <View style={styles.danglingBucketInfo}>
                <View
                  style={[
                    styles.bucketIconContainer,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <Icon
                    source="folder"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
                <View style={styles.bucketInfo}>
                  <Text variant="titleMedium" style={styles.bucketName}>
                    {currentDanglingBucket.name}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.bucketCount,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {currentDanglingBucket.totalMessages}{" "}
                    {currentDanglingBucket.totalMessages === 1
                      ? t("buckets.notification")
                      : t("buckets.notifications")}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Text
            variant="bodyMedium"
            style={[
              styles.description,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {isMigrating
              ? creatingBucket
                ? t("buckets.creatingBucketDescription")
                : t("buckets.migratingDescription")
              : t("buckets.danglingBucketActionDescription", {
                  count: currentDanglingBucket.totalMessages,
                })}
          </Text>

          {!isMigrating && (
            <>
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  {t("buckets.migrateToExisting")}
                </Text>
                <BucketSelector
                  selectedBucketId={selectedBucketId}
                  onBucketChange={(bucketId) => setSelectedBucketId(bucketId)}
                  searchable
                />
              </View>

              <View style={styles.section}>
                <Button
                  mode="outlined"
                  onPress={handleMigrateToExisting}
                  style={styles.migrateButton}
                  disabled={!selectedBucketId}
                >
                  {t("buckets.migrateToExisting")}
                </Button>
              </View>

              <Divider />

              <View style={styles.section}>
                <Button
                  mode="contained"
                  onPress={handleCreateNewBucket}
                  icon="plus"
                  style={styles.createNewButton}
                >
                  {t("buckets.createNewBucket")}
                </Button>
              </View>

              <Divider />

              <View style={styles.section}>
                <Button
                  mode="outlined"
                  onPress={() => setShowDeleteDialog(true)}
                  icon="delete"
                  buttonColor={theme.colors.errorContainer}
                  textColor={theme.colors.onErrorContainer}
                  style={styles.deleteButton}
                >
                  {t("buckets.deleteBucket")}
                </Button>
              </View>
            </>
          )}

          {/* Loading overlay */}
          {isMigrating && (
            <View
              style={[
                styles.loadingOverlay,
                { backgroundColor: theme.colors.background + "E6" },
              ]}
            >
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text variant="bodyLarge" style={styles.loadingText}>
                {creatingBucket
                  ? t("buckets.creatingBucket")
                  : t("buckets.migrating")}
              </Text>
            </View>
          )}

          {/* Delete Confirmation Dialog */}
          <Portal>
            <Dialog
              visible={showDeleteDialog}
              onDismiss={() => setShowDeleteDialog(false)}
            >
              <Dialog.Title>{t("buckets.deleteBucketTitle")}</Dialog.Title>
              <Dialog.Content>
                <Text variant="bodyMedium">
                  {t("buckets.deleteBucketConfirmation", {
                    bucketName: currentDanglingBucket?.name,
                    count: currentDanglingBucket?.totalMessages,
                  })}
                </Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setShowDeleteDialog(false)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  mode="contained"
                  buttonColor={theme.colors.error}
                  textColor={theme.colors.onError}
                  onPress={handleDeleteBucket}
                >
                  {t("buckets.deleteBucket")}
                </Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </>
      )}
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bucketInfoCard: {
    marginBottom: 16,
  },
  danglingBucketInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  bucketIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  bucketInfo: {
    flex: 1,
  },
  bucketName: {
    marginBottom: 4,
  },
  bucketCount: {
    // opacity handled by color
  },
  description: {
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    margin: 12,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  createNewButton: {
    marginTop: 8,
  },
  migrateButton: {
    marginTop: 8,
  },
  deleteButton: {
    marginTop: 8,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    textAlign: "center",
  },
});
