import { GetNotificationsDocument, NotificationFragment, NotificationFragmentDoc } from '@/generated/gql-operations-generated';
import { ApolloCache } from '@apollo/client';

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

    entities.set(entityKey, obj);

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
  cache: ApolloCache<any>,
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

  return successCount;
};

/**
 * Processa un array di notifiche complete e scrive tutte le entità nella cache
 */
export const processNotificationsToCache = (
  cache: ApolloCache<any>,
  notifications: any[],
  context: string = 'import'
): number => {
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
  cache: ApolloCache<any>,
  notifications: any[],
  context: string = 'import',
): number => {
  const notificationCount = processNotificationsToCache(cache, notifications, context);

  try {
    cache.writeQuery({
      query: GetNotificationsDocument,
      data: {
        notifications
      }
    });
  } catch (e) {
    console.warn(`⚠️ [${context}] Failed to write Query.notifications:`, e);
  }

  return notificationCount;
};

/**
 * Valida che una notifica abbia i campi necessari
 */
export const validateNotification = (notification: NotificationFragment, index?: number): boolean => {
  if (!notification.id) {
    console.warn(`Notification at index ${index ?? 'unknown'} missing ID`);
    return false;
  }
  if (!notification.__typename || notification.__typename !== 'Notification') {
    console.warn(`Notification at index ${index ?? 'unknown'} missing or invalid __typename:`, notification.__typename);
    return false;
  }
  if (notification.message.tapAction && !notification.message.tapAction.type) {
    console.warn(`Notification at index ${index ?? 'unknown'} missing tap action type`);
    return false;
  }
  return true;
};


const INIT_BATCH_SIZE = 50;
/**
 * Funzione completa per processare JSON raw e scrivere tutto nella cache
 * Gestisce parsing, validazione, scrittura entità e aggiornamento query
 */
export const processJsonToCache = async (
  cache: ApolloCache<any>,
  notificationsParent: NotificationFragment[],
  context: string = 'import',
): Promise<number> => {
  const startTime = Date.now();

  // const notifications = notificationsParent.filter((notification, index) =>
  //   validateNotification(notification, index)
  // );
  const notifications = notificationsParent;

  if (notificationsParent.length !== notifications.length) {
    console.warn(`[${context}] Filtered out ${notifications.length - notificationsParent.length} invalid notifications`);
  }

  let totalCount = 0;
  const firstBatch = notifications.slice(0, INIT_BATCH_SIZE);
  const firstBatchContext = `${context} batch 1`;

  const firstCount = processNotificationsToCacheWithQuery(
    cache,
    firstBatch,
    firstBatchContext,
  );
  console.log(`[${firstBatchContext}] Processed ${firstBatch.length} notifications...`);
  totalCount += firstCount;

  // Wait before processing remaining notifications
  if (notifications.length > INIT_BATCH_SIZE) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Process remaining notifications in second batch
  if (notifications.length > INIT_BATCH_SIZE) {
    const remainingBatch = notifications.slice(INIT_BATCH_SIZE);
    const remainingBatchContext = `${context} batch 2`;

    const remainingCount = processNotificationsToCacheWithQuery(
      cache,
      remainingBatch,
      remainingBatchContext,
    );
    console.log(`[${remainingBatchContext}] Processed ${remainingBatch.length} notifications...`);
    totalCount += remainingCount;
  }

  const endTime = Date.now();
  console.log(`[${context}] Finish processing ${notifications.length} notifications in ${(endTime - startTime) / 1000} seconds`);
  return totalCount;
};
