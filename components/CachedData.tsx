import React, { useCallback, useState, useEffect } from "react";
import { View, StyleSheet, Alert, Platform, ScrollView } from "react-native";
import {
  Text,
  Card,
  useTheme,
  IconButton,
  List,
  Button,
  Portal,
  Dialog,
} from "react-native-paper";
import { useI18n } from "@/hooks/useI18n";
import { deleteBucket } from "@/db/repositories/buckets-repository";
import { Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import PaperScrollView from "./ui/PaperScrollView";
import DetailSectionCard from "./ui/DetailSectionCard";
import DetailModal from "./ui/DetailModal";
import { useAppState, useDeleteNotification } from "@/hooks/notifications";

type CloudKitRecord = {
  recordName: string;
  recordType?: string;
  createdAt: number;
  modifiedAt: number;
  [key: string]: any;
};

type LocalRecord = {
  type: 'bucket' | 'notification';
  data: any;
};

export default function CachedData() {
  const theme = useTheme();
  const { t } = useI18n();
  const { data: appState, isLoading, refetch } = useAppState();
  const deleteMutation = useDeleteNotification();
  const [cloudKitData, setCloudKitData] = useState<{
    bucketsCount: number;
    notificationsCount: number;
  } | null>(null);
  const [cloudKitBuckets, setCloudKitBuckets] = useState<CloudKitRecord[]>([]);
  const [cloudKitNotifications, setCloudKitNotifications] = useState<CloudKitRecord[]>([]);
  const [loadingCloudKit, setLoadingCloudKit] = useState(false);
  const [loadingCloudKitRecords, setLoadingCloudKitRecords] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CloudKitRecord | null>(null);
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [selectedLocalRecord, setSelectedLocalRecord] = useState<LocalRecord | null>(null);
  const [showLocalRecordModal, setShowLocalRecordModal] = useState(false);

  const refreshData = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const fetchCloudKitData = useCallback(async () => {
    if (Platform.OS !== 'ios') return;
    
    setLoadingCloudKit(true);
    try {
      const { default: IosBridgeService } = await import('@/services/ios-bridge');
      const result = await IosBridgeService.fetchCloudKitRecordsCount();
      
      if (result.success) {
        setCloudKitData({
          bucketsCount: result.bucketsCount,
          notificationsCount: result.notificationsCount,
        });
      } else {
        Alert.alert(t("common.error"), t("cachedData.cloudKitError"));
      }
    } catch (error) {
      console.error("Failed to fetch CloudKit data:", error);
      Alert.alert(t("common.error"), t("cachedData.cloudKitError"));
    } finally {
      setLoadingCloudKit(false);
    }
  }, [t]);

  const fetchAllCloudKitRecords = useCallback(async () => {
    if (Platform.OS !== 'ios') return;
    
    setLoadingCloudKitRecords(true);
    try {
      const { default: IosBridgeService } = await import('@/services/ios-bridge');
      
      const [bucketsResult, notificationsResult] = await Promise.all([
        IosBridgeService.fetchAllBucketsFromCloudKit(),
        IosBridgeService.fetchAllNotificationsFromCloudKit(),
      ]);
      
      if (bucketsResult.success) {
        setCloudKitBuckets(bucketsResult.buckets as CloudKitRecord[]);
      }
      
      if (notificationsResult.success) {
        setCloudKitNotifications(notificationsResult.notifications as CloudKitRecord[]);
      }
      
      // Update counts too
      setCloudKitData({
        bucketsCount: bucketsResult.buckets.length,
        notificationsCount: notificationsResult.notifications.length,
      });
    } catch (error) {
      console.error("Failed to fetch CloudKit records:", error);
      Alert.alert(t("common.error"), t("cachedData.cloudKitError"));
    } finally {
      setLoadingCloudKitRecords(false);
    }
  }, [t]);

  const handleViewRecord = useCallback((record: CloudKitRecord) => {
    setSelectedRecord(record);
    setShowRecordDialog(true);
  }, []);

  const handleDeleteRecord = useCallback(async (recordName: string) => {
    if (Platform.OS !== 'ios') return;
    
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this record from CloudKit?",
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const { default: IosBridgeService } = await import('@/services/ios-bridge');
              const result = await IosBridgeService.deleteRecordFromCloudKit(recordName);
              
              if (result.success) {
                // Refresh records after deletion
                await fetchAllCloudKitRecords();
                Alert.alert(t("common.success"), "Record deleted successfully");
              } else {
                Alert.alert(t("common.error"), "Failed to delete record");
              }
            } catch (error) {
              console.error("Failed to delete record:", error);
              Alert.alert(t("common.error"), "Failed to delete record");
            }
          },
        },
      ]
    );
  }, [t, fetchAllCloudKitRecords]);

  const handleViewLocalBucket = useCallback((bucket: any) => {
    setSelectedLocalRecord({ type: 'bucket', data: bucket });
    setShowLocalRecordModal(true);
  }, []);

  const handleViewLocalNotification = useCallback((notification: any) => {
    setSelectedLocalRecord({ type: 'notification', data: notification });
    setShowLocalRecordModal(true);
  }, []);

  const handleExportBuckets = useCallback(async () => {
    if (!appState?.buckets) return;

    try {
      const jsonData = JSON.stringify(appState.buckets, null, 2);

      if (Platform.OS === "web") {
        // Web download
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `buckets_${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Mobile download
        const file = await Paths.document.createFile(
          `buckets_${new Date().toISOString()}.json`,
          jsonData
        );

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri);
        } else {
          Alert.alert(t("common.success"), `File saved to ${file.uri}`);
        }
      }

      Alert.alert(t("common.success"), t("cachedData.exportSuccess"));
    } catch (error) {
      console.error("Failed to export buckets:", error);
      Alert.alert(t("common.error"), t("cachedData.exportError"));
    }
  }, [appState, t]);

  const handleExportNotifications = useCallback(async () => {
    if (!appState?.notifications) return;

    try {
      const jsonData = JSON.stringify(appState.notifications, null, 2);

      if (Platform.OS === "web") {
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `notifications_${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const file = await Paths.document.createFile(
          `notifications_${new Date().toISOString()}.json`,
          jsonData
        );

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri);
        } else {
          Alert.alert(t("common.success"), `File saved to ${file.uri}`);
        }
      }

      Alert.alert(t("common.success"), t("cachedData.exportSuccess"));
    } catch (error) {
      console.error("Failed to export notifications:", error);
      Alert.alert(t("common.error"), t("cachedData.exportError"));
    }
  }, [appState, t]);

  const handleDeleteBucket = useCallback(
    (bucketId: string) => {
      Alert.alert(
        t("cachedData.confirmDelete"),
        t("cachedData.confirmDeleteMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await deleteBucket(bucketId);
                Alert.alert(t("common.success"), t("cachedData.deleteSuccess"));
                await refetch();
              } catch (error) {
                console.error("Failed to delete bucket:", error);
                Alert.alert(t("common.error"), t("cachedData.deleteError"));
              }
            },
          },
        ]
      );
    },
    [t, refetch]
  );

  const handleDeleteNotification = useCallback(
    (notificationId: string) => {
      Alert.alert(
        t("cachedData.confirmDelete"),
        t("cachedData.confirmDeleteMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await deleteMutation.mutateAsync(notificationId);
                Alert.alert(t("common.success"), t("cachedData.deleteSuccess"));
              } catch (error) {
                console.error("Failed to delete notification:", error);
                Alert.alert(t("common.error"), t("cachedData.deleteError"));
              }
            },
          },
        ]
      );
    },
    [t, deleteMutation]
  );

  // Find bucket name for a notification
  const getBucketName = useCallback(
    (bucketId?: string) => {
      if (!bucketId) return "Unknown";
      const bucket = appState?.buckets.find((b) => b.id === bucketId);
      return bucket?.name || "Unknown";
    },
    [appState]
  );

  // Fetch CloudKit data on mount (iOS only)
  useEffect(() => {
    if (Platform.OS === 'ios') {
      fetchCloudKitData();
    }
  }, [fetchCloudKitData]);

  return (
    <PaperScrollView onRefresh={refreshData} loading={isLoading}>
      {/* Overview Description */}
      <Text
        variant="bodyMedium"
        style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
      >
        {t("cachedData.description")}
      </Text>

      {/* Buckets Section */}
      <DetailSectionCard
        title={t("cachedData.buckets")}
        description="Notification buckets stored locally for offline access"
        actionButtons={[
          {
            icon: "download",
            onPress: handleExportBuckets,
            disabled: !appState?.buckets.length,
          },
        ]}
        loading={isLoading}
        emptyState={{
          icon: "folder-outline",
          text: "No buckets cached",
        }}
        items={appState?.buckets || []}
        renderItem={(bucket) => (
          <List.Item
            title={bucket.name || bucket.id}
            description={`${bucket.totalMessages || 0} notifications`}
            left={(props) => (
              <List.Icon {...props} icon="folder" color={theme.colors.primary} />
            )}
            right={(props) => (
              <View style={{ flexDirection: 'row' }}>
                <IconButton
                  icon="eye"
                  iconColor={theme.colors.primary}
                  size={20}
                  onPress={() => handleViewLocalBucket(bucket)}
                />
                <IconButton
                  icon="delete"
                  iconColor={theme.colors.error}
                  size={20}
                  onPress={() => handleDeleteBucket(bucket.id)}
                />
              </View>
            )}
          />
        )}
        maxHeight={400}
      />

      {/* Notifications Section */}
      <DetailSectionCard
        title={t("cachedData.notifications")}
        description={`${appState?.stats.totalCount || 0} notifications cached locally`}
        actionButtons={[
          {
            icon: "download",
            onPress: handleExportNotifications,
            disabled: !appState?.notifications.length,
          },
        ]}
        loading={isLoading}
        emptyState={{
          icon: "bell-outline",
          text: "No notifications cached",
        }}
        items={appState?.notifications || []}
        renderItem={(notification) => (
          <List.Item
            title={notification.message.title || "No title"}
            description={getBucketName(notification.message.bucket?.id)}
            left={(props) => (
              <List.Icon {...props} icon="bell" color={theme.colors.secondary} />
            )}
            right={(props) => (
              <View style={{ flexDirection: 'row' }}>
                <IconButton
                  icon="eye"
                  iconColor={theme.colors.primary}
                  size={20}
                  onPress={() => handleViewLocalNotification(notification)}
                />
                <IconButton
                  icon="delete"
                  iconColor={theme.colors.error}
                  size={20}
                  onPress={() => handleDeleteNotification(notification.id)}
                />
              </View>
            )}
          />
        )}
        maxHeight={400}
      />

      {/* CloudKit Records Card - iOS Only */}
      {Platform.OS === 'ios' && (
        <>
          {/* CloudKit Summary */}
          <DetailSectionCard
            title={t("cachedData.cloudKit")}
            description={t("cachedData.cloudKitDescription")}
            actionButtons={[
              {
                icon: "refresh",
                onPress: fetchCloudKitData,
                disabled: loadingCloudKit,
              },
              {
                icon: "cloud-download",
                onPress: fetchAllCloudKitRecords,
                disabled: loadingCloudKitRecords,
              },
            ]}
            loading={loadingCloudKit}
            emptyState={{
              icon: "cloud-outline",
              text: "No CloudKit data available",
            }}
            items={cloudKitData ? [cloudKitData] : []}
            renderItem={(data) => (
              <>
                <List.Item
                  title={t("cachedData.bucketsInCloud")}
                  description={`${data.bucketsCount} buckets`}
                  left={(props) => (
                    <List.Icon {...props} icon="folder-multiple" color={theme.colors.primary} />
                  )}
                />
                <List.Item
                  title={t("cachedData.notificationsInCloud")}
                  description={`${data.notificationsCount} notifications`}
                  left={(props) => (
                    <List.Icon {...props} icon="bell-ring" color={theme.colors.primary} />
                  )}
                />
              </>
            )}
            maxHeight={200}
          />

          {/* CloudKit Buckets Detail */}
          {cloudKitBuckets.length > 0 && (
            <DetailSectionCard
              title="CloudKit Buckets"
              description={`${cloudKitBuckets.length} buckets in iCloud`}
              actionButtons={[]}
              loading={loadingCloudKitRecords}
              emptyState={{
                icon: "folder-outline",
                text: "No buckets in CloudKit",
              }}
              items={cloudKitBuckets}
              renderItem={(bucket) => (
                <List.Item
                  title={bucket.data_id || bucket.recordName}
                  description={`Record: ${bucket.recordName.substring(0, 20)}...`}
                  left={(props) => (
                    <List.Icon {...props} icon="folder-cloud" color={theme.colors.primary} />
                  )}
                  right={(props) => (
                    <View style={{ flexDirection: 'row' }}>
                      <IconButton
                        icon="eye"
                        iconColor={theme.colors.primary}
                        size={20}
                        onPress={() => handleViewRecord(bucket)}
                      />
                      <IconButton
                        icon="delete"
                        iconColor={theme.colors.error}
                        size={20}
                        onPress={() => handleDeleteRecord(bucket.recordName)}
                      />
                    </View>
                  )}
                />
              )}
              maxHeight={400}
            />
          )}

          {/* CloudKit Notifications Detail */}
          {cloudKitNotifications.length > 0 && (
            <DetailSectionCard
              title="CloudKit Notifications"
              description={`${cloudKitNotifications.length} notifications in iCloud`}
              actionButtons={[]}
              loading={loadingCloudKitRecords}
              emptyState={{
                icon: "bell-outline",
                text: "No notifications in CloudKit",
              }}
              items={cloudKitNotifications}
              renderItem={(notification) => (
                <List.Item
                  title={notification.data_id || notification.recordName}
                  description={`Record: ${notification.recordName.substring(0, 20)}...`}
                  left={(props) => (
                    <List.Icon {...props} icon="bell-badge" color={theme.colors.secondary} />
                  )}
                  right={(props) => (
                    <View style={{ flexDirection: 'row' }}>
                      <IconButton
                        icon="eye"
                        iconColor={theme.colors.primary}
                        size={20}
                        onPress={() => handleViewRecord(notification)}
                      />
                      <IconButton
                        icon="delete"
                        iconColor={theme.colors.error}
                        size={20}
                        onPress={() => handleDeleteRecord(notification.recordName)}
                      />
                    </View>
                  )}
                />
              )}
              maxHeight={400}
            />
          )}
        </>
      )}

      {/* Local Record Detail Modal */}
      <DetailModal
        visible={showLocalRecordModal}
        onDismiss={() => setShowLocalRecordModal(false)}
        title={selectedLocalRecord?.type === 'bucket' ? 'Bucket Details' : 'Notification Details'}
        icon={selectedLocalRecord?.type === 'bucket' ? 'folder' : 'bell'}
        actions={{
          cancel: {
            label: t("common.close"),
            onPress: () => setShowLocalRecordModal(false),
          },
        }}
      >
        {selectedLocalRecord && (
          <Text
            variant="bodySmall"
            style={{
              fontFamily: 'monospace',
              color: theme.colors.onSurface,
            }}
          >
            {JSON.stringify(selectedLocalRecord.data, null, 2)}
          </Text>
        )}
      </DetailModal>

      {/* CloudKit Record Detail Dialog */}
      <Portal>
        <Dialog visible={showRecordDialog} onDismiss={() => setShowRecordDialog(false)}>
          <Dialog.Title>{t("cachedData.recordDetails")}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <ScrollView>
              <Card.Content>
                {selectedRecord && (
                  <Text
                    variant="bodySmall"
                    style={{
                      fontFamily: 'monospace',
                      color: theme.colors.onSurface,
                    }}
                  >
                    {JSON.stringify(selectedRecord, null, 2)}
                  </Text>
                )}
              </Card.Content>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowRecordDialog(false)}>
              {t("common.close")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Storage Info Card */}
      <Card style={styles.card}>
        <Card.Title
          title={t("cachedData.storageInfo")}
          left={(props) => (
            <IconButton
              {...props}
              icon="database"
              iconColor={theme.colors.tertiary}
            />
          )}
        />
        <Card.Content>
          <View style={styles.infoRow}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Platform:
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface, fontWeight: "600" }}
            >
              {Platform.OS === "web" ? "IndexedDB" : "SQLite"}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  description: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  card: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
});

