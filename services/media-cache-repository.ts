import type { SQLiteDatabase } from 'expo-sqlite';
import type { CacheItem } from './media-cache';

export class MediaCacheRepository {
  constructor(private readonly db: SQLiteDatabase) { }

  async upsertCacheItem(item: CacheItem): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO cache_item (
        key, url, local_path, local_thumb_path, generating_thumbnail,
        timestamp, size, media_type, original_file_name,
        downloaded_at, notification_date, is_downloading,
        is_permanent_failure, is_user_deleted, error_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        url=excluded.url,
        local_path=excluded.local_path,
        local_thumb_path=excluded.local_thumb_path,
        generating_thumbnail=excluded.generating_thumbnail,
        timestamp=excluded.timestamp,
        size=excluded.size,
        media_type=excluded.media_type,
        original_file_name=excluded.original_file_name,
        downloaded_at=excluded.downloaded_at,
        notification_date=excluded.notification_date,
        is_downloading=excluded.is_downloading,
        is_permanent_failure=excluded.is_permanent_failure,
        is_user_deleted=excluded.is_user_deleted,
        error_code=excluded.error_code
      `,
      [
        item.key,
        item.url,
        item.localPath ?? null,
        item.localThumbPath ?? null,
        item.generatingThumbnail ? 1 : 0,
        item.timestamp,
        item.size,
        String(item.mediaType),
        item.originalFileName ?? null,
        item.downloadedAt ?? null,
        item.notificationDate ?? null,
        item.isDownloading ? 1 : 0,
        item.isPermanentFailure ? 1 : 0,
        item.isUserDeleted ? 1 : 0,
        item.errorCode ?? null,
      ],
    );
  }

  async getCacheItem(key: string): Promise<CacheItem | null> {
    const row = await this.db.getFirstAsync(
      `SELECT * FROM cache_item WHERE key = ?`,
      [key],
    );
    return row ? mapRowToCacheItem(row) : null;
  }

  async deleteCacheItem(key: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM cache_item WHERE key = ?`, [key]);
  }

  async listCacheItems(): Promise<CacheItem[]> {
    const rows = await this.db.getAllAsync(`SELECT * FROM cache_item ORDER BY downloaded_at DESC`);
    return rows.map(mapRowToCacheItem);
  }

  async upsertMany(items: CacheItem[]): Promise<void> {
    if (!items.length) return;
    await this.db.execAsync('BEGIN');
    try {
      for (const item of items) {
        await this.db.runAsync(
          `INSERT INTO cache_item (
            key, url, local_path, local_thumb_path, generating_thumbnail,
            timestamp, size, media_type, original_file_name,
            downloaded_at, notification_date, is_downloading,
            is_permanent_failure, is_user_deleted, error_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            url=excluded.url,
            local_path=excluded.local_path,
            local_thumb_path=excluded.local_thumb_path,
            generating_thumbnail=excluded.generating_thumbnail,
            timestamp=excluded.timestamp,
            size=excluded.size,
            media_type=excluded.media_type,
            original_file_name=excluded.original_file_name,
            downloaded_at=excluded.downloaded_at,
            notification_date=excluded.notification_date,
            is_downloading=excluded.is_downloading,
            is_permanent_failure=excluded.is_permanent_failure,
            is_user_deleted=excluded.is_user_deleted,
            error_code=excluded.error_code
          `,
          [
            item.key,
            item.url,
            item.localPath ?? null,
            item.localThumbPath ?? null,
            item.generatingThumbnail ? 1 : 0,
            item.timestamp,
            item.size,
            String(item.mediaType),
            item.originalFileName ?? null,
            item.downloadedAt ?? null,
            item.notificationDate ?? null,
            item.isDownloading ? 1 : 0,
            item.isPermanentFailure ? 1 : 0,
            item.isUserDeleted ? 1 : 0,
            item.errorCode ?? null,
          ],
        );
      }
      await this.db.execAsync('COMMIT');
    } catch (e) {
      await this.db.execAsync('ROLLBACK');
      throw e;
    }
  }

  async clearAll(): Promise<void> {
    await this.db.execAsync('DELETE FROM cache_item;');
  }
}

function mapRowToCacheItem(row: any): CacheItem {
  return {
    key: row.key,
    url: row.url,
    localPath: row.local_path,
    localThumbPath: row.local_thumb_path ?? undefined,
    generatingThumbnail: row.generating_thumbnail === 1,
    timestamp: Number(row.timestamp),
    size: Number(row.size),
    mediaType: row.media_type,
    originalFileName: row.original_file_name ?? undefined,
    downloadedAt: Number(row.downloaded_at),
    notificationDate: row.notification_date != null ? Number(row.notification_date) : undefined,
    isDownloading: row.is_downloading === 1,
    isPermanentFailure: row.is_permanent_failure === 1,
    isUserDeleted: row.is_user_deleted === 1,
    errorCode: row.error_code ?? undefined,
  };
}


