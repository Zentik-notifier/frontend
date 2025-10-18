import type { SQLiteDatabase } from 'expo-sqlite';
import type { IDBPDatabase } from 'idb';
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { openWebStorageDb, openSharedCacheDb } from './db-setup';
import type { WebStorageDB } from './db-setup';
import type { CacheItem } from './media-cache-service';
import { getSharedMediaCacheDirectoryAsync } from '@/utils/shared-cache';

export type MediaItem = {
  data: ArrayBuffer;
  key: string;
};

/**
 * Media cache repository for managing media cache storage operations
 * Handles both IndexedDB (web) and SQLite (mobile) storage
 * Initializes the appropriate database automatically based on platform
 */

export class MediaCacheRepository {
  private db: SQLiteDatabase | IDBPDatabase<WebStorageDB> | null = null;
  private initialized = false;
  private objectUrlCache = new Map<string, string>();

  constructor() {
    // this.initialize().catch(error => {
    //   console.error('[MediaCacheRepository] Failed to initialize database:', error);
    //   throw error;
    // });
  }

  /**
   * Dispose of the repository and clean up all cached object URLs
   */
  dispose(): void {
    this.revokeAllObjectUrls();
  }

  /**
   * Notify repository that the database has been closed externally
   * This allows automatic reopening on next operation
   */
  notifyDatabaseClosed(): void {
    console.log('[MediaCacheRepository] Database closed externally, marking for reopen');
    this.initialized = false;
    this.db = null;
  }

  /**
   * Create and initialize a MediaCacheRepository instance
   * This ensures the repository is properly initialized before use
   */
  static async create(): Promise<MediaCacheRepository> {
    const repo = new MediaCacheRepository();
    await repo.initialize();
    return repo;
  }

  private isWeb(): boolean {
    return Platform.OS === 'web';
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (this.isWeb()) {
        this.db = await openWebStorageDb();
      } else {
        this.db = await openSharedCacheDb();
      }
      this.initialized = true;
    } catch (error) {
      console.error('[MediaCacheRepository] Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Ensure database is initialized and reopen if closed
   * This handles cases where the database was closed during app backgrounding
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
      return;
    }

    // On mobile, check if database is still accessible
    // If not, reinitialize (database may have been closed in background)
    if (!this.isWeb() && this.db) {
      try {
        const sqliteDb = this.db as any;
        // Try a simple operation to verify database is still open
        // If this fails, the database was closed and needs reopening
        if (sqliteDb.prepareAsync) {
          // Test if database is accessible
          const stmt = await sqliteDb.prepareAsync('SELECT 1');
          await stmt.finalizeAsync();
        }
      } catch (error: any) {
        // Database is closed or inaccessible, reinitialize
        if (error?.message?.includes('closed resource')) {
          console.log('[MediaCacheRepository] Database was closed, reopening...');
          this.initialized = false;
          this.db = null;
          await this.initialize();
        } else {
          throw error;
        }
      }
    }
  }

