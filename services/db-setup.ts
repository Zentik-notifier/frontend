import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { getSharedMediaCacheDirectoryAsync } from '../utils/shared-cache';
import { Platform } from 'react-native';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { NotificationFragment } from '@/generated/gql-operations-generated';
import { File, Paths } from 'expo-file-system';

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
      bucket_icon_url: string;
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

function isIndexedDBAvailable(): boolean {
  try {
    return (
      typeof globalThis !== 'undefined' &&
      typeof (globalThis as any).indexedDB !== 'undefined' &&
      (globalThis as any).indexedDB !== null
    );
  } catch {
    return false;
  }
}

/**
 * On some PWA environments indexedDB may not be available immediately.
 * This helper waits (with a timeout) until indexedDB appears before
 * attempting to open the database.
 */
async function waitForIndexedDB(timeoutMs: number = 10000, intervalMs: number = 100): Promise<void> {
  // Only relevant on web; on native we skip the check
  if (Platform.OS !== 'web') return;

  if (isIndexedDBAvailable()) {
    return;
  }

  const start = Date.now();

  await new Promise<void>((resolve) => {
    const check = () => {
      if (isIndexedDBAvailable()) {
        resolve();
        return;
      }

      if (Date.now() - start >= timeoutMs) {
        console.warn('[DB] indexedDB not available after waiting, proceeding without guarantee');
        resolve();
        return;
      }

      setTimeout(check, intervalMs);
    };

    check();
  });
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

  // Add timeout to prevent infinite queue waiting
  const operationWithTimeout = async () => {
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timeout after 30s')), 30000)
    );
    
    return Promise.race([
      operation(),
      timeoutPromise
    ]);
  };

  const queued = dbOperationQueue
    .then(() => {
      // Double-check if database is still open
      if (isClosing) {
        throw new Error('Database closed during operation');
      }
      return operationWithTimeout();
    })
    .catch((error) => {
      // Log error but don't crash
      console.warn('[queueDbOperation] Operation failed:', error?.message);
      throw error;
    });

  dbOperationQueue = queued.catch(() => { }); // Don't propagate errors to next operations
  return queued;
}

/**
 * Validate database integrity before operations
 * Prevents crashes from corrupted database files (FS pagein errors)
 */
async function validateDatabase(db: SQLiteDatabase): Promise<boolean> {
  try {
    // Quick integrity check - try to read a simple pragma
    await db.execAsync('PRAGMA quick_check');
    return true;
  } catch (error: any) {
    console.error('[validateDatabase] Database integrity check failed:', error?.message);
    return false;
  }
}

/**
 * Execute a database query with automatic error handling and retry logic
 * This wrapper prevents crashes from SQLite errors (mutex locks, database closed, etc.)
 * 
 * @param operation - The database operation to execute
 * @param operationName - Name for logging purposes
 * @param retryCount - Number of retries on failure (default: 5)
 * @returns Promise with the operation result or throws a safe error
 */
