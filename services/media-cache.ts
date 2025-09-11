import { Directory, File } from 'expo-file-system/next';
import { BehaviorSubject } from "rxjs";
import { MediaType } from '../generated/gql-operations-generated';
import { getSharedMediaCacheDirectoryAsync } from '../utils/shared-cache';
import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { openSharedCacheDb } from './media-cache-db';
import { MediaCacheRepository } from './media-cache-repository';

export interface CacheItem {
    key: string;
    url: string;
    localPath?: string;
    localThumbPath?: string;
    generatingThumbnail?: boolean;
    timestamp: number;
    size: number;
    mediaType: MediaType;
    originalFileName?: string;
    downloadedAt?: number;
    notificationDate?: number;
    isDownloading?: boolean;
    inDownload?: boolean;
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
    force?: boolean;
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
    private dbInitialized = false;
    private repo?: MediaCacheRepository;
    private initializing = false;
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
        console.log('[MediaCache] Adding item to download queue:', item.op, item.url);
        this.downloadQueue.push({ ...item, key, timestamp: Date.now() });
        const cacheKey = this.generateCacheKey(item.url, item.mediaType);
        if (item.op === 'download') {
            await this.updateItem(cacheKey, { isDownloading: true, timestamp: Date.now() });
        } else if (item.op === 'thumbnail') {
            await this.updateItem(cacheKey, { generatingThumbnail: true, timestamp: Date.now() });
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
        const { url, mediaType, notificationDate, force } = item;
        const key = this.generateCacheKey(url, mediaType);

        try {
            const { filePath: localPath, directory } = this.getLocalPath(url, mediaType);

            await this.updateItem(key, {
                inDownload: true,
                isPermanentFailure: false,
                isUserDeleted: false,
                generatingThumbnail: false,
                url,
                mediaType,
                timestamp: Date.now(),
                notificationDate: notificationDate ?? this.metadata[key]?.notificationDate,
            });

            const destination = new Directory(directory);
            try {
                const downloadResult = await File.downloadFileAsync(url, destination);
                console.log('[MediaCache] Download result:', url, downloadResult);

                console.log('[MediaCache] Media saved at:', downloadResult.uri, url);
                await this.updateItem(key, {
                    size: downloadResult.size || 0,
                    inDownload: false,
                    isDownloading: false,
                    localPath: downloadResult.uri,
                    errorCode: undefined,
                    downloadedAt: Date.now(),
                    timestamp: Date.now(),
                });

                await this.generateThumbnail({ url, mediaType, force });
            } catch (error: any) {
                console.error('[MediaCache] Download failed:', JSON.stringify(error));

                await this.updateItem(key, {
                    inDownload: false,
                    isDownloading: false,
                    timestamp: Date.now(),
                    isPermanentFailure: true,
                    errorCode: error.toString(),
                });
            }

        } catch (error) {
            console.error('[MediaCache] Download failed:', error);

            delete this.metadata[key];
            return false;
        }
    }

    private async performThumbnail(item: DownloadQueueItem) {
        const { url, mediaType } = item;
        const cacheKey = this.generateCacheKey(url, mediaType);
        try {
            await this.getOrCreateThumbnail(url, mediaType);
        } catch (e) {
            console.warn('[MediaCache] Thumbnail generation failed for', url, e);
        } finally {
            await this.updateItem(cacheKey, { generatingThumbnail: false, timestamp: Date.now() });
        }
    }

    private async initialize(): Promise<void> {
        if (this.initializing) return;

        try {
            this.initializing = true;
            console.log('[MediaCache] Initializating DB');
            this.cacheDir = await getSharedMediaCacheDirectoryAsync();
            await this.ensureDirectories();
            const db = await openSharedCacheDb();
            this.repo = new MediaCacheRepository(db);
            await this.loadMetadata();
        } catch (error) {
            console.error('[MediaCache] Initialization failed:', error);
        }
    }

