import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FS from 'expo-file-system';
import { Platform } from 'react-native';
import { BehaviorSubject } from "rxjs";
import { MediaType } from '../generated/gql-operations-generated';
import { getMetadataDirectory, getSharedMediaCacheDirectoryAsync } from '../utils/shared-cache';
import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';

export interface CacheItem {
    url: string;
    localPath: string;
    localThumbPath?: string;
    generatingThumbnail?: boolean;
    timestamp: number;
    size: number;
    mediaType: MediaType;
    originalFileName?: string;
    downloadedAt: number;
    notificationDate?: number;
    isDownloading?: boolean;
    isPermanentFailure?: boolean;
    isUserDeleted?: boolean;
    errorCode?: string;
}

export interface CacheStats {
    totalItems: number;
    totalSize: number;
    itemsByType: Record<MediaType, number>;
}

export type MediaSource = {
    fromCache: boolean;
    isDownloading?: boolean;
    isUserDeleted?: boolean;
    isPermanentFailure?: boolean;
    item?: CacheItem;
};

export interface CacheMetadata {
    [key: string]: CacheItem;
}

type QueueOperation = 'download' | 'thumbnail';

export interface DownloadQueueItem {
    key: string;
    url: string;
    mediaType: MediaType;
    notificationDate?: number;
    timestamp: number;
    op: QueueOperation;
}

export interface DownloadQueueState {
    queue: DownloadQueueItem[];
    isProcessing: boolean;
}

class MediaCacheService {
    private cacheDir: string = '';
    private metadata: CacheMetadata = {};
    private downloadingKeys: Set<string> = new Set();
    private userDeletedSet: Set<string> = new Set();
    private readonly USER_DELETED_KEY = '@media_cache_user_deleted';
    private initialized = false;
    public metadata$ = new BehaviorSubject<CacheMetadata>(this.metadata);

    // Download queue management
    private downloadQueue: DownloadQueueItem[] = [];
    private isProcessingQueue = false;
    public downloadQueue$ = new BehaviorSubject<DownloadQueueState>({
        queue: [],
        isProcessing: false,
    });

    constructor() {
        this.initialize();
    }

    private updateQueueState(): void {
        this.downloadQueue$.next({
            queue: [...this.downloadQueue],
            isProcessing: this.isProcessingQueue,
        });
    }

    private buildQueueKey(url: string, mediaType: MediaType, op: QueueOperation): string {
        return `${this.generateCacheKey(url, mediaType)}::${op}`;
    }

    private async addToQueue(item: Omit<DownloadQueueItem, 'timestamp' | 'key'>) {
        const key = this.buildQueueKey(item.url, item.mediaType, item.op);
        if (this.isInQueue(item.url, item.mediaType, item.op)) {
            return;
        }
        this.downloadQueue.push({ ...item, key, timestamp: Date.now() });
        if (item.op === 'download') {
            const cacheKey = this.generateCacheKey(item.url, item.mediaType);
            this.metadata[cacheKey] = {
                ...this.metadata[cacheKey],
                isDownloading: true,
            };
            await this.saveMetadata();
        }
        if (item.op === 'thumbnail') {
            const cacheKey = this.generateCacheKey(item.url, item.mediaType);
            this.metadata[cacheKey] = {
                ...this.metadata[cacheKey],
                generatingThumbnail: true,
                timestamp: Date.now(),
            };
            await this.saveMetadata();
        }

        this.updateQueueState();
        this.processQueue();
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.downloadQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;
        this.updateQueueState();

        while (this.downloadQueue.length > 0) {
            const item = this.downloadQueue.shift()!;
            this.updateQueueState();

            try {
                if (item.op === 'download') {
                    await this.performDownload(item);
                } else if (item.op === 'thumbnail') {
                    await this.performThumbnail(item);
                }
            } catch (error) {
                console.error('[MediaCache] Queue task failed:', item.op, error);
            }
        }

        this.isProcessingQueue = false;
        this.updateQueueState();
    }

