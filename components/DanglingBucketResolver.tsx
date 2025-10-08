import { useAppContext } from "@/contexts/AppContext";
import {
  useCreateBucketMutation,
} from "@/generated/gql-operations-generated";
import { useBucketsStats } from "@/hooks/notifications";
import { useI18n } from "@/hooks/useI18n";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
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
import { upsertNotificationsBatch, getAllNotificationsFromCache } from "@/services/notifications-repository";
import { useNavigationUtils } from "@/utils/navigation";
import { NotificationFragment } from "@/generated/gql-operations-generated";
import { useQueryClient } from "@tanstack/react-query";
import { notificationKeys } from "@/hooks/notifications/useNotificationQueries";

interface DanglingBucketResolverProps {
  onBack?: () => void;
}

export default function DanglingBucketResolver({
  onBack,
}: DanglingBucketResolverProps) {
  const { navigateToBucketDetail } = useNavigationUtils();
  const theme = useTheme();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Local state for notifications from DB
  const [notifications, setNotifications] = useState<NotificationFragment[]>([]);

  const { id } = useLocalSearchParams<{
    id?: string;
  }>();

  const [isMigrating, setIsMigrating] = useState(false);
  const [selectedBucketId, setSelectedBucketId] = useState<string>();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  const [createBucketMutation, { loading: creatingBucket }] =
    useCreateBucketMutation({
      refetchQueries: ["GetBuckets"],
    });
  const { data: bucketsWithStats = [], isLoading: loading, refreshBucketsStats } = useBucketsStats();
  const buckets = bucketsWithStats;

  // Load notifications from local DB
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const allNotifications = await getAllNotificationsFromCache();
        setNotifications(allNotifications);
      } catch (error) {
        console.error('[DanglingBucketResolver] Error loading notifications:', error);
      }
    };

    loadNotifications();
  }, []);

  // Identifica i dangling buckets (bucket collegati a notifiche ma non esistenti nel remote)
  const danglingBuckets = useMemo(() => {
    const remoteBucketIds = new Set(buckets.map((bucket) => bucket.id));
    const danglingBucketMap = new Map<string, { bucket: any; count: number }>();

    notifications.forEach((notification) => {
      const bucket = notification.message?.bucket;
      if (bucket && !remoteBucketIds.has(bucket.id)) {
        const existing = danglingBucketMap.get(bucket.id);
        if (existing) {
          existing.count++;
        } else {
          danglingBucketMap.set(bucket.id, { bucket, count: 1 });
        }
      }
    });

    return Array.from(danglingBucketMap.values());
  }, [notifications, buckets]);

  const currentDanglingBucket = danglingBuckets.find(
    (item) => item.bucket.id === id
  );

  if (!currentDanglingBucket) {
    return (
      <View style={styles.container}>
        <Text>{t("buckets.bucketNotFound")}</Text>
      </View>
    );
  }

  const migrateNotificationsToBucket = async (
    fromBucketId: string,
    toBucketId: string,
    targetBucketName: string
  ) => {
    // Trova tutte le notifiche collegate al dangling bucket
    const danglingNotifications = notifications.filter(
      (notification: NotificationFragment) => notification.message?.bucket?.id === fromBucketId
    );

    if (danglingNotifications.length === 0) {
      throw new Error("No notifications found for the dangling bucket");
    }

    // Trova il bucket target dai buckets stats
    const targetBucket = buckets.find((b) => b.id === toBucketId);

    if (!targetBucket) {
      throw new Error("Target bucket not found");
    }

    console.log(
      `🔄 Migrating ${danglingNotifications.length} notifications from dangling bucket ${fromBucketId} to bucket ${toBucketId} (${targetBucketName})`
    );

    // Crea le notifiche aggiornate con il nuovo bucket
    const updatedNotifications = danglingNotifications.map((notification: NotificationFragment) => {
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
    });

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
        currentDanglingBucket.bucket.id,
        selectedBucketId,
        targetBucket.name
      );

      setDialogMessage(
        t("buckets.migrationSuccessMessage", {
          count: currentDanglingBucket.count,
          bucketName: targetBucket.name,
        })
      );
      setShowSuccessDialog(true);
      navigateToBucketDetail(selectedBucketId);
    } catch (error) {
      console.error("Migration error:", error);
      setDialogMessage(
        t("buckets.migrationErrorMessage", {
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
      setShowErrorDialog(true);
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
          currentDanglingBucket.bucket.name ||
          `Bucket ${currentDanglingBucket.bucket.id.slice(0, 8)}`,
        icon: currentDanglingBucket.bucket.icon,
        description: currentDanglingBucket.bucket.description,
        color: currentDanglingBucket.bucket.color || "#0a7ea4",
        isProtected: false,
        isPublic: false,
      };

      console.log(
        "🔄 Creating new bucket from dangling bucket:",
        newBucketInput
      );

      const result = await createBucketMutation({
        variables: { input: newBucketInput },
      });

      if (result.data?.createBucket) {
        const newBucket = result.data.createBucket;
        console.log("✅ Created new bucket:", newBucket.id);

        // Migra le notifiche al nuovo bucket
        await migrateNotificationsToBucket(
          currentDanglingBucket.bucket.id,
          newBucket.id,
          newBucket.name
        );

        setDialogMessage(
          t("buckets.bucketCreationSuccessMessage", {
            count: currentDanglingBucket.count,
            bucketName: newBucket.name,
          })
        );
        setShowSuccessDialog(true);
        navigateToBucketDetail(newBucket.id);
      }
    } catch (error) {
      console.error("Create bucket error:", error);
      setDialogMessage(
        t("buckets.bucketCreationErrorMessage", {
          error: error instanceof Error ? error.message : "Unknown error",
        })
      );
      setShowErrorDialog(true);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRefresh = async () => {
    await refreshBucketsStats();
    
    // Reload notifications from DB
    try {
      const allNotifications = await getAllNotificationsFromCache();
      setNotifications(allNotifications);
    } catch (error) {
      console.error('[DanglingBucketResolver] Error reloading notifications:', error);
    }
  };

  return (
    <PaperScrollView onRefresh={handleRefresh} loading={loading}>
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
                {currentDanglingBucket.bucket.name}
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.bucketCount,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {currentDanglingBucket.count}{" "}
                {currentDanglingBucket.count === 1
                  ? t("buckets.notification")
                  : t("buckets.notifications")}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Text
        variant="bodyMedium"
        style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
      >
        {isMigrating
          ? creatingBucket
            ? t("buckets.creatingBucketDescription")
            : t("buckets.migratingDescription")
          : t("buckets.danglingBucketActionDescription", {
              count: currentDanglingBucket.count,
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
              buckets={buckets as any}
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

      {/* Success Dialog */}
      <Portal>
        <Dialog
          visible={showSuccessDialog}
          onDismiss={() => setShowSuccessDialog(false)}
        >
          <Dialog.Title>{t("common.success")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSuccessDialog(false)}>
              {t("common.ok")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Error Dialog */}
      <Portal>
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
