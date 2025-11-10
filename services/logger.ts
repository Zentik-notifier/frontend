import { Platform } from 'react-native';
import { getSharedMediaCacheDirectoryAsync } from '../utils/shared-cache';
import { File } from '../utils/filesystem-wrapper';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AppLog {
  id: string; // Unique identifier (UUID)
  level: LogLevel;
  tag?: string;
  message: string;
  metadata?: any; // Simplified for JSON encoding
  timestamp: number;
  source: string; // "React", "NSE", or "NCE"
}

const ONE_DAY_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_LOGS = 10000; // Keep max 10000 logs
const BATCH_SIZE = 20; // Write to file after 20 logs
const BATCH_TIMEOUT_MS = 5000; // Write to file after 5 seconds

function extractCaller(): string | undefined {
  try {
    const err = new Error();
    const stack = (err.stack || '').split('\n')
      .map(s => s.trim())
      // remove the first line (error message) and any frames inside logger.ts
      .filter((s, idx) => idx > 0 && !/services\/logger\.ts/.test(s));

    // Find first meaningful frame
    const frame = stack.find(s => /\((.*):(\d+):(\d+)\)/.test(s) || /(at\s+.*:\d+:\d+)/.test(s)) || stack[0];
    if (!frame) return undefined;

    // Try to extract file:line:col
    const matchParen = frame.match(/\((.*):(\d+):(\d+)\)/);
    if (matchParen) {
      const [, file, line, col] = matchParen;
      return `${file}:${line}:${col}`;
    }
    const matchPlain = frame.match(/(\S+):(\d+):(\d+)/);
    if (matchPlain) {
      const [full] = matchPlain;
      return full;
    }
    return frame;
  } catch {
    return undefined;
  }
}