    private async performDownload(item: DownloadQueueItem) {
        const { url, mediaType, notificationDate } = item;
        const key = this.generateCacheKey(url, mediaType);

        this.userDeletedSet.delete(key);
        this.downloadingKeys.add(key);

        try {
            const localPath = this.getLocalPath(url, mediaType);

            this.metadata[key] = {
                ...this.metadata[key],
                isDownloading: true,
                isPermanentFailure: false,
                isUserDeleted: false,
                url,
                mediaType,
                timestamp: new Date().getTime(),
                notificationDate: notificationDate ?? this.metadata[key]?.notificationDate,
            };
            await this.saveMetadata();

            const downloadResult = await FS.downloadAsync(url, localPath);

            let success = false;
            let fileSize = 0;
            if (downloadResult.status === 200) {
                const fileInfo = await FS.getInfoAsync(localPath);

                if (!fileInfo.exists) {
                    success = false;
                } else {
                    fileSize = fileInfo.size || 0;
                    success = true;
                }
            } else {
                success = false;
            }

            if (success) {
                this.metadata[key] = {
                    ...this.metadata[key],
                    size: fileSize,
                    isDownloading: false,
                    localPath: downloadResult.uri,
                    errorCode: undefined,
                    downloadedAt: Date.now(),
                    timestamp: new Date().getTime(),
                };
                // enqueue thumbnail generation if applicable
                if ([MediaType.Image, MediaType.Gif, MediaType.Video].includes(mediaType)) {
                    // await this.addToQueue({ url, mediaType, op: 'thumbnail' });
                }
            } else {
                this.metadata[key] = {
                    ...this.metadata[key],
                    isDownloading: false,
                    timestamp: new Date().getTime(),
                    isPermanentFailure: true,
                };
            }

            await this.saveMetadata();
        } catch (error) {
            console.error('[MediaCache] Download failed:', error);

            delete this.metadata[key];
            await this.saveMetadata();
            return false;
        } finally {
            this.downloadingKeys.delete(key);
        }
    }

    private async performThumbnail(item: DownloadQueueItem) {
        const { url, mediaType } = item;
        const cacheKey = this.generateCacheKey(url, mediaType);
        try {
            console.log('[MediaCache] Thumbnail generation START:', mediaType, url);
            const result = await this.getOrCreateThumbnail(url, mediaType);
            // getOrCreateThumbnail already sets localThumbPath if generated
            console.log('[MediaCache] Thumbnail generation END:', mediaType, url, '->', result);
        } catch (e) {
            console.warn('[MediaCache] Thumbnail generation failed for', url, e);
        } finally {
            this.metadata[cacheKey] = {
                ...this.metadata[cacheKey],
                generatingThumbnail: false,
                timestamp: Date.now(),
            };
            await this.saveMetadata();
        }
    }

    private async initialize(): Promise<void> {
        if (this.initialized) return;

        if (Platform.OS === 'web') {
            this.cacheDir = '';
            this.initialized = true;
            return;
        }

        try {
            this.cacheDir = await getSharedMediaCacheDirectoryAsync();
            await this.ensureDirectories();
            await this.loadMetadata();
            await this.loadUserDeleted();
            this.initialized = true;
        } catch (error) {
            console.error('[MediaCache] Initialization failed:', error);
        }
    }

    private async ensureDirectories(): Promise<void> {
        if (Platform.OS === 'web') return;

        const typeDirs = ['IMAGE', 'VIDEO', 'GIF', 'AUDIO', 'ICON'];
        for (const type of typeDirs) {
            const dirPath = `${this.cacheDir}${type}/`;
            const info = await FS.getInfoAsync(dirPath);
            if (!info.exists) {
                await FS.makeDirectoryAsync(dirPath, { intermediates: true });
            }

            // Ensure thumbnails subdirectory INSIDE each media type folder
            const thumbPath = `${dirPath}thumbnails/`;
            const thumbInfo = await FS.getInfoAsync(thumbPath);
            if (!thumbInfo.exists) {
                await FS.makeDirectoryAsync(thumbPath, { intermediates: true });
            }
        }
    }

    generateCacheKey(url: string, mediaType: MediaType): string {
        return `${String(mediaType).toUpperCase()}_${url}`;
    }

    private hashStringUtf8Sum(str: string): number {
        try {
            const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
            const bytes: Uint8Array = encoder
                ? encoder.encode(str)
                : new Uint8Array(unescape(encodeURIComponent(str)).split('').map((c) => c.charCodeAt(0)));
            let sum = 0;
            for (let i = 0; i < bytes.length; i++) {
                sum = (sum + bytes[i]) % 999999;
            }
            return sum;
        } catch {
            // Last-resort fallback (may differ for non-ASCII)
            let sum = 0;
            for (let i = 0; i < str.length; i++) sum = (sum + str.charCodeAt(i)) % 999999;
            return sum;
        }
    }

