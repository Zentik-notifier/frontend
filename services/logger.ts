import { openSharedCacheDb } from './media-cache-db';
import { LogRepository, LogLevel } from './log-repository';
import { userSettings } from './user-settings';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

export const logger = new DbLogger();


