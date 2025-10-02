import { openSharedCacheDb, openWebStorageDb } from './db-setup';
import { LogRepository, LogLevel } from './log-repository';
import { Platform } from 'react-native';

export interface AppLog {
  id?: number;
  level: LogLevel;
  tag?: string;
  message: string;
  metaJson?: string;
  timestamp: number;
}

const ONE_DAY_MS = 3 * 24 * 60 * 60 * 1000;

class DbLogger {
  private repoPromise: Promise<LogRepository> | null = null;

  private async getRepo(): Promise<LogRepository> {
    if (!this.repoPromise) {
      this.repoPromise = (async () => {
        const db = await openSharedCacheDb();
        return new LogRepository(db);
      })();
    }
    return this.repoPromise;
  }

  private async write(level: LogLevel, tag: string | undefined, message: string, meta?: any) {
    try {
      const repo = await this.getRepo();
      const now = Date.now();
      await repo.add({ level, tag, message, metaJson: meta ? JSON.stringify(meta) : undefined, timestamp: now });
      // retention: purge older than 24h
      await repo.purgeOlderThan(now - ONE_DAY_MS);
    } catch (e) {
      // Avoid throwing from logger
      // eslint-disable-next-line no-console
      console.warn('[Logger] Failed to write log', e);
    }
  }

  debug(message: string, meta?: any, tag?: string) { return this.write('debug', tag, message, meta); }
  info(message: string, meta?: any, tag?: string) { return this.write('info', tag, message, meta); }
  warn(message: string, meta?: any, tag?: string) { return this.write('warn', tag, message, meta); }
  error(message: string, meta?: any, tag?: string) { return this.write('error', tag, message, meta); }
}

class WebIndexedDbLogger {
  private async write(level: LogLevel, tag: string | undefined, message: string, meta?: any) {
    try {
      const now = Date.now();
      const db = await openWebStorageDb();
      const entry = { level, tag, message, meta_json: meta ? JSON.stringify(meta) : undefined, timestamp: now };
      await db.put('app_log', entry);

      // Retention: purge logs older di 24h
      const cutoff = now - ONE_DAY_MS;
      const tx = db.transaction('app_log', 'readwrite');
      const store = tx.store;
      let cursor = await store.openCursor();
      while (cursor) {
        const record = cursor.value as any;
        if (record && typeof record.timestamp === 'number' && record.timestamp < cutoff) {
          await cursor.delete();
        }
        cursor = await cursor.continue();
      }
      await tx.done;
    } catch {
      // avoid throwing from logger
    }
  }

  debug(message: string, meta?: any, tag?: string) { return this.write('debug', tag, message, meta); }
  info(message: string, meta?: any, tag?: string) { return this.write('info', tag, message, meta); }
  warn(message: string, meta?: any, tag?: string) { return this.write('warn', tag, message, meta); }
  error(message: string, meta?: any, tag?: string) { return this.write('error', tag, message, meta); }
}

export const logger = Platform.OS === 'web' ? new WebIndexedDbLogger() : new DbLogger();

// Static method to read logs from both sources
export async function readLogs(tsFrom: number = 0): Promise<AppLog[]> {
  if (Platform.OS === 'web') {
    try {
      const db = await openWebStorageDb();
      const allLogs = await db.getAll('app_log');
      
      // Filter by timestamp and sort by timestamp DESC
      const filteredLogs = allLogs
        .filter((log: any) => log.timestamp >= tsFrom)
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
      
      // Convert to AppLog format
      return filteredLogs.map((log: any) => ({
        id: log.timestamp, // Use timestamp as ID for web logs
        level: log.level,
        tag: log.tag,
        message: log.message,
        metaJson: log.meta_json,
        timestamp: log.timestamp,
      }));
    } catch (error) {
      console.warn('Failed to read web logs:', error);
      return [];
    }
  } else {
    try {
      const db = await openSharedCacheDb();
      const repo = new LogRepository(db);
      return await repo.listSince(tsFrom);
    } catch (error) {
      console.warn('Failed to read mobile logs:', error);
      return [];
    }
  }
}


