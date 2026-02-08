import AsyncStorage from "@/utils/async-storage-wrapper";
import { MediaType } from "@/generated/gql-operations-generated";

const DOWNLOADS_HISTORY_KEY = "zentik_downloads_history";
const MAX_ENTRIES = 100;

export interface DownloadHistoryEntry {
  id: string;
  url: string;
  mediaType: MediaType;
  completedAt: number;
  size?: number;
  bucketName?: string;
  notificationId?: string;
  title?: string;
}

async function readEntries(): Promise<DownloadHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADS_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DownloadHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeEntries(entries: DownloadHistoryEntry[]): Promise<void> {
  const trimmed = entries.slice(-MAX_ENTRIES);
  await AsyncStorage.setItem(DOWNLOADS_HISTORY_KEY, JSON.stringify(trimmed));
}

export const downloadHistoryService = {
  async append(entry: Omit<DownloadHistoryEntry, "id" | "completedAt">): Promise<void> {
    const entries = await readEntries();
    const newEntry: DownloadHistoryEntry = {
      ...entry,
      id: `dl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      completedAt: Date.now(),
    };
    entries.push(newEntry);
    await writeEntries(entries);
  },

  async getDownloads(): Promise<DownloadHistoryEntry[]> {
    const entries = await readEntries();
    return entries.sort((a, b) => b.completedAt - a.completedAt);
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(DOWNLOADS_HISTORY_KEY);
  },
};
