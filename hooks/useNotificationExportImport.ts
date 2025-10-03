import { useI18n } from '@/hooks/useI18n';
import { getAllNotificationsFromCache, getAllRawNotificationsFromDB, importRawNotificationsToDB } from '@/services/notifications-repository';
import { processJsonToCache } from '@/utils/cache-data-processor';
import { useApolloClient } from '@apollo/client';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';

export function useNotificationExportImport(onImportSuccess?: (notifications: any[]) => void) {
  const { t } = useI18n();
  const apolloClient = useApolloClient();

  const exportAllNotifications = async () => {
    try {
      const rawNotifications = await getAllRawNotificationsFromDB();

      if (rawNotifications.length === 0) {
        Alert.alert(
          t('appSettings.gqlCache.importExport.exportError'),
          t('appSettings.gqlCache.importExport.noNotificationsToExport')
        );
        return false;
      }

      const fileName = `notifications-${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        return await exportNotificationsWeb(fileName, rawNotifications);
      } else {
        return await exportNotificationsMobile(fileName, rawNotifications);
      }
    } catch (error) {
      console.error('Error exporting notifications:', error);
      Alert.alert(
        t('appSettings.gqlCache.importExport.exportError'),
        t('appSettings.gqlCache.importExport.exportError')
      );
      return false;
    }
  }

  /**
   * Import notifications from JSON file to database (raw DB format)
   */
  const importAllNotifications = async () => {
    try {
      // let fileContent: string;

      // if (Platform.OS === 'web') {
      //   // For web, use file input
      //   fileContent = await importNotificationsWeb();
      // } else {
      //   // For mobile, use DocumentPicker
      const fileContent = await importNotificationsMobile();
      // }

      if (!fileContent) {
        return false;
      }

      // Parse JSON content - expects raw DB format
      const rawNotifications = JSON.parse(fileContent);

      if (!Array.isArray(rawNotifications) || rawNotifications.length === 0) {
        Alert.alert(
          t('appSettings.gqlCache.importExport.importError'),
          t('appSettings.gqlCache.importExport.noValidNotificationsFound')
        );
        return false;
      }

      // Show confirmation dialog
      return new Promise((resolve) => {
        Alert.alert(
          t('appSettings.gqlCache.importExport.confirmImportTitle'),
          t('appSettings.gqlCache.importExport.confirmImportQuestion', { count: rawNotifications.length }),
          [
            {
              text: t('appSettings.gqlCache.importExport.buttons.cancel'),
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: t('appSettings.gqlCache.importExport.buttons.import'),
              style: 'default',
              onPress: async () => {
                try {
                  // Import raw notifications directly to database
                  await importRawNotificationsToDB(rawNotifications);

                  // Update Apollo cache with the parsed notifications
                  if (apolloClient?.cache) {
                    const notifications = rawNotifications.map(raw => {
                      try {
                        return JSON.parse(raw.fragment);
                      } catch {
                        return null;
                      }
                    }).filter(Boolean);

                    if (notifications.length > 0) {
                      await processJsonToCache(
                        apolloClient.cache,
                        notifications,
                        'Import'
                      );
                    }
                  }

                  Alert.alert(
                    t('appSettings.gqlCache.importExport.importCompleted'),
                    t('appSettings.gqlCache.importExport.importCompletedMessage', { count: rawNotifications.length })
                  );
                  resolve(true);
                } catch (error) {
                  console.error('Error importing notifications:', error);
                  Alert.alert(
                    t('appSettings.gqlCache.importExport.importError'),
                    t('appSettings.gqlCache.importExport.importError')
                  );
                  resolve(false);
                }
              },
            },
          ]
        );
      });
    } catch (error) {
      console.error('Error importing notifications:', error);
      Alert.alert(
        t('appSettings.gqlCache.importExport.importError'),
        t('appSettings.gqlCache.importExport.importError')
      );
      return false;
    }
  }

  /**
   * Export notifications for web platform
   */
  const exportNotificationsWeb = async (fileName: string, notifications: any[]): Promise<boolean> => {
    try {
      const fileContent = JSON.stringify(notifications, null, 2);

      const blob = new Blob([fileContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error in web export:', error);
      throw error;
    }
  }

  /**
   * Export notifications for mobile platform
   */
  const exportNotificationsMobile = async (fileName: string, notifications: any[]): Promise<boolean> => {
    const fileUri = `${Paths.document.uri}${fileName}`;
    const file = new File(fileUri);

    try {
      const fileContent = JSON.stringify(notifications, null, 2);
      file.write(fileContent, {});

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: t('appSettings.gqlCache.importExport.exportButton'),
        });
      } else {
        Alert.alert(
          t('appSettings.gqlCache.importExport.exportCompleted'),
          t('appSettings.gqlCache.importExport.exportCompletedMessage', { path: fileUri })
        );
      }

      return true;
    } catch (error) {
      console.error('Error in mobile export:', error);
      throw error;
    }
  }

  const importNotificationsWeb = async (): Promise<string> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async (event: any) => {
        const file = event.target.files[0];
        if (!file) {
          resolve('');
          return;
        }

        try {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve(e.target?.result as string || '');
          };
          reader.readAsText(file);
        } catch (error) {
          console.error('Error reading file:', error);
          resolve('');
        }
      };
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    });
  }

  const importNotificationsMobile = async (): Promise<string> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return '';
    }

    const fileUri = result.assets[0].uri;
    const file = new File(fileUri);
    return await file.text();
  }


  const handleExportNotifications = useCallback(async () => {
    try {
      return await exportAllNotifications();
    } catch (error) {
      console.error("Export failed:", error);
      return false;
    }
  }, [exportAllNotifications]);

  const handleImportNotifications = useCallback(async () => {
    try {
      const success = await importAllNotifications();
      if (success && onImportSuccess) {
        const notifications = await getAllNotificationsFromCache();
        onImportSuccess(notifications);
      }
      return success;
    } catch (error) {
      console.error("Import failed:", error);
      return false;
    }
  }, [importAllNotifications, onImportSuccess]);

  return {
    handleExportNotifications,
    handleImportNotifications,
  };
}
