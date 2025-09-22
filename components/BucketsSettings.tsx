import { Colors } from "@/constants/Colors";
import {
  useGetBucketsQuery,
  BucketFragmentDoc,
  useCreateBucketMutation,
} from "@/generated/gql-operations-generated";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { useApolloClient } from "@apollo/client";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import SwipeableBucketItem from "./SwipeableBucketItem";
import BucketSelector from "./BucketSelector";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { useNavigationUtils } from "@/utils/navigation";

interface BucketsSettingsProps {
  refreshing?: boolean;
}

export default function BucketsSettings({
  refreshing: externalRefreshing,
}: BucketsSettingsProps) {
  const { danglingBucketId } = useLocalSearchParams<{
    danglingBucketId?: string;
  }>();
  const colorScheme = useColorScheme();
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

  useEffect(() => {
    if (externalRefreshing) {
      refetch();
    }
  }, [externalRefreshing, refetch]);

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

    Alert.alert(
      t("buckets.migrateToExisting"),
      t("buckets.danglingBucketActionDescription", {
        count: selectedDanglingBucket.count,
      }),
      [
        { text: t("buckets.cancel"), style: "cancel" },
        {
          text: t("buckets.migrateToExisting"),
          onPress: async () => {
            setIsMigrating(true);
            try {
              await migrateNotificationsToBucket(
                selectedDanglingBucket.bucket.id,
                bucketId,
                targetBucket.name
              );

              Alert.alert(
                t("buckets.migrationSuccess"),
                t("buckets.migrationSuccessMessage", {
                  count: selectedDanglingBucket.count,
                  bucketName: targetBucket.name,
                })
              );

              setShowDanglingBucketModal(false);
              setSelectedDanglingBucket(null);

              // Refresh notifications and buckets
              apolloClient.refetchQueries({
                include: ["GetNotifications", "GetBuckets"],
              });
            } catch (error) {
              console.error("Migration error:", error);
              Alert.alert(
                t("buckets.migrationError"),
                t("buckets.migrationErrorMessage", {
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                })
              );
            } finally {
              setIsMigrating(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateNewBucket = async () => {
    if (!selectedDanglingBucket) return;

    Alert.alert(
      t("buckets.createNewBucket"),
      t("buckets.danglingBucketActionDescription", {
        count: selectedDanglingBucket.count,
      }),
      [
        { text: t("buckets.cancel"), style: "cancel" },
        {
          text: t("buckets.createNewBucket"),
          onPress: async () => {
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

                Alert.alert(
                  t("buckets.bucketCreationSuccess"),
                  t("buckets.bucketCreationSuccessMessage", {
                    count: selectedDanglingBucket.count,
                    bucketName: newBucket.name,
                  })
                );

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
              Alert.alert(
                t("buckets.bucketCreationError"),
                t("buckets.bucketCreationErrorMessage", {
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                })
              );
            } finally {
              setIsMigrating(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>{t("buckets.title")}</ThemedText>
        <View style={styles.headerButtons}>
          {danglingBuckets.length > 0 && (
            <TouchableOpacity
              style={[
                styles.danglingButton,
                {
                  backgroundColor: showDanglingBuckets
                    ? Colors[colorScheme ?? "light"].tint
                    : Colors[colorScheme ?? "light"].backgroundCard,
                  borderColor: Colors[colorScheme ?? "light"].tint,
                },
              ]}
              onPress={() => setShowDanglingBuckets(!showDanglingBuckets)}
            >
              <Ionicons
                name="warning-outline"
                size={20}
                color={
                  showDanglingBuckets
                    ? "white"
                    : Colors[colorScheme ?? "light"].tint
                }
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.createButton,
              {
                backgroundColor:
                  isOfflineAuth || isBackendUnreachable
                    ? Colors[colorScheme ?? "light"].buttonDisabled
                    : Colors[colorScheme ?? "light"].tint,
              },
            ]}
            onPress={() => navigateToCreateBucket(false)}
            disabled={isOfflineAuth || isBackendUnreachable}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ThemedText style={styles.description}>
        {t("buckets.organize")}
      </ThemedText>

      {/* Sezione Dangling Buckets */}
      {showDanglingBuckets && (
        <View style={styles.danglingSection}>
          <ThemedText
            style={[
              styles.danglingTitle,
              { color: Colors[colorScheme ?? "light"].tint },
            ]}
          >
            {t("buckets.danglingBuckets")}
          </ThemedText>
          <ThemedText
            style={[
              styles.danglingDescription,
              { color: Colors[colorScheme ?? "light"].textSecondary },
            ]}
          >
            {t("buckets.danglingBucketsDescription")}
          </ThemedText>

          {danglingBuckets.length === 0 ? (
            <View style={styles.emptyDanglingState}>
              <Ionicons
                name="checkmark-circle-outline"
                size={48}
                color={Colors[colorScheme ?? "light"].icon}
              />
              <ThemedText
                style={[
                  styles.emptyDanglingText,
                  { color: Colors[colorScheme ?? "light"].textSecondary },
                ]}
              >
                {t("buckets.noDanglingBuckets")}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.danglingBucketsContainer}>
              {danglingBuckets.map((item) => (
                <TouchableOpacity
                  key={item.bucket.id}
                  style={[
                    styles.danglingBucketItem,
                    {
                      backgroundColor:
                        Colors[colorScheme ?? "light"].backgroundCard,
                    },
                  ]}
                  onPress={() => handleDanglingBucketPress(item)}
                >
                  <View style={styles.danglingBucketInfo}>
                    <Ionicons
                      name="warning"
                      size={16}
                      color={Colors[colorScheme ?? "light"].warning}
                    />
                    <View style={styles.danglingBucketDetails}>
                      <ThemedText
                        style={[
                          styles.danglingBucketName,
                          { color: Colors[colorScheme ?? "light"].text },
                        ]}
                      >
                        {item.bucket.name ||
                          `Bucket ${item.bucket.id.slice(0, 8)}`}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.danglingBucketCount,
                          {
                            color: Colors[colorScheme ?? "light"].textSecondary,
                          },
                        ]}
                      >
                        {t("buckets.danglingBucketItem", { count: item.count })}
                      </ThemedText>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={Colors[colorScheme ?? "light"].textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {buckets.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <Ionicons
            name="folder-outline"
            size={64}
            color={Colors[colorScheme ?? "light"].icon}
          />
          <ThemedText style={styles.emptyText}>
            {t("buckets.noBucketsYet")}
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            {t("buckets.createFirstBucket")}
          </ThemedText>
        </ThemedView>
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
      <Modal
        visible={showDanglingBucketModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!isMigrating) {
            setShowDanglingBucketModal(false);
            // Pulisce il parametro URL se presente
            if (danglingBucketId) {
              navigateToBucketsSettings();
            }
          }
        }}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText
              style={[
                styles.modalTitle,
                { color: Colors[colorScheme ?? "light"].text },
              ]}
            >
              {isMigrating
                ? creatingBucket
                  ? t("buckets.creatingBucket")
                  : t("buckets.migrating")
                : t("buckets.danglingBucketAction")}
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.modalCloseButton,
                { opacity: isMigrating ? 0.5 : 1 },
              ]}
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
            >
              <Ionicons
                name="close"
                size={24}
                color={Colors[colorScheme ?? "light"].text}
              />
            </TouchableOpacity>
          </View>

          {selectedDanglingBucket && (
            <>
              <View
                style={[
                  styles.modalContent,
                  { opacity: isMigrating ? 0.6 : 1 },
                ]}
              >
                {/* Dangling Bucket Info */}
                <View
                  style={[
                    styles.danglingBucketInfo,
                    { borderColor: Colors[colorScheme ?? "light"].border },
                  ]}
                >
                  <View
                    style={[
                      styles.bucketIconContainer,
                      {
                        backgroundColor: Colors[colorScheme ?? "light"].border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="folder-outline"
                      size={24}
                      color={Colors[colorScheme ?? "light"].text}
                    />
                  </View>
                  <View style={styles.bucketInfo}>
                    <ThemedText
                      style={[
                        styles.bucketName,
                        { color: Colors[colorScheme ?? "light"].text },
                      ]}
                    >
                      {selectedDanglingBucket.bucket.name}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.bucketCount,
                        { color: Colors[colorScheme ?? "light"].textSecondary },
                      ]}
                    >
                      {selectedDanglingBucket.count}{" "}
                      {selectedDanglingBucket.count === 1
                        ? t("buckets.notification")
                        : t("buckets.notifications")}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText
                  style={[
                    styles.modalDescription,
                    { color: Colors[colorScheme ?? "light"].textSecondary },
                  ]}
                >
                  {isMigrating
                    ? creatingBucket
                      ? t("buckets.creatingBucketDescription")
                      : t("buckets.migratingDescription")
                    : t("buckets.danglingBucketActionDescription", {
                        count: selectedDanglingBucket.count,
                      })}
                </ThemedText>

                {!isMigrating && (
                  <>
                    <View style={styles.modalSection}>
                      <ThemedText
                        style={[
                          styles.modalSectionTitle,
                          { color: Colors[colorScheme ?? "light"].text },
                        ]}
                      >
                        {t("buckets.migrateToExisting")}
                      </ThemedText>
                      <BucketSelector
                        selectedBucketId={null}
                        onBucketChange={handleMigrateToExisting}
                        buckets={buckets}
                        placeholder={t("bucketSelector.selectBucket")}
                        searchable={true}
                      />
                    </View>

                    <View style={styles.modalSection}>
                      <TouchableOpacity
                        style={[
                          styles.createNewButton,
                          {
                            backgroundColor:
                              Colors[colorScheme ?? "light"].tint,
                          },
                        ]}
                        onPress={handleCreateNewBucket}
                      >
                        <Ionicons name="add-circle" size={20} color="white" />
                        <ThemedText style={styles.createNewButtonText}>
                          {t("buckets.createNewBucket")}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              {/* Loading overlay */}
              {isMigrating && (
                <View
                  style={[
                    styles.loadingOverlay,
                    {
                      backgroundColor:
                        Colors[colorScheme ?? "light"].background + "E6",
                    },
                  ]}
                >
                  <ActivityIndicator
                    size="large"
                    color={Colors[colorScheme ?? "light"].tint}
                  />
                  <ThemedText
                    style={[
                      styles.loadingText,
                      { color: Colors[colorScheme ?? "light"].text },
                    ]}
                  >
                    {t("buckets.migrating")}
                  </ThemedText>
                </View>
              )}
            </>
          )}
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: "center",
  },
  bucketsContainer: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  danglingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  danglingSection: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 193, 7, 0.3)",
  },
  danglingTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  danglingDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  emptyDanglingState: {
    alignItems: "center",
    paddingVertical: 16,
  },
  emptyDanglingText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  danglingBucketsContainer: {
    gap: 8,
  },
  danglingBucketItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  danglingBucketInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  danglingBucketDetails: {
    marginLeft: 8,
    flex: 1,
  },
  danglingBucketName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 1,
  },
  danglingBucketCount: {
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalCloseButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
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
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  bucketCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  createNewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  createNewButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
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
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
});
