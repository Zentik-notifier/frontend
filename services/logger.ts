import { Platform } from 'react-native';
import { getSharedMediaCacheDirectoryAsync } from '../utils/shared-cache';
import { File, Directory } from '../utils/filesystem-wrapper';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const getLogsDirectory = async (): Promise<string> => {
  const cacheDir = await getSharedMediaCacheDirectoryAsync();
  return `${cacheDir}/logs`;
};

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
const MAX_LOGS = 2000; // Keep max 2000 logs
const BATCH_SIZE = 20; // Write to file after 20 logs
const BATCH_TIMEOUT_MS = 5000; // Write to file after 5 seconds

// Generate UUID v4 (shared utility function)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
  private logsDir: string | null = null;

  private async getLogsDirectory(): Promise<string> {
    if (!this.logsDir) {
      this.logsDir = await getLogsDirectory();
      // Ensure logs directory exists
      const directory = new Directory(this.logsDir);
      if (!directory.exists) {
        await directory.create();
      }
    }
    return this.logsDir;
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
        const logsDir = await this.getLogsDirectory();
        const logFilePath = `${logsDir}/React.json`;
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

        // Keep max 10000 logs to prevent file growth
        if (existingLogs.length > MAX_LOGS) {
          existingLogs = existingLogs.slice(-MAX_LOGS);
        }

        // Write back to file
        await logFile.write(JSON.stringify(existingLogs, null, 2));

        // console.log(`[Logger] ✅ Flushed ${logsToWrite.length} logs to React.json`);
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
        id: generateUUID(),
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
        id: generateUUID(),
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

const READ_LOGS_DEFAULT_LIMIT = 5000;

export async function readLogs(tsFrom: number = 0, fromSource?: string, limit?: number): Promise<AppLog[]> {
  const cap = limit === undefined ? READ_LOGS_DEFAULT_LIMIT : limit;
  const applyLimit = (logs: AppLog[]) => (cap > 0 ? logs.slice(0, cap) : logs);

  if (Platform.OS === 'web') {
    try {
      const stored = localStorage.getItem('zentik-logs-json');
      if (!stored) return [];

      const allLogs: AppLog[] = JSON.parse(stored);

      const filtered = allLogs
        .filter(log => log.timestamp >= tsFrom && (!fromSource || log.source === fromSource))
        .sort((a, b) => b.timestamp - a.timestamp);
      return applyLimit(filtered);
    } catch (error) {
      console.warn('Failed to read web logs:', error);
      return [];
    }
  } else {
    try {
      const logsDir = await getLogsDirectory();

      const allLogs: AppLog[] = [];

      const directory = new Directory(logsDir);

      if (directory.exists) {
        const files = await directory.list();

        for (const file of files) {
          const fileName = file.name;
          if (fileName.includes('_corrupted_')) continue;
          if (!fileName.endsWith('.json')) continue;
          if (fromSource) {
            const sourceFromFile = fileName.replace('.json', '');
            if (sourceFromFile !== fromSource) continue;
          }

          try {
            const logFile = new File(`${logsDir}/${fileName}`);
            const content = await logFile.read();

            if (content) {
              const logs: AppLog[] = JSON.parse(content);
              allLogs.push(...logs);
            }
          } catch (error) {
            console.warn(`Failed to read log file ${fileName}:`, error);
          }
        }
      }

      const filtered = allLogs
        .filter(log => log.timestamp >= tsFrom && (!fromSource || log.source === fromSource))
        .sort((a, b) => b.timestamp - a.timestamp);
      return applyLimit(filtered);
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
      const logsDir = await getLogsDirectory();

      const directory = new Directory(logsDir);

      if (directory.exists) {
        // Delete all log files in the directory
        const files = await directory.list();

        for (const file of files) {
          const fileName = file.name;
          if (fileName.endsWith('.json')) {
            try {
              const logFile = new File(`${logsDir}/${fileName}`);
              await logFile.delete();
            } catch (error) {
              console.warn(`Failed to delete log file ${fileName}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to clear mobile logs:', error);
      throw error;
    }
  }
}

// Static method to delete a single log entry by ID
export async function deleteLogEntry(logId: string, source?: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      const stored = localStorage.getItem('zentik-logs-json');
      if (!stored) return;

      let allLogs: AppLog[] = JSON.parse(stored);
      allLogs = allLogs.filter(log => log.id !== logId);
      
      localStorage.setItem('zentik-logs-json', JSON.stringify(allLogs));
    } catch (error) {
      console.warn('Failed to delete web log entry:', error);
      throw error;
    }
  } else {
    try {
      const logsDir = await getLogsDirectory();
      const directory = new Directory(logsDir);

      if (!directory.exists) return;

      const files = await directory.list();

      for (const file of files) {
        const fileName = file.name;
        
        // Skip corrupted backup files
        if (fileName.includes('_corrupted_')) continue;
        
        // Only process .json files
        if (!fileName.endsWith('.json')) continue;

        // If source specified, only process that file
        if (source) {
          const sourceFromFile = fileName.replace('.json', '');
          if (sourceFromFile !== source) continue;
        }

        try {
          const logFile = new File(`${logsDir}/${fileName}`);
          const content = await logFile.read();

          if (content) {
            let logs: AppLog[] = JSON.parse(content);
            const originalLength = logs.length;
            
            logs = logs.filter(log => log.id !== logId);
            
            // Only write if we actually removed something
            if (logs.length !== originalLength) {
              await logFile.write(JSON.stringify(logs, null, 2));
              return; // Log found and deleted, exit
            }
          }
        } catch (error) {
          console.warn(`Failed to process log file ${fileName}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to delete mobile log entry:', error);
      throw error;
    }
  }
}

// Static method to delete an entire log file (iOS only)
export async function deleteLogFile(fileName: string): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('deleteLogFile is not supported on web platform');
  }

  try {
    const logsDir = await getLogsDirectory();
    const logFile = new File(`${logsDir}/${fileName}`);

    if (logFile.exists) {
      await logFile.delete();
    }
  } catch (error) {
    console.warn(`Failed to delete log file ${fileName}:`, error);
    throw error;
  }
}

// Function to save task logs to tasks.json file (compatible with AppLog structure)
export async function saveTaskToFile(
  task: string,
  status: 'started' | 'completed' | 'failed',
  message: string,
  metadata?: any
): Promise<void> {
  try {
    const logsDir = await getLogsDirectory();
    const tasksFilePath = `${logsDir}/tasks.json`;
    
    const directory = new Directory(logsDir);
    if (!directory.exists) {
      await directory.create();
    }

    const taskFile = new File(tasksFilePath);
    
    let existingLogs: AppLog[] = [];
    if (taskFile.exists) {
      try {
        const content = await taskFile.read();
        if (content) {
          existingLogs = JSON.parse(content);
        }
      } catch (e) {
        console.warn('[TaskLogger] Failed to parse existing tasks, starting fresh', e);
      }
    }

    const level: LogLevel = status === 'failed' ? 'error' : 'info';
    
    const newLog: AppLog = {
      id: generateUUID(),
      level,
      tag: task,
      message,
      metadata,
      timestamp: Date.now(),
      source: 'BackgroundTasks',
    };

    existingLogs.push(newLog);

    const MAX_LOGS = 2000;
    if (existingLogs.length > MAX_LOGS) {
      existingLogs = existingLogs.slice(-MAX_LOGS);
    }

    await taskFile.write(JSON.stringify(existingLogs, null, 2));
  } catch (e) {
    console.warn('[TaskLogger] Failed to save task to file', e);
  }
}