export async function executeQuery<T>(
  operation: (db: any) => Promise<T>,
  operationName: string = 'query',
  retryCount: number = 5
): Promise<T> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      if (Platform.OS === 'web') {
        const db = await openWebStorageDb();
        return await operation(db);
      } else {
        const db = await openSharedCacheDb();
        
        // Validate database integrity before operations (prevents FS pagein errors)
        if (attempt === 0) {
          const isValid = await validateDatabase(db);
          if (!isValid) {
            console.error('[executeQuery] Database integrity check failed, attempting recovery...');
            // Try to recover by closing and reopening
            try {
              await closeSharedCacheDb();
              await new Promise(resolve => setTimeout(resolve, 1000));
              const recoveredDb = await openSharedCacheDb();
              const recoveredValid = await validateDatabase(recoveredDb);
              if (!recoveredValid) {
                throw new Error('Database corruption detected and recovery failed');
              }
            } catch (recoveryError: any) {
              console.error('[executeQuery] Database recovery failed:', recoveryError?.message);
              throw new Error('Database corruption detected');
            }
          }
        }
        
        return await queueDbOperation(() => operation(db));
      }
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || String(error);
      const errorCode = error?.code;

      // Log error with context
      console.warn(
        `[executeQuery] ${operationName} failed (attempt ${attempt + 1}/${retryCount + 1}):`,
        `code=${errorCode || 'unknown'}`,
        errorMessage
      );

      // Don't retry on certain errors
      if (
        errorMessage.includes('closing') ||
        errorMessage.includes('closed') ||
        errorMessage.includes('corruption') ||
        isClosing
      ) {
        console.warn(`[executeQuery] ${operationName} aborted: database is closing or corrupted`);
        break;
      }

      // Special handling for SQLITE_BUSY (code 5) - table locked errors
      // These are temporary and should always be retried with longer delays
      const isBusyError = errorCode === 5 || 
                          errorMessage.includes('SQLITE_BUSY') || 
                          errorMessage.includes('database is locked') ||
                          errorMessage.includes('table is locked');

      if (isBusyError && attempt < retryCount) {
        // For busy errors, use longer exponential backoff
        const busyDelay = 200 * Math.pow(2, attempt);
        console.warn(
          `[executeQuery] ${operationName} - table locked, retrying in ${busyDelay}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, busyDelay));
        continue;
      }

      // Wait before retry with exponential backoff (100ms, 200ms, 400ms, 800ms, 1600ms)
      if (attempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
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
    
    // Validate database file exists and is readable before opening
    // This prevents "FS pagein error" crashes from corrupted files
    try {
      const { File } = await import('expo-file-system');
      const dbPath = `${directory}/cache.db`;
      const dbFile = new File(dbPath);
      
      if (dbFile.exists) {
        // Try to read first byte to verify file is not corrupted
        try {
          const info = await dbFile.info();
          if (info.size === 0) {
            console.warn('[DB] Database file exists but is empty, will recreate');
          }
        } catch (infoError: any) {
          console.warn('[DB] Could not read database file info (may be corrupted):', infoError?.message);
        }
      }
    } catch (fileCheckError: any) {
      // Non-fatal - continue with database open attempt
      console.warn('[DB] File check failed (non-fatal):', fileCheckError?.message);
    }
    
    const db = await openDatabaseAsync('cache.db', undefined, directory);

    // Database configuration optimized for iOS stability and concurrent access
    // WAL mode allows multiple concurrent readers (NCE, NSE, main app)
    // DELETE mode blocks all access when one process has the database open
    // Added integrity check to detect corruption early
    try {
      await db.execAsync(`
        PRAGMA journal_mode=WAL;
        PRAGMA synchronous=NORMAL;
        PRAGMA foreign_keys=ON;
        PRAGMA cache_size=-2000;
        PRAGMA temp_store=MEMORY;
        PRAGMA busy_timeout=5000;
        PRAGMA wal_autocheckpoint=1000;
      `);
      
      // Perform checkpoint after opening to ensure WAL is in good state
      // This prevents "cluster_pagein past EOF" errors
      await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch (pragmaError: any) {
      // If pragmas fail, database may be corrupted
      console.error('[DB] Failed to configure database:', pragmaError?.message);
      // Try to close and throw to trigger recovery
      try {
        await db.closeAsync();
      } catch (closeError) {
        // Ignore close errors
      }
      throw new Error(`Database configuration failed: ${pragmaError?.message}`);
    }

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

    // Migration: Add bucket_icon_url column to notifications if it doesn't exist
    try {
      await db.execAsync(`
        ALTER TABLE notifications ADD COLUMN bucket_icon_url TEXT;
      `);
      console.log('[DB] Migration: Added bucket_icon_url column to notifications');
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

    // Notifications table for storing notification data
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        read_at TEXT,
        bucket_id TEXT NOT NULL,
        bucket_icon_url TEXT,
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
 * 3. Finalizing all statements before closing
 * 4. Then safely closing the database connection
 * 
 * Fixes crash: EXC_BAD_ACCESS on mutex_lock when statements are reset after database close
 */
export async function closeSharedCacheDb(): Promise<void> {
  if (!dbInstance || Platform.OS === 'web' || isClosing) {
    return;
  }

  try {
    // Set flag to prevent new operations
    isClosing = true;
    console.log('[DB] Closing database: waiting for pending operations...');

    // Wait for all pending operations in the queue to complete with timeout
    // This prevents the crash when closeAsync is called while queries are running
    const queueFlushTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Queue flush timeout')), 5000)
    );

    try {
      await Promise.race([
        dbOperationQueue.catch(() => {
          // Ignore errors from pending operations
          console.warn('[DB] Some pending operations failed during close');
        }),
        queueFlushTimeout
      ]);
      console.log('[DB] Operation queue flushed successfully');
    } catch (error) {
      console.warn('[DB] Queue flush timed out, forcing close');
    }

    // CRITICAL: Extended delay to ensure all Expo SQLite statements are finalized
    // The crash logs show that statements can still be alive after queue flush
    // Mutex invalidation occurs when statements try to reset after database close
    // Increasing delay from 500ms to 2000ms to ensure all statements are finalized
    console.log('[DB] Waiting for statement finalization...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Additional safety: Try to checkpoint WAL before closing to reduce file system errors
    // This prevents "cluster_pagein past EOF" errors on next open
    if (dbInstance) {
      try {
        console.log('[DB] Performing final WAL checkpoint...');
        await dbInstance.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
        console.log('[DB] WAL checkpoint completed');
      } catch (checkpointError: any) {
        // Non-fatal - checkpoint may fail if database is already in use
        console.warn('[DB] WAL checkpoint failed (non-fatal):', checkpointError?.message);
      }
    }

    // Now safe to close the database
    if (dbInstance) {
      console.log('[DB] Calling closeAsync...');
      await dbInstance.closeAsync();
      console.log('[DB] Database closed successfully');
    }
  } catch (error: any) {
    // Graceful error handling - don't crash the app
    // Even if close fails, we reset state to allow reopening
    console.error('[DB] Error closing database (non-fatal):', error?.message || error);
  } finally {
    // Always reset state
    dbInstance = null;
    dbPromise = null;
    isClosing = false;
  }
}

/**
 * Delete SQLite database file (mobile only)
 * This function:
 * 1. Closes the database connection safely
 * 2. Deletes the physical database file and WAL files
 * 3. Resets all database state
 * 
 * Use case: Force re-download of all data from backend
 */
export async function deleteSQLiteDatabase(): Promise<void> {
  if (Platform.OS === 'web') {
    console.log('[DB] Web platform uses IndexedDB, use browser tools to clear data');
    return;
  }

  try {
    // First close the database connection
    await closeSharedCacheDb();
    console.log('[DB] Database connection closed, proceeding to delete files...');

    // Import FileSystem module dynamically
    const { File } = await import('expo-file-system');
    const { getSharedMediaCacheDirectoryAsync } = await import('../utils/shared-cache');

    const sharedDir = await getSharedMediaCacheDirectoryAsync();
    const directory = sharedDir.startsWith('file://') ? sharedDir.replace('file://', '') : sharedDir;

    // Delete main database file
    const dbPath = `${directory}/cache.db`;
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;

    const filesToDelete = [
      { path: dbPath, name: 'database' },
      { path: walPath, name: 'WAL' },
      { path: shmPath, name: 'SHM' },
    ];

    for (const { path, name } of filesToDelete) {
      try {
        const file = new File(path);
        if (file.exists) {
          await file.delete();
          console.log(`[DB] ✅ Deleted ${name} file: ${path}`);
        } else {
          console.log(`[DB] ℹ️ ${name} file does not exist: ${path}`);
        }
      } catch (error: any) {
        console.warn(`[DB] ⚠️ Error deleting ${name} file:`, error?.message || error);
      }
    }

    console.log('[DB] ✅ SQLite database deleted successfully');
  } catch (error: any) {
    console.error('[DB] ❌ Error deleting database:', error?.message || error);
    throw error;
  }
}

/**
 * Export SQLite database to SQL dump file (mobile only)
 * This function:
 * 1. Reads all data from the database
 * 2. Generates SQL INSERT statements
 * 3. Saves to a .sql file
 * 
 * @returns Path to the exported SQL file
 */
export async function exportSQLiteDatabaseToFile(): Promise<string> {
  if (Platform.OS === 'web') {
    throw new Error('Database export is only available on mobile platforms');
  }

  try {
    const db = await openSharedCacheDb();

    // Generate SQL dump
    let sqlDump = '-- Zentik SQLite Database Export\n';
    sqlDump += `-- Exported at: ${new Date().toISOString()}\n\n`;
    sqlDump += '-- Disable foreign keys during import\n';
    sqlDump += 'PRAGMA foreign_keys=OFF;\n\n';

    // Get list of all tables
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );

    for (const table of tables) {
      const tableName = table.name;

      // Get table schema
      const schemaResult = await db.getAllAsync<{ sql: string }>(
        `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName]
      );

      if (schemaResult.length > 0 && schemaResult[0].sql) {
        sqlDump += `-- Table: ${tableName}\n`;
        sqlDump += `DROP TABLE IF EXISTS ${tableName};\n`;
        sqlDump += `${schemaResult[0].sql};\n\n`;
      }

      // Get all rows from table
      const rows = await db.getAllAsync(`SELECT * FROM ${tableName}`);

      if (rows.length > 0) {
        sqlDump += `-- Data for table: ${tableName}\n`;

        for (const row of rows) {
          const rowData = row as Record<string, any>;
          const columns = Object.keys(rowData);
          const values = columns.map(col => {
            const val = rowData[col];
            if (val === null) return 'NULL';
            if (typeof val === 'number') return val.toString();
            // Escape single quotes in strings
            return `'${String(val).replace(/'/g, "''")}'`;
          });

          sqlDump += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }

        sqlDump += '\n';
      }
    }

    // Get indices
    const indices = await db.getAllAsync<{ name: string; sql: string }>(
      "SELECT name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
    );

    if (indices.length > 0) {
      sqlDump += '-- Indices\n';
      for (const index of indices) {
        if (index.sql) {
          sqlDump += `${index.sql};\n`;
        }
      }
      sqlDump += '\n';
    }

    sqlDump += '-- Re-enable foreign keys\n';
    sqlDump += 'PRAGMA foreign_keys=ON;\n';

    // Save to file using new API
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `zentik-db-export-${timestamp}.sql`;

    // Create and write file in one operation
    const file = new File(Paths.cache, fileName);
    file.write(sqlDump);

    console.log(`[DB] ✅ Database exported to: ${file.uri}`);
    return file.uri;
  } catch (error: any) {
    console.error('[DB] ❌ Error exporting database:', error?.message || error);
    throw error;
  }
}

