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
    indexes: {
      created_at: string; // ISO timestamp
      read_at: string; // ISO timestamp
      bucket_id: string;
    };
  };
  buckets: {
    key: string; // bucketId
    value: {
      id: string;
      name: string;
      icon?: string;
      description?: string;
      fragment: string; // Complete bucket data as JSON
      updated_at: string; // ISO timestamp
      synced_at: number; // Timestamp when last synced with backend
    };
    indexes: {
      updated_at: string;
      synced_at: number;
    };
  };
  deleted_notifications: {
    key: string; // notificationId
    value: {
      id: string;
      deleted_at: number; // Timestamp when deleted locally
      retry_count: number; // Number of retry attempts to delete on server
      last_retry_at?: number; // Timestamp of last retry attempt
    };
    indexes: {
      deleted_at: number;
    };
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
      notificationId?: string;
      isDownloading: boolean;
      isPermanentFailure: boolean;
      isUserDeleted: boolean;
      errorCode?: string;
    };
  };
  media_item: {
    key: string;
    value: {
      data: ArrayBuffer;
      key: string;
    };
  };
}

let dbPromise: Promise<SQLiteDatabase> | null = null;
let webDbPromise: Promise<IDBPDatabase<WebStorageDB>> | null = null;
let dbInstance: SQLiteDatabase | null = null;
let isClosing = false; // Flag to prevent operations during database close

// Prevent concurrent database operations
let dbOperationQueue: Promise<any> = Promise.resolve();

/**
 * Queue database operations to prevent concurrent access issues
 * This prevents the mutex contention issues seen in crash logs
 */
export function queueDbOperation<T>(operation: () => Promise<T>): Promise<T> {
  // Reject operations if database is being closed
  if (isClosing) {
    return Promise.reject(new Error('Database is closing, operation rejected'));
  }

  const queued = dbOperationQueue
    .then(() => {
      // Double-check if database is still open
      if (isClosing) {
        throw new Error('Database closed during operation');
      }
      return operation();
    })
    .catch((error) => {
      // Log error but don't crash
      console.warn('[queueDbOperation] Operation failed:', error?.message);
      throw error;
    });
  
  dbOperationQueue = queued.catch(() => {}); // Don't propagate errors to next operations
  return queued;
}

/**
 * Execute a database query with automatic error handling and retry logic
 * This wrapper prevents crashes from SQLite errors (mutex locks, database closed, etc.)
 * 
 * @param operation - The database operation to execute
 * @param operationName - Name for logging purposes
 * @param retryCount - Number of retries on failure (default: 1)
 * @returns Promise with the operation result or throws a safe error
 */
export async function executeQuery<T>(
  operation: (db: any) => Promise<T>,
  operationName: string = 'query',
  retryCount: number = 1
): Promise<T> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      if (Platform.OS === 'web') {
        const db = await openWebStorageDb();
        return await operation(db);
      } else {
        const db = await openSharedCacheDb();
        return await queueDbOperation(() => operation(db));
      }
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || String(error);
      
      // Log error with context
      console.warn(
        `[executeQuery] ${operationName} failed (attempt ${attempt + 1}/${retryCount + 1}):`,
        errorMessage
      );

      // Don't retry on certain errors
      if (
        errorMessage.includes('closing') ||
        errorMessage.includes('closed') ||
        isClosing
      ) {
        console.warn(`[executeQuery] ${operationName} aborted: database is closing`);
        break;
      }

      // Wait before retry
      if (attempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
      }
    }
  }

  // All retries failed - return safe default or throw
  console.error(
    `[executeQuery] ${operationName} failed after ${retryCount + 1} attempts:`,
    lastError?.message || lastError
  );
  
  throw new Error(`Database operation failed: ${operationName}`);
}

