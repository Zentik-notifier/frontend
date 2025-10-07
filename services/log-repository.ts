import type { SQLiteDatabase } from 'expo-sqlite';
import { AppLog } from './logger';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class LogRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async add(entry: Omit<AppLog, 'id'>): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO app_log (level, tag, message, meta_json, timestamp) VALUES (?, ?, ?, ?, ?)` ,
      [entry.level, entry.tag ?? null, entry.message, entry.metaJson ?? null, entry.timestamp]
    );
  }

  async listSince(tsFrom: number): Promise<AppLog[]> {
    const rows = await this.db.getAllAsync(`SELECT * FROM app_log WHERE timestamp >= ? ORDER BY timestamp DESC`, [tsFrom]);
    return rows.map(mapRow);
  }

  async purgeOlderThan(tsThreshold: number): Promise<void> {
    await this.db.runAsync(`DELETE FROM app_log WHERE timestamp < ?`, [tsThreshold]);
  }

  async clearAll(): Promise<void> {
    await this.db.runAsync(`DELETE FROM app_log`);
  }
}

function mapRow(row: any): AppLog {
  return {
    id: row.id,
    level: row.level,
    tag: row.tag ?? undefined,
    message: row.message,
    metaJson: row.meta_json ?? undefined,
    timestamp: Number(row.timestamp),
  };
}