class JsonFileLogger {
  private logBuffer: AppLog[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private isFlushingPromise: Promise<void> | null = null;
  private logFilePath: string | null = null;

  // Generate UUID v4 (simplified version)
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private async getLogFilePath(): Promise<string> {
    if (!this.logFilePath) {
      const cacheDir = await getSharedMediaCacheDirectoryAsync();
      this.logFilePath = `${cacheDir}/logs.json`;
    }
    return this.logFilePath;
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
        const logFilePath = await this.getLogFilePath();
        const logFile = new File(logFilePath);

        // Read existing logs
        let existingLogs: AppLog[] = [];
        if (logFile.exists) {
          try {
            const content = await logFile.read();
            if (content) {
              existingLogs = JSON.parse(content);
            }
          } catch (e) {
            console.warn('[Logger] Failed to parse existing logs, starting fresh', e);
          }
        }

        // Append new logs
        existingLogs.push(...logsToWrite);

        // Retention: keep only last 24 hours
        const cutoff = Date.now() - ONE_DAY_MS;
        existingLogs = existingLogs.filter(log => log.timestamp > cutoff);

        // Keep max 1000 logs to prevent file growth
        if (existingLogs.length > MAX_LOGS) {
          existingLogs = existingLogs.slice(-MAX_LOGS);
        }

        // Write back to file
        await logFile.write(JSON.stringify(existingLogs, null, 2));

        // console.log(`[Logger] ✅ Flushed ${logsToWrite.length} logs to JSON`);
      } catch (e) {
        // Avoid throwing from logger
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

  // private convertMetadataToStrings(meta: any): Record<string, string> | undefined {
  //   if (!meta) return undefined;

  //   // If meta is a string, try to parse it as JSON first
  //   if (typeof meta === 'string') {
  //     try {
  //       const parsed = JSON.parse(meta);
  //       if (typeof parsed === 'object' && parsed !== null) {
  //         // Recursively convert the parsed object
  //         return this.convertMetadataToStrings(parsed);
  //       }
  //       // If parsed is not an object, return it as a single value
  //       return { value: meta };
  //     } catch {
  //       // Not valid JSON, return as-is
  //       return { value: meta };
  //     }
  //   }

  //   if (typeof meta !== 'object') {
  //     return { value: String(meta) };
  //   }

  //   // Handle arrays
  //   if (Array.isArray(meta)) {
  //     try {
  //       return { value: JSON.stringify(meta) };
  //     } catch {
  //       return { value: String(meta) };
  //     }
  //   }

  //   // Handle Error objects - extract ALL useful properties including SQLite-specific ones
  //   if (meta instanceof Error) {
  //     const errorMeta: Record<string, string> = {
  //       name: meta.name,
  //       message: meta.message,
  //     };

  //     // Add stack trace if available
  //     if (meta.stack) {
  //       errorMeta.stack = meta.stack;
  //     }

  //     // Add cause if available (for nested errors)
  //     if ((meta as any).cause) {
  //       try {
  //         errorMeta.cause = JSON.stringify((meta as any).cause);
  //       } catch {
  //         errorMeta.cause = String((meta as any).cause);
  //       }
  //     }

  //     // Extract ALL enumerable properties from the error (SQLite errors often have extra props)
  //     for (const [key, value] of Object.entries(meta)) {
  //       if (key !== 'name' && key !== 'message' && key !== 'stack') {
  //         if (typeof value === 'string') {
  //           errorMeta[key] = value;
  //         } else if (typeof value === 'number' || typeof value === 'boolean') {
  //           errorMeta[key] = String(value);
  //         } else if (value === null || value === undefined) {
  //           errorMeta[key] = String(value);
  //         } else {
  //           try {
  //             errorMeta[key] = JSON.stringify(value);
  //           } catch {
  //             errorMeta[key] = String(value);
  //           }
  //         }
  //       }
  //     }

  //     return errorMeta;
  //   }

  //   const result: Record<string, string> = {};
  //   for (const [key, value] of Object.entries(meta)) {
  //     if (typeof value === 'string') {
  //       result[key] = value;
  //     } else if (typeof value === 'number' || typeof value === 'boolean') {
  //       result[key] = String(value);
  //     } else if (value instanceof Error) {
  //       // Handle nested Error objects
  //       const errorData = this.convertMetadataToStrings(value);
  //       if (errorData) {
  //         result[key] = JSON.stringify(errorData);
  //       }
  //     } else {
  //       try {
  //         result[key] = JSON.stringify(value);
  //       } catch {
  //         result[key] = String(value);
  //       }
  //     }
  //   }
  //   return Object.keys(result).length > 0 ? result : undefined;
  // }

  private async write(level: LogLevel, tag: string | undefined, message: string, meta?: any) {
    try {
      const origin = extractCaller();
      const log: AppLog = {
        id: this.generateUUID(),
        level,
        tag,
        message,
        metadata: { ...meta, origin },
        // metadata: JSON.stringify({ ...meta, origin }),
        // metadata: this.convertMetadataToStrings({ ...meta, origin }),
        timestamp: Date.now(),
        source: 'React',
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

class WebJsonFileLogger {
  private logBuffer: AppLog[] = [];
  private flushTimeout: number | null = null;
  private isFlushingPromise: Promise<void> | null = null;
  private logKey = 'zentik-logs-json';

  // Generate UUID v4 (simplified version)
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
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
        // Read existing logs from localStorage
        let existingLogs: AppLog[] = [];
        try {
          const stored = localStorage.getItem(this.logKey);
          if (stored) {
            existingLogs = JSON.parse(stored);
          }
        } catch (e) {
          console.warn('[Logger] Failed to parse existing logs, starting fresh', e);
        }

        // Append new logs
        existingLogs.push(...logsToWrite);

        // Retention: keep only last 24 hours
        const cutoff = Date.now() - ONE_DAY_MS;
        existingLogs = existingLogs.filter(log => log.timestamp > cutoff);

        // Keep max 1000 logs to prevent storage growth
        if (existingLogs.length > MAX_LOGS) {
          existingLogs = existingLogs.slice(-MAX_LOGS);
        }

        // Write back to localStorage
        localStorage.setItem(this.logKey, JSON.stringify(existingLogs));

        // console.log(`[Logger] ✅ Flushed ${logsToWrite.length} logs to localStorage`);
      } catch (e) {
        // avoid throwing from logger
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
        // Error already logged
      });
    }, BATCH_TIMEOUT_MS) as unknown as number;
  }

  private convertMetadataToStrings(meta: any): Record<string, string> | undefined {
    if (!meta) return undefined;

    // If meta is a string, try to parse it as JSON first
    if (typeof meta === 'string') {
      try {
        const parsed = JSON.parse(meta);
        if (typeof parsed === 'object' && parsed !== null) {
          // Recursively convert the parsed object
          return this.convertMetadataToStrings(parsed);
        }
        // If parsed is not an object, return it as a single value
        return { value: meta };
      } catch {
        // Not valid JSON, return as-is
        return { value: meta };
      }
    }

    if (typeof meta !== 'object') {
      return { value: String(meta) };
    }

    // Handle arrays
    if (Array.isArray(meta)) {
      try {
        return { value: JSON.stringify(meta) };
      } catch {
        return { value: String(meta) };
      }
    }

    // Handle Error objects - extract ALL useful properties including SQLite-specific ones
    if (meta instanceof Error) {
      const errorMeta: Record<string, string> = {
        name: meta.name,
        message: meta.message,
      };

      // Add stack trace if available
      if (meta.stack) {
        errorMeta.stack = meta.stack;
      }

      // Add cause if available (for nested errors)
      if ((meta as any).cause) {
        try {
          errorMeta.cause = JSON.stringify((meta as any).cause);
        } catch {
          errorMeta.cause = String((meta as any).cause);
        }
      }

      // Extract ALL enumerable properties from the error (SQLite errors often have extra props)
      for (const [key, value] of Object.entries(meta)) {
        if (key !== 'name' && key !== 'message' && key !== 'stack') {
          if (typeof value === 'string') {
            errorMeta[key] = value;
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            errorMeta[key] = String(value);
          } else if (value === null || value === undefined) {
            errorMeta[key] = String(value);
          } else {
            try {
              errorMeta[key] = JSON.stringify(value);
            } catch {
              errorMeta[key] = String(value);
            }
          }
        }
      }

      return errorMeta;
    }

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        result[key] = String(value);
      } else if (value instanceof Error) {
        // Handle nested Error objects
        const errorData = this.convertMetadataToStrings(value);
        if (errorData) {
          result[key] = JSON.stringify(errorData);
        }
      } else {
        try {
          result[key] = JSON.stringify(value);
        } catch {
          result[key] = String(value);
        }
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }

  private async write(level: LogLevel, tag: string | undefined, message: string, meta?: any) {
    try {
      const origin = extractCaller();
      const log: AppLog = {
        id: this.generateUUID(),
        level,
        tag,
        message,
        metadata: { ...meta, origin },
        // metadata: JSON.stringify({ ...meta, origin }),
        // metadata: this.convertMetadataToStrings({ ...meta, origin }),
        timestamp: Date.now(),
        source: 'Web',
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
      // avoid throwing from logger
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

export const logger = Platform.OS === 'web' ? new WebJsonFileLogger() : new JsonFileLogger();

// Static method to read logs from both sources
export async function readLogs(tsFrom: number = 0): Promise<AppLog[]> {
  if (Platform.OS === 'web') {
    try {
      const stored = localStorage.getItem('zentik-logs-json');
      if (!stored) return [];

      const allLogs: AppLog[] = JSON.parse(stored);

      // Filter by timestamp and sort by timestamp DESC
      return allLogs
        .filter(log => log.timestamp >= tsFrom)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.warn('Failed to read web logs:', error);
      return [];
    }
  } else {
    try {
      const logFilePath = await (async () => {
        const cacheDir = await getSharedMediaCacheDirectoryAsync();
        return `${cacheDir}/logs.json`;
      })();
      const logFile = new File(logFilePath);

      if (!logFile.exists) return [];

      const content = await logFile.read();
      if (!content) return [];

      const allLogs: AppLog[] = JSON.parse(content);

      // Filter by timestamp and sort by timestamp DESC
      return allLogs
        .filter(log => log.timestamp >= tsFrom)
        .sort((a, b) => b.timestamp - a.timestamp);
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
      localStorage.removeItem('zentik-logs-json');
    } catch (error) {
      console.warn('Failed to clear web logs:', error);
      throw error;
    }
  } else {
    try {
      const logFilePath = await (async () => {
        const cacheDir = await getSharedMediaCacheDirectoryAsync();
        return `${cacheDir}/logs.json`;
      })();
      const logFile = new File(logFilePath);

      if (logFile.exists) {
        logFile.delete();
      }
    } catch (error) {
      console.warn('Failed to clear mobile logs:', error);
      throw error;
    }
  }
}


