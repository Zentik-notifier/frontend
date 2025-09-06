import * as RNFS from 'expo-file-system';
import { Platform } from 'react-native';

export interface FileInfo {
    exists: boolean;
    isDirectory?: boolean;
    size?: number;
    uri?: string;
}

export interface FileSystemLike {
    documentDirectory: string | null;
    getInfoAsync: (uri: string, opts?: { size?: boolean }) => Promise<FileInfo>;
    makeDirectoryAsync: (uri: string, opts?: { intermediates?: boolean }) => Promise<void>;
    deleteAsync: (uri: string) => Promise<void>;
    downloadAsync: (fromUrl: string, toFile: string) => Promise<{ uri: string; status: number }>;
}

// --- Simple IndexedDB-backed FS for Web ---
type IdbRecord = { path: string; data: ArrayBuffer; type: string; size: number };

class WebFSImpl implements FileSystemLike {
    public documentDirectory: string | null = '';
    private dbPromise: Promise<IDBDatabase> | null = null;

    private ensureDb(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;
        this.dbPromise = new Promise((resolve, reject) => {
            const hasIndexedDb = typeof globalThis !== 'undefined' && typeof (globalThis as any).indexedDB !== 'undefined';
            if (!hasIndexedDb) {
                // Fallback: create a fake DB that always fails
                reject(new Error('indexedDB not available'));
                return;
            }
            const req = (globalThis as any).indexedDB.open('WebFS', 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('files')) {
                    db.createObjectStore('files', { keyPath: 'path' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return this.dbPromise;
    }

    private async idbGet(path: string): Promise<IdbRecord | null> {
        try {
            const db = await this.ensureDb();
            return await new Promise((resolve, reject) => {
                const tx = db.transaction('files', 'readonly');
                const store = tx.objectStore('files');
                const r = store.get(path);
                r.onsuccess = () => resolve(r.result || null);
                r.onerror = () => reject(r.error);
            });
        } catch {
            return null;
        }
    }

    private async idbPut(path: string, blob: Blob): Promise<void> {
        try {
            const db = await this.ensureDb();
            const buffer = await blob.arrayBuffer();
            const rec: IdbRecord = { path, data: buffer, type: blob.type || 'application/octet-stream', size: blob.size };
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction('files', 'readwrite');
                const store = tx.objectStore('files');
                store.put(rec);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch {
            // ignore
        }
    }

    private async idbDelete(path: string): Promise<void> {
        try {
            const db = await this.ensureDb();
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction('files', 'readwrite');
                const store = tx.objectStore('files');
                store.delete(path);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch {
            // ignore
        }
    }

    async getInfoAsync(uri: string, opts?: { size?: boolean }): Promise<FileInfo> {
        const rec = await this.idbGet(uri);
        if (!rec) return { exists: false };
        let objectUrl: string | undefined;
        try {
            const blob = new Blob([rec.data], { type: rec.type });
            objectUrl = URL.createObjectURL(blob);
        } catch { }
        return { exists: true, isDirectory: false, size: rec.size, uri: objectUrl };
    }

    async makeDirectoryAsync(uri: string, opts?: { intermediates?: boolean }): Promise<void> {
        // No-op on web (virtual)
        return;
    }

    async deleteAsync(uri: string): Promise<void> {
        await this.idbDelete(uri);
    }

    async downloadAsync(fromUrl: string, toFile: string): Promise<{ uri: string; status: number }> {
        try {
            const res = await fetch(fromUrl, { cache: 'force-cache' });
            if (!res.ok) return { uri: toFile, status: res.status };
            const blob = await res.blob();
            await this.idbPut(toFile, blob);
            const info = await this.getInfoAsync(toFile);
            return { uri: info.uri || toFile, status: res.status };
        } catch {
            return { uri: toFile, status: 500 };
        }
    }
}

const webFS: FileSystemLike = new WebFSImpl();

export const FS = Platform.OS === 'web' ? webFS : RNFS;