export async function openSharedCacheDb(): Promise<SQLiteDatabase> {
  if (dbInstance && !isClosing) return dbInstance;
  if (dbPromise && !isClosing) return dbPromise;

  if (Platform.OS === 'web') {
    return {} as SQLiteDatabase;
  }

  // Reset closing flag when opening database
  isClosing = false;

  dbPromise = (async () => {
    const sharedDir = await getSharedMediaCacheDirectoryAsync();
    // expo-sqlite expects databaseName and an optional directory path (not URI)
    const directory = sharedDir.startsWith('file://') ? sharedDir.replace('file://', '') : sharedDir;
    console.log('[DB] Opening shared cache database at directory:', directory);
    const db = await openDatabaseAsync('cache.db', undefined, directory);

    // Database configuration optimized for iOS stability and concurrent access
    // WAL mode allows multiple concurrent readers (NCE, NSE, main app)
    // DELETE mode blocks all access when one process has the database open
    await db.execAsync(`
      PRAGMA journal_mode=WAL;
      PRAGMA synchronous=NORMAL;
      PRAGMA foreign_keys=ON;
      PRAGMA cache_size=-2000;
      PRAGMA temp_store=MEMORY;
      PRAGMA wal_autocheckpoint=1000;
      PRAGMA wal_checkpoint(TRUNCATE);
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
        notification_id TEXT,
        is_downloading INTEGER NOT NULL DEFAULT 0 CHECK (is_downloading IN (0,1)),
        is_permanent_failure INTEGER NOT NULL DEFAULT 0 CHECK (is_permanent_failure IN (0,1)),
        is_user_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_user_deleted IN (0,1)),
        error_code TEXT
      );
    `);

    // Migration: Add notification_id column if it doesn't exist (for existing databases)
    try {
      await db.execAsync(`
        ALTER TABLE cache_item ADD COLUMN notification_id TEXT;
      `);
      console.log('[DB] Migration: Added notification_id column to cache_item');
    } catch (error: any) {
      // Column already exists or other error - safe to ignore
      if (!error?.message?.includes('duplicate column name')) {
        console.warn('[DB] Migration warning (safe to ignore if column exists):', error?.message);
      }
    }

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

    // Buckets table for caching bucket metadata
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS buckets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        description TEXT,
        fragment TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at INTEGER NOT NULL
      );
    `);

    // Create indexes for buckets
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_buckets_updated_at ON buckets(updated_at);`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_buckets_synced_at ON buckets(synced_at);`);

    // Deleted notifications tombstone table - tracks notifications deleted locally
    // These should not be re-added to cache even if they come from backend sync
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS deleted_notifications (
        id TEXT PRIMARY KEY,
        deleted_at INTEGER NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_retry_at INTEGER
      );
    `);

    // Create index for cleanup queries
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_deleted_notifications_deleted_at ON deleted_notifications(deleted_at);`);

    // Store instance for reuse
    dbInstance = db;
    
    return db;
  })();

  return dbPromise;
}

/**
 * Close database connection when app goes to background
 * Helps prevent memory pressure and improves iOS stability
 * 
 * CRITICAL: This function prevents race conditions by:
 * 1. Setting isClosing flag to reject new operations
 * 2. Waiting for all pending operations to complete
 * 3. Then safely closing the database connection
 */
export async function closeSharedCacheDb(): Promise<void> {
  if (!dbInstance || Platform.OS === 'web' || isClosing) {
    return;
  }

  try {
    // Set flag to prevent new operations
    isClosing = true;
    console.log('[DB] Closing database: waiting for pending operations...');

    // Wait for all pending operations in the queue to complete
    // This prevents the crash when closeAsync is called while queries are running
    await dbOperationQueue.catch(() => {
      // Ignore errors from pending operations
      console.warn('[DB] Some pending operations failed during close');
    });

    // Small delay to ensure all operations have truly completed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now safe to close the database
    if (dbInstance) {
      await dbInstance.closeAsync();
      console.log('[DB] Database closed successfully');
    }
  } catch (error: any) {
    // Graceful error handling - don't crash the app
    console.error('[DB] Error closing database (non-fatal):', error?.message || error);
  } finally {
    // Always reset state
    dbInstance = null;
    dbPromise = null;
    isClosing = false;
  }
}

// Initialize IndexedDB for web
export async function openWebStorageDb(): Promise<IDBPDatabase<WebStorageDB>> {
  if (webDbPromise) return webDbPromise;

  if (Platform.OS !== 'web') {
    return {} as IDBPDatabase<WebStorageDB>;
  }

  try {
    // await waitForIndexedDB();
    webDbPromise = openDB<WebStorageDB>('zentik-storage', 9, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('keyvalue')) {
          db.createObjectStore('keyvalue');
        }
        
        // Notifications store with indices for efficient querying
        if (!db.objectStoreNames.contains('notifications')) {
          const notificationsStore = db.createObjectStore('notifications');
          notificationsStore.createIndex('created_at', 'created_at');
          notificationsStore.createIndex('read_at', 'read_at');
          notificationsStore.createIndex('bucket_id', 'bucket_id');
        } else if (oldVersion < 7) {
          // Upgrade existing store to add indices
          const notificationsStore = transaction.objectStore('notifications');
          if (!notificationsStore.indexNames.contains('created_at')) {
            notificationsStore.createIndex('created_at', 'created_at');
          }
          if (!notificationsStore.indexNames.contains('read_at')) {
            notificationsStore.createIndex('read_at', 'read_at');
          }
          if (!notificationsStore.indexNames.contains('bucket_id')) {
            notificationsStore.createIndex('bucket_id', 'bucket_id');
          }
        }
        
        // Buckets store for caching bucket metadata
        if (!db.objectStoreNames.contains('buckets')) {
          const bucketsStore = db.createObjectStore('buckets');
          bucketsStore.createIndex('updated_at', 'updated_at');
          bucketsStore.createIndex('synced_at', 'synced_at');
        }
        
        // Deleted notifications tombstone store (v9)
        if (!db.objectStoreNames.contains('deleted_notifications')) {
          const deletedStore = db.createObjectStore('deleted_notifications');
          deletedStore.createIndex('deleted_at', 'deleted_at');
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
 * Validate that a notification has all required properties
 * @param notification - The notification object to validate
 * @returns true if valid, false if corrupted
 */
export function isValidNotification(notification: any): boolean {
  try {
    // Check required top-level properties
    if (!notification || typeof notification !== 'object') {
      return false;
    }

    if (!notification.id || typeof notification.id !== 'string') {
      return false;
    }

    if (!notification.createdAt || typeof notification.createdAt !== 'string') {
      return false;
    }

    // readAt can be null/undefined (unread notifications)
    if (notification.readAt !== null && notification.readAt !== undefined && typeof notification.readAt !== 'string') {
      return false;
    }

    // Check required message object
    if (!notification.message || typeof notification.message !== 'object') {
      return false;
    }

    // Check required bucket object inside message
    if (!notification.message.bucket || typeof notification.message.bucket !== 'object') {
      return false;
    }

    if (!notification.message.bucket.id || typeof notification.message.bucket.id !== 'string') {
      return false;
    }

    // All essential properties are present and valid
    return true;
  } catch (error) {
    console.error('[isValidNotification] Validation error:', error);
    return false;
  }
}

/**
 * Delete a corrupted notification from the database
 * @param notificationId - ID of the notification to delete
 * @param db - Optional database instance (if already open)
 */
async function deleteCorruptedNotification(notificationId: string, db?: any): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      const database = db || await openWebStorageDb();
      await database.delete('notifications', notificationId);
      console.warn(`[deleteCorruptedNotification] Removed corrupted notification from cache: ${notificationId}`);
    } else {
      const database = db || await openSharedCacheDb();
      await database.runAsync('DELETE FROM notifications WHERE id = ?', [notificationId]);
      console.warn(`[deleteCorruptedNotification] Removed corrupted notification from cache: ${notificationId}`);
    }
  } catch (error) {
    console.error(`[deleteCorruptedNotification] Failed to delete corrupted notification ${notificationId}:`, error);
  }
}

/**
 * Helper function to parse database record back to NotificationFragment
 *
 * Reconstructs the complete NotificationFragment from database record.
 * The database stores the full NotificationFragment as JSON in the 'fragment' field,
 * but we also store key fields as columns for efficient querying.
 * 
 * IMPORTANT: Column values take precedence over JSON fragment values to ensure consistency.
 *
 * @param dbRecord - The database record to parse
 * @param db - Optional database instance for removing corrupted records
 * @returns Reconstructed NotificationFragment or null if corrupted
 */
export function parseNotificationFromDB(dbRecord: any, db?: any): NotificationFragment | null {
  try {
    const notification = typeof dbRecord.fragment === 'string' ? JSON.parse(dbRecord.fragment) : dbRecord.fragment;
    
    // Override with column values to ensure consistency
    // This fixes the bug where read_at column is null but fragment JSON has a timestamp
    if (dbRecord.read_at !== undefined) {
      notification.readAt = dbRecord.read_at;
    }
    
    if (dbRecord.created_at !== undefined) {
      notification.createdAt = dbRecord.created_at;
    }

    // Validate the notification
    if (!isValidNotification(notification)) {
      console.error('[parseNotificationFromDB] Corrupted notification detected:', {
        id: notification?.id || 'unknown',
        hasMessage: !!notification?.message,
        hasBucket: !!notification?.message?.bucket,
        hasCreatedAt: !!notification?.createdAt,
      });
      
      // Delete corrupted notification from database (async, non-blocking)
      const notificationId = notification?.id || dbRecord.id;
      if (notificationId) {
        deleteCorruptedNotification(notificationId, db).catch(err => {
          console.error('[parseNotificationFromDB] Failed to delete corrupted notification:', err);
        });
      }
      
      return null;
    }
    
    return notification as NotificationFragment;
  } catch (error) {
    console.error('[parseNotificationFromDB] Parse error:', error);
    
    // Try to delete using dbRecord.id if available
    const notificationId = dbRecord?.id;
    if (notificationId) {
      deleteCorruptedNotification(notificationId, db).catch(err => {
        console.error('[parseNotificationFromDB] Failed to delete corrupted notification:', err);
      });
    }
    
    return null;
  }
}
