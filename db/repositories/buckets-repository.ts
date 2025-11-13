/**
 * Buckets repository
 * Provides CRUD operations for bucket metadata in local storage
 */

import { Platform } from 'react-native';
import { executeQuery as executeQuerySafe } from '../../services/db-setup';

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
 */
function parseBucketFromDB(record: any): BucketData {
  try {
    const bucket = typeof record.fragment === 'string'
      ? JSON.parse(record.fragment)
      : record.fragment;

    // Override with column values for consistency
    if (record.name !== undefined) {
      bucket.name = record.name;
    }
    if (record.icon !== undefined) {
      bucket.icon = record.icon;
    }
    if (record.description !== undefined) {
      bucket.description = record.description;
    }
    if (record.updated_at !== undefined) {
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
  return await executeQuery(async (db) => {
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
}

/**
 * Save multiple buckets to local storage (bulk operation)
 */
export async function saveBuckets(buckets: BucketData[]): Promise<void> {
  if (!buckets || buckets.length === 0) return;

  return await executeQuery(async (db) => {
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
 */
export async function getAllBuckets(): Promise<BucketData[]> {
  return await executeQuery(async (db) => {
    if (Platform.OS === 'web') {
      // IndexedDB
      const tx = db.transaction('buckets', 'readonly');
      const store = tx.objectStore('buckets');
      const records = await store.getAll();
      await tx.done;

      return records.map((record: any) => parseBucketFromDB(record));
    } else {
      // SQLite
      const results = await db.getAllAsync('SELECT * FROM buckets ORDER BY name ASC');
      return results.map((record: any) => parseBucketFromDB(record));
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
