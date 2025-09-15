import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { getSharedMediaCacheDirectoryAsync } from '../utils/shared-cache';

export async function openSharedCacheDb(): Promise<SQLiteDatabase> {
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
}


