import { GetNotificationsDocument, GetNotificationsQuery, NotificationFragmentDoc } from '@/generated/gql-operations-generated';
import { useApolloClient, InMemoryCache } from '@apollo/client';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useI18n } from './useI18n';
import { cleanExportData, processJsonToCache } from '@/utils/cache-data-processor';

export function useGraphQLCacheImportExport(onImportComplete?: (count: number) => void) {
  const { t } = useI18n();
  const apolloClient = useApolloClient();



  /**
   * Estrae le notifiche dalla query GetNotifications
   * Restituisce un array di notifiche complete con tutte le entità annidate
   */
  const extractNotificationsFromQuery = useCallback((): any[] => {
    try {
      const cache = apolloClient?.cache;
      if (!cache) {
        throw new Error(t('appSettings.gqlCache.importExport.errors.apolloCacheUnavailable'));
      }

      // Prova prima a leggere dalla query GetNotifications
      let queryData: GetNotificationsQuery | null = null;
      try {
        queryData = cache.readQuery<GetNotificationsQuery>({
          query: GetNotificationsDocument
        });
      } catch (error) {
        console.warn('⚠️ GetNotifications query not found in cache');
      }

      if (queryData?.notifications) {
        // Usa le notifiche dalla query (già complete con tutte le relazioni)
        const notifications = queryData.notifications.map(notification =>
          cleanExportData(notification)
        );
        console.log(`📤 Exporting ${notifications.length} notifications from query`);
        return notifications;
      }

      // Fallback: nessuna notifica trovata
      console.log('📤 No notifications found to export');
      return [];
    } catch (error) {
      console.error('Error extracting notifications from query:', error);
      throw error;
    }
  }, [t]);

  /**
   * Processa i dati importati e li inserisce nella cache
   */
  const processImportedData = useCallback(async (jsonContent: string): Promise<boolean> => {
    try {
      console.log('🔄 Processing imported data...');

      const cache = apolloClient?.cache;
      if (!cache) {
        console.error('❌ Apollo cache not available');
        throw new Error(t('appSettings.gqlCache.importExport.errors.apolloCacheUnavailable'));
      }

      // Usa la funzione centralizzata per ottenere il count delle notifiche
      let notificationCount = 0;
      try {
        // Processa temporaneamente solo per ottenere il count (senza scrivere nella cache)
        const tempNotifications = JSON.parse(jsonContent);
        const notifications = Array.isArray(tempNotifications)
          ? tempNotifications
          : (Array.isArray(tempNotifications?.notifications) ? tempNotifications.notifications : []);
        notificationCount = notifications.length;
      } catch {
        throw new Error('Formato JSON non valido');
      }

      if (notificationCount === 0) {
        throw new Error('Nessuna notifica trovata nel file di import');
      }

      // Conferma l'import con l'utente
      return new Promise((resolve) => {
        Alert.alert(
          t('appSettings.gqlCache.importExport.importTitle'),
          t('appSettings.gqlCache.importExport.confirmImportMessage', { count: notificationCount }),
          [
            {
              text: t('appSettings.gqlCache.importExport.buttons.cancel'),
              style: 'cancel',
              onPress: () => {
                console.log('❌ Import cancelled by user');
                resolve(false);
              },
            },
            {
              text: t('appSettings.gqlCache.importExport.buttons.import'),
              style: 'default',
              onPress: async () => {
                try {
                  const successCount = processJsonToCache(
                    cache as InMemoryCache,
                    jsonContent,
                    'Import'
                  );

                  Alert.alert(
                    t('appSettings.gqlCache.importExport.importSuccess'),
                    t('appSettings.gqlCache.importExport.importSuccessMessage', { count: successCount })
                  );

                  // Notify callback if provided
                  if (onImportComplete) {
                    onImportComplete(successCount);
                  }

                  resolve(true);
                } catch (error) {
                  console.error('❌ Error applying cache updates:', error);
                  Alert.alert(t('appSettings.gqlCache.importExport.importError'), t('appSettings.gqlCache.importExport.failedApply'));
                  resolve(false);
                }
              },
            },
          ]
        );
      });
    } catch (error) {
      console.error('❌ Error processing imported data:', error);
      Alert.alert(t('appSettings.gqlCache.importExport.importError'), t('appSettings.gqlCache.importExport.invalidFileFormat') + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
      return false;
    }
  }, [t]);

  /**
   * Esporta le notifiche dalla cache GraphQL in un file JSON con streaming per evitare crash
   */
  const exportNotifications = useCallback(async (): Promise<boolean> => {
    try {
      // Rimuove entità orfane dalla cache (il cleanup automatico è gestito in apollo-client.ts)
      try {
        apolloClient?.cache.gc();
      } catch { }

      const fileName = `notifications-${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        return await exportNotificationsWeb(fileName);
      } else {
        return await exportNotificationsMobile(fileName);
      }

    } catch (error) {
      console.error('Error exporting notifications:', error);
      Alert.alert(t('appSettings.gqlCache.importExport.exportError'), t('appSettings.gqlCache.importExport.exportError') + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
      return false;
    }
  }, [t]);

  /**
   * Export per mobile con streaming per evitare crash di memoria
   */
  const exportNotificationsMobile = useCallback(async (fileName: string): Promise<boolean> => {
    const fileUri = `${Paths.document}${fileName}`;
    const file = new File(fileUri);

    try {
      // Usa extractNotificationsFromQuery invece della cache raw
      const notifications = extractNotificationsFromQuery();

      if (notifications.length === 0) {
        Alert.alert(t('appSettings.gqlCache.importExport.exportError'), t('appSettings.gqlCache.importExport.noNotificationsToExport'));
        return false;
      }

      console.log(`📤 Exporting ${notifications.length} notifications in batches...`);

      // Costruisci il contenuto in chunk per evitare crash di memoria
      let fileContent = '[\n';
      const batchSize = 50;

      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);

        // Aggiungi il batch al contenuto
        const batchJson = batch
          .map((notification: any) => JSON.stringify(notification, null, 2))
          .join(',\n');

        if (i > 0) {
          fileContent += ',\n' + batchJson;
        } else {
          fileContent += batchJson;
        }

        console.log(`📤 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(notifications.length / batchSize)}`);

        // Piccola pausa per evitare blocco UI
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      fileContent += '\n]';

      file.write(fileContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Notifications Cache',
        });
      } else {
        Alert.alert(t('appSettings.gqlCache.importExport.exportComplete'), t('appSettings.gqlCache.importExport.exportCompleteMessage', { path: fileUri }));
      }

      return true;
    } catch (error) {
      console.error('Error in mobile export:', error);
      throw error;
    }
  }, [t, extractNotificationsFromQuery]);

  /**
   * Export per web con batch processing per evitare crash di memoria
   */
  const exportNotificationsWeb = useCallback(async (fileName: string): Promise<boolean> => {
    try {
      // Usa extractNotificationsFromQuery invece della cache raw
      const notifications = extractNotificationsFromQuery();

      if (notifications.length === 0) {
        Alert.alert(t('appSettings.gqlCache.importExport.exportError'), t('appSettings.gqlCache.importExport.noNotificationsToExport'));
        return false;
      }

      console.log(`📤 Exporting ${notifications.length} notifications via web batching...`);

      // Costruisci il contenuto in batch per evitare crash di memoria
      let fileContent = '[\n';
      const batchSize = 50;

      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);

        // Aggiungi il batch al contenuto
        const batchJson = batch
          .map((notification: any) => JSON.stringify(notification, null, 2))
          .join(',\n');

        if (i > 0) {
          fileContent += ',\n' + batchJson;
        } else {
          fileContent += batchJson;
        }

        console.log(`📤 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(notifications.length / batchSize)}`);

        // Piccola pausa per evitare blocco UI
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      fileContent += '\n]';

      // Crea e scarica il file
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
  }, [t, extractNotificationsFromQuery]);

  /**
   * Importa le notifiche da un file JSON nella cache GraphQL
   */
  const importNotifications = useCallback(async (): Promise<boolean> => {
    try {
      console.log('📥 Starting import notifications...');
      let fileContent: string;

      if (Platform.OS === 'web') {
        console.log('🌐 Using web file picker...');
        // Per il web, usa un input file
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json,application/json';
          input.onchange = async (event: any) => {
            const file = event.target.files[0];
            if (!file) {
              console.log('❌ No file selected');
              resolve(false);
              return;
            }

            console.log('📁 File selected:', file.name, 'Size:', file.size);
            try {
              const reader = new FileReader();
              reader.onload = async (e) => {
                try {
                  const content = e.target?.result as string;
                  console.log('📄 File content loaded, length:', content.length);
                  const success = await processImportedData(content);
                  resolve(success);
                } catch (error) {
                  console.error('❌ Error processing imported file:', error);
                  Alert.alert(t('appSettings.gqlCache.importExport.importError'), t('appSettings.gqlCache.importExport.failedProcess'));
                  resolve(false);
                }
              };
              reader.readAsText(file);
            } catch (error) {
              console.error('❌ Error reading file:', error);
              Alert.alert(t('appSettings.gqlCache.importExport.importError'), t('appSettings.gqlCache.importExport.failedRead'));
              resolve(false);
            }
          };
          document.body.appendChild(input);
          input.click();
          document.body.removeChild(input);
        });
      } else {
        console.log('📱 Using mobile DocumentPicker...');
        // Per mobile, usa DocumentPicker
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
        });

        console.log('📋 DocumentPicker result:', {
          canceled: result.canceled,
          assetsCount: result.assets?.length,
          firstAsset: result.assets?.[0] ? {
            name: result.assets[0].name,
            size: result.assets[0].size,
            uri: result.assets[0].uri.substring(0, 50) + '...'
          } : null
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          console.log('❌ Document picker canceled or no assets');
          return false;
        }

        const fileUri = result.assets[0].uri;
        console.log('📄 Reading file from URI:', fileUri);
        const file = new File(fileUri);
        const fileContent = await file.text();

        console.log('📄 File content loaded, length:', fileContent.length);
        return await processImportedData(fileContent);
      }
    } catch (error) {
      console.error('❌ Error importing notifications:', error);
      Alert.alert(t('appSettings.gqlCache.importExport.importError'), t('appSettings.gqlCache.importExport.importError') + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
      return false;
    }
  }, [processImportedData, t]);

  /**
   * Ottiene statistiche sulla cache delle notifiche
   */
  const getCacheStats = useCallback((): { totalNotifications: number; cacheSize: number } => {
    try {
      const cache = apolloClient?.cache;
      if (!cache) {
        return { totalNotifications: 0, cacheSize: 0 };
      }

      const cacheData = cache.extract();
      let totalNotifications = 0;
      let estimatedSize = 0;

      Object.entries(cacheData).forEach(([key, entity]: [string, any]) => {
        if (entity && entity.__typename === 'Notification') {
          totalNotifications++;
          // Stima approssimativa della dimensione in bytes
          estimatedSize += JSON.stringify({ [key]: entity }).length;
        }
      });

      return {
        totalNotifications,
        cacheSize: estimatedSize,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalNotifications: 0, cacheSize: 0 };
    }
  }, []);


  return {
    exportNotifications,
    importNotifications,
    getCacheStats,
    extractNotificationsFromQuery,
  };
}