  private getWebDb(): IDBPDatabase<WebStorageDB> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    if (!this.isWeb()) {
      throw new Error('Web database can only be used on web platform');
    }
    return this.db as IDBPDatabase<WebStorageDB>;
  }

  private getSQLiteDb(): SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    if (this.isWeb()) {
      throw new Error('SQLite database can only be used on mobile platforms');
    }
    return this.db as SQLiteDatabase;
  }

  async upsertCacheItem(item: CacheItem): Promise<void> {
    await this.ensureInitialized();

    if (this.isWeb()) {
      // IndexedDB
      await this.getWebDb().put('cache_item', {
        key: item.key,
        url: item.url,
        localPath: item.localPath ?? undefined,
        localThumbPath: item.localThumbPath ?? undefined,
        generatingThumbnail: item.generatingThumbnail ?? false,
        timestamp: item.timestamp,
        size: item.size,
        mediaType: String(item.mediaType),
        originalFileName: item.originalFileName ?? undefined,
        downloadedAt: item.downloadedAt ?? undefined,
        notificationDate: item.notificationDate ?? undefined,
        notificationId: item.notificationId ?? undefined,
        isDownloading: item.isDownloading ?? false,
        isPermanentFailure: item.isPermanentFailure ?? false,
        isUserDeleted: item.isUserDeleted ?? false,
        errorCode: item.errorCode ?? undefined,
      }, item.key);
    } else {
      // SQLite
      const sqliteDb = this.getSQLiteDb();
      await sqliteDb.runAsync(
        `INSERT INTO cache_item (
          key, url, local_path, local_thumb_path, generating_thumbnail,
          timestamp, size, media_type, original_file_name,
          downloaded_at, notification_date, notification_id, is_downloading,
          is_permanent_failure, is_user_deleted, error_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          notification_id=excluded.notification_id,
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
          item.notificationId ?? null,
          item.isDownloading ? 1 : 0,
          item.isPermanentFailure ? 1 : 0,
          item.isUserDeleted ? 1 : 0,
          item.errorCode ?? null,
        ],
      );
    }
  }

  async getCacheItem(key: string): Promise<CacheItem | null> {
    await this.ensureInitialized();

    if (this.isWeb()) {
      // IndexedDB
      const result = await this.getWebDb().get('cache_item', key);
      return result ? mapWebRecordToCacheItem(result) : null;
    } else {
      // SQLite
      const sqliteDb = this.getSQLiteDb();
      const row = await sqliteDb.getFirstAsync(
        `SELECT * FROM cache_item WHERE key = ?`,
        [key],
      );
      return row ? mapSQLiteRowToCacheItem(row) : null;
    }
  }

  async deleteCacheItem(key: string): Promise<void> {
    await this.ensureInitialized();

    if (this.isWeb()) {
      // IndexedDB
      await this.getWebDb().delete('cache_item', key);
    } else {
      // SQLite
      const sqliteDb = this.getSQLiteDb();
      await sqliteDb.runAsync(`DELETE FROM cache_item WHERE key = ?`, [key]);
    }
  }

  async listCacheItems(): Promise<CacheItem[]> {
    await this.ensureInitialized();

    if (this.isWeb()) {
      // IndexedDB
      const results = await this.getWebDb().getAll('cache_item');
      return results.map(mapWebRecordToCacheItem);
    } else {
      // SQLite
      const sqliteDb = this.getSQLiteDb();
      const rows = await sqliteDb.getAllAsync(`SELECT * FROM cache_item ORDER BY downloaded_at DESC`);
      return rows.map(mapSQLiteRowToCacheItem);
    }
  }

  async upsertMany(items: CacheItem[]): Promise<void> {
    if (!items.length) return;

    await this.ensureInitialized();

    if (this.isWeb()) {
      // IndexedDB - use transaction
      const db = this.getWebDb();
      const tx = db.transaction('cache_item', 'readwrite');
      try {
        for (const item of items) {
          await tx.store.put({
            key: item.key,
            url: item.url,
            localPath: item.localPath ?? undefined,
            localThumbPath: item.localThumbPath ?? undefined,
            generatingThumbnail: item.generatingThumbnail ?? false,
            timestamp: item.timestamp,
            size: item.size,
            mediaType: String(item.mediaType),
            originalFileName: item.originalFileName ?? undefined,
            downloadedAt: item.downloadedAt ?? undefined,
            notificationDate: item.notificationDate ?? undefined,
            notificationId: item.notificationId ?? undefined,
            isDownloading: item.isDownloading ?? false,
            isPermanentFailure: item.isPermanentFailure ?? false,
            isUserDeleted: item.isUserDeleted ?? false,
            errorCode: item.errorCode ?? undefined,
          }, item.key);
        }
        await tx.done;
      } catch (e) {
        tx.abort();
        throw e;
      }
    } else {
      // SQLite
      const sqliteDb = this.getSQLiteDb();
      await sqliteDb.execAsync('BEGIN');
      try {
        for (const item of items) {
          await sqliteDb.runAsync(
            `INSERT INTO cache_item (
              key, url, local_path, local_thumb_path, generating_thumbnail,
              timestamp, size, media_type, original_file_name,
              downloaded_at, notification_date, notification_id, is_downloading,
              is_permanent_failure, is_user_deleted, error_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
              notification_id=excluded.notification_id,
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
              item.notificationId ?? null,
              item.isDownloading ? 1 : 0,
              item.isPermanentFailure ? 1 : 0,
              item.isUserDeleted ? 1 : 0,
              item.errorCode ?? null,
            ],
          );
        }
        await sqliteDb.execAsync('COMMIT');
      } catch (e) {
        await sqliteDb.execAsync('ROLLBACK');
        throw e;
      }
    }
  }

  async clearAll(): Promise<void> {
    await this.ensureInitialized();

    if (this.isWeb()) {
      // IndexedDB
      const db = this.getWebDb();
      const tx = db.transaction('cache_item', 'readwrite');
      const keys = await tx.store.getAllKeys();
      await Promise.all(keys.map(key => tx.store.delete(key)));
      await tx.done;
    } else {
      // SQLite
      const sqliteDb = this.getSQLiteDb();
      await sqliteDb.execAsync('DELETE FROM cache_item;');
    }
  }

  // ====================
  // MEDIA ITEM METHODS (for binary data storage)
  // ====================

  async saveMediaItem(item: MediaItem): Promise<void> {
    await this.ensureInitialized();

    if (this.isWeb()) {
      await this.getWebDb().put('media_item', item, item.key);
    }
  }

  async getMediaItem(key: string): Promise<MediaItem | null> {
    await this.ensureInitialized();

    if (this.isWeb()) {
      // IndexedDB
      const result = await this.getWebDb().get('media_item', key);
      return result ? mapWebRecordToMediaItem(result) : null;
    }

    return null;
  }

  async deleteMediaItem(key: string): Promise<void> {
    await this.ensureInitialized();

    if (this.isWeb()) {
      // IndexedDB
      await this.getWebDb().delete('media_item', key);
    }

    // Revoke the object URL if it exists to prevent memory leaks
    this.revokeObjectUrl(key);
  }

  async listMediaItems(): Promise<MediaItem[]> {
    await this.ensureInitialized();

    if (this.isWeb()) {
      // IndexedDB
      const results = await this.getWebDb().getAll('media_item');
      return results.map(mapWebRecordToMediaItem);
    }

    return [];
  }

  async clearAllMediaItems(): Promise<void> {
    await this.ensureInitialized();

    if (this.isWeb()) {
      // IndexedDB
      const db = this.getWebDb();
      const tx = db.transaction('media_item', 'readwrite');
      const keys = await tx.store.getAllKeys();
      await Promise.all(keys.map(key => tx.store.delete(key)));
      await tx.done;
    } else {
      // SQLite
      const sqliteDb = this.getSQLiteDb();
      await sqliteDb.execAsync('DELETE FROM media_item;');
    }

    // Revoke all cached object URLs to prevent memory leaks
    this.revokeAllObjectUrls();
  }

  /**
   * Get MIME type from media key
   * Key format: MEDIATYPE/filename.ext (e.g., VIDEO/video_abc123.mp4, IMAGE/image_def456.jpg)
   */
  private getMimeTypeFromKey(key: string): string {
    // Extract media type and extension from key
    const parts = key.split('/');
    if (parts.length < 2) {
      return 'application/octet-stream';
    }

    const mediaTypeStr = parts[0].toUpperCase();
    const filename = parts[1];
    const extension = filename.split('.').pop()?.toLowerCase();

    // Map media type and extension to MIME type
    switch (mediaTypeStr) {
      case 'VIDEO':
        switch (extension) {
          case 'mp4': return 'video/mp4';
          case 'webm': return 'video/webm';
          case 'ogg': return 'video/ogg';
          case 'mov': return 'video/quicktime';
          default: return 'video/mp4'; // Default to mp4
        }
      case 'AUDIO':
        switch (extension) {
          case 'mp3': return 'audio/mpeg';
          case 'wav': return 'audio/wav';
          case 'ogg': return 'audio/ogg';
          case 'm4a': return 'audio/mp4';
          default: return 'audio/mpeg'; // Default to mp3
        }
      case 'IMAGE':
        switch (extension) {
          case 'jpg':
          case 'jpeg': return 'image/jpeg';
          case 'png': return 'image/png';
          case 'gif': return 'image/gif';
          case 'webp': return 'image/webp';
          case 'svg': return 'image/svg+xml';
          default: return 'image/jpeg'; // Default to jpeg
        }
      case 'GIF':
        return 'image/gif';
      default:
        return 'application/octet-stream';
    }
  }

  async getMediaUrl(key: string): Promise<string | null> {
    await this.ensureInitialized();

    if (this.isWeb()) {
      // Check if we already have a cached object URL for this key
      const cachedUrl = this.objectUrlCache.get(key);
      if (cachedUrl) {
        return cachedUrl;
      }

      const mediaItem = await this.getMediaItem(key);
      if (mediaItem) {
        // Get MIME type from key to create proper Blob
        const mimeType = this.getMimeTypeFromKey(key);
        
        const blob = new Blob([mediaItem.data], { type: mimeType });
        const objectUrl = URL.createObjectURL(blob);
        this.objectUrlCache.set(key, objectUrl);
        return objectUrl;
      }
    }

    return null;
  }

  /**
   * Revoke a specific object URL from the cache
   */
  revokeObjectUrl(key: string): void {
    const objectUrl = this.objectUrlCache.get(key);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      this.objectUrlCache.delete(key);
    }
  }

  /**
   * Revoke all cached object URLs
   */
  revokeAllObjectUrls(): void {
    for (const [key, objectUrl] of this.objectUrlCache.entries()) {
      URL.revokeObjectURL(objectUrl);
    }
    this.objectUrlCache.clear();
  }

  /**
   * Get bucket icon from shared cache
   * For mobile: checks filesystem (saved by React Native app)
   * For web: checks IndexedDB
   * Simple naming: just bucketId.png
   * Returns the file URI/data URL if found, null otherwise
   */
  async getBucketIconFromSharedCache(
    bucketId: string,
    bucketName: string,
    bucketColor?: string,
    timestamp?: number
  ): Promise<string | null> {
    await this.ensureInitialized();

    try {
      const ts = timestamp || Date.now();
      if (Platform.OS === 'web') {
        // For web, check IndexedDB
        const cacheKey = `BUCKET_ICON/${bucketId}.png`;
        const cachedUrl = await this.getMediaUrl(cacheKey);
        if (cachedUrl) {
          // For web data URLs, add fragment to force cache invalidation
          return `${cachedUrl}#t=${ts}`;
        }
        return null;
      } else {
        // For mobile, check filesystem
        const sharedCacheDir = await getSharedMediaCacheDirectoryAsync();
        const bucketIconDir = `${sharedCacheDir}BUCKET_ICON/`;
        const fileName = `${bucketId}.png`;
        const fileUri = `${bucketIconDir}${fileName}`;
        
        // Check if file exists
        const file = new File(fileUri);
        if (file.exists) {
          // Add timestamp to force expo-image cache invalidation
          // Timestamp changes only when bucket params change (managed by MediaCacheService)
          return `${fileUri}?t=${ts}`;
        }
        
        return null;
      }
    } catch (error) {
      console.error('[MediaCacheRepository] ❌ Error checking cache for bucket icon:', error);
      return null;
    }
  }
}