/**
 * Import SQLite database from SQL dump file (mobile only)
 * This function:
 * 1. Deletes the existing database
 * 2. Creates a new database
 * 3. Executes all SQL statements from the dump file
 * 
 * @param filePath Path to the SQL dump file
 */
export async function importSQLiteDatabaseFromFile(filePath: string): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Database import is only available on mobile platforms');
  }

  try {
    const { File } = await import('expo-file-system');

    // Read SQL dump file using new API
    const file = new File(filePath);

    if (!file.exists) {
      throw new Error('SQL dump file does not exist');
    }

    const sqlDump = await file.text();

    if (!sqlDump || sqlDump.trim().length === 0) {
      throw new Error('SQL dump file is empty');
    }

    console.log('[DB] 📥 Importing database from file...');

    // Close and delete existing database
    await deleteSQLiteDatabase();

    // Wait a bit to ensure file system is ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Open new database (will be created automatically)
    const db = await openSharedCacheDb();

    // Split SQL dump into individual statements
    // This is a simple split - for production you might want a proper SQL parser
    const statements = sqlDump
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`[DB] 📝 Executing ${statements.length} SQL statements...`);

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        await db.execAsync(statement + ';');
        successCount++;
      } catch (error: any) {
        // Log error but continue with other statements
        console.warn(`[DB] ⚠️ Error executing statement: ${error?.message}`);
        console.warn(`Statement: ${statement.substring(0, 100)}...`);
        errorCount++;
      }
    }

    console.log(`[DB] ✅ Database import completed: ${successCount} success, ${errorCount} errors`);

    if (errorCount > statements.length / 2) {
      throw new Error(`Too many errors during import: ${errorCount}/${statements.length} statements failed`);
    }
  } catch (error: any) {
    console.error('[DB] ❌ Error importing database:', error?.message || error);
    throw error;
  }
}

