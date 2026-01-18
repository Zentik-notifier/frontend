/**
 * Buckets repository
 * Provides CRUD operations for bucket metadata in local storage
 */

import { Platform } from 'react-native';
import { executeQuery as executeQuerySafe } from '../../services/db-setup';
import iosBridgeService from '../../services/ios-bridge';

/**
 * Bucket interface matching GraphQL BucketFragment
 */
export interface BucketData {
  id: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  updatedAt: string;
  // Add other bucket fields as needed from GraphQL schema
  [key: string]: any;
}

/**
 * Database bucket record
 */
interface BucketRecord {
  id: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  fragment: string; // Complete bucket data as JSON
  updated_at: string; // ISO timestamp
  synced_at: number; // Timestamp when last synced with backend
}

/**
 * Execute a query on the appropriate database with error handling
 * Uses the safe executeQuery from db-setup that handles race conditions
 */
async function executeQuery<T>(queryFn: (db: any) => Promise<T>, operationName: string): Promise<T> {
  return await executeQuerySafe(queryFn, operationName);
}

/**
 * Parse bucket data for database storage
 */
function parseBucketForDB(bucket: BucketData): BucketRecord {
  return {
    id: bucket.id,
    name: bucket.name,
    icon: bucket.icon,
    description: bucket.description,
    fragment: JSON.stringify(bucket),
    updated_at: bucket.updatedAt,
    synced_at: Date.now(),
  };
}

/**
 * Parse database record back to bucket data
 * Optimized to avoid unnecessary JSON parsing and property assignments
 */
function parseBucketFromDB(record: any): BucketData {
  try {
    // Fast path: if fragment is already an object, use it directly
    let bucket: BucketData;
    if (typeof record.fragment === 'string') {
      bucket = JSON.parse(record.fragment);
    } else {
      bucket = record.fragment;
    }

    // Only override if column values differ from fragment (avoid unnecessary assignments)
    // Most of the time, these will be the same, so we can skip
    if (record.name !== undefined && record.name !== bucket.name) {
      bucket.name = record.name;
    }
    if (record.icon !== undefined && record.icon !== bucket.icon) {
      bucket.icon = record.icon;
    }
    if (record.description !== undefined && record.description !== bucket.description) {
      bucket.description = record.description;
    }
    if (record.updated_at !== undefined && record.updated_at !== bucket.updatedAt) {
      bucket.updatedAt = record.updated_at;
    }

    return bucket as BucketData;
  } catch (error) {
    console.error('[parseBucketFromDB] Parse error:', error);
    throw error;
  }
}

/**
 * Save a single bucket to local storage
 */
export async function saveBucket(bucket: BucketData): Promise<void> {
  await executeQuery(async (db) => {
    const record = parseBucketForDB(bucket);

    if (Platform.OS === 'web') {
      // IndexedDB
      const tx = db.transaction('buckets', 'readwrite');
      const store = tx.objectStore('buckets');
      await store.put(record, bucket.id);
      await tx.done;
    } else {
      // SQLite
      await db.runAsync(
        `INSERT OR REPLACE INTO buckets 
         (id, name, icon, description, fragment, updated_at, synced_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.name,
          record.icon,
          record.description,
          record.fragment,
          record.updated_at,
          record.synced_at,
        ]
      );
    }
  }, 'saveBucket');

  // Trigger CloudKit sync with debounce on iOS
  if (Platform.OS === 'ios') {
    iosBridgeService.triggerCloudKitSyncWithDebounce().catch((error) => {
      console.error('[BucketsRepository] Failed to trigger CloudKit sync:', error);
    });
  }
}

/**
 * Save multiple buckets to local storage (bulk operation)
 */
export async function saveBuckets(buckets: BucketData[]): Promise<void> {
  if (!buckets || buckets.length === 0) return;

  await executeQuery(async (db) => {
    if (Platform.OS === 'web') {
      // IndexedDB - use transaction for bulk insert
      const tx = db.transaction('buckets', 'readwrite');
      const store = tx.objectStore('buckets');

      for (const bucket of buckets) {
        const record = parseBucketForDB(bucket);
        await store.put(record, bucket.id);
      }

      await tx.done;
    } else {
      // SQLite - use batch insert
      const statements = buckets.map(bucket => {
        const record = parseBucketForDB(bucket);
        return {
          sql: `INSERT OR REPLACE INTO buckets 
                (id, name, icon, description, fragment, updated_at, synced_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            record.id,
            record.name,
            record.icon,
            record.description,
            record.fragment,
            record.updated_at,
            record.synced_at,
          ],
        };
      });

      // Execute all statements in a transaction
      await db.withTransactionAsync(async () => {
        for (const statement of statements) {
          await db.runAsync(statement.sql, statement.args);
        }
      });
    }
  }, 'saveBuckets');

  // Trigger CloudKit sync with debounce on iOS
  if (Platform.OS === 'ios') {
    iosBridgeService.triggerCloudKitSyncWithDebounce().catch((error) => {
      console.error('[BucketsRepository] Failed to trigger CloudKit sync:', error);
    });
  }
}

/**
 * Get a single bucket by ID from local storage
 */
export async function getBucket(bucketId: string): Promise<BucketData | null> {
  return await executeQuery(async (db) => {
    if (Platform.OS === 'web') {
      // IndexedDB
      const tx = db.transaction('buckets', 'readonly');
      const store = tx.objectStore('buckets');
      const record = await store.get(bucketId);
      await tx.done;

      return record ? parseBucketFromDB(record) : null;
    } else {
      // SQLite
      const result = await db.getFirstAsync(
        'SELECT * FROM buckets WHERE id = ?',
        [bucketId]
      );

      return result ? parseBucketFromDB(result) : null;
    }
  }, 'getBucket');
}

