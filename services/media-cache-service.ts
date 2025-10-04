import { Directory, File } from '../utils/filesystem-wrapper';
import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { BehaviorSubject } from "rxjs";
import { MediaType } from '../generated/gql-operations-generated';
import { getSharedMediaCacheDirectoryAsync } from '../utils/shared-cache';
import { MediaCacheRepository, MediaItem } from './media-cache-repository';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

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
        // this.initialize();
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
        console.log('[MediaCache] Adding item to queue:', item.op, item.url);
        this.downloadQueue.push({ ...item, key, timestamp: Date.now() });
        const cacheKey = this.generateCacheKey(item.url, item.mediaType);
        if (item.op === 'download') {
            await this.upsertItem(cacheKey, { isDownloading: true, timestamp: Date.now() });
        } else if (item.op === 'thumbnail') {
            await this.upsertItem(cacheKey, { generatingThumbnail: true, timestamp: Date.now() });
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

        await this.processNextItem();
    }

    private async processNextItem(): Promise<void> {
        if (this.downloadQueue.length === 0) {
            this.isProcessingQueue = false;
            this.updateQueueState();
            return;
        }

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

        // Use setTimeout to yield control back to the event loop before processing next item
        setTimeout(() => {
            this.processNextItem();
        }, 0);
    }

    private async performDownload(item: DownloadQueueItem) {
        const { url, mediaType, notificationDate, force } = item;
        const key = this.generateCacheKey(url, mediaType);

        try {
            const { filePath } = this.getLocalPath(url, mediaType);

            await this.upsertItem(key, {
                inDownload: true,
                isPermanentFailure: false,
                isUserDeleted: false,
                generatingThumbnail: false,
                url,
                mediaType,
                timestamp: Date.now(),
                notificationDate: notificationDate ?? this.metadata[key]?.notificationDate,
            });

            try {
                let file = new File(filePath);
                if (file.exists) {
                    console.log('[MediaCache] File exists:', filePath, file.size);
                    file.delete();
                }
                const downloadResult = await File.downloadFileAsync(url, file as any);
                console.log('[MediaCache] Download result:', url, downloadResult);

                console.log('[MediaCache] Media saved at:', downloadResult.uri, url);
                await this.upsertItem(key, {
                    url,
                    mediaType,
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

                await this.upsertItem(key, {
                    inDownload: false,
                    isDownloading: false,
                    timestamp: Date.now(),
                    isPermanentFailure: true,
                    errorCode: error.toString(),
                });
            }

        } catch (error) {
            console.error('[MediaCache] Download failed: outer', error);

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
            await this.upsertItem(cacheKey, { generatingThumbnail: false, timestamp: Date.now() });
        }
    }

    private async initialize(): Promise<void> {
        if (this.initializing) return;

        try {
            this.initializing = true;

            // Initialize repository for metadata management (works on both web and mobile)
            this.repo = await MediaCacheRepository.create();

            if (isWeb) {
            } else {
                this.cacheDir = await getSharedMediaCacheDirectoryAsync();
                await this.ensureDirectories();
            }

            await this.loadMetadata();
            console.log('[MediaCache] DB initialized successfull');
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

    private generateLongHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash * 31 + char) >>> 0;
        }
        return hash.toString(16).padStart(8, '0');
    }

    private getLocalPath(url: string, mediaType: MediaType) {
        const longHash = this.generateLongHash(url);
        const safeFileName = `${String(mediaType).toLowerCase()}_${longHash}`;
        const extension = this.getFileExtension(url, mediaType);
        const fileName = `${safeFileName}.${extension}`;
        const directory = `${this.cacheDir}${mediaType}`;
        const filePath = `${directory}/${fileName}`;
        return {
            filePath,
            directory,
            fileName,
        }
    }

    private getThumbnailPath(url: string, mediaType: MediaType): string {
        const longHash = this.generateLongHash(url);
        const fileName = `${String(mediaType).toLowerCase()}_${longHash}.jpg`;
        // Save thumbnails inside the media type folder under a thumbnails subfolder
        return `${this.cacheDir}${mediaType}/thumbnails/${fileName}`;
    }

    private async loadMetadata(): Promise<void> {
        await this.initialize();
        try {
            let items: CacheItem[] = [];
            if (this.repo) {
                // Ensure repository is initialized before using it
                items = await this.repo.listCacheItems();
            }
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

    public async upsertItem(key: string, patch: Partial<CacheItem>) {
        await this.initialize();
        const current: CacheItem | undefined = this.metadata[key];
        const next: CacheItem = { ...current, ...patch };
        this.metadata[key] = next;

        try {
            if (!this.repo) throw new Error('Repository not initialized');
            const item = this.metadata[key];
            if (item) {
                await this.repo.upsertCacheItem({ ...item, key });
            }
        } catch (error) {
            console.error('[MediaCache] Failed to persist single item to DB:', key, error);
        } finally {
            this.emitMetadata();
            return next;
        }
    }

    getCachedItemSync(url: string, mediaType: MediaType): CacheItem | undefined {
        return this.metadata[this.generateCacheKey(url, mediaType)];
    }

    async getCachedItem(url: string, mediaType: MediaType): Promise<CacheItem | undefined> {
        if (!url) return undefined;

        const key = this.generateCacheKey(url, mediaType);
        let cachedItem: CacheItem | undefined = this.metadata[key];

        if (!cachedItem) {
            const { filePath: localPath } = this.getLocalPath(url, mediaType);
            const file = new File(localPath);

            if (file.exists && file.size) {
                cachedItem = await this.upsertItem(key, {
                    url,
                    key,
                    localPath,
                    timestamp: Date.now(),
                    size: file.size,
                    mediaType,
                    downloadedAt: Date.now(),
                    isDownloading: false,
                    generatingThumbnail: false,
                });
            }
        }

        if (cachedItem && this.isThumbnailSupported(mediaType) && !cachedItem.localThumbPath) {
            const thumbPath = this.getThumbnailPath(url, mediaType);
            const thumbFile = new File(thumbPath);
            if (thumbFile.exists) {
                if (cachedItem.localThumbPath !== thumbPath) {
                    await this.upsertItem(key, { localThumbPath: thumbPath, generatingThumbnail: false, timestamp: Date.now() });
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

        if (!url || !mediaType || !this.repo) return;

        let cachedItem = await this.getCachedItem(url, mediaType);
        const key = this.generateCacheKey(url, mediaType);

        if (!cachedItem) {
            cachedItem = await this.repo.getCacheItem(key) ?? undefined;
        }

        if (cachedItem && (cachedItem.isUserDeleted || cachedItem.isPermanentFailure) && !force) {
            return;
        }

        try {
            const { filePath } = this.getLocalPath(url, mediaType);
            const file = new File(filePath);

            const minValidSizeBytes = 512;
            if (!force && file.exists && (file.size || 0) > minValidSizeBytes) {
                await this.upsertItem(key, {
                    inDownload: false,
                    isDownloading: false,
                    isPermanentFailure: false,
                    isUserDeleted: false,
                    generatingThumbnail: false,
                    url,
                    mediaType,
                    localPath: filePath,
                    size: file.size || 0,
                    errorCode: undefined,
                    downloadedAt: Date.now(),
                    timestamp: Date.now(),
                    notificationDate: notificationDate ?? this.metadata[key]?.notificationDate,
                });

                // Ensure thumbnail exists or generate it
                await this.generateThumbnail({ url, mediaType, force });
                return;
            }
        } catch (e) {
            // If any error occurs while checking existing file, proceed with download as fallback
            console.warn('[MediaCache] Existing file check failed, proceeding to download:', url, e);
        }

        await this.upsertItem(key, {
            key,
            size: 0,
            downloadedAt: 0,
            url,
            mediaType,
            isDownloading: true,
            timestamp: Date.now(),
        });

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

        await this.upsertItem(key, {
            url,
            mediaType,
            isPermanentFailure: true,
            isDownloading: false,
            errorCode: errorCode || 'UNKNOWN_ERROR',
            timestamp: Date.now(),
        });
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
                await this.upsertItem(key, {
                    isUserDeleted: true,
                    localPath: undefined,
                    localThumbPath: undefined,
                    isPermanentFailure: false,
                    isDownloading: false,
                    size: 0,
                    timestamp: Date.now(),
                })
            }
            console.log('[MediaCache] Media deleted:', key);

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
            src.copy(dest as any);
            await this.upsertItem(key, { localThumbPath: thumbPath, timestamp: Date.now() });
            console.log('[MediaCache] Thumbnail saved at:', thumbPath, url);
            return thumbPath;
        } catch (error) {
            console.error('[MediaCache] Failed to create thumbnail:', url, error);
            await this.upsertItem(key, { isPermanentFailure: true, timestamp: Date.now() });

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
        return isWeb ? false : [MediaType.Image, MediaType.Gif, MediaType.Video].includes(mediaType);
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

    // ====================
    // MEDIA ITEM METHODS (for binary data storage)
    // ====================

    /**
     * Download media as binary data and store in media_item table
     * This is an alternative to filesystem storage
     */
    async downloadMediaAsBinary(props: {
        url: string,
        mediaType: MediaType,
        originalFileName?: string,
    }): Promise<MediaItem | null> {
        await this.initialize();

        if (!props.url || !props.mediaType) return null;

        const key = this.generateCacheKey(props.url, props.mediaType);

        try {
            // Fetch binary data
            const response = await fetch(props.url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const blob = new Blob([arrayBuffer]);

            const mediaItem: MediaItem = {
                key,
                data: arrayBuffer,
            };

            // Save to media_item table
            if (this.repo) {
                await this.repo.saveMediaItem(mediaItem);
            }

            // Also update cache_item metadata
            await this.upsertItem(key, {
                url: props.url,
                mediaType: props.mediaType,
                size: blob.size,
                timestamp: Date.now(),
                downloadedAt: Date.now(),
                isDownloading: false,
                generatingThumbnail: false,
            });

            console.log('[MediaCache] Binary media saved:', key, blob.size, 'bytes');
            return mediaItem;

        } catch (error) {
            console.error('[MediaCache] Binary download failed:', key, error);

            // Mark as permanent failure
            await this.upsertItem(key, {
                isPermanentFailure: true,
                isDownloading: false,
                errorCode: error instanceof Error ? error.message : String(error),
                timestamp: Date.now(),
            });

            return null;
        }
    }

    /**
     * Delete media binary data
     */
    async deleteMediaBinary(key: string): Promise<boolean> {
        if (!this.repo) return false;

        try {
            await this.repo.deleteMediaItem(key);
            return true;
        } catch (error) {
            console.error('[MediaCache] Failed to delete media binary:', key, error);
            return false;
        }
    }

    /**
     * Clear all binary media data
     */
    async clearAllBinaryMedia(): Promise<void> {
        if (!this.repo) return;

        try {
            await this.repo.clearAllMediaItems();
            console.log('[MediaCache] All binary media cleared');
        } catch (error) {
            console.error('[MediaCache] Failed to clear binary media:', error);
        }
    }

    async getMediaUrl(key: string): Promise<string | null> {
        await this.initialize();
        if (!this.repo) return null;

        try {
            return await this.repo.getMediaUrl(key);
        } catch (error) {
            console.error('[MediaCache] Failed to get media url:', key, error);
            return null;
        }
    }
}

export const mediaCache = new MediaCacheService();