// Initialize IndexedDB for web
export async function openWebStorageDb(): Promise<IDBPDatabase<WebStorageDB>> {
  if (webDbPromise) return webDbPromise;

  if (Platform.OS !== 'web') {
    return {} as IDBPDatabase<WebStorageDB>;
  }

  try {
    await waitForIndexedDB();
    // If indexedDB is still not available (e.g. during SSR / Node build),
    // avoid calling openDB from idb which expects a browser environment.
    if (!isIndexedDBAvailable()) {
      console.warn('[DB] IndexedDB not available in this environment, skipping web storage DB initialization');

      // In non-browser environments (build, Node) return a stub object instead of throwing,
      // so that static builds like `npm run build:web` don't fail.
      if (typeof window === 'undefined') {
        return {} as IDBPDatabase<WebStorageDB>;
      }

      throw new Error('IndexedDB not available');
    }

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
          notificationsStore.createIndex('bucket_icon_url', 'bucket_icon_url');
        } else if (oldVersion < 8) {
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
          if (!notificationsStore.indexNames.contains('bucket_icon_url')) {
            notificationsStore.createIndex('bucket_icon_url', 'bucket_icon_url');
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

    // During non-browser execution (SSR / build), swallow the error and return a stub DB
    // so that the process can continue; actual web runtime will have IndexedDB.
    if (typeof window === 'undefined') {
      return {} as IDBPDatabase<WebStorageDB>;
    }

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
 * - bucket_icon_url: notification.message.bucket.iconUrl (nullable)
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
    bucket_icon_url: notification.message.bucket.iconUrl || null,
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
        rootBucketId: notification?.bucketId || 'missing',
        notification
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
