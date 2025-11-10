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
import * as DocumentPicker from "expo-document-picker";
import PaperScrollView from "./ui/PaperScrollView";
import DetailSectionCard from "./ui/DetailSectionCard";
import DetailModal from "./ui/DetailModal";
import { useAppState, useDeleteNotification } from "@/hooks/notifications";
import { 
  deleteSQLiteDatabase, 
  exportSQLiteDatabaseToFile,
  importSQLiteDatabaseFromFile 
} from "@/services/db-setup";

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
      t("cachedData.cloudKit.confirmDeleteTitle"),
      t("cachedData.cloudKit.confirmDeleteMessage"),
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
                Alert.alert(
                  t("common.success"), 
                  t("cachedData.cloudKit.deleteSuccess")
                );
              } else {
                Alert.alert(
                  t("common.error"), 
                  t("cachedData.cloudKit.deleteError")
                );
              }
            } catch (error) {
              console.error("Failed to delete record:", error);
              Alert.alert(
                t("common.error"), 
                t("cachedData.cloudKit.deleteError")
              );
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
      if (!bucketId) return t("cachedData.recordDetails.unknownBucket");
      const bucket = appState?.buckets.find((b) => b.id === bucketId);
      return bucket?.name || t("cachedData.recordDetails.unknownBucket");
    },
    [appState, t]
  );

  // Bump database: delete SQLite and force re-download
  const handleBumpDatabase = useCallback(async () => {
    Alert.alert(
      t("cachedData.resetDatabase.warningTitle"),
      t("cachedData.resetDatabase.warningMessage"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("cachedData.resetDatabase.buttonText"),
          style: "destructive",
          onPress: async () => {
            try {
              console.log('[CachedData] Starting database reset...');
              
              // Delete the SQLite database
              await deleteSQLiteDatabase();
              
              Alert.alert(
                t("cachedData.resetDatabase.successTitle"), 
                t("cachedData.resetDatabase.successMessage"),
                [
                  {
                    text: "OK",
                    onPress: async () => {
                      // Trigger a full refresh from the server
                      await refetch();
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('[CachedData] Failed to bump database:', error);
              Alert.alert(
                t("common.error"), 
                t("cachedData.resetDatabase.errorMessage", { 
                  error: error instanceof Error ? error.message : 'Unknown error' 
                })
              );
            }
          },
        },
      ]
    );
  }, [t, refetch]);

  // Export database to SQL file
  const handleExportDatabase = useCallback(async () => {
    try {
      console.log('[CachedData] Exporting database...');
      
      const filePath = await exportSQLiteDatabaseToFile();
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath);
      } else {
        Alert.alert(
          t("common.success"), 
          t("cachedData.exportDatabase.successMessage", { path: filePath })
        );
      }
    } catch (error) {
      console.error('[CachedData] Failed to export database:', error);
      Alert.alert(
        t("common.error"), 
        t("cachedData.exportDatabase.errorMessage", { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      );
    }
  }, [t]);

  // Import database from SQL file
  const handleImportDatabase = useCallback(async () => {
    try {
      console.log('[CachedData] Picking SQL file...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // SQL files might not have a specific MIME type
        copyToCacheDirectory: true,
      });
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('[CachedData] File picker cancelled');
        return;
      }
      
      const file = result.assets[0];
      
      // Confirm import
      Alert.alert(
        t("cachedData.importDatabase.warningTitle"),
        t("cachedData.importDatabase.warningMessage", { fileName: file.name }),
        [
          {
            text: t("common.cancel"),
            style: "cancel",
          },
          {
            text: t("cachedData.importDatabase.buttonText"),
            style: "destructive",
            onPress: async () => {
              try {
                await importSQLiteDatabaseFromFile(file.uri);
                
                Alert.alert(
                  t("cachedData.importDatabase.successTitle"), 
                  t("cachedData.importDatabase.successMessage"),
                  [
                    {
                      text: "OK",
                      onPress: async () => {
                        // Trigger a refresh
                        await refetch();
                      }
                    }
                  ]
                );
              } catch (error) {
                console.error('[CachedData] Failed to import database:', error);
                Alert.alert(
                  t("common.error"), 
                  t("cachedData.importDatabase.errorMessage", { 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                  })
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('[CachedData] Failed to pick file:', error);
      Alert.alert(
        t("common.error"), 
        t("cachedData.importDatabase.filePickerError", { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      );
    }
  }, [t, refetch]);

  // Fetch CloudKit data on mount (iOS only)
  useEffect(() => {
    if (Platform.OS === 'ios') {
      fetchAllCloudKitRecords();
    }
  }, [fetchAllCloudKitRecords]);

  return (
    <PaperScrollView onRefresh={refreshData} loading={isLoading}>
      {/* Overview Description */}
      <Text
        variant="bodyMedium"
        style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
      >
        {t("cachedData.description")}
      </Text>

      {/* Database Reset Button - Mobile Only */}
      {Platform.OS !== 'web' && (
        <Card style={[styles.card, { backgroundColor: theme.colors.errorContainer }]}>
          <Card.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ color: theme.colors.onErrorContainer, fontWeight: '600' }}>
                  {t("cachedData.resetDatabase.title")}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer, marginTop: 4 }}>
                  {t("cachedData.resetDatabase.description")}
                </Text>
              </View>
              <Button
                mode="contained"
                onPress={handleBumpDatabase}
                buttonColor={theme.colors.error}
                textColor={theme.colors.onError}
                icon="database-refresh"
              >
                {t("cachedData.resetDatabase.buttonText")}
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Database Export/Import - Mobile Only */}
      {Platform.OS !== 'web' && (
        <Card style={styles.card}>
          <Card.Title
            title={t("cachedData.databaseBackup.title")}
            subtitle={t("cachedData.databaseBackup.description")}
            left={(props) => (
              <IconButton
                {...props}
                icon="database-export"
                iconColor={theme.colors.primary}
              />
            )}
          />
          <Card.Content>
            <View style={{ gap: 8 }}>
              <Button
                mode="contained-tonal"
                icon="database-export"
                onPress={handleExportDatabase}
              >
                {t("cachedData.databaseBackup.exportButton")}
              </Button>
              <Button
                mode="outlined"
                icon="database-import"
                onPress={handleImportDatabase}
              >
                {t("cachedData.databaseBackup.importButton")}
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Buckets Section */}
      <DetailSectionCard
        title={t("cachedData.buckets")}
        description={t("cachedData.bucketsList.description")}
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
          text: t("cachedData.bucketsList.emptyText"),
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
        description={t("cachedData.notificationsList.description", { 
          count: appState?.stats.totalCount || 0 
        })}
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
          text: t("cachedData.notificationsList.emptyText"),
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
          {/* CloudKit Buckets Detail */}
          <DetailSectionCard
            title={t("cachedData.cloudKitBuckets.title")}
            description={cloudKitBuckets.length > 0 
              ? t("cachedData.cloudKitBuckets.description", { count: cloudKitBuckets.length })
              : t("cachedData.cloudKitBuckets.emptyDescription")
            }
            actionButtons={[
              {
                icon: "refresh",
                onPress: fetchAllCloudKitRecords,
                disabled: loadingCloudKitRecords,
              },
            ]}
            loading={loadingCloudKitRecords}
            emptyState={{
              icon: "folder-cloud-outline",
              text: t("cachedData.cloudKitBuckets.emptyText"),
            }}
            items={cloudKitBuckets}
            renderItem={(bucket) => (
              <List.Item
                title={bucket.name || bucket.recordName}
                description={`ID: ${bucket.id || bucket.recordName.substring(0, 30)}...`}
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

          {/* CloudKit Notifications Detail */}
          <DetailSectionCard
            title={t("cachedData.cloudKitNotifications.title")}
            description={cloudKitNotifications.length > 0 
              ? t("cachedData.cloudKitNotifications.description", { count: cloudKitNotifications.length })
              : t("cachedData.cloudKitNotifications.emptyDescription")
            }
            actionButtons={[
              {
                icon: "refresh",
                onPress: fetchAllCloudKitRecords,
                disabled: loadingCloudKitRecords,
              },
            ]}
            loading={loadingCloudKitRecords}
            emptyState={{
              icon: "bell-badge-outline",
              text: t("cachedData.cloudKitNotifications.emptyText"),
            }}
            items={cloudKitNotifications}
            renderItem={(notification) => (
              <List.Item
                title={notification.title || notification.recordName}
                description={`Bucket: ${notification.bucketId ? notification.bucketId.substring(0, 30) : 'Unknown'}...`}
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
        </>
      )}

      {/* Local Record Detail Modal */}
      <DetailModal
        visible={showLocalRecordModal}
        onDismiss={() => setShowLocalRecordModal(false)}
        title={selectedLocalRecord?.type === 'bucket' 
          ? t("cachedData.recordDetails.bucketTitle")
          : t("cachedData.recordDetails.notificationTitle")
        }
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
          <Dialog.Title>{t("cachedData.recordDetailsTitle")}</Dialog.Title>
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

      {/* Storage Info Card
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
      </Card> */}
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

