import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { getSharedMediaCacheDirectoryAsync } from '../utils/shared-cache';
import { Platform } from 'react-native';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { NotificationFragment } from '@/generated/gql-operations-generated';

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
  cache_item: {
    key: string; // cache key
    value: {
      key: string;
      url: string;
      localPath?: string;
      localThumbPath?: string;
      generatingThumbnail: boolean;
      timestamp: number;
      size: number;
      mediaType: string;
      originalFileName?: string;
      downloadedAt?: number;
      notificationDate?: number;
      isDownloading: boolean;
      isPermanentFailure: boolean;
      isUserDeleted: boolean;
      errorCode?: string;
    };
  };
  media_item: {
    key: string; // media key (same as cache_item key)
    value: {
      key: string;
      data: ArrayBuffer; // binary data of the media file
      mediaType: string;
      size: number;
      timestamp: number;
      originalFileName?: string;
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

    // Notifications table for storing notification data
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        read_at TEXT,
        bucket_id TEXT NOT NULL,
        has_attachments INTEGER NOT NULL DEFAULT 0 CHECK (has_attachments IN (0,1)),
        fragment TEXT NOT NULL
      );
    `);

    // Create indexes for performance
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_notifications_bucket_id ON notifications(bucket_id);`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_notifications_has_attachments ON notifications(has_attachments);`);

    // Media items table for storing binary data
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS media_item (
        key TEXT PRIMARY KEY,
        data BLOB NOT NULL,
        media_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        original_file_name TEXT
      );
    `);

    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_media_item_timestamp ON media_item(timestamp);`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_media_item_media_type ON media_item(media_type);`);

    return db;
  })();

  return dbPromise;
}

// Initialize IndexedDB for web
export async function openWebStorageDb(): Promise<IDBPDatabase<WebStorageDB>> {
  if (webDbPromise) return webDbPromise;

  if (Platform.OS !== 'web') {
    throw new Error('openWebStorageDb can only be used on web platform');
  }

  // Wait for IndexedDB to be available with retry logic
  const waitForIndexedDB = async (maxRetries: number = 10, delayMs: number = 500): Promise<void> => {
    for (let i = 0; i < maxRetries; i++) {
      if (typeof indexedDB !== 'undefined') {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    throw new Error('IndexedDB is not available after waiting');
  };

  try {
    // await waitForIndexedDB();
    webDbPromise = openDB<WebStorageDB>('zentik-storage', 5, {
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
        if (!db.objectStoreNames.contains('cache_item')) {
          db.createObjectStore('cache_item');
        }
        if (!db.objectStoreNames.contains('media_item')) {
          db.createObjectStore('media_item');
        }
      },
    });
  } catch (error) {
    console.error('Failed to open web storage db:', error);
    throw error;
  }

  return webDbPromise;
}

/**
 * Helper function to parse NotificationFragment for database storage
 *
 * Maps NotificationFragment fields to database table structure:
 * - id: notification.id (primary key)
 * - created_at: notification.createdAt (required)
 * - read_at: notification.readAt (nullable)
 * - bucket_id: notification.message.bucket.id (required)
 * - has_attachments: boolean flag based on notification.message.attachments.length
 * - fragment: complete NotificationFragment as JSON string
 *
 * @param notification - The NotificationFragment to parse
 * @returns Database record object
 */
export function parseNotificationForDB(notification: NotificationFragment) {
  return {
    id: notification.id,
    created_at: notification.createdAt,
    read_at: notification.readAt,
    bucket_id: notification.message.bucket.id,
    has_attachments: notification.message.attachments && notification.message.attachments.length > 0 ? 1 : 0,
    fragment: JSON.stringify(notification)
  };
}

/**
 * Helper function to parse database record back to NotificationFragment
 *
 * Reconstructs the complete NotificationFragment from database record.
 * The database stores the full NotificationFragment as JSON in the 'fragment' field,
 * so this function simply parses it back.
 *
 * @param dbRecord - The database record to parse
 * @returns Reconstructed NotificationFragment
 */
export function parseNotificationFromDB(dbRecord: any): NotificationFragment {
  return JSON.parse(dbRecord.fragment);
}
