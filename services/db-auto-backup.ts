import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { exportSQLiteDatabaseToFile, importSQLiteDatabaseFromFile } from './db-setup';

const AUTO_BACKUP_DIR_NAME = 'zentik-db-auto-backups';
const AUTO_BACKUP_PREFIX = 'zentik-db-auto-backup-';

export type AutoDbBackupFile = {
  name: string;
  uri: string;
  timestamp: string;
};

function getAutoBackupDirectory(): Directory {
  return new Directory(Paths.document, AUTO_BACKUP_DIR_NAME);
}

function parseBackupTimestampFromName(name: string): string | null {
  if (!name.startsWith(AUTO_BACKUP_PREFIX) || !name.endsWith('.sql')) return null;
  return name.slice(AUTO_BACKUP_PREFIX.length, -'.sql'.length);
}

export async function listAutoDbBackups(): Promise<AutoDbBackupFile[]> {
  if (Platform.OS === 'web') return [];

  const dir = getAutoBackupDirectory();
  if (!dir.exists) return [];

  const files = await dir.list();

  const backups: AutoDbBackupFile[] = files
    .map((f) => {
      const timestamp = parseBackupTimestampFromName(f.name);
      if (!timestamp) return null;
      return {
        name: f.name,
        uri: f.uri,
        timestamp,
      } satisfies AutoDbBackupFile;
    })
    .filter(Boolean) as AutoDbBackupFile[];

  backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return backups;
}

export async function getLatestAutoDbBackup(): Promise<AutoDbBackupFile | null> {
  const backups = await listAutoDbBackups();
  return backups[0] ?? null;
}

async function pruneOldAutoDbBackups(maxCopies: number): Promise<void> {
  if (Platform.OS === 'web') return;
  if (maxCopies <= 0) return;

  const backups = await listAutoDbBackups();
  const toDelete = backups.slice(maxCopies);

  for (const b of toDelete) {
    try {
      const file = new File(b.uri);
      if (file.exists) {
        await file.delete();
      }
    } catch (e) {
      console.warn('[DB][AutoBackup] Failed to delete old backup:', b.uri, e);
    }
  }
}

export async function createAutoDbBackupNow(options?: { keepCopies?: number }): Promise<AutoDbBackupFile | null> {
  if (Platform.OS === 'web') return null;

  const keepCopies = options?.keepCopies ?? 3;

  const dir = getAutoBackupDirectory();
  if (!dir.exists) {
    await dir.create();
  }

  // Create SQL dump in cache, then copy into document directory for persistence.
  const exportUri = await exportSQLiteDatabaseToFile();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destName = `${AUTO_BACKUP_PREFIX}${timestamp}.sql`;

  const src = new File(exportUri);
  const dest = new File(dir, destName);

  try {
    await (src as any).copy(dest as any);
  } finally {
    // Best-effort cleanup of the temporary export
    try {
      if (src.exists) {
        await src.delete();
      }
    } catch {}
  }

  await pruneOldAutoDbBackups(keepCopies);

  return {
    name: destName,
    uri: dest.uri,
    timestamp,
  };
}

export async function restoreLatestAutoDbBackup(): Promise<AutoDbBackupFile> {
  const latest = await getLatestAutoDbBackup();
  if (!latest) {
    throw new Error('No local automatic DB backups found');
  }

  await importSQLiteDatabaseFromFile(latest.uri);
  return latest;
}
