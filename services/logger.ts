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
const BATCH_SIZE = 20; // Write to DB after 20 logs
const BATCH_TIMEOUT_MS = 5000; // Write to DB after 5 seconds

class DbLogger {
  private repoPromise: Promise<LogRepository> | null = null;
  private logBuffer: AppLog[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private isFlushingPromise: Promise<void> | null = null;

  private async getRepo(): Promise<LogRepository> {
    if (!this.repoPromise) {
      this.repoPromise = (async () => {
        const db = await openSharedCacheDb();
        return new LogRepository(db);
      })();
    }
    return this.repoPromise;
  }

  private async flushLogs(): Promise<void> {
    // Prevent concurrent flushes
    if (this.isFlushingPromise) {
      return this.isFlushingPromise;
    }

    // Clear timeout since we're flushing now
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Nothing to flush
    if (this.logBuffer.length === 0) {
      return;
    }

    // Copy buffer and clear it immediately to avoid blocking new logs
    const logsToWrite = [...this.logBuffer];
    this.logBuffer = [];

    this.isFlushingPromise = (async () => {
      try {
        const repo = await this.getRepo();
        const now = Date.now();

        // Batch insert all logs
        for (const log of logsToWrite) {
          await repo.add(log);
        }

        // Retention: purge logs older than 24h (only once per batch)
        await repo.purgeOlderThan(now - ONE_DAY_MS);
      } catch (e) {
        // Avoid throwing from logger
        // eslint-disable-next-line no-console
        console.warn('[Logger] Failed to write log batch', e);
      } finally {
        this.isFlushingPromise = null;
      }
    })();

    return this.isFlushingPromise;
  }

  private scheduleFlush(): void {
    // Clear existing timeout
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    // Schedule flush after timeout
    this.flushTimeout = setTimeout(() => {
      this.flushLogs().catch(() => {
        // Error already logged in flushLogs
      });
    }, BATCH_TIMEOUT_MS) as any;
  }

  private async write(level: LogLevel, tag: string | undefined, message: string, meta?: any) {
    try {
      const now = Date.now();
      const log: AppLog = {
        level,
        tag,
        message,
        metaJson: meta ? JSON.stringify(meta) : undefined,
        timestamp: now,
      };

      // Add to buffer
      this.logBuffer.push(log);

      // Flush immediately if buffer is full
      if (this.logBuffer.length >= BATCH_SIZE) {
        await this.flushLogs();
      } else {
        // Schedule flush if not already scheduled
        if (!this.flushTimeout) {
          this.scheduleFlush();
        }
      }
    } catch (e) {
      // Avoid throwing from logger
      // eslint-disable-next-line no-console
      console.warn('[Logger] Failed to buffer log', e);
    }
  }

  debug(message: string, meta?: any, tag?: string) { return this.write('debug', tag, message, meta); }
  info(message: string, meta?: any, tag?: string) { return this.write('info', tag, message, meta); }
  warn(message: string, meta?: any, tag?: string) { return this.write('warn', tag, message, meta); }
  error(message: string, meta?: any, tag?: string) { return this.write('error', tag, message, meta); }

  // Expose flush for manual triggers (e.g., before app closes)
  async flush(): Promise<void> {
    return this.flushLogs();
  }
}

class WebIndexedDbLogger {
  private logBuffer: Array<{ level: LogLevel; tag?: string; message: string; meta?: any }> = [];
  private flushTimeout: number | null = null;
  private isFlushingPromise: Promise<void> | null = null;

  private async flushLogs(): Promise<void> {
    // Prevent concurrent flushes
    if (this.isFlushingPromise) {
      return this.isFlushingPromise;
    }

    // Clear timeout since we're flushing now
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Nothing to flush
    if (this.logBuffer.length === 0) {
      return;
    }

    // Copy buffer and clear it immediately to avoid blocking new logs
    const logsToWrite = [...this.logBuffer];
    this.logBuffer = [];

    this.isFlushingPromise = (async () => {
      try {
        const now = Date.now();
        const db = await openWebStorageDb();

        // Batch insert all logs
        const tx = db.transaction('app_log', 'readwrite');
        for (const log of logsToWrite) {
          const entry = {
            level: log.level,
            tag: log.tag,
            message: log.message,
            meta_json: log.meta ? JSON.stringify(log.meta) : undefined,
            timestamp: now,
          };
          await tx.store.put(entry);
        }
        await tx.done;

        // Retention: purge logs older than 24h (only once per batch)
        const cutoff = now - ONE_DAY_MS;
        const purgeTx = db.transaction('app_log', 'readwrite');
        const store = purgeTx.store;
        let cursor = await store.openCursor();
        while (cursor) {
          const record = cursor.value as any;
          if (record && typeof record.timestamp === 'number' && record.timestamp < cutoff) {
            await cursor.delete();
          }
          cursor = await cursor.continue();
        }
        await purgeTx.done;
      } catch {
        // avoid throwing from logger
      } finally {
        this.isFlushingPromise = null;
      }
    })();

    return this.isFlushingPromise;
  }

  private scheduleFlush(): void {
    // Clear existing timeout
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    // Schedule flush after timeout
    this.flushTimeout = setTimeout(() => {
      this.flushLogs().catch(() => {
        // Error already logged
      });
    }, BATCH_TIMEOUT_MS) as unknown as number;
  }

  private async write(level: LogLevel, tag: string | undefined, message: string, meta?: any) {
    try {
      // Add to buffer
      this.logBuffer.push({ level, tag, message, meta });

      // Flush immediately if buffer is full
      if (this.logBuffer.length >= BATCH_SIZE) {
        await this.flushLogs();
      } else {
        // Schedule flush if not already scheduled
        if (!this.flushTimeout) {
          this.scheduleFlush();
        }
      }
    } catch {
      // avoid throwing from logger
    }
  }

  debug(message: string, meta?: any, tag?: string) { return this.write('debug', tag, message, meta); }
  info(message: string, meta?: any, tag?: string) { return this.write('info', tag, message, meta); }
  warn(message: string, meta?: any, tag?: string) { return this.write('warn', tag, message, meta); }
  error(message: string, meta?: any, tag?: string) { return this.write('error', tag, message, meta); }

  // Expose flush for manual triggers (e.g., before app closes)
  async flush(): Promise<void> {
    return this.flushLogs();
  }
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

// Static method to clear all logs
export async function clearAllLogs(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      const db = await openWebStorageDb();
      await db.clear('app_log');
    } catch (error) {
      console.warn('Failed to clear web logs:', error);
      throw error;
    }
  } else {
    try {
      const db = await openSharedCacheDb();
      const repo = new LogRepository(db);
      await repo.clearAll();
    } catch (error) {
      console.warn('Failed to clear mobile logs:', error);
      throw error;
    }
  }
}


