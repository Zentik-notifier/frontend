import { NotificationFragmentDoc } from '@/generated/gql-operations-generated';
import { useApolloClient } from '@apollo/client';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useI18n } from './useI18n';

export function useGraphQLCacheImportExport(onImportComplete?: (count: number) => void) {
  const { t } = useI18n();
  const apolloClient = useApolloClient();
  

  /**
   * Risolve una referenza nella cache Apollo
   */
  const resolveReference = useCallback((cacheData: any, ref: any, visited = new Set<string>()): any => {
    if (!ref || typeof ref !== 'object') {
      return ref;
    }

    // Se è una referenza Apollo Cache
    if (ref.__ref) {
      // Protezione contro cicli infiniti
      if (visited.has(ref.__ref)) {
        return { __ref: ref.__ref }; // Mantieni solo la referenza per evitare cicli
      }

      const referencedEntity = cacheData[ref.__ref];
      if (referencedEntity) {
        visited.add(ref.__ref);
        const resolved = resolveEntity(cacheData, referencedEntity, visited);
        visited.delete(ref.__ref);
        return resolved;
      }
    }

    // Se è un array, risolvi ogni elemento
    if (Array.isArray(ref)) {
      return ref.map(item => resolveReference(cacheData, item, visited));
    }

    // Se è un oggetto, risolvi ogni proprietà
    if (typeof ref === 'object') {
      const resolved: any = {};
      Object.entries(ref).forEach(([key, value]) => {
        resolved[key] = resolveReference(cacheData, value, visited);
      });
      return resolved;
    }

    return ref;
  }, []);

  /**
   * Risolve tutte le relazioni di un'entità
   */
  const resolveEntity = useCallback((cacheData: any, entity: any, visited = new Set<string>()): any => {
    if (!entity || typeof entity !== 'object') {
      return entity;
    }

    const resolved: any = { ...entity };

    // Risolvi ogni proprietà dell'entità
    Object.entries(entity).forEach(([key, value]) => {
      if (key === '__typename') {
        resolved[key] = value;
        return;
      }

      resolved[key] = resolveReference(cacheData, value, visited);
    });

    return resolved;
  }, [resolveReference]);

  /**
   * Pulisce i dati rimuovendo metadati interni di Apollo Cache e proprietà non necessarie
   */
  const cleanExportData = useCallback((data: any, currentPath: string = ''): any => {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => cleanExportData(item, currentPath));
    }

    const cleaned: any = {};
    Object.entries(data).forEach(([key, value]) => {
      // Rimuovi metadati interni di Apollo Cache (mantieni __typename)
      if (key.startsWith('__') && key !== '__typename') {
        return;
      }

      // Maschera informazioni sensibili richieste da fragment/schema
      if (key === 'publicKey' || key === 'privateKey' || key === 'deviceToken') {
        cleaned[key] = '***';
        return;
      }

      cleaned[key] = cleanExportData(value, currentPath ? `${currentPath}.${key}` : key);
    });

    return cleaned;
  }, []);

  /**
   * Estrae tutte le notifiche dalla cache GraphQL con tutte le relazioni risolte
   */
  const extractNotificationsFromCache = useCallback((): any[] => {
    try {
      const cache = apolloClient?.cache;
      if (!cache) {
        throw new Error(t('appSettings.gqlCache.importExport.errors.apolloCacheUnavailable'));
      }

      // Evita di leggere da storage persistito; prendiamo solo lo stato attuale in memoria
      const cacheData = cache.extract(true as any);
      const notifications: any[] = [];

      // Estrai tutte le notifiche dalla cache e risolvi le relazioni
      Object.entries(cacheData).forEach(([key, entity]: [string, any]) => {
        if (entity && entity.__typename === 'Notification') {
          const resolvedNotification = resolveEntity(cacheData, entity);
          const cleanedNotification = cleanExportData(resolvedNotification, 'notifications');
          notifications.push(cleanedNotification);
        }
      });

      console.log(`📤 Exporting ${notifications.length} notifications from raw cache`);
      return notifications;
    } catch (error) {
      console.error('Error extracting notifications from cache:', error);
      throw error;
    }
  }, [t, resolveEntity, cleanExportData]);

  /**
   * Processa i dati importati e li inserisce nella cache
   */
  const processImportedData = useCallback(async (jsonContent: string): Promise<boolean> => {
    try {
      console.log('🔄 Processing imported data...');
      console.log('📄 JSON content length:', jsonContent.length);
      
      // Verifica che il contenuto non sia vuoto
      if (!jsonContent || jsonContent.trim().length === 0) {
        console.error('❌ Empty JSON content');
        throw new Error('File JSON vuoto o non valido');
      }
      
      // Verifica che il contenuto sia JSON valido
      let parsed: any;
      try {
        parsed = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error('Formato JSON non valido');
      }
      // Supporta sia array puro sia formato { notifications: [...] }
      const incomingNotifications: any[] = Array.isArray(parsed)
        ? parsed
        : (Array.isArray(parsed?.notifications) ? parsed.notifications : []);

      // Valida la struttura dei dati
      if (!Array.isArray(incomingNotifications)) {
        console.error('❌ Invalid notifications payload:', parsed);
        throw new Error(t('appSettings.gqlCache.importExport.errors.notificationsArrayNotFound'));
      }

      // Verifica che le notifiche abbiano i campi necessari
      const validNotifications = incomingNotifications.filter((notification, index) => {
        if (!notification.id) {
          console.warn(`⚠️ Notification at index ${index} missing ID`);
          return false;
        }
        if (!notification.__typename || notification.__typename !== 'Notification') {
          console.warn(`⚠️ Notification at index ${index} missing or invalid __typename:`, notification.__typename);
          return false;
        }
        return true;
      });

      if (validNotifications.length === 0) {
        console.error('❌ No valid notifications found in import data');
        throw new Error('Nessuna notifica valida trovata nel file di import');
      }

      if (validNotifications.length !== incomingNotifications.length) {
        console.warn(`⚠️ Filtered out ${incomingNotifications.length - validNotifications.length} invalid notifications`);
      }

      // Si assume che le relazioni siano già risolte nel payload in ingresso

      const cache = apolloClient?.cache;
      if (!cache) {
        console.error('❌ Apollo cache not available');
        throw new Error(t('appSettings.gqlCache.importExport.errors.apolloCacheUnavailable'));
      }

      // Conferma l'import con l'utente
      return new Promise((resolve) => {
        Alert.alert(
          t('appSettings.gqlCache.importExport.importTitle'),
          t('appSettings.gqlCache.importExport.confirmImportMessage', { count: validNotifications.length }),
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
                  console.log('🔄 Writing notifications into Apollo cache...');
                  for (const original of validNotifications) {
                    try {
                      // Sanitize incoming object: remove sensitive keys and ensure required fields
                      const notification = cleanExportData(original);
                      // Ensure masked sensitive fields exist if fragment expects them
                      if (notification?.userDevice) {
                        if (notification.userDevice.deviceToken === undefined) notification.userDevice.deviceToken = '***';
                        if (notification.userDevice.publicKey === undefined) notification.userDevice.publicKey = '***';
                        if (notification.userDevice.privateKey === undefined) notification.userDevice.privateKey = '***';
                      }
                      if (notification.userDevice === undefined) {
                        notification.userDevice = null;
                      }

                      const entityId = cache.identify({ __typename: 'Notification', id: notification.id }) || `Notification:${notification.id}`;
                      cache.writeFragment({
                        id: entityId,
                        fragment: NotificationFragmentDoc as any,
                        fragmentName: 'NotificationFragment',
                        data: notification,
                      });
                    } catch (writeErr) {
                      console.warn('⚠️ Failed to write notification to cache', (original as any)?.id, writeErr);
                    }
                  }
                  console.log('✅ Cache writes completed successfully');

                  // Aggiorna la lista Query.notifications per riflettere subito l'import
                  try {
                    cache.modify({
                      id: 'ROOT_QUERY',
                      fields: {
                        notifications(_existing = [], { toReference }: any) {
                          try {
                            const refs = validNotifications.map((n) => toReference({ __typename: 'Notification', id: n.id }));
                            return refs;
                          } catch {
                            return _existing;
                          }
                        },
                      },
                    });
                    console.log('🧭 Query.notifications updated with imported items');
                  } catch (e) {
                    console.warn('⚠️ Failed to update Query.notifications list:', e);
                  }

                  // Force cache update to ensure UI reflects changes
                  try {
                    console.log('🔄 Triggering cache update...');
                    // Trigger a cache update by reading from cache
                    const updatedCacheData = cache.extract();
                    const updatedNotifications = Object.entries(updatedCacheData)
                      .filter(([key, entity]: [string, any]) => entity && entity.__typename === 'Notification')
                      .length;
                    console.log(`📊 Cache updated - Total notifications in cache: ${updatedNotifications}`);
                    
                    // Force refresh of active queries
                    console.log('🔄 Refreshing active queries...');
                    await apolloClient.refetchQueries({
                      include: 'active',
                    });
                    console.log('✅ Active queries refreshed');
                  } catch (cacheUpdateError) {
                    console.warn('⚠️ Cache update check failed:', cacheUpdateError);
                  }

                  Alert.alert(
                    t('appSettings.gqlCache.importExport.importSuccess'),
                    t('appSettings.gqlCache.importExport.importSuccessMessage', { count: validNotifications.length })
                  );
                  
                  // Notify callback if provided
                  if (onImportComplete) {
                    onImportComplete(validNotifications.length);
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
   * Esporta le notifiche dalla cache GraphQL in un file JSON
   */
  const exportNotifications = useCallback(async (): Promise<boolean> => {
    try {
      // Rimuove entità orfane dalla cache prima dell'estrazione
      try {
        apolloClient?.cache.gc();
      } catch {}
      const notifications = extractNotificationsFromCache();

      if (notifications.length === 0) {
        Alert.alert(t('appSettings.gqlCache.importExport.exportError'), t('appSettings.gqlCache.importExport.noNotificationsToExport'));
        return false;
      }

      // Esporta un array puro di notifiche con relazioni risolte
      const jsonData = JSON.stringify(notifications, null, 2);
      const fileName = `notifications-${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        // Per il web, usa il download diretto
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Per mobile, usa Expo FileSystem e Sharing
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, jsonData, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Export Notifications Cache',
          });
        } else {
          Alert.alert(t('appSettings.gqlCache.importExport.exportComplete'), t('appSettings.gqlCache.importExport.exportCompleteMessage', { path: fileUri }));
        }
      }

      return true;
    } catch (error) {
      console.error('Error exporting notifications:', error);
      Alert.alert(t('appSettings.gqlCache.importExport.exportError'), t('appSettings.gqlCache.importExport.exportError') + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
      return false;
    }
  }, [extractNotificationsFromCache, t]);

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
        fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });

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
    extractNotificationsFromCache,
  };
}
