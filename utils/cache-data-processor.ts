import { NotificationFragmentDoc, GetNotificationsDocument } from '@/generated/gql-operations-generated';
import { InMemoryCache } from '@apollo/client';

/**
 * Estrae tutte le entità da un oggetto e le restituisce come mappa
 * Ogni entità con __typename e id viene estratta e mappata con la sua chiave cache
 */
export const extractAllEntities = (obj: any, entities = new Map<string, any>(), visited = new Set<string>()): Map<string, any> => {
  if (!obj || typeof obj !== 'object') {
    return entities;
  }

  if (Array.isArray(obj)) {
    obj.forEach(item => extractAllEntities(item, entities, visited));
    return entities;
  }

  if (obj.__typename && obj.id) {
    const entityKey = `${obj.__typename}:${obj.id}`;

    if (visited.has(entityKey)) {
      return entities;
    }
    visited.add(entityKey);

    entities.set(entityKey, { ...obj, userDevice: null });

    Object.values(obj).forEach(value => {
      extractAllEntities(value, entities, visited);
    });

    visited.delete(entityKey);
  } else {
    Object.values(obj).forEach(value => {
      extractAllEntities(value, entities, visited);
    });
  }

  return entities;
};

/**
 * Scrive tutte le entità estratte nella cache Apollo
 */
export const writeEntitiesToCache = (
  cache: InMemoryCache,
  entities: Map<string, any>,
  context: string = 'cache'
): number => {
  let successCount = 0;

  entities.forEach((entity, entityKey) => {
    try {
      cache.writeFragment({
        id: entityKey,
        fragment: NotificationFragmentDoc,
        fragmentName: 'NotificationFragment',
        data: entity,
      });

      successCount++;
    } catch (error) {
      console.warn(`⚠️ [${context}] Failed to write ${entityKey}:`, error);
    }
  });

  // console.log(`✅ [${context}] Successfully wrote ${successCount}/${entities.size} entities`);
  return successCount;
};

/**
 * Processa un array di notifiche complete e scrive tutte le entità nella cache
 */
export const processNotificationsToCache = (
  cache: InMemoryCache,
  notifications: any[],
  context: string = 'import'
): number => {
  console.log(`🔄 [${context}] Processing ${notifications.length} notifications...`);

  // Estrai tutte le entità da tutte le notifiche
  const allEntities = new Map<string, any>();

  notifications.forEach(notification => {
    extractAllEntities(notification, allEntities);
  });

  writeEntitiesToCache(cache, allEntities, context);

  let notificationCount = 0;
  allEntities.forEach((entity) => {
    if (entity.__typename === 'Notification') {
      notificationCount++;
    }
  });

  return notificationCount;
};

/**
 * Processa notifiche e aggiorna anche la query ROOT_QUERY.notifications
 * Questa è la funzione completa che dovrebbe essere usata per import e caricamento cache
 */
export const processNotificationsToCacheWithQuery = (
  cache: InMemoryCache,
  notifications: any[],
  context: string = 'import',
  maxBatch?: number
): number => {
  // Prima scrivi tutte le entità
  const notificationCount = processNotificationsToCache(cache, notifications, context);

  // Poi scrivi direttamente la query GetNotifications
  try {
    cache.writeQuery({
      query: GetNotificationsDocument,
      data: {
        notifications: notifications
      }
    });
    console.log(`🧭 [${context}] Query.notifications written directly with ${notifications.length} items`);
  } catch (e) {
    console.warn(`⚠️ [${context}] Failed to write Query.notifications:`, e);
  }

  return notificationCount;
};

/**
 * Valida che una notifica abbia i campi necessari
 */
export const validateNotification = (notification: any, index?: number): boolean => {
  if (!notification.id) {
    console.warn(`⚠️ Notification at index ${index ?? 'unknown'} missing ID`);
    return false;
  }
  if (!notification.__typename || notification.__typename !== 'Notification') {
    console.warn(`⚠️ Notification at index ${index ?? 'unknown'} missing or invalid __typename:`, notification.__typename);
    return false;
  }
  return true;
};

/**
 * Parsa il contenuto JSON e restituisce un array di notifiche
 */
export const parseNotificationJson = (jsonContent: string): any[] => {
  console.log('📄 JSON content length:', jsonContent.length);

  if (!jsonContent || jsonContent.trim().length === 0) {
    console.error('❌ Empty JSON content');
    throw new Error('File JSON vuoto o non valido');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (parseError) {
    console.error('❌ JSON parse error:', parseError);
    throw new Error('Formato JSON non valido');
  }

  // Supporta sia array diretto che formato { notifications: [...] }
  const notifications: any[] = Array.isArray(parsed)
    ? parsed
    : (Array.isArray(parsed?.notifications) ? parsed.notifications : []);

  if (!Array.isArray(notifications)) {
    console.error('❌ Invalid notifications payload:', parsed);
    throw new Error('Array di notifiche non trovato nel JSON');
  }

  return notifications;
};

/**
 * Funzione completa per processare JSON raw e scrivere tutto nella cache
 * Gestisce parsing, validazione, scrittura entità e aggiornamento query
 */
export const processJsonToCache = async (
  cache: InMemoryCache,
  jsonContent: string,
  context: string = 'import',
  maxBatch?: number
): Promise<number> => {
  console.log(`🔄 [${context}] Processing JSON content...`);

  // 1. Parsa il JSON
  const notifications = parseNotificationJson(jsonContent);

  // 2. Valida le notifiche
  const validNotifications = notifications.filter((notification, index) =>
    validateNotification(notification, index)
  );

  if (validNotifications.length === 0) {
    console.error(`❌ [${context}] No valid notifications found`);
    throw new Error('Nessuna notifica valida trovata');
  }

  if (validNotifications.length !== notifications.length) {
    console.warn(`⚠️ [${context}] Filtered out ${notifications.length - validNotifications.length} invalid notifications`);
  }

  if (!maxBatch) {
    const successCount = processNotificationsToCacheWithQuery(
      cache,
      validNotifications,
      context,
      maxBatch
    );
    return successCount;
  }

  let totalCount = 0;
  for (let i = 0; i < validNotifications.length; i += maxBatch) {
    const batch = validNotifications.slice(i, i + maxBatch);
    const batchIndex = Math.floor(i / maxBatch) + 1;
    const batchContext = `${context} batch ${batchIndex}`;

    const count = processNotificationsToCacheWithQuery(
      cache,
      batch,
      batchContext,
      maxBatch
    );
    totalCount += count;

    if (i + maxBatch < validNotifications.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return totalCount;
};

/**
 * Pulisce i dati rimuovendo campi non necessari per l'export
 */
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
      // Rimuovi metadati interni di Apollo Cache (mantieni solo __typename)
      if (key.startsWith('__') && key !== '__typename') {
        return;
      }

      // Maschera informazioni sensibili
      if (key === 'publicKey' || key === 'privateKey' || key === 'deviceToken') {
        cleaned[key] = '***';
        return;
      }

      cleaned[key] = cleanExportData(value);
    });

    return cleaned;
  }

  return data;
};