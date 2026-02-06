import { getSharedMediaCacheDirectoryAsync } from '../utils/shared-cache';

export interface ISharedCacheDb {
  getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>;
  runAsync(sql: string, params?: any[]): Promise<{ changes: number }>;
  execAsync(sql: string): Promise<void>;
  closeAsync(): Promise<void>;
}
import { Alert, Platform } from 'react-native';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { NotificationFragment } from '@/generated/gql-operations-generated';
import { File, Paths } from 'expo-file-system';
import { databaseRecoveryService } from './database-recovery-service';

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

let dbPromise: Promise<ISharedCacheDb> | null = null;
let webDbPromise: Promise<IDBPDatabase<WebStorageDB>> | null = null;
let dbInstance: ISharedCacheDb | null = null;
let isClosing = false; // Flag to prevent operations during database close

let iosBridgeDbPromise: Promise<ISharedCacheDb> | null = null;

type IosBridge = {
  dbExecuteQuery: (sql: string, params?: any[]) => Promise<any[]>;
  dbExecuteUpdate: (sql: string, params?: any[]) => Promise<{ success: boolean; changes: number }>;
};

function createBridgeCacheDbAdapter(bridge: IosBridge): ISharedCacheDb {
  return {
    getFirstAsync: async <T = any>(sql: string, params?: any[]): Promise<T | undefined> => {
      const rows = await bridge.dbExecuteQuery(sql, params ?? []);
      return (rows[0] as T) ?? undefined;
    },
    getAllAsync: async <T = any>(sql: string, params?: any[]): Promise<T[]> => {
      return (await bridge.dbExecuteQuery(sql, params ?? [])) as T[];
    },
    runAsync: async (sql: string, params?: any[]): Promise<{ changes: number }> => {
      const r = await bridge.dbExecuteUpdate(sql, params ?? []);
      return { changes: r.changes };
    },
    execAsync: async (sql: string): Promise<void> => {
      const s = sql.trim().toUpperCase();
      if (s.startsWith('PRAGMA') || s.startsWith('SELECT')) {
        await bridge.dbExecuteQuery(sql, []);
      } else {
        await bridge.dbExecuteUpdate(sql, []);
      }
    },
    closeAsync: async () => {},
  };
}

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
async function validateDatabase(db: ISharedCacheDb): Promise<boolean> {
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
        
        try {
          return await queueDbOperation(() => operation(db));
        } catch (operationError: any) {
          // Se è un errore WAL/pagein, prova a fare checkpoint e riprova
          const errorMsg = operationError?.message || String(operationError);
          if (errorMsg.includes('WAL') || 
              errorMsg.includes('pagein') || 
              errorMsg.includes('Invalid argument') ||
              errorMsg.includes('FS pagein') ||
              errorMsg.includes('cluster_pagein')) {
            console.warn(`[executeQuery] WAL/pagein error detected in ${operationName}, attempting checkpoint...`, {
              error: errorMsg,
              attempt: attempt + 1
            });
            try {
              // Prova a fare checkpoint per riparare il WAL
              await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
              // Riprova dopo checkpoint (solo se non è l'ultimo tentativo)
              if (attempt < retryCount) {
                await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
                continue;
              }
            } catch (checkpointError: any) {
              console.error(`[executeQuery] Checkpoint failed in ${operationName}:`, checkpointError?.message);
              // Se il checkpoint fallisce, potrebbe essere corruzione grave
              // Prova a chiudere e riaprire il database
              if (attempt < retryCount) {
                try {
                  await closeSharedCacheDb();
                  await new Promise(resolve => setTimeout(resolve, 500));
                  // Il prossimo tentativo riaprirà il database
                } catch (closeError) {
                  console.error(`[executeQuery] Failed to close database:`, closeError);
                }
                continue;
              }
            }
          }
          // Rilancia l'errore per gestione normale
          throw operationError;
        }
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

      // Check for database corruption error (SQLite error code 11: database disk image is malformed)
      const isCorruptionError = 
        errorCode === 11 ||
        errorCode === 'ERR_INTERNAL_SQLITE_ERROR' ||
        errorMessage.includes('database disk image is malformed') ||
        errorMessage.includes('malformed') ||
        (errorMessage.includes('finalizeAsync') && errorMessage.includes('Error code 11'));

      if (isCorruptionError) {
        console.error('[executeQuery] Database corruption detected:', errorMessage);

        databaseRecoveryService.notifyCorruption({
          errorMessage,
          errorCode,
          originalError: error,
          source: `executeQuery:${operationName}`,
        });

        // Throw a special error that can be caught by callers
        const corruptionError = new Error('Database corruption detected');
        (corruptionError as any).isCorruptionError = true;
        (corruptionError as any).originalError = error;
        throw corruptionError;
      }

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

  // Check if the last error was a corruption error
  if (lastError && (lastError as any).isCorruptionError) {
    throw lastError;
  }

  throw new Error(`Database operation failed: ${operationName}`);
}

const androidNoOpCacheDb: ISharedCacheDb = {
  getFirstAsync: async () => undefined,
  getAllAsync: async () => [],
  runAsync: async () => ({ changes: 0 }),
  execAsync: async () => {},
  closeAsync: async () => {},
};

export async function openSharedCacheDb(): Promise<ISharedCacheDb> {
  if (Platform.OS === 'web') {
    return {} as ISharedCacheDb;
  }

  if (Platform.OS === 'android') {
    return androidNoOpCacheDb;
  }

  if (Platform.OS === 'ios' || Platform.OS === 'macos') {
    if (iosBridgeDbPromise) return iosBridgeDbPromise;
    iosBridgeDbPromise = (async () => {
      try {
        const iosBridge = (await import('./ios-bridge')).default;
        await iosBridge.dbEnsureCacheDbInitialized();
        return createBridgeCacheDbAdapter(iosBridge);
      } catch (error: any) {
        iosBridgeDbPromise = null;
        const errorMessage = error?.message || String(error);
        const errorCode = error?.code;
        console.error('[openSharedCacheDb] Failed to initialize shared cache database:', errorMessage, errorCode);
        Alert.alert(
          'Database init failed',
          `${errorMessage}${errorCode != null ? ` (code: ${errorCode})` : ''}`,
          [{ text: 'OK' }]
        );
        const isCorruptionError =
          errorCode === 11 ||
          errorCode === 'ERR_INTERNAL_SQLITE_ERROR' ||
          errorMessage.includes('database disk image is malformed') ||
          errorMessage.includes('malformed') ||
          errorMessage.includes('corruption');
        if (isCorruptionError) {
          databaseRecoveryService.notifyCorruption({
            errorMessage,
            errorCode,
            originalError: error,
            source: 'openSharedCacheDb',
          });
        }
        throw error;
      }
    })();
    return iosBridgeDbPromise;
  }

  return androidNoOpCacheDb;
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

type SQLiteDbFilePaths = {
  directory: string;
  dbPath: string;
  walPath: string;
  shmPath: string;
};

async function getSQLiteDbFilePaths(): Promise<SQLiteDbFilePaths> {
  const { getSharedMediaCacheDirectoryAsync } = await import('../utils/shared-cache');

  const sharedDir = await getSharedMediaCacheDirectoryAsync();
  const directory = sharedDir.startsWith('file://') ? sharedDir.replace('file://', '') : sharedDir;

  const dbPath = `${directory}/cache.db`;
  return {
    directory,
    dbPath,
    walPath: `${dbPath}-wal`,
    shmPath: `${dbPath}-shm`,
  };
}

/**
 * Best-effort snapshot of raw SQLite DB files to the cache directory.
 * This does NOT modify the database; it simply copies files so data can be recovered manually if needed.
 *
 * @returns List of created backup file URIs (may be empty)
 */
export async function backupSQLiteDatabaseFiles(): Promise<string[]> {
  if (Platform.OS === 'web') {
    return [];
  }

  const { Directory, File, Paths } = await import('expo-file-system');
  const { dbPath, walPath, shmPath } = await getSQLiteDbFilePaths();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = new Directory(Paths.cache, 'zentik-db-backups');
  if (!backupDir.exists) {
    backupDir.create();
  }

  const candidates = [
    { src: dbPath, suffix: 'cache.db' },
    { src: walPath, suffix: 'cache.db-wal' },
    { src: shmPath, suffix: 'cache.db-shm' },
  ];

  const created: string[] = [];

  for (const { src, suffix } of candidates) {
    try {
      const srcFile = new File(src);
      if (!srcFile.exists) continue;

      const destFile = new File(backupDir, `${suffix}.${timestamp}.bak`);
      await (srcFile as any).copy(destFile as any);
      created.push(destFile.uri);
    } catch (error: any) {
      console.warn('[DB] ⚠️ Failed to backup file (non-fatal):', src, error?.message || error);
    }
  }

  if (created.length > 0) {
    console.log('[DB] ✅ Database backup created:', created);
  } else {
    console.log('[DB] ℹ️ No database files found to backup');
  }

  return created;
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
    // Use executeQuery to ensure proper error handling and WAL recovery
    const tables = await executeQuery(async (db) => {
      return await db.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
    }, 'exportSQLiteDatabaseToFile:getTables');

    for (const table of tables) {
      const tableName = table.name;

      try {
        // Get table schema - use executeQuery wrapper for safety
        const schemaResult = await executeQuery(async (db) => {
          return await db.getAllAsync(
            `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`,
            [tableName]
          );
        }, `exportSQLiteDatabaseToFile:getSchema:${tableName}`);

        if (schemaResult.length > 0 && schemaResult[0].sql) {
          sqlDump += `-- Table: ${tableName}\n`;
          sqlDump += `DROP TABLE IF EXISTS ${tableName};\n`;
          sqlDump += `${schemaResult[0].sql};\n\n`;
        }
      } catch (schemaError: any) {
        console.warn('[DB] ⚠️ Failed to export schema for table (skipping):', tableName, schemaError?.message);
        sqlDump += `-- ⚠️ Failed to export schema for table: ${tableName} (${schemaError?.message || schemaError})\n\n`;
        continue;
      }

      // Get all rows from table (best-effort per table)
      let rows: any[] = [];
      try {
        // Use executeQuery wrapper for safety
        rows = await executeQuery(async (db) => {
          return await db.getAllAsync(`SELECT * FROM ${tableName}`);
        }, `exportSQLiteDatabaseToFile:getRows:${tableName}`);
      } catch (rowsError: any) {
        console.warn('[DB] ⚠️ Failed to export rows for table (skipping data):', tableName, rowsError?.message);
        sqlDump += `-- ⚠️ Failed to export rows for table: ${tableName} (${rowsError?.message || rowsError})\n\n`;
        continue;
      }

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

    // Get indices (best-effort)
    try {
      // Use executeQuery wrapper for safety
      const indices = await executeQuery(async (db) => {
        return await db.getAllAsync(
          "SELECT name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
        );
      }, `exportSQLiteDatabaseToFile:getIndices`);

      if (indices.length > 0) {
        sqlDump += '-- Indices\n';
        for (const index of indices) {
          if (index.sql) {
            sqlDump += `${index.sql};\n`;
          }
        }
        sqlDump += '\n';
      }
    } catch (indexError: any) {
      console.warn('[DB] ⚠️ Failed to export indices (non-fatal):', indexError?.message || indexError);
      sqlDump += `-- ⚠️ Failed to export indices (${indexError?.message || indexError})\n\n`;
    }

    sqlDump += '-- Re-enable foreign keys\n';
    sqlDump += 'PRAGMA foreign_keys=ON;\n';

    // Save to file using new API
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `zentik-db-export-${timestamp}.sql`;

    // Create and write file in one operation
    const file = new File(Paths.cache, fileName);
    await file.write(sqlDump);

    console.log(`[DB] ✅ Database exported to: ${file.uri}`);
    return file.uri;
  } catch (error: any) {
    console.error('[DB] ❌ Error exporting database:', error?.message || error);
    throw error;
  }
}

function splitSqlStatements(sqlDump: string): string[] {
  const statements: string[] = [];
  let current = '';

  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sqlDump.length; i++) {
    const ch = sqlDump[i];
    const next = i + 1 < sqlDump.length ? sqlDump[i + 1] : '';

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        // Preserve a newline boundary (optional)
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++; // Skip '/'
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      // Start of comments
      if (ch === '-' && next === '-') {
        inLineComment = true;
        i++; // Skip second '-'
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i++; // Skip '*'
        continue;
      }
    }

    if (ch === "'" && !inDoubleQuote) {
      if (inSingleQuote && next === "'") {
        // Escaped single quote inside string
        current += "''";
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      current += ch;
      continue;
    }

    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += ch;
      continue;
    }

    if (ch === ';' && !inSingleQuote && !inDoubleQuote) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail.length > 0) {
    statements.push(tail);
  }

  return statements;
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

    // Split SQL dump into individual statements (quote/comment-aware)
    const statements = splitSqlStatements(sqlDump);

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
