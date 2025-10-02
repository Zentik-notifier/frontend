import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { getSharedMediaCacheDirectoryAsync } from '../utils/shared-cache';
import { IS_FS_SUPPORTED } from '@/utils/fileUtils';
import { Platform } from 'react-native';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// IndexedDB schema for web storage
export interface WebStorageDB extends DBSchema {
  keyvalue: {
    key: string;
    value: string;
  };
  notifications: {
    key: string; // notificationId
    value: any; // GraphQL Notification object
  };
  app_log: {
    key: number; // timestamp
    value: {
      level: string;
      tag?: string;
      message: string;
      meta_json?: string;
      timestamp: number;
    };
  };
}

let dbPromise: Promise<SQLiteDatabase> | null = null;
let webDbPromise: Promise<IDBPDatabase<WebStorageDB>> | null = null;

export async function openSharedCacheDb(): Promise<SQLiteDatabase> {
  if (dbPromise) return dbPromise;

  if (Platform.OS === 'web') {
    return {} as SQLiteDatabase;
  }

  dbPromise = (async () => {
    const sharedDir = await getSharedMediaCacheDirectoryAsync();
    // expo-sqlite expects databaseName and an optional directory path (not URI)
    const directory = sharedDir.startsWith('file://') ? sharedDir.replace('file://', '') : sharedDir;
    const db = await openDatabaseAsync('cache.db', undefined, directory);

    await db.execAsync(`
      PRAGMA journal_mode=WAL;
      PRAGMA synchronous=NORMAL;
      PRAGMA foreign_keys=ON;
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cache_item (
        key TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        media_type TEXT NOT NULL,
        local_path TEXT,
        local_thumb_path TEXT,
        generating_thumbnail INTEGER NOT NULL DEFAULT 0 CHECK (generating_thumbnail IN (0,1)),
        timestamp INTEGER NOT NULL,
        size INTEGER NOT NULL,
        original_file_name TEXT,
        downloaded_at INTEGER NOT NULL,
        notification_date INTEGER,
        is_downloading INTEGER NOT NULL DEFAULT 0 CHECK (is_downloading IN (0,1)),
        is_permanent_failure INTEGER NOT NULL DEFAULT 0 CHECK (is_permanent_failure IN (0,1)),
        is_user_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_user_deleted IN (0,1)),
        error_code TEXT
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_cache_item_downloaded_at ON cache_item(downloaded_at);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_cache_item_notification_date ON cache_item(notification_date);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_cache_item_media_type ON cache_item(media_type);
    `);

    await db.execAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_item_key ON cache_item(key);`);

    // Additional indexes to speed up common queries
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_cache_item_timestamp ON cache_item(timestamp);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_cache_item_is_downloading ON cache_item(is_downloading);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_cache_item_generating_thumbnail ON cache_item(generating_thumbnail);
    `);

    // Application logs table (keeps last 24h)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        tag TEXT,
        message TEXT NOT NULL,
        meta_json TEXT,
        timestamp INTEGER NOT NULL
      );
    `);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_app_log_timestamp ON app_log(timestamp);`);

    return db;
  })();

  return dbPromise;
}

// Initialize IndexedDB for web
export async function openWebStorageDb(): Promise<IDBPDatabase<WebStorageDB>> {
  if (webDbPromise) return webDbPromise;
  console.log('OPENING WEB STORAGE DB');

  if (Platform.OS !== 'web') {
    throw new Error('openWebStorageDb can only be used on web platform');
  }

  try {
    webDbPromise = openDB<WebStorageDB>('zentik-storage', 3, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('keyvalue')) {
          db.createObjectStore('keyvalue');
        }
        if (!db.objectStoreNames.contains('notifications')) {
          db.createObjectStore('notifications');
        }
        if (!db.objectStoreNames.contains('app_log')) {
          db.createObjectStore('app_log', { keyPath: 'timestamp' });
        }
      },
    });
  } catch (error) {
    console.error('Failed to open web storage db:', error);
    throw error;
  }

  return webDbPromise;
}

// Notification cache functions
export async function saveNotificationToCache(notificationData: any): Promise<void> {
  if (Platform.OS !== 'web') return;

  const db = await openWebStorageDb();
  await db.put('notifications', notificationData, notificationData.id);
}

export async function getNotificationFromCache(notificationId: string): Promise<any | null> {
  if (Platform.OS !== 'web') return null;

  try {
    const db = await openWebStorageDb();
    const result = await db.get('notifications', notificationId);
    return result || null;
  } catch {
    return null;
  }
}

export async function getAllNotificationsFromCache(): Promise<any[]> {
  if (Platform.OS !== 'web') return [];

  try {
    const db = await openWebStorageDb();
    const results = await db.getAll('notifications');
    return results;
  } catch {
    return [];
  }
}

export async function removeNotificationFromCache(notificationId: string): Promise<void> {
  if (Platform.OS !== 'web') return;

  try {
    const db = await openWebStorageDb();
    await db.delete('notifications', notificationId);
  } catch {
    // Ignore errors
  }
}

export async function clearAllNotificationsFromCache(): Promise<void> {
  if (Platform.OS !== 'web') return;

  try {
    const db = await openWebStorageDb();
    await db.clear('notifications');
  } catch {
    // Ignore errors
  }
}

export async function upsertNotificationsBatch(notifications: any[]): Promise<void> {
  if (Platform.OS !== 'web' || notifications.length === 0) return;

  try {
    const db = await openWebStorageDb();
    const tx = db.transaction('notifications', 'readwrite');

    for (const notification of notifications) {
      await tx.store.put(notification, notification.id);
    }

    await tx.done;
  } catch (error) {
    console.error('Failed to upsert notifications batch:', error);
  }
}


