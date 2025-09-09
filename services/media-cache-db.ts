import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { getSharedMediaCacheDirectoryAsync } from '../utils/shared-cache';

export async function openSharedCacheDb(): Promise<SQLiteDatabase> {
  const sharedDir = await getSharedMediaCacheDirectoryAsync();
  const dbPath = `${sharedDir}cache.db` as unknown as string;

  const db = await openDatabaseAsync(dbPath);

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

  // Ensure 'key' column exists and is unique for existing installations
  try {
    const cols2: Array<{ name: string }> = await db.getAllAsync(`PRAGMA table_info('cache_item')` as any);
    const hasKey = cols2.some((c) => c.name === 'key');
    if (!hasKey) {
      await db.execAsync('BEGIN');
      await db.execAsync(`ALTER TABLE cache_item ADD COLUMN key TEXT;`);
      await db.execAsync(`UPDATE cache_item SET key = UPPER(media_type) || '_' || url WHERE key IS NULL OR key = '' ;`);
      await db.execAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_item_key ON cache_item(key);`);
      await db.execAsync('COMMIT');
    } else {
      await db.execAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_item_key ON cache_item(key);`);
    }
  } catch (e) {
    console.warn('[media-cache-db] Key migration failed:', e);
  }

  return db;
}