function mapWebRecordToCacheItem(record: any): CacheItem {
  return {
    key: record.key,
    url: record.url,
    localPath: record.localPath ?? undefined,
    localThumbPath: record.localThumbPath ?? undefined,
    generatingThumbnail: record.generatingThumbnail ?? false,
    timestamp: Number(record.timestamp),
    size: Number(record.size),
    mediaType: record.mediaType,
    originalFileName: record.originalFileName ?? undefined,
    downloadedAt: record.downloadedAt ? Number(record.downloadedAt) : undefined,
    notificationDate: record.notificationDate ? Number(record.notificationDate) : undefined,
    notificationId: record.notificationId ?? undefined,
    isDownloading: record.isDownloading ?? false,
    isPermanentFailure: record.isPermanentFailure ?? false,
    isUserDeleted: record.isUserDeleted ?? false,
    errorCode: record.errorCode ?? undefined,
  };
}

function mapSQLiteRowToCacheItem(row: any): CacheItem {
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
    notificationId: row.notification_id ?? undefined,
    isDownloading: row.is_downloading === 1,
    isPermanentFailure: row.is_permanent_failure === 1,
    isUserDeleted: row.is_user_deleted === 1,
    errorCode: row.error_code ?? undefined,
  };
}

function mapWebRecordToMediaItem(record: any): MediaItem {
  return {
    data: record.data,
    key: record.key,
  };
}