/**
 * Get all buckets from local storage
 * Optimized for performance: avoids database sorting, uses efficient parsing
 */
export async function getAllBuckets(): Promise<BucketData[]> {
  return await executeQuery(async (db) => {
    if (Platform.OS === 'web') {
      // IndexedDB - use direct getAll() for better performance
      const records = await db.getAll('buckets');
      
      // Parse all buckets in one pass
      const buckets = new Array<BucketData>(records.length);
      for (let i = 0; i < records.length; i++) {
        buckets[i] = parseBucketFromDB(records[i]);
      }
      
      // Sort in memory (faster than database sort for small datasets)
      // Use a more efficient sort for small arrays
      if (buckets.length > 1) {
        buckets.sort((a, b) => {
          const aName = a.name || '';
          const bName = b.name || '';
          return aName < bName ? -1 : aName > bName ? 1 : 0;
        });
      }
      
      return buckets;
    } else {
      // SQLite - remove ORDER BY to avoid full table scan, sort in memory instead
      // This is much faster for small datasets (few dozen buckets)
      const results = await db.getAllAsync('SELECT * FROM buckets');
      
      // Parse all buckets in one pass
      const buckets = new Array<BucketData>(results.length);
      for (let i = 0; i < results.length; i++) {
        buckets[i] = parseBucketFromDB(results[i]);
      }
      
      // Sort in memory (faster than database sort without index)
      // Use a more efficient sort for small arrays
      if (buckets.length > 1) {
        buckets.sort((a, b) => {
          const aName = a.name || '';
          const bName = b.name || '';
          return aName < bName ? -1 : aName > bName ? 1 : 0;
        });
      }
      
      return buckets;
    }
  }, 'getAllBuckets');
}

/**
 * Delete a bucket from local storage
 */
export async function deleteBucket(bucketId: string): Promise<void> {
  return await executeQuery(async (db) => {
    if (Platform.OS === 'web') {
      // IndexedDB
      const tx = db.transaction('buckets', 'readwrite');
      const store = tx.objectStore('buckets');
      await store.delete(bucketId);
      await tx.done;
    } else {
      // SQLite
      await db.runAsync('DELETE FROM buckets WHERE id = ?', [bucketId]);
    }
  }, 'deleteBucket');
}

/**
 * Delete all buckets from local storage
 */
export async function deleteAllBuckets(): Promise<void> {
  return await executeQuery(async (db) => {
    if (Platform.OS === 'web') {
      // IndexedDB
      const tx = db.transaction('buckets', 'readwrite');
      const store = tx.objectStore('buckets');
      await store.clear();
      await tx.done;
    } else {
      // SQLite
      await db.runAsync('DELETE FROM buckets');
    }
  }, 'deleteAllBuckets');
}

/**
 * Get the last sync timestamp for buckets
 */
export async function getLastBucketSyncTime(): Promise<number> {
  return await executeQuery(async (db) => {
    if (Platform.OS === 'web') {
      // IndexedDB - get max synced_at using index
      const tx = db.transaction('buckets', 'readonly');
      const store = tx.objectStore('buckets');
      const index = store.index('synced_at');

      // Get all keys, find max
      let cursor = await index.openCursor(null, 'prev'); // Reverse order
      const maxSyncedAt = cursor ? cursor.value.synced_at : 0;

      await tx.done;
      return maxSyncedAt;
    } else {
      // SQLite
      const result: any = await db.getFirstAsync(
        'SELECT MAX(synced_at) as max_synced FROM buckets'
      );

      return result?.max_synced || 0;
    }
  }, 'getLastBucketSyncTime');
}

/**
 * Get count of cached buckets
 */
export async function getBucketsCount(): Promise<number> {
  return await executeQuery(async (db) => {
    if (Platform.OS === 'web') {
      // IndexedDB
      const tx = db.transaction('buckets', 'readonly');
      const store = tx.objectStore('buckets');
      const count = await store.count();
      await tx.done;
      return count;
    } else {
      // SQLite
      const result: any = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM buckets'
      );
      return result?.count || 0;
    }
  }, 'getBucketsCount');
}

/**
 * Get updatedAt timestamps for multiple buckets
 * Returns a map of bucketId -> updatedAt
 * This is used to check which buckets need updating before saving
 */
export async function getBucketsUpdatedAt(bucketIds: string[]): Promise<Map<string, string>> {
  if (!bucketIds || bucketIds.length === 0) {
    return new Map();
  }

  return await executeQuery(async (db) => {
    const updatedAtMap = new Map<string, string>();

    if (Platform.OS === 'web') {
      // IndexedDB - get each bucket's updated_at
      const tx = db.transaction('buckets', 'readonly');
      const store = tx.objectStore('buckets');

      for (const bucketId of bucketIds) {
        const record = await store.get(bucketId);
        if (record && record.updated_at) {
          updatedAtMap.set(bucketId, record.updated_at);
        }
      }

      await tx.done;
    } else {
      // SQLite - use IN query for efficiency
      const placeholders = bucketIds.map(() => '?').join(',');
      const results = await db.getAllAsync(
        `SELECT id, updated_at FROM buckets WHERE id IN (${placeholders})`,
        bucketIds
      ) as Array<{ id: string; updated_at: string }>;

      for (const record of results) {
        updatedAtMap.set(record.id, record.updated_at);
      }
    }

    return updatedAtMap;
  }, 'getBucketsUpdatedAt');
}
