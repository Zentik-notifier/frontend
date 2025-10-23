import { useI18n } from '@/hooks/useI18n';
import { getAllNotificationsFromCache, getAllRawNotificationsFromDB, importRawNotificationsToDB } from '@/services/notifications-repository';
import { useQueryClient } from '@tanstack/react-query';
import { notificationKeys } from '@/hooks/notifications';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';

export const cleanExportData = (data: any): any => {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => cleanExportData(item));
  }

  if (typeof data === 'object') {
    const cleaned: any = {};

    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('__') && key !== '__typename') {
        return;
      }

      // Rimuovi executionId dai messaggi (dati interni non necessari per l'export)
      if (key === 'executionId') {
        return; // Skip executionId completely
      }

      // Maschera informazioni sensibili nei record del database
      if (key === 'publicKey' || key === 'privateKey' || key === 'deviceToken' ||
        key === 'accessToken' || key === 'refreshToken' || key === 'authToken' ||
        key === 'password' || key === 'secret' || key === 'apiKey') {
        cleaned[key] = '***';
        return;
      }

      // Maschera URL sensibili nelle azioni (potrebbero contenere token o dati personali)
      if (key === 'value' && typeof value === 'string' && (
        value.includes('token=') ||
        value.includes('key=') ||
        value.includes('password=') ||
        value.includes('secret=') ||
        value.match(/https?:\/\/[^\s]+/)
      )) {
        // Se il valore sembra contenere dati sensibili o URL, maschera tutto o parte di esso
        if (value.includes('?')) {
          const baseUrl = value.split('?')[0];
          cleaned[key] = `${baseUrl}?***`;
        } else {
          cleaned[key] = '***';
        }
        return;
      }

      // Se è il campo fragment (da database), parsalo e puliscilo
      if (key === 'fragment' && typeof value === 'string') {
        try {
          const fragmentData = JSON.parse(value);
          cleaned[key] = cleanExportData(fragmentData);
          return;
        } catch {
          // Se non riesce a parsare, mantieni il valore originale
          cleaned[key] = value;
          return;
        }
      }

      // Processa ricorsivamente gli altri valori
      cleaned[key] = cleanExportData(value);
    });

    return cleaned;
  }

  return data;
};

export function useNotificationExportImport(onImportSuccess?: (notifications: any[]) => void) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

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

      // Applica cleanExportData per rimuovere metadati e mascherare dati sensibili
      const cleanedNotifications = cleanExportData(rawNotifications);

      const fileName = `notifications-${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        return await exportNotificationsWeb(fileName, cleanedNotifications);
      } else {
        return await exportNotificationsMobile(fileName, cleanedNotifications);
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
      let fileContent: string;

      if (Platform.OS === 'web') {
        fileContent = await importNotificationsWeb();
      } else {
        fileContent = await importNotificationsMobile();
      }

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

                  // Invalidate all React Query notification queries to refresh from DB
                  await queryClient.invalidateQueries({ 
                    queryKey: notificationKeys.all 
                  });
                  
                  console.log(`[Import] Imported ${rawNotifications.length} notifications and invalidated React Query cache`);

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

