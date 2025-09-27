import {
  useGetBucketsQuery,
  BucketFragmentDoc,
  useCreateBucketMutation,
} from "@/generated/gql-operations-generated";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import { useApolloClient } from "@apollo/client";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import SwipeableBucketItem from "./SwipeableBucketItem";
import SettingsScrollView from "@/components/SettingsScrollView";
import BucketSelector from "./BucketSelector";
import { useNavigationUtils } from "@/utils/navigation";
import {
  Button,
  Card,
  Dialog,
  FAB,
  Icon,
  IconButton,
  Portal,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

export default function BucketsSettings() {
  const { danglingBucketId } = useLocalSearchParams<{
    danglingBucketId?: string;
  }>();
  const theme = useTheme();
  const { t } = useI18n();
  const {
    setMainLoading,
    notifications,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const apolloClient = useApolloClient();
  const { navigateToCreateBucket, navigateToBucketsSettings } =
    useNavigationUtils();

  const [showDanglingBuckets, setShowDanglingBuckets] = useState(false);
  const [showDanglingBucketModal, setShowDanglingBucketModal] = useState(false);
  const [selectedDanglingBucket, setSelectedDanglingBucket] = useState<{
    bucket: any;
    count: number;
  } | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  const { data, loading, error, refetch } = useGetBucketsQuery();
  const [createBucketMutation, { loading: creatingBucket }] =
    useCreateBucketMutation({
      refetchQueries: ["GetBuckets"],
    });
  useEffect(() => setMainLoading(loading), [loading]);

  const buckets = data?.buckets || [];
  const sortedBuckets = useEntitySorting(buckets, "desc");

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

  // Gestisci l'apertura automatica del modal per bucket orfani specifici
  useEffect(() => {
    if (danglingBucketId && danglingBuckets.length > 0) {
      const targetDanglingBucket = danglingBuckets.find(
        (item) => item.bucket.id === danglingBucketId
      );

      if (targetDanglingBucket) {
        console.log(
          "🔄 Auto-opening modal for dangling bucket:",
          danglingBucketId
        );
        setSelectedDanglingBucket(targetDanglingBucket);
        setShowDanglingBucketModal(true);
        setShowDanglingBuckets(true); // Mostra anche la sezione dangling buckets
      }
    }
  }, [danglingBucketId, danglingBuckets]);

  // Handle GraphQL error
  if (error) {
    console.error("Error loading buckets:", error);
  }

  const migrateNotificationsToBucket = async (
    fromBucketId: string,
    toBucketId: string,
    targetBucketName: string
  ) => {
    const cache = apolloClient.cache;

    // Trova tutte le notifiche collegate al dangling bucket
    const danglingNotifications = notifications.filter(
      (notification) => notification.message?.bucket?.id === fromBucketId
    );

    if (danglingNotifications.length === 0) {
      throw new Error("No notifications found for the dangling bucket");
    }

    // Trova il bucket target nella cache
    const targetBucket = cache.readFragment({
      id: `Bucket:${toBucketId}`,
      fragment: BucketFragmentDoc,
    });

    if (!targetBucket) {
      throw new Error("Target bucket not found in cache");
    }

    console.log(
      `🔄 Migrating ${danglingNotifications.length} notifications from dangling bucket ${fromBucketId} to bucket ${toBucketId} (${targetBucketName})`
    );

    // Aggiorna ogni Message direttamente nella cache
    danglingNotifications.forEach((notification) => {
      try {
        const messageId = `Message:${notification.message.id}`;

        // Aggiorna il Message con il nuovo bucket
        cache.modify({
          id: messageId,
          fields: {
            bucket: () => ({
              ...targetBucket,
              __typename: "Bucket",
            }),
          },
        });

        console.log(
          `✅ Updated message ${notification.message.id} to point to bucket ${toBucketId}`
        );
      } catch (error) {
        console.error(
          `❌ Failed to update message ${notification.message.id}:`,
          error
        );
        throw error;
      }
    });

    // Aggiorna anche la query ROOT_QUERY.notifications per consistenza
    try {
      cache.modify({
        fields: {
          notifications: (existingNotifications, { readField }) => {
            if (existingNotifications) {
              return existingNotifications.map((notification: any) => {
                const message = readField("message", notification);
                if (!message) return notification;
                const bucket = readField("bucket", message as any);
                if (!bucket) return notification;
                const bucketId = readField("id", bucket as any);
                if (bucketId === fromBucketId) {
                  // Sostituisci il bucket della notifica
                  const existingMessage = readField(
                    "message",
                    notification
                  ) as any;
                  return {
                    ...notification,
                    message: existingMessage
                      ? {
                          ...existingMessage,
                          bucket: {
                            ...targetBucket,
                            __typename: "Bucket",
                          },
                        }
                      : {
                          bucket: {
                            ...targetBucket,
                            __typename: "Bucket",
                          },
                        },
                  };
                }
                return notification;
              });
            }
            return existingNotifications;
          },
        },
      });
    } catch (error) {
      console.warn("Failed to update ROOT_QUERY.notifications:", error);
    }

    console.log(
      `✅ Successfully migrated ${danglingNotifications.length} notifications to bucket ${targetBucketName}`
    );
  };

  const handleDanglingBucketPress = (item: { bucket: any; count: number }) => {
    setSelectedDanglingBucket(item);
    setShowDanglingBucketModal(true);
  };

  const handleMigrateToExisting = (bucketId: string | null) => {
    if (!bucketId || !selectedDanglingBucket) return;

    const targetBucket = buckets.find((b) => b.id === bucketId);
    if (!targetBucket) return;

    setIsMigrating(true);
    migrateNotificationsToBucket(
      selectedDanglingBucket.bucket.id,
      bucketId,
      targetBucket.name
    )
      .then(() => {
        setDialogMessage(
          t("buckets.migrationSuccessMessage", {
            count: selectedDanglingBucket.count,
            bucketName: targetBucket.name,
          })
        );
        setShowSuccessDialog(true);
        setShowDanglingBucketModal(false);
        setSelectedDanglingBucket(null);

        // Refresh notifications and buckets
        apolloClient.refetchQueries({
          include: ["GetNotifications", "GetBuckets"],
        });
      })
      .catch((error) => {
        console.error("Migration error:", error);
        setDialogMessage(
          t("buckets.migrationErrorMessage", {
            error: error instanceof Error ? error.message : "Unknown error",
          })
        );
        setShowErrorDialog(true);
      })
      .finally(() => {
        setIsMigrating(false);
      });
  };

  const handleCreateNewBucket = async () => {
    if (!selectedDanglingBucket) return;

    setIsMigrating(true);
    try {
      // Crea il nuovo bucket utilizzando i dati del dangling bucket
      const newBucketInput = {
        name:
          selectedDanglingBucket.bucket.name ||
          `Bucket ${selectedDanglingBucket.bucket.id.slice(0, 8)}`,
        icon: selectedDanglingBucket.bucket.icon,
        description: selectedDanglingBucket.bucket.description,
        color: selectedDanglingBucket.bucket.color || "#0a7ea4",
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
          selectedDanglingBucket.bucket.id,
          newBucket.id,
          newBucket.name
        );

        setDialogMessage(
          t("buckets.bucketCreationSuccessMessage", {
            count: selectedDanglingBucket.count,
            bucketName: newBucket.name,
          })
        );
        setShowSuccessDialog(true);
        setShowDanglingBucketModal(false);
        setSelectedDanglingBucket(null);
        // Pulisce il parametro URL se presente
        if (danglingBucketId) {
          navigateToBucketsSettings();
        }

        // Refresh notifications and buckets
        apolloClient.refetchQueries({
          include: ["GetNotifications", "GetBuckets"],
        });
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

  return (
    <View style={styles.container}>
      <SettingsScrollView
        onRefresh={refetch}
        headerActions={
          <>
            {danglingBuckets.length > 0 && (
              <IconButton
                icon="alert"
                size={20}
                iconColor={
                  showDanglingBuckets
                    ? theme.colors.onPrimary
                    : theme.colors.primary
                }
                containerColor={
                  showDanglingBuckets
                    ? theme.colors.primary
                    : theme.colors.surface
                }
                onPress={() => setShowDanglingBuckets(!showDanglingBuckets)}
                style={styles.danglingButton}
              />
            )}
          </>
        }
      >
        {/* Sezione Dangling Buckets */}
        {showDanglingBuckets && (
          <Card style={styles.danglingSection} elevation={0}>
            <Card.Content>
              <Text
                variant="titleMedium"
                style={[styles.danglingTitle, { color: theme.colors.primary }]}
              >
                {t("buckets.danglingBuckets")}
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.danglingDescription,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {t("buckets.danglingBucketsDescription")}
              </Text>

              {danglingBuckets.length === 0 ? (
                <View style={styles.emptyDanglingState}>
                  <Icon
                    source="check-circle"
                    size={48}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.emptyDanglingText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("buckets.noDanglingBuckets")}
                  </Text>
                </View>
              ) : (
                <View style={styles.danglingBucketsContainer}>
                  {danglingBuckets.map((item) => (
                    <Card
                      key={item.bucket.id}
                      style={styles.danglingBucketItem}
                      elevation={0}
                    >
                      <TouchableRipple onPress={() => handleDanglingBucketPress(item)}>
                        <Card.Content>
                          <View style={styles.danglingBucketInfo}>
                            <Icon
                              source="alert"
                              size={16}
                              color={theme.colors.error}
                            />
                            <View style={styles.danglingBucketDetails}>
                              <Text
                                variant="titleSmall"
                                style={styles.danglingBucketName}
                              >
                                {item.bucket.name ||
                                  `Bucket ${item.bucket.id.slice(0, 8)}`}
                              </Text>
                              <Text
                                variant="bodySmall"
                                style={[
                                  styles.danglingBucketCount,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                {t("buckets.danglingBucketItem", {
                                  count: item.count,
                                })}
                              </Text>
                            </View>
                            <Icon
                              source="chevron-right"
                              size={14}
                              color={theme.colors.onSurfaceVariant}
                            />
                          </View>
                        </Card.Content>
                      </TouchableRipple>
                    </Card>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {buckets.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              source="folder"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="headlineSmall" style={styles.emptyText}>
              {t("buckets.noBucketsYet")}
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {t("buckets.createFirstBucket")}
            </Text>
          </View>
        ) : (
          <View style={styles.bucketsContainer}>
            {sortedBuckets.map((item) => (
              <SwipeableBucketItem
                bucketDeleted={() => refetch()}
                onSharingRevoked={() => refetch()}
                key={item.id}
                bucket={item}
              />
            ))}
          </View>
        )}

        {/* Modal per gestire i dangling buckets */}
        <Portal>
          <Dialog
            visible={showDanglingBucketModal}
            onDismiss={() => {
              if (!isMigrating) {
                setShowDanglingBucketModal(false);
                if (danglingBucketId) {
                  navigateToBucketsSettings();
                }
              }
            }}
            style={styles.modalDialog}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.outline }]}>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                {isMigrating
                  ? creatingBucket
                    ? t("buckets.creatingBucket")
                    : t("buckets.migrating")
                  : t("buckets.danglingBucketAction")}
              </Text>
              <IconButton
                icon="close"
                size={20}
                onPress={() => {
                  if (!isMigrating) {
                    setShowDanglingBucketModal(false);
                    // Pulisce il parametro URL se presente
                    if (danglingBucketId) {
                      navigateToBucketsSettings();
                    }
                  }
                }}
                disabled={isMigrating}
              />
            </View>

            <Dialog.Content style={{ paddingTop: 16 }}>
              {selectedDanglingBucket && (
                <>
                  <View
                    style={[
                      styles.modalContent,
                      { opacity: isMigrating ? 0.6 : 1 },
                    ]}
                  >
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
                              {selectedDanglingBucket.bucket.name}
                            </Text>
                            <Text
                              variant="bodyMedium"
                              style={[
                                styles.bucketCount,
                                { color: theme.colors.onSurfaceVariant },
                              ]}
                            >
                              {selectedDanglingBucket.count}{" "}
                              {selectedDanglingBucket.count === 1
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
                        styles.modalDescription,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {isMigrating
                        ? creatingBucket
                          ? t("buckets.creatingBucketDescription")
                          : t("buckets.migratingDescription")
                        : t("buckets.danglingBucketActionDescription", {
                            count: selectedDanglingBucket.count,
                          })}
                    </Text>

                    {!isMigrating && (
                      <>
                        <View style={styles.modalSection}>
                          <Text
                            variant="titleMedium"
                            style={styles.modalSectionTitle}
                          >
                            {t("buckets.migrateToExisting")}
                          </Text>
                          <BucketSelector
                            selectedBucketId={null}
                            onBucketChange={handleMigrateToExisting}
                            buckets={buckets}
                            placeholder={t("bucketSelector.selectBucket")}
                            searchable={true}
                          />
                        </View>

                        <View style={styles.modalSection}>
                          {isMigrating ? (
                            <ActivityIndicator
                              size="small"
                              color={theme.colors.primary}
                            />
                          ) : (
                            <Button
                              mode="contained"
                              onPress={handleCreateNewBucket}
                              icon="plus"
                              style={styles.createNewButton}
                            >
                              {t("buckets.createNewBucket")}
                            </Button>
                          )}
                        </View>
                      </>
                    )}
                  </View>

                  {/* Loading overlay */}
                  {isMigrating && (
                    <View
                      style={[
                        styles.loadingOverlay,
                        { backgroundColor: theme.colors.background + "E6" },
                      ]}
                    >
                      <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                      />
                      <Text
                        variant="bodyLarge"
                        style={styles.loadingText}
                      >
                        {t("buckets.migrating")}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </Dialog.Content>
          </Dialog>
        </Portal>

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
      </SettingsScrollView>

      {/* FAB per creare nuovo bucket */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigateToCreateBucket(false)}
        disabled={isOfflineAuth || isBackendUnreachable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: "center",
  },
  bucketsContainer: {
    flex: 1,
  },
  danglingButton: {
    marginRight: 8,
  },
  danglingSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 193, 7, 0.3)",
  },
  danglingTitle: {
    marginBottom: 4,
  },
  danglingDescription: {
    marginBottom: 16,
  },
  emptyDanglingState: {
    alignItems: "center",
    paddingVertical: 16,
  },
  emptyDanglingText: {
    marginTop: 8,
    textAlign: "center",
  },
  danglingBucketsContainer: {
    gap: 8,
  },
  danglingBucketItem: {
    marginBottom: 8,
  },
  danglingBucketInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  danglingBucketDetails: {
    marginLeft: 8,
    flex: 1,
  },
  danglingBucketName: {
    marginBottom: 1,
  },
  danglingBucketCount: {
    // fontSize handled by variant
  },
  modalDialog: {
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    marginBottom: 4,
  },
  modalContent: {
    flex: 1,
  },
  modalDescription: {
    marginBottom: 24,
    lineHeight: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    marginBottom: 12,
  },
  bucketInfoCard: {
    marginBottom: 16,
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
  createNewButton: {
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
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
  },
});
