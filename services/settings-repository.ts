import type { SQLiteDatabase } from 'expo-sqlite';
import type { IDBPDatabase } from 'idb';
import { Platform } from 'react-native';
import { openWebStorageDb, openSharedCacheDb } from './db-setup';
import type { WebStorageDB } from './db-setup';

export interface SettingsItem {
  key: string;
  value: string;
  updated_at: number;
}

/**
 * Settings repository for managing app settings storage operations
 * Handles both IndexedDB (web) and SQLite (mobile) storage with shared folder support
 * Initializes the appropriate database automatically based on platform
 */
export class SettingsRepository {
  private db: SQLiteDatabase | IDBPDatabase<WebStorageDB> | null = null;
  private initialized = false;

  constructor() {
    // Lazy initialization on first use
  }

  /**
   * Create and initialize a SettingsRepository instance
   * This ensures the repository is properly initialized before use
   */
  static async create(): Promise<SettingsRepository> {
    const repo = new SettingsRepository();
    await repo.initialize();
    return repo;
  }

  /**
   * Notify repository that the database has been closed externally
   * This allows automatic reopening on next operation
   */
  notifyDatabaseClosed(): void {
    console.log('[SettingsRepository] Database closed externally, marking for reopen');
    this.initialized = false;
    this.db = null;
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
        await this.createTablesIfNeeded();
      }
      this.initialized = true;
    } catch (error) {
      console.error('[SettingsRepository] Failed to initialize database:', error);
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

    // On mobile, if database reference is null, reinitialize
    // We don't run test queries because they can race with database close operations
    if (!this.isWeb() && !this.db) {
      console.log('[SettingsRepository] Database reference is null, reopening...');
      this.initialized = false;
      await this.initialize();
    }
  }

  private async createTablesIfNeeded(): Promise<void> {
    if (this.isWeb() || !this.db) return;

    const sqliteDb = this.db as SQLiteDatabase;
    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  /**
   * Get a setting value by key
   */
  async getSetting(key: string): Promise<string | null> {
    await this.ensureInitialized();

    try {
      if (this.isWeb()) {
        const webDb = this.db as IDBPDatabase<WebStorageDB>;
        const result = await webDb.get('keyvalue', `app_setting:${key}`);
        return result || null;
      } else {
        const sqliteDb = this.db as SQLiteDatabase;
        const result = await sqliteDb.getFirstAsync<{ value: string }>(
          'SELECT value FROM app_settings WHERE key = ?',
          [key]
        );
        return result?.value || null;
      }
    } catch (error) {
      console.error(`[SettingsRepository] Failed to get setting ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a setting value
   */
  async setSetting(key: string, value: string): Promise<void> {
    await this.ensureInitialized();

    const maxRetries = 3;
    let attempt = 0;

    // Simple retry loop to mitigate transient "database is locked" errors
    // on mobile SQLite. On web (IndexedDB) we retry only once.
    // This is especially important during authentication flows.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        if (this.isWeb()) {
          const webDb = this.db as IDBPDatabase<WebStorageDB>;
          await webDb.put('keyvalue', value, `app_setting:${key}`);
        } else {
          const sqliteDb = this.db as SQLiteDatabase;
          await sqliteDb.runAsync(
            'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
            [key, value, Date.now()]
          );
        }
        return;
      } catch (error: any) {
        const message = String(error?.message || "");
        const isLocked =
          !this.isWeb() &&
          (message.includes("database is locked") ||
            message.includes("SQLITE_BUSY"));

        if (isLocked && attempt < maxRetries) {
          attempt += 1;
          const delayMs = 100 * attempt;
          console.warn(
            `[SettingsRepository] Failed to set setting ${key} due to locked database (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        console.error(
          `[SettingsRepository] Failed to set setting ${key}:`,
          error
        );
        throw error;
      }
    }
  }

  /**
   * Remove a setting
   */
  async removeSetting(key: string): Promise<void> {
    await this.ensureInitialized();

    try {
      if (this.isWeb()) {
        const webDb = this.db as IDBPDatabase<WebStorageDB>;
        await webDb.delete('keyvalue', `app_setting:${key}`);
      } else {
        const sqliteDb = this.db as SQLiteDatabase;
        await sqliteDb.runAsync(
          'DELETE FROM app_settings WHERE key = ?',
          [key]
        );
      }
    } catch (error) {
      console.error(`[SettingsRepository] Failed to remove setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<Map<string, string>> {
    await this.ensureInitialized();

    try {
      if (this.isWeb()) {
        const webDb = this.db as IDBPDatabase<WebStorageDB>;
        const allKeys = await webDb.getAllKeys('keyvalue');
        const settingsMap = new Map<string, string>();
        
        for (const key of allKeys) {
          if (typeof key === 'string' && key.startsWith('app_setting:')) {
            const value = await webDb.get('keyvalue', key);
            if (value) {
              const settingKey = key.replace('app_setting:', '');
              settingsMap.set(settingKey, value);
            }
          }
        }
        
        return settingsMap;
      } else {
        const sqliteDb = this.db as SQLiteDatabase;
        const results = await sqliteDb.getAllAsync<SettingsItem>(
          'SELECT key, value FROM app_settings'
        );
        
        const settingsMap = new Map<string, string>();
        for (const row of results) {
          settingsMap.set(row.key, row.value);
        }
        
        return settingsMap;
      }
    } catch (error) {
      console.error('[SettingsRepository] Failed to get all settings:', error);
      return new Map();
    }
  }

  /**
   * Clear all settings
   */
  async clearAllSettings(): Promise<void> {
    await this.ensureInitialized();

    try {
      if (this.isWeb()) {
        const webDb = this.db as IDBPDatabase<WebStorageDB>;
        const allKeys = await webDb.getAllKeys('keyvalue');
        
        for (const key of allKeys) {
          if (typeof key === 'string' && key.startsWith('app_setting:')) {
            await webDb.delete('keyvalue', key);
          }
        }
      } else {
        const sqliteDb = this.db as SQLiteDatabase;
        await sqliteDb.runAsync('DELETE FROM app_settings');
      }
    } catch (error) {
      console.error('[SettingsRepository] Failed to clear all settings:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (!this.isWeb() && this.db) {
      try {
        const sqliteDb = this.db as SQLiteDatabase;
        await sqliteDb.closeAsync();
      } catch (error) {
        console.error('[SettingsRepository] Failed to close database:', error);
      }
    }
    this.initialized = false;
    this.db = null;
  }
}

// Export singleton instance
export const settingsRepository = new SettingsRepository();