    private async ensureDirectories(): Promise<void> {
        const typeDirs = ['IMAGE', 'VIDEO', 'GIF', 'AUDIO', 'ICON'];
        for (const type of typeDirs) {
            const dirPath = `${this.cacheDir}${type}/`;
            const directory = new Directory(dirPath);
            if (!directory.exists) {
                directory.create()
            }

            // Ensure thumbnails subdirectory INSIDE each media type folder
            const thumbPath = `${dirPath}thumbnails/`;
            const thumbDirectory = new Directory(thumbPath);
            if (!thumbDirectory.exists) {
                thumbDirectory.create()
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

    private getLocalPath(url: string, mediaType: MediaType) {
        const longHash = this.generateLongHash(url);
        const safeFileName = `${String(mediaType).toLowerCase()}_${longHash}`;
        const extension = this.getFileExtension(url, mediaType);
        const directory = `${this.cacheDir}${mediaType}`;
        const filePath = `${directory}/${safeFileName}.${extension}`;
        return {
            filePath,
            directory,
        }
    }

    private getThumbnailPath(url: string, mediaType: MediaType): string {
        const longHash = this.generateLongHash(url);
        const fileName = `${String(mediaType).toLowerCase()}_${longHash}.jpg`;
        // Save thumbnails inside the media type folder under a thumbnails subfolder
        return `${this.cacheDir}${mediaType}/thumbnails/${fileName}`;
    }

    private async loadMetadata(): Promise<void> {
        try {
            if (!this.repo) throw new Error('Repository not initialized');
            const items = await this.repo.listCacheItems();
            this.metadata = {};
            const pendingDownloads: CacheItem[] = [];
            const pendingThumbnails: CacheItem[] = [];
            for (const item of items) {
                const key = this.generateCacheKey(item.url, item.mediaType);
                if (item.isDownloading) {
                    pendingDownloads.push(item);
                    pendingThumbnails.push(item);
                }
                if (item.generatingThumbnail) {
                    pendingThumbnails.push(item);
                }
                this.metadata[key] = {
                    ...item,
                    isDownloading: false,
                    generatingThumbnail: false,
                    isPermanentFailure: item.isPermanentFailure ?? false,
                };
            }

            for (const item of pendingDownloads) {
                await this.downloadMedia({ url: item.url, mediaType: item.mediaType, notificationDate: item.notificationDate });
            }
            for (const item of pendingThumbnails) {
                await this.generateThumbnail({ url: item.url, mediaType: item.mediaType });
            }
            this.emitMetadata();
        } catch (error) {
            console.error('[MediaCache] Failed to load metadata (DB):', error);
            this.metadata = {};
        }
    }

    private emitMetadata(): void {
        this.metadata$.next(this.getMetadata());
    }

    private async saveSingleItem(key: string) {
        try {
            if (!this.repo) throw new Error('Repository not initialized');
            const item = this.metadata[key];
            if (item) {
                await this.repo.upsertCacheItem({ ...item, key });
            }
        } catch (error) {
            console.error('[MediaCache] Failed to persist single item to DB:', error);
        } finally {
            this.emitMetadata();
        }
    }

    public async updateItem(key: string, patch: Partial<CacheItem>): Promise<void> {
        await this.initialize();
        const current: CacheItem | undefined = this.metadata[key];
        if (!current) return;
        const next: CacheItem = { ...current, ...patch } as CacheItem;
        this.metadata[key] = next;
        await this.saveSingleItem(key);
    }

    getCachedItemSync(url: string, mediaType: MediaType): CacheItem | undefined {
        return this.metadata[this.generateCacheKey(url, mediaType)];
    }

    async getCachedItem(url: string, mediaType: MediaType): Promise<CacheItem | undefined> {
        const key = this.generateCacheKey(url, mediaType);
        let cachedItem = this.metadata[key];

        if (!cachedItem) {
            const { filePath: localPath } = this.getLocalPath(url, mediaType);
            const file = new File(localPath);

            if (file.exists && file.size) {
                cachedItem = {
                    url,
                    key,
                    localPath,
                    timestamp: Date.now(),
                    size: file.size,
                    mediaType,
                    downloadedAt: Date.now(),
                    isDownloading: false,
                    generatingThumbnail: false,
                };

                this.metadata[key] = cachedItem;
                await this.saveSingleItem(key);
            }
        }

        // Thumbnail metadata update only (no auto enqueue)
        if (cachedItem && this.isThumbnailSupported(mediaType) && !cachedItem.localThumbPath) {
            const thumbPath = this.getThumbnailPath(url, mediaType);
            const thumbFile = new File(thumbPath);
            if (thumbFile.exists) {
                if (cachedItem.localThumbPath !== thumbPath) {
                    await this.updateItem(key, { localThumbPath: thumbPath, generatingThumbnail: false, timestamp: Date.now() });
                }
            }
        }

        return cachedItem;
    }

    async reloadMetadata(): Promise<void> {
        await this.loadMetadata();
    }

    async checkMediaExists(props: { url: string, mediaType: MediaType, notificationDate: number }) {
        const { url, mediaType, notificationDate } = props;
        const key = this.generateCacheKey(url, mediaType);
        const cachedItem = this.metadata[key];

        let shouldDownload = false;
        let shouldGenerateThumbnail = false;

        if (cachedItem && cachedItem.localPath && cachedItem.localThumbPath) {
            return;
        }

        if (cachedItem && !cachedItem.localPath) {
            shouldDownload = true;
        }

        if (cachedItem && cachedItem.localPath && !cachedItem.localThumbPath) {
            shouldGenerateThumbnail = true;
        }

        if (shouldDownload) {
            await this.downloadMedia({ url, mediaType, notificationDate });
        }

        if (shouldGenerateThumbnail) {
            await this.generateThumbnail({ url, mediaType });
        }
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

        const cachedItem = await this.getCachedItem(url, mediaType);

        if (cachedItem && !force) {
            return;
        }

        if (!cachedItem) {
            const key = this.generateCacheKey(url, mediaType);
            this.metadata[key] = {
                key,
                size: 0,
                downloadedAt: 0,
                url,
                mediaType,
                isDownloading: true,
                timestamp: Date.now(),
            };
            await this.saveSingleItem(this.generateCacheKey(url, mediaType));
        }

        if (
            (
                cachedItem?.isUserDeleted ||
                cachedItem?.isPermanentFailure ||
                cachedItem?.isDownloading
            )
            && !force
        ) {
            return;
        }

        this.addToQueue({
            url,
            mediaType,
            op: 'download',
            notificationDate,
            force
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

        await this.saveSingleItem(key);
        console.log('[MediaCache] Marked as permanent failure:', key, errorCode);
    }

    async clearCache(): Promise<void> {
        await this.initialize();

        try {
            for (const [key, item] of Object.entries(this.metadata)) {
                try {
                    if (item.localPath) {
                        const file = new File(item.localPath);
                        file.delete();
                    }

                    this.metadata[key] = {
                        ...item,
                        isUserDeleted: true,
                        localPath: undefined,
                        localThumbPath: undefined,
                        isDownloading: false,
                        generatingThumbnail: false,
                        isPermanentFailure: false,
                        errorCode: undefined,
                        size: 0,
                        timestamp: Date.now(),
                    };
                } catch (error) {
                    console.warn('[MediaCache] Failed to delete file:', error);
                }
            }

            // Persist every modified item in a single transaction
            if (this.repo) {
                await this.repo.upsertMany(Object.values(this.metadata));
            }
            this.metadata = {};
            this.emitMetadata();
        } catch (error) {
            console.error('[MediaCache] Failed to clear cache:', error);
        }
    }

    getCachedItems(): CacheItem[] {
        return Object.values(this.metadata);
    }

    getCacheStats() {
        const items = Object.values(this.metadata).filter(item => !item.isUserDeleted);
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
        return JSON.parse(JSON.stringify(this.metadata));
    }

    async deleteCachedMedia(url: string, mediaType: MediaType, permanent?: boolean): Promise<boolean> {
        await this.initialize();

        const key = this.generateCacheKey(url, mediaType);
        const cachedItem = this.metadata[key];

        if (!cachedItem) {
            console.warn('[MediaCache] Media not found in cache:', url);
            return false;
        }

        try {
            // Delete media file
            if (cachedItem.localPath) {
                try {
                    const file = new File(cachedItem.localPath);
                    file.delete();
                } catch (error) {
                    console.warn('[MediaCache] Failed to delete file:', error);
                }
            }

            // Delete thumbnail file if present
            const thumbPath = cachedItem.localThumbPath || this.getThumbnailPath(url, mediaType);
            try {
                const file = new File(thumbPath);
                if (file.exists) {
                    file.delete();
                }
            } catch (err) {
                console.warn('[MediaCache] Failed to delete thumbnail:', err);
            }

            if (permanent) {
                delete this.metadata[key];
                await this.repo?.deleteCacheItem(key);
            } else {
                this.metadata[key] = {
                    ...cachedItem,
                    isUserDeleted: true,
                    localPath: undefined,
                    localThumbPath: undefined,
                    isPermanentFailure: false,
                    isDownloading: false,
                    size: 0,
                    timestamp: Date.now(),
                };
                await this.saveSingleItem(key);
            }

            return true;
        } catch (error) {
            console.error('[MediaCache] Failed to delete media:', error);
            return false;
        } finally {
            this.emitMetadata();
        }
    }

    async forceMediaDownload(props: { url: string, mediaType: MediaType, notificationDate?: number }) {
        const { url, mediaType, notificationDate } = props;
        await this.initialize();

        await this.downloadMedia({ url, mediaType, force: true, notificationDate });
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
        const key = this.generateCacheKey(url, mediaType);

        try {
            const cached = await this.getCachedItem(url, mediaType);
            if (!cached?.localPath) return null;

            const thumbPath = this.getThumbnailPath(url, mediaType);
            const file = new File(thumbPath);
            if (file.exists) {
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

            const src = new File(tempUri);
            const dest = new File(thumbPath);
            src.copy(dest);
            await this.updateItem(key, { localThumbPath: thumbPath, timestamp: Date.now() });
            console.log('[MediaCache] Thumbnail saved at:', thumbPath, url);
            return thumbPath;
        } catch (error) {
            console.error('[MediaCache] Failed to create thumbnail:', url, error);
            await this.updateItem(key, { isPermanentFailure: true, timestamp: Date.now() });

            return null;
        }
    }

    async clearCacheComplete(): Promise<void> {
        await this.initialize();

        try {
            const directory = new Directory(this.cacheDir);
            if (directory.exists) {
                directory.delete();
                directory.create();
                await this.ensureDirectories();
            }

            if (this.repo) {
                await this.repo.clearAll();
            }
            this.metadata = {};
            this.emitMetadata();

            console.log('[MediaCache] Cache cleared completely');
        } catch (error) {
            console.error('[MediaCache] Failed to clear cache completely:', error);
        }
    }

    isThumbnailSupported(mediaType: MediaType): boolean {
        return [MediaType.Image, MediaType.Gif, MediaType.Video].includes(mediaType);
    }

    public async generateThumbnail(props: { url: string, mediaType: MediaType, force?: boolean }): Promise<void> {
        await this.initialize();
        const { url, mediaType, force } = props;

        if (!this.isThumbnailSupported(mediaType)) {
            return;
        };

        const key = this.generateCacheKey(url, mediaType);
        const cachedItem = this.metadata[key];

        if (cachedItem && cachedItem.localThumbPath && !force) {
            return;
        }

        if (
            (
                cachedItem?.isUserDeleted ||
                cachedItem?.isPermanentFailure ||
                !cachedItem?.localPath ||
                cachedItem?.isDownloading
            )
            && !force
        ) {
            return;
        }

        await this.addToQueue({ url, mediaType, op: 'thumbnail' });
    }
}

export const mediaCache = new MediaCacheService();
