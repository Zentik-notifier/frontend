import type { SQLiteDatabase } from 'expo-sqlite';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AppLog {
  id?: number;
  level: LogLevel;
  tag?: string;
  message: string;
  metaJson?: string;
  timestamp: number;
}

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