    private generateLongHash(str: string): string {
        // Use a simple but effective hash algorithm for React Native
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            // Use safe arithmetic operations to avoid overflow
            hash = (hash * 31 + char) >>> 0; // Unsigned right shift to ensure 32-bit
        }
        // Convert to hex string and pad to 8 characters
        return hash.toString(16).padStart(8, '0');
    }

    private getLocalPath(url: string, mediaType: MediaType): string {
        if (Platform.OS === 'web') return url;

        const longHash = this.generateLongHash(url);
        const safeFileName = `${String(mediaType).toLowerCase()}_${longHash}`;
        const extension = this.getFileExtension(url, mediaType);
        return `${this.cacheDir}${mediaType}/${safeFileName}.${extension}`;
    }

    private getThumbnailPath(url: string, mediaType: MediaType): string {
        if (Platform.OS === 'web') return url;
        const longHash = this.generateLongHash(url);
        const fileName = `${String(mediaType).toLowerCase()}_${longHash}.jpg`;
        // Save thumbnails inside the media type folder under a thumbnails subfolder
        return `${this.cacheDir}${mediaType}/thumbnails/${fileName}`;
    }

    private async loadMetadata(): Promise<void> {
        try {
            if (Platform.OS === 'ios') {
                // Read from shared metadata file created by NSE
                const metadataFilePath = await getMetadataDirectory();
                const fileInfo = await FS.getInfoAsync(metadataFilePath);

                if (fileInfo.exists) {
                    const metadataContent = await FS.readAsStringAsync(metadataFilePath);
                    const sharedMetadata: CacheMetadata = JSON.parse(metadataContent);

                    this.metadata = {};
                    for (const [key, item] of Object.entries(sharedMetadata)) {
                        if (item.downloadedAt) {
                            this.metadata[key] = {
                                ...item,
                                isDownloading: false,
                                isPermanentFailure: false,
                            };
                        }
                    }
                    console.log('[MediaCache] Loaded metadata:', Object.keys(this.metadata).length, 'items');
                } else {
                    console.log('[MediaCache] No metadata file found, starting fresh');
                    this.metadata = {};
                }
            } else {
                this.metadata = {};
            }

            this.metadata$.next(this.metadata);
        } catch (error) {
            console.error('[MediaCache] Failed to load metadata:', error);
            this.metadata = {};
        }
    }

    private async loadUserDeleted(): Promise<void> {
        try {
            const raw = await AsyncStorage.getItem(this.USER_DELETED_KEY);
            if (raw) {
                const arr: string[] = JSON.parse(raw);
                this.userDeletedSet = new Set(arr);
            }
        } catch {
            this.userDeletedSet = new Set();
        }
    }

    private async saveUserDeleted(): Promise<void> {
        try {
            await AsyncStorage.setItem(this.USER_DELETED_KEY, JSON.stringify(Array.from(this.userDeletedSet)));
        } catch (error) {
            console.error('[MediaCache] Failed to save user deleted:', error);
        }
    }

    private async markUserDeleted(url: string, mediaType: MediaType): Promise<void> {
        const key = this.generateCacheKey(url, mediaType);
        this.userDeletedSet.add(key);
        this.metadata[key] = {
            ...this.metadata[key],
            isUserDeleted: true,
            timestamp: new Date().getTime(),
        };
        await this.saveMetadata();
        await this.saveUserDeleted();
    }

    private isUserDeleted(url: string, mediaType: MediaType): boolean {
        return this.userDeletedSet.has(this.generateCacheKey(url, mediaType));
    }

    private isPermanentFailure(url: string, mediaType: MediaType): boolean {
        const key = this.generateCacheKey(url, mediaType);
        const cachedItem = this.metadata[key];
        return cachedItem?.isPermanentFailure ?? false;
    }

    private async saveMetadata(): Promise<void> {
        try {
            if (Platform.OS === 'ios') {
                const metadataFilePath = await getMetadataDirectory();

                const sharedMetadata: CacheMetadata = {};
                const cachedItems = Object.entries(this.metadata);
                for (const [key, item] of cachedItems) {
                    sharedMetadata[key] = {
                        url: item.url,
                        localPath: item.localPath,
                        localThumbPath: item.localThumbPath,
                        generatingThumbnail: item.generatingThumbnail,
                        timestamp: item.timestamp,
                        size: item.size,
                        mediaType: item.mediaType,
                        originalFileName: item.originalFileName,
                        downloadedAt: item.downloadedAt,
                        notificationDate: item.notificationDate,
                        isDownloading: item.isDownloading ?? false,
                    };
                }

                this.metadata$.next(this.metadata);
                await FS.writeAsStringAsync(metadataFilePath, JSON.stringify(sharedMetadata, null, 2));
                console.log('[MediaCache] Save cache item:', Object.keys(sharedMetadata).length, 'items');
            } else {
                this.metadata$.next(this.metadata);
            }
        } catch (error) {
            console.error('[MediaCache] Failed to save shared metadata:', error);
        }
    }

    getCachedItemSync(url: string, mediaType: MediaType): CacheItem | undefined {
        return this.metadata[this.generateCacheKey(url, mediaType)];
    }

    async getCachedItem(url: string, mediaType: MediaType): Promise<CacheItem | undefined> {
        const key = this.generateCacheKey(url, mediaType);
        let cachedItem = this.metadata[key];

        if (!cachedItem && Platform.OS !== 'web') {
            const localPath = this.getLocalPath(url, mediaType);
            const fileInfo = await FS.getInfoAsync(localPath);

            if (fileInfo.exists && fileInfo.size) {
                cachedItem = {
                    url,
                    localPath,
                    timestamp: Date.now(),
                    size: fileInfo.size,
                    mediaType,
                    downloadedAt: Date.now(),
                    isDownloading: false,
                    generatingThumbnail: false,
                };

                this.metadata[key] = cachedItem;
                await this.saveMetadata();
            }
        }

        // Thumbnail metadata update only (no auto enqueue)
        if (cachedItem && [MediaType.Image, MediaType.Gif, MediaType.Video].includes(mediaType)) {
            const thumbPath = this.getThumbnailPath(url, mediaType);
            const info = await FS.getInfoAsync(thumbPath);
            if (info.exists) {
                if (!this.metadata[key]?.localThumbPath || this.metadata[key]?.localThumbPath !== thumbPath) {
                    this.metadata[key] = {
                        ...this.metadata[key],
                        localThumbPath: thumbPath,
                        generatingThumbnail: false,
                        timestamp: Date.now(),
                    };
                    await this.saveMetadata();
                }
            }
        }

        return cachedItem;
    }

    async reloadMetadata(): Promise<void> {
        await this.loadMetadata();
    }

    async downloadMedia(
        props: {
            url: string,
            mediaType: MediaType,
            force?: boolean,
            notificationDate?: number,
        },
    ): Promise<void> {
        const { url, mediaType, force, notificationDate } = props;
        await this.initialize();
        const key = this.generateCacheKey(url, mediaType);

        if (Platform.OS === 'web') return;

        // Check if already cached
        const cachedItem = await this.getCachedItem(url, mediaType);
        if (cachedItem && !force) {
            return;
        }

        // Check if already downloading
        if (this.downloadingKeys.has(key)) {
            return;
        }

        // Check if user deleted or permanent failure
        if (this.isUserDeleted(url, mediaType) && !force) {
            return;
        }

        if (this.isPermanentFailure(url, mediaType) && !force) {
            return;
        }

        // Add to download queue
        this.addToQueue({
            url,
            mediaType,
            op: 'download',
            notificationDate,
        });
    }

    async markAsPermanentFailure(url: string, mediaType: MediaType, errorCode?: string): Promise<void> {
        await this.initialize();
        const key = this.generateCacheKey(url, mediaType);

        this.metadata[key] = {
            ...this.metadata[key],
            url,
            mediaType,
            isPermanentFailure: true,
            isDownloading: false,
            errorCode: errorCode || 'UNKNOWN_ERROR',
            timestamp: Date.now(),
        };

        await this.saveMetadata();
        console.log('[MediaCache] Marked as permanent failure:', key, errorCode);
    }

    async clearCache(): Promise<void> {
        await this.initialize();

        if (Platform.OS === 'web') return;

        try {
            for (const item of Object.values(this.metadata)) {
                try {
                    if (item.localPath) {
                        await FS.deleteAsync(item.localPath, { idempotent: true });
                    }
                } catch (error) {
                    console.warn('[MediaCache] Failed to delete file:', error);
                }
            }

            this.metadata = {};
            this.metadata$.next(this.metadata);

            const metadataFilePath = await getMetadataDirectory();
            await FS.deleteAsync(metadataFilePath, { idempotent: true });
        } catch (error) {
            console.error('[MediaCache] Failed to clear cache:', error);
        }
    }

    getCachedItems(): CacheItem[] {
        return Object.values(this.metadata);
    }

    getCacheStats() {
        const items = Object.values(this.metadata);
        const totalSize = items.reduce((sum, item) => sum + (item.size || 0), 0);

        const itemsByType: Record<MediaType, number> = {
            [MediaType.Image]: 0,
            [MediaType.Video]: 0,
            [MediaType.Gif]: 0,
            [MediaType.Audio]: 0,
            [MediaType.Icon]: 0,
        };

        items.forEach(item => {
            itemsByType[item.mediaType] = (itemsByType[item.mediaType] || 0) + 1;
        });

        const stats = {
            totalItems: items.length,
            totalSize,
            itemsByType,
        };

        return { items, stats };
    }

    getMetadata() {
        const metadata = JSON.parse(JSON.stringify(this.metadata));

        for (const key of Array.from(this.userDeletedSet)) {
            metadata[key] = {
                ...metadata[key],
                isUserDeleted: true,
            };
        }

        return metadata;
    }

    async deleteCachedMedia(url: string, mediaType: MediaType): Promise<boolean> {
        await this.initialize();

        if (Platform.OS === 'web') return true;

        const key = this.generateCacheKey(url, mediaType);
        const cachedItem = this.metadata[key];

        if (!cachedItem) {
            console.warn('[MediaCache] Media not found in cache:', url);
            return false;
        }

        try {
            if (cachedItem.localPath) {
                await FS.deleteAsync(cachedItem.localPath, { idempotent: true });
            }

            delete this.metadata[key];

            await this.markUserDeleted(url, mediaType);

            await this.saveMetadata();

            console.log('[MediaCache] Media deleted manually:', url);
            return true;
        } catch (error) {
            console.error('[MediaCache] Failed to delete media:', error);
            return false;
        }
    }

    async forceMediaDownload(props: { url: string, mediaType: MediaType, notificationDate?: number }) {
        const { url, mediaType, notificationDate } = props;
        await this.initialize();

        return this.downloadMedia({ url, mediaType, force: true, notificationDate });
    }

    // Queue management methods
    getDownloadQueueState(): DownloadQueueState {
        return this.downloadQueue$.value;
    }

    clearDownloadQueue(): void {
        this.downloadQueue = [];
        this.updateQueueState();
    }

    removeFromQueue(url: string, mediaType: MediaType): boolean {
        const keyBase = this.generateCacheKey(url, mediaType);
        const index = this.downloadQueue.findIndex(
            item => item.key.startsWith(`${keyBase}::`)
        );

        if (index !== -1) {
            this.downloadQueue.splice(index, 1);
            this.updateQueueState();
            return true;
        }

        return false;
    }

    isInQueue(url: string, mediaType: MediaType, op: QueueOperation = 'download'): boolean {
        const key = this.buildQueueKey(url, mediaType, op);
        return this.downloadQueue.some(item => item.key === key);
    }

    private getFileExtension(url: string, mediaType: MediaType): string {
        switch (mediaType) {
            case MediaType.Video:
                return 'mp4';
            case MediaType.Image:
                return 'jpg';
            case MediaType.Gif:
                return 'gif';
            case MediaType.Audio:
                return 'mp3';
        }
        return 'dat';
    }

    async getOrCreateThumbnail(url: string, mediaType: MediaType, maxSize: number = 256): Promise<string | null> {
        await this.initialize();
        if (Platform.OS === 'web') return null;

        try {
            const cached = await this.getCachedItem(url, mediaType);
            if (!cached?.localPath) return null;

            const thumbPath = this.getThumbnailPath(url, mediaType);
            const info = await FS.getInfoAsync(thumbPath);
            if (info.exists) {
                return thumbPath;
            }

            // Ensure directories exist
            await this.ensureDirectories();

            let tempUri: string | null = null;

            if (mediaType === MediaType.Image || mediaType === MediaType.Gif) {
                const result = await ImageManipulator.manipulateAsync(
                    cached.localPath,
                    [{ resize: { width: maxSize } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );
                tempUri = result.uri;
            } else if (mediaType === MediaType.Video) {
                const { uri } = await VideoThumbnails.getThumbnailAsync(cached.localPath, {
                    time: 1000,
                    quality: 0.6,
                });
                tempUri = uri;
            } else {
                return null;
            }

            if (!tempUri) return null;

            await FS.copyAsync({ from: tempUri, to: thumbPath });
            const key = this.generateCacheKey(url, mediaType);
            this.metadata[key] = {
                ...this.metadata[key],
                localThumbPath: thumbPath,
                timestamp: Date.now(),
            };
            await this.saveMetadata();
            console.log('[MediaCache] Thumbnail saved at:', thumbPath);
            return thumbPath;
        } catch (error) {
            console.error('[MediaCache] Failed to create thumbnail:', error);
            return null;
        }
    }

    /**
     * Copy a cached media file into a temporary directory, if not already present.
     * Returns the temporary file path, the original URL on web, or null if the file is not available locally.
     */
    async copyMediaToTempIfNeeded(url: string, mediaType: MediaType): Promise<string | null> {
        await this.initialize();

        if (Platform.OS === 'web') {
            return url;
        }

        try {
            const key = this.generateCacheKey(url, mediaType);
            const cachedItem = this.metadata[key];
            const sourcePath = cachedItem?.localPath;

            if (!sourcePath) {
                return null;
            }

            const sourceInfo = await FS.getInfoAsync(sourcePath);
            if (!sourceInfo.exists) {
                return null;
            }

            const baseTempDir = `${FS.cacheDirectory}zentik-temp/`;
            const tempDir = `${baseTempDir}${mediaType}/`;
            const baseExists = await FS.getInfoAsync(baseTempDir);
            if (!baseExists.exists) {
                await FS.makeDirectoryAsync(baseTempDir, { intermediates: true });
            }
            const typeExists = await FS.getInfoAsync(tempDir);
            if (!typeExists.exists) {
                await FS.makeDirectoryAsync(tempDir, { intermediates: true });
            }

            const fileName = cachedItem.localPath.split('/').pop();
            const destPath = `${tempDir}${fileName}.mp4`;

            const destInfo = await FS.getInfoAsync(destPath);
            if (destInfo.exists) {
                return destPath;
            }

            await FS.copyAsync({ from: sourcePath, to: destPath });
            return destPath;
        } catch (error) {
            console.error('[MediaCache] Failed to copy media to temp:', error);
            return null;
        }
    }

    async clearCacheComplete(): Promise<void> {
        await this.initialize();

        if (Platform.OS === 'web') return;

        try {
            // Elimina tutti i file dalla cache directory
            const dirInfo = await FS.getInfoAsync(this.cacheDir);
            if (dirInfo.exists) {
                await FS.deleteAsync(this.cacheDir);
                await FS.makeDirectoryAsync(this.cacheDir, { intermediates: true });
                await this.ensureDirectories();
            }

            // Pulisci completamente tutti i metadati
            this.metadata = {};
            this.metadata$.next(this.metadata);

            // Pulisci completamente le flags di eliminazione utente
            this.userDeletedSet.clear();
            await AsyncStorage.removeItem(this.USER_DELETED_KEY);

            // Pulisci le chiavi di download in corso
            this.downloadingKeys.clear();

            // Pulisci file shared metadata per NSE
            const metadataFilePath = await getMetadataDirectory();
            await FS.deleteAsync(metadataFilePath, { idempotent: true });

            console.log('[MediaCache] Cache cleared completely');
        } catch (error) {
            console.error('[MediaCache] Failed to clear cache completely:', error);
        }
    }

    public async enqueueThumbnail(url: string, mediaType: MediaType): Promise<void> {
        await this.initialize();
        if (![MediaType.Image, MediaType.Gif, MediaType.Video].includes(mediaType)) return;
        await this.addToQueue({ url, mediaType, op: 'thumbnail' });
    }
}

export const mediaCache = new MediaCacheService();
