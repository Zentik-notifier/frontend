import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Platform } from 'react-native';
import { BehaviorSubject, Observable, Subject } from "rxjs";
import {
    catchError,
    concatMap,
    distinctUntilChanged,
    filter,
    map,
    scan,
    shareReplay,
    tap
} from "rxjs/operators";
import { MediaType, NotificationFragment } from '../generated/gql-operations-generated';
import { Directory, File } from '../utils/filesystem-wrapper';
import { getSharedMediaCacheDirectoryAsync } from '../utils/shared-cache';
import { MediaCacheRepository } from './media-cache-repository';
import { settingsService } from './settings-service';

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
    notificationId?: string;
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

type QueueOperation = 'download' | 'thumbnail' | 'bucket-icon';

export interface DownloadQueueItem {
    key: string;
    url: string;
    force?: boolean;
    mediaType: MediaType;
    notificationDate?: number;
    notificationId?: string;
    timestamp: number;
    op: QueueOperation;
    priority?: number;
    bucketId?: string;
    bucketName?: string;
}

export interface DownloadQueueState {
    queue: DownloadQueueItem[];
    isProcessing: boolean;
    currentItem?: DownloadQueueItem;
    completedCount: number;
    failedCount: number;
}

interface QueueAction {
    type: 'ADD' | 'REMOVE' | 'START' | 'COMPLETE' | 'FAIL' | 'CLEAR';
    item?: DownloadQueueItem;
    key?: string;
}

class MediaCacheService {
    private cacheDir: string = '';
    private metadata: CacheMetadata = {};
    private repo?: MediaCacheRepository;
    private initializing = false;
    public metadata$ = new BehaviorSubject<CacheMetadata>(this.metadata);
    private hasFilesystemPermission: boolean = true;

    // Track current bucket icon parameters in memory to detect changes.
    // IMPORTANT: do not include bucketName here; different screens may pass different names
    // for the same bucketId (e.g. stale notification snapshot vs buckets list), which would
    // cause infinite invalidation + re-download loops.
    private bucketParamsCache = new Map<string, {
        iconUrl?: string;
        timestamp: number;
    }>();

    // In-memory cache for bucket icon URIs (for instant synchronous access)
    private bucketIconUriCache = new Map<string, string>();

    // Modern reactive queue management with RxJS
    private queueAction$ = new Subject<QueueAction>();
    private queueItem$ = new Subject<DownloadQueueItem>();

    // Bucket icon completion notifications
    private bucketIconReady$ = new Subject<{ bucketId: string; uri: string }>();

    // Initialization ready notification
    private initReady$ = new Subject<void>();

    // Track current queue state for synchronous access
    private currentQueueState: DownloadQueueState = {
        queue: [],
        isProcessing: false,
        completedCount: 0,
        failedCount: 0
    };

    public downloadQueue$: Observable<DownloadQueueState>;

    // Public observable for bucket icon completion
    public bucketIconReady = this.bucketIconReady$.asObservable();

    // Public observable for initialization completion
    public initReady = this.initReady$.asObservable();

    constructor() {
        this.downloadQueue$ = this.setupQueueObservable();
    }

    /**
     * Setup reactive queue processing using RxJS operators
     * This creates a clean, declarative flow for queue management
     */
    private setupQueueObservable(): Observable<DownloadQueueState> {
        // State reducer for queue actions
        const queueStateReducer$ = this.queueAction$.pipe(
            scan((state: DownloadQueueState, action: QueueAction): DownloadQueueState => {
                let newState: DownloadQueueState;

                switch (action.type) {
                    case 'ADD':
                        if (!action.item) return state;
                        const exists = state.queue.some(i => i.key === action.item!.key);
                        if (exists) {
                            console.log(`[MediaCache] ⚠️ Duplicate item detected in reducer, skipping: ${action.item.key}`);
                            return state;
                        }

                        // Insert sorted by priority (higher first) then timestamp
                        const newQueue = [...state.queue, action.item].sort((a, b) => {
                            const priorityDiff = (b.priority || 0) - (a.priority || 0);
                            return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
                        });

                        console.log(`[MediaCache] ✅ Added item to queue: ${action.item.key}, queue size: ${newQueue.length}`);
                        newState = { ...state, queue: newQueue };
                        break;

                    case 'REMOVE':
                        if (!action.key) return state;
                        newState = {
                            ...state,
                            queue: state.queue.filter(i => i.key !== action.key)
                        };
                        break;

                    case 'START':
                        if (!action.item) return state;
                        newState = {
                            ...state,
                            isProcessing: true,
                            currentItem: action.item
                        };
                        break;

                    case 'COMPLETE':
                        newState = {
                            ...state,
                            isProcessing: false,
                            currentItem: undefined,
                            completedCount: state.completedCount + 1
                        };
                        break;

                    case 'FAIL':
                        newState = {
                            ...state,
                            isProcessing: false,
                            currentItem: undefined,
                            failedCount: state.failedCount + 1
                        };
                        break;

                    case 'CLEAR':
                        newState = {
                            queue: [],
                            isProcessing: false,
                            currentItem: undefined,
                            completedCount: 0,
                            failedCount: 0
                        };
                        break;

                    default:
                        newState = state;
                }

                // Update internal state for synchronous access
                this.currentQueueState = newState;
                return newState;
            }, {
                queue: [],
                isProcessing: false,
                completedCount: 0,
                failedCount: 0
            }),
            shareReplay(1)
        );

        // Process queue items sequentially using concatMap
        this.queueItem$.pipe(
            tap(item => {
                console.log('[MediaCache] Processing queue item:', item.op, item.url);
                this.queueAction$.next({ type: 'START', item });
            }),
            concatMap(item =>
                this.processQueueItem(item).pipe(
                    tap(() => {
                        this.queueAction$.next({ type: 'COMPLETE' });
                    }),
                    catchError(error => {
                        console.error('[MediaCache] Queue item failed:', item.op, error);
                        this.queueAction$.next({ type: 'FAIL' });
                        return [];
                    })
                )
            )
        ).subscribe();

        // Emit items to processing stream when queue has items and not processing
        queueStateReducer$.pipe(
            filter(state => state.queue.length > 0 && !state.isProcessing),
            map(state => state.queue[0]),
            tap(item => {
                console.log('[MediaCache] Triggering processing for:', item.op, item.url);
                this.queueAction$.next({ type: 'REMOVE', key: item.key });
                this.queueItem$.next(item);
            })
        ).subscribe();

        return queueStateReducer$;
    }

    /**
     * Process a single queue item and return an observable
     */
    private processQueueItem(item: DownloadQueueItem): Observable<void> {
        return new Observable<void>(observer => {
            const processAsync = async () => {
                try {
                    if (item.op === 'download') {
                        await this.performDownload(item);
                    } else if (item.op === 'thumbnail') {
                        await this.performThumbnail(item);
                    } else if (item.op === 'bucket-icon') {
                        await this.performBucketIcon(item);
                    }
                    observer.next();
                    observer.complete();
                } catch (error) {
                    observer.error(error);
                }
            };

            processAsync();
        });
    }

    private buildQueueKey(url: string, mediaType: MediaType, op: QueueOperation, bucketId?: string): string {
        if (op === 'bucket-icon' && bucketId) {
            return `BUCKET_ICON::${bucketId}::${op}`;
        }
        return `${this.generateCacheKey(url, mediaType)}::${op}`;
    }

    /**
     * Add item to queue using reactive approach
     */
    private async addToQueue(item: Omit<DownloadQueueItem, 'timestamp' | 'key'> & { priority?: number }) {
        const key = this.buildQueueKey(item.url, item.mediaType, item.op, item.bucketId);

        console.log('[MediaCache] Adding item to queue:', item.op, item.url, item.priority ? `priority: ${item.priority}` : '');

        const queueItem: DownloadQueueItem = {
            ...item,
            key,
            timestamp: Date.now(),
            priority: item.priority || 0
        };

        const cacheKey = this.generateCacheKey(item.url, item.mediaType);

        if (item.op === 'download') {
            await this.upsertItem(cacheKey, { isDownloading: true, timestamp: Date.now() });
        } else if (item.op === 'thumbnail') {
            await this.upsertItem(cacheKey, { generatingThumbnail: true, timestamp: Date.now() });
        }
        // bucket-icon operations don't need cache item tracking

        this.queueAction$.next({ type: 'ADD', item: queueItem });
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
                const downloadResult = await File.downloadAsync(url, isWeb ? (file as any) : filePath);
                console.log('[MediaCache] Download result:', url, JSON.stringify(downloadResult));

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
                    notificationId: item.notificationId,
                });

                await this.generateThumbnail({ url, mediaType, force, notificationId: item.notificationId });
            } catch (error: any) {
                console.error('[MediaCache] Download failed:', url, key, JSON.stringify(error));

                await this.upsertItem(key, {
                    inDownload: false,
                    isDownloading: false,
                    timestamp: Date.now(),
                    isPermanentFailure: true,
                    errorCode: error.toString(),
                });
            }

        } catch (error: any) {
            console.error('[MediaCache] Download failed: outer', error);

            await this.upsertItem(key, {
                inDownload: false,
                isDownloading: false,
                timestamp: Date.now(),
                isPermanentFailure: true,
                errorCode: error?.code,
            });
            return false;
        }
    }

    private async performThumbnail(item: DownloadQueueItem) {
        const { url, mediaType } = item;
        const cacheKey = this.generateCacheKey(url, mediaType);
        try {
            await this.getOrCreateThumbnail(url, mediaType);
        } catch (e: any) {
            const isPermissionError = e?.message?.includes('ERR_FILE_SYSTEM') ||
                e?.code === 'ERR_FILE_SYSTEM_READ_PERMISSION';

            if (isPermissionError) {
                console.warn('[MediaCache] Thumbnail generation skipped - permission denied:', url);
            } else {
                console.warn('[MediaCache] Thumbnail generation failed for', url, e);
            }
        } finally {
            // Don't update timestamp when thumbnail completes - preserve original media date
            await this.upsertItem(cacheKey, { generatingThumbnail: false });
        }
    }

    private async performBucketIcon(item: DownloadQueueItem) {
        const { bucketId, bucketName, url } = item;

        if (!bucketId || !bucketName || !url) {
            console.error('[MediaCache] ❌ Bucket icon item missing required fields');
            return;
        }

        try {
            console.log(`[MediaCache] 🎭 Downloading bucket icon for ${bucketName}`, { bucketId, url });

            const uri = await this.downloadAndCacheBucketIcon(bucketId, bucketName, url);
            if (uri) {
                console.log(`[MediaCache] ✅ Download complete, notifying ${this.bucketIconReady$.observers.length} observers`);
                this.bucketIconReady$.next({ bucketId, uri });
            } else {
                console.error(`[MediaCache] ❌ Download failed for ${bucketName}, ${url}`);
            }
        } catch (e) {
            console.error('[MediaCache] ❌ Bucket icon download error for', bucketName, e);
        }
    }

    /**
     * Set filesystem permission status (called by useConnectionStatus)
     */
    public setFilesystemPermission(hasPermission: boolean): void {
        this.hasFilesystemPermission = hasPermission;
    }

    /**
     * Check if filesystem is accessible
     */
    public getFilesystemPermission(): boolean {
        return this.hasFilesystemPermission;
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

            // Queue thumbnail generation for all media that are downloaded but missing thumbnails
            if (!isWeb) {
                let thumbnailsQueued = 0;
                for (const key in this.metadata) {
                    const item = this.metadata[key];
                    // Use the centralized method to check and queue thumbnail generation
                    this.tryGenerateThumbnail({
                        url: item.url,
                        mediaType: item.mediaType,
                        notificationId: item.notificationId
                    }).then(queued => {
                        if (queued) thumbnailsQueued++;
                    }).catch(e => console.warn('[MediaCache] Auto-queue thumbnail failed for', item.url, e));
                }
                // Log after a small delay to allow promises to resolve
                setTimeout(() => {
                    if (thumbnailsQueued > 0) {
                        console.log(`[MediaCache] Queued ${thumbnailsQueued} thumbnail(s) for generation on initialization`);
                    }
                }, 100);
            }

            // Notify components that initialization is complete
            this.initReady$.next();
        } catch (error) {
            console.error('[MediaCache] Initialization failed:', error);
        }
    }

    /**
     * Notify the cache service that the database has been closed externally
     * This allows automatic reopening on next operation
     */
    public notifyDatabaseClosed(): void {
        console.log('[MediaCache] Database closed externally, notifying repository');
        if (this.repo) {
            this.repo.notifyDatabaseClosed();
        }
    }

    private async ensureDirectories(): Promise<void> {
        const typeDirs = ['IMAGE', 'VIDEO', 'GIF', 'AUDIO', 'ICON', 'BUCKET_ICON'];
        for (const type of typeDirs) {
            const dirPath = `${this.cacheDir}${type}/`;
            const directory = new Directory(dirPath);
            if (!directory.exists) {
                directory.create()
            }

            // Ensure thumbnails subdirectory INSIDE each media type folder (except BUCKET_ICON)
            if (type !== 'BUCKET_ICON') {
                const thumbPath = `${dirPath}thumbnails/`;
                const thumbDirectory = new Directory(thumbPath);
                if (!thumbDirectory.exists) {
                    thumbDirectory.create()
                }
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

            // Get current queue state to preserve active operations
            const activeDownloadKeys = new Set<string>();
            const activeThumbnailKeys = new Set<string>();

            // Check current queue for items being processed
            // this.currentQueueState.queue.forEach((queueItem: DownloadQueueItem) => {
            //     const key = this.generateCacheKey(queueItem.url, queueItem.mediaType);
            //     if (queueItem.op === 'download') {
            //         activeDownloadKeys.add(key);
            //     } else if (queueItem.op === 'thumbnail') {
            //         activeThumbnailKeys.add(key);
            //     }
            // });

            // // Also check if there's a current item being processed
            // if (this.currentQueueState.currentItem) {
            //     const currentKey = this.generateCacheKey(
            //         this.currentQueueState.currentItem.url, 
            //         this.currentQueueState.currentItem.mediaType
            //     );
            //     if (this.currentQueueState.currentItem.op === 'download') {
            //         activeDownloadKeys.add(currentKey);
            //     } else if (this.currentQueueState.currentItem.op === 'thumbnail') {
            //         activeThumbnailKeys.add(currentKey);
            //     }
            // }

            // Save current metadata to preserve items added to queue but not yet in DB
            const currentMetadata = { ...this.metadata };

            this.metadata = {};
            const pendingDownloads: CacheItem[] = [];
            const pendingThumbnails: CacheItem[] = [];
            for (const item of items) {
                const key = this.generateCacheKey(item.url, item.mediaType);

                // Check if this item was marked as downloading/generating in DB
                if (item.isDownloading) {
                    pendingDownloads.push(item);
                    pendingThumbnails.push(item);
                }
                if (item.generatingThumbnail) {
                    pendingThumbnails.push(item);
                }

                // Preserve active operation states from current queue
                const isActivelyDownloading = activeDownloadKeys.has(key);
                const isActivelyGeneratingThumbnail = activeThumbnailKeys.has(key);

                // Merge with current metadata if it exists (for items in queue but not yet in DB)
                const currentItem = currentMetadata[key];

                this.metadata[key] = {
                    ...item,
                    ...currentItem, // Preserve current metadata (e.g., from items added to queue)
                    isDownloading: isActivelyDownloading, // Preserve if in active download queue
                    generatingThumbnail: isActivelyGeneratingThumbnail, // Preserve if in active thumbnail queue
                    isPermanentFailure: item.isPermanentFailure ?? false,
                };
            }

            // Also preserve items that are in current metadata but not in DB (newly added to queue)
            // for (const key in currentMetadata) {
            //     if (!this.metadata[key]) {
            //         const currentItem = currentMetadata[key];
            //         const isActivelyDownloading = activeDownloadKeys.has(key);
            //         const isActivelyGeneratingThumbnail = activeThumbnailKeys.has(key);

            //         console.log('[MediaCache] Preserving queued item not yet in DB:', currentItem.url);
            //         this.metadata[key] = {
            //             ...currentItem,
            //             isDownloading: isActivelyDownloading,
            //             generatingThumbnail: isActivelyGeneratingThumbnail,
            //         };
            //     }
            // }

            // Only restart downloads/thumbnails that were marked in DB but are NOT already in the active queue
            for (const item of pendingDownloads) {
                const key = this.generateCacheKey(item.url, item.mediaType);
                if (!activeDownloadKeys.has(key)) {
                    console.log('[MediaCache] Restarting interrupted download:', item.url);
                    await this.downloadMedia({ url: item.url, mediaType: item.mediaType, notificationDate: item.notificationDate });
                }
            }
            for (const item of pendingThumbnails) {
                const key = this.generateCacheKey(item.url, item.mediaType);
                if (!activeThumbnailKeys.has(key)) {
                    console.log('[MediaCache] Restarting interrupted thumbnail:', item.url);
                    await this.generateThumbnail({ url: item.url, mediaType: item.mediaType });
                }
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
                    // Don't update timestamp when discovering existing thumbnail - preserve original media date
                    await this.upsertItem(key, { localThumbPath: thumbPath, generatingThumbnail: false });
                }
            }
        }

        return cachedItem;
    }

    async reloadMetadata(): Promise<void> {
        await this.loadMetadata();
    }

    /**
     * Preload bucket icons for all buckets (especially shared buckets)
     * This ensures icons are available in shared cache for NSE/NCE extensions
     * @param buckets - Array of buckets with id, name, and iconUrl
     */
    async preloadBucketIcons(
        buckets: Array<{ id: string; name: string; iconUrl?: string | null }>
    ): Promise<void> {
        await this.initialize();
        if (!this.repo) return;

        // Preload icons for all buckets that have an iconUrl
        const preloadPromises = buckets
            .filter(bucket => bucket.iconUrl && bucket.name)
            .map(bucket => {
                // Preload icon asynchronously (don't await to avoid blocking)
                return this.getBucketIcon(
                    bucket.id,
                    bucket.name,
                    bucket.iconUrl!
                ).catch((error) => {
                    // Silently fail - icon will be loaded on-demand by BucketIcon component
                    console.debug(`[MediaCache] Failed to preload icon for bucket ${bucket.name}:`, error);
                });
            });

        // Wait for all preloads to complete (or fail silently)
        await Promise.allSettled(preloadPromises);
    }

    async downloadMedia(
        props: {
            url: string,
            mediaType: MediaType,
            force?: boolean,
            notificationDate?: number,
            notificationId?: string,
            priority?: number,
        },
    ): Promise<void> {
        const { url, mediaType, force, notificationDate, notificationId, priority = 0 } = props;
        await this.initialize();

        if (!url || !mediaType || !this.repo) return;

        let cachedItem = await this.getCachedItem(url, mediaType);
        const key = this.generateCacheKey(url, mediaType);

        if (!cachedItem) {
            cachedItem = await this.repo.getCacheItem(key) ?? undefined;
        }

        if (cachedItem && (cachedItem.isDownloading || cachedItem.localPath || cachedItem.isUserDeleted || cachedItem.isPermanentFailure) && !force) {
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
                    notificationId: notificationId ?? this.metadata[key]?.notificationId,
                });

                // Ensure thumbnail exists or generate it
                await this.generateThumbnail({ url, mediaType, force, notificationId });
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

        await this.addToQueue({
            url,
            mediaType,
            op: 'download',
            notificationDate,
            notificationId,
            force,
            priority
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
            this.bucketParamsCache.clear();
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

    // Queue management methods - Modern reactive approach

    /**
     * Get current queue state as a snapshot
     * Note: For reactive subscriptions, subscribe directly to downloadQueue$
     */
    async getDownloadQueueState(): Promise<DownloadQueueState> {
        return new Promise((resolve) => {
            let subscription: any;
            subscription = this.downloadQueue$.subscribe(state => {
                resolve(state);
                if (subscription) {
                    subscription.unsubscribe();
                }
            });
        });
    }

    /**
     * Clear the entire download queue
     */
    clearDownloadQueue(): void {
        console.log('[MediaCache] Clearing download queue');
        this.queueAction$.next({ type: 'CLEAR' });
    }

    /**
     * Remove specific item from queue by URL and media type
     */
    removeFromQueue(url: string, mediaType: MediaType): void {
        const keyBase = this.generateCacheKey(url, mediaType);
        // Remove both download and thumbnail operations for this item
        this.queueAction$.next({ type: 'REMOVE', key: `${keyBase}::download` });
        this.queueAction$.next({ type: 'REMOVE', key: `${keyBase}::thumbnail` });
        console.log('[MediaCache] Removed from queue:', url);
    }

    /**
     * Check if item is currently in queue
     */
    async isInQueue(url: string, mediaType: MediaType, op: QueueOperation = 'download', bucketId?: string): Promise<boolean> {
        const key = this.buildQueueKey(url, mediaType, op, bucketId);
        const state = await this.getDownloadQueueState();
        return state.queue.some((item: DownloadQueueItem) => item.key === key);
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

            // Verify source file exists and is accessible before attempting thumbnail generation
            const sourceFile = new File(cached.localPath);
            if (!sourceFile.exists) {
                console.warn('[MediaCache] Source file not found for thumbnail generation:', cached.localPath);
                return null;
            }

            // Check filesystem permissions before attempting thumbnail generation
            if (!isWeb && !this.hasFilesystemPermission) {
                console.warn('[MediaCache] Thumbnail generation skipped - no filesystem permission:', cached.localPath);
                return null;
            }

            // Test file readability before attempting thumbnail generation (mobile only)
            if (!isWeb) {
                try {
                    // Verify the source file is accessible
                    if (!sourceFile.exists) {
                        console.warn('[MediaCache] Source file not accessible for thumbnail generation:', cached.localPath);
                        return null;
                    }
                } catch (accessError: any) {
                    console.warn('[MediaCache] Cannot access file for thumbnail generation:', cached.localPath, accessError.message);
                    return null; // Exit early if file is not accessible
                }
            }

            // Ensure directories exist
            await this.ensureDirectories();

            let tempUri: string | null = null;

            try {
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
            } catch (manipulateError: any) {
                const isPermissionError = manipulateError?.message?.includes('ERR_FILE_SYSTEM') ||
                    manipulateError?.code === 'ERR_FILE_SYSTEM_READ_PERMISSION';

                if (isPermissionError) {
                    console.warn('[MediaCache] File system permission denied during thumbnail manipulation:', cached.localPath);
                    return null; // Exit early without marking as permanent failure
                }
                throw manipulateError; // Re-throw other errors
            }

            if (!tempUri) return null;

            const src = new File(tempUri);
            const dest = new File(thumbPath);
            src.copy(dest as any);
            // Don't update timestamp when saving thumbnail - preserve original media date
            await this.upsertItem(key, { localThumbPath: thumbPath });
            console.log('[MediaCache] Thumbnail saved at:', thumbPath, url);
            return thumbPath;
        } catch (error: any) {
            const isPermissionError = error?.message?.includes('ERR_FILE_SYSTEM') ||
                error?.code === 'ERR_FILE_SYSTEM_READ_PERMISSION';

            if (isPermissionError) {
                console.warn('[MediaCache] Thumbnail generation skipped due to permission error:', url);
                // Don't mark as permanent failure - might work later if permissions granted
            } else {
                console.error('[MediaCache] Failed to create thumbnail:', url, error);
                // Mark as permanent failure only for non-permission errors
                await this.upsertItem(key, { isPermanentFailure: true });
            }

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
            this.bucketParamsCache.clear();
            this.emitMetadata();

            console.log('[MediaCache] Cache cleared completely');
        } catch (error) {
            console.error('[MediaCache] Failed to clear cache completely:', error);
        }
    }

    isThumbnailSupported(mediaType: MediaType): boolean {
        return isWeb ? false : [MediaType.Image, MediaType.Gif, MediaType.Video].includes(mediaType);
    }

    /**
     * Checks if thumbnail generation should be attempted for a given media item.
     * Returns true if all conditions are met, false otherwise.
     */
    public shouldGenerateThumbnail(url: string, mediaType: MediaType, force: boolean = false): boolean {
        if (!this.isThumbnailSupported(mediaType)) {
            return false;
        }

        // Check filesystem permissions (mobile only)
        if (!isWeb && !this.hasFilesystemPermission) {
            return false;
        }

        const key = this.generateCacheKey(url, mediaType);
        const cachedItem = this.metadata[key];

        // If no cached item exists, can't generate thumbnail (need media file first)
        if (!cachedItem) {
            return false;
        }

        // Skip if thumbnail already exists (unless forcing)
        if (cachedItem.localThumbPath && !force) {
            return false;
        }

        // Skip if media is not ready or has issues (unless forcing)
        if (!force) {
            if (cachedItem.isUserDeleted ||
                cachedItem.isPermanentFailure ||
                !cachedItem.localPath ||
                cachedItem.isDownloading) {
                return false;
            }
        }

        // Skip if already generating thumbnail
        if (cachedItem.generatingThumbnail) {
            return false;
        }

        return true;
    }

    /**
     * Attempts to generate a thumbnail if conditions are met.
     * Returns true if generation was queued, false if skipped.
     */
    public async tryGenerateThumbnail(props: { url: string, mediaType: MediaType, force?: boolean, notificationId?: string }): Promise<boolean> {
        await this.initialize();
        const { url, mediaType, force = false, notificationId } = props;

        if (!this.shouldGenerateThumbnail(url, mediaType, force)) {
            return false;
        }

        await this.addToQueue({ url, mediaType, op: 'thumbnail', force, priority: 5, notificationId });
        return true;
    }

    public async generateThumbnail(props: { url: string, mediaType: MediaType, force?: boolean, notificationId?: string }): Promise<void> {
        await this.initialize();
        const { url, mediaType, force, notificationId } = props;

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

        await this.addToQueue({ url, mediaType, op: 'thumbnail', force, priority: 5, notificationId });
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

    /**
     * Get bucket icon from cache, or download/process/cache if not found
     * If no icon URL provided, generates a placeholder with initials
     * Compatible with both web (IndexedDB) and mobile (filesystem)
     * Checks parameters only once per session for performance
     * Returns the file URI (mobile) or data URL (web) if successful, null otherwise
     */
    async getBucketIcon(
        bucketId: string,
        bucketName: string,
        iconUrl?: string,
    ): Promise<string | null> {
        await this.initialize();
        if (!this.repo) return null;

        try {
            // Check if bucket parameters have changed since last call
            const cachedParams = this.bucketParamsCache.get(bucketId);
            const currentTimestamp = Date.now();

            // Compare current params with cached params.
            // Only invalidate if the icon URL changes.
            const paramsChanged = cachedParams && (cachedParams.iconUrl !== iconUrl);

            if (paramsChanged) {
                // console.log(`[MediaCache] 🔄 Bucket params changed for ${bucketName}`, {
                //     old: cachedParams,
                //     new: { bucketName, iconUrl, iconAttachmentUuid }
                // });
                // console.log(`[MediaCache] 🗑️ Invalidating cache for ${bucketName}`);
                await this.invalidateBucketIcon(bucketId, bucketName);
                // Update timestamp for invalidated icon
                this.bucketParamsCache.set(bucketId, { iconUrl, timestamp: currentTimestamp });
            } else if (!cachedParams) {
                // First time seeing this bucket
                this.bucketParamsCache.set(bucketId, { iconUrl, timestamp: currentTimestamp });
            }

            // Check if already cached
            const timestamp = this.bucketParamsCache.get(bucketId)?.timestamp || Date.now();

            // Use the same method for both web and mobile
            const cachedUri = await this.repo.getBucketIconFromSharedCache(bucketId, bucketName, timestamp);
            if (cachedUri) {
                // Store in memory cache for instant access
                this.bucketIconUriCache.set(bucketId, cachedUri);
                return cachedUri;
            }

            // Not in cache - add to queue for download if iconUrl exists
            // Backend automatically generates icons, so iconUrl should always exist
            if (iconUrl) {
                await this.addBucketIconToQueue(bucketId, bucketName, iconUrl);
                return null;
            }
            return null;
        } catch (error) {
            console.error('[MediaCache] Failed to get bucket icon:', error);
            return null;
        }
    }

    /**
     * Get bucket icon URI synchronously from in-memory cache
     * Returns null if not yet loaded or if params have changed (needs re-download)
     * Use this for instant access during initial render
     * 
     * @param bucketId - The bucket ID
     * @param bucketName - The bucket name (to check if params changed)
     * @param iconUrl - The icon URL (to check if params changed)
     */
    getCachedBucketIconUri(
        bucketId: string,
        bucketName: string,
        iconUrl?: string
    ): string | null {
        // Check if params have changed since last cache
        const cachedParams = this.bucketParamsCache.get(bucketId);

        if (cachedParams) {
            const paramsChanged =
                cachedParams.iconUrl !== iconUrl;

            if (paramsChanged) {
                // Params changed, invalidate cache
                console.log(`[MediaCache] 🔄 Params changed for ${bucketName}, cache invalidated`);
                this.bucketIconUriCache.delete(bucketId);
                return null;
            }
        }

        // Return from memory cache if available
        const memoryCacheUri = this.bucketIconUriCache.get(bucketId);
        if (memoryCacheUri) {
            return memoryCacheUri;
        }

        // If not in memory cache but params match, try to get from persistent cache
        // This handles the case where icon was downloaded but component wasn't subscribed yet
        if (cachedParams && this.repo) {
            const timestamp = cachedParams.timestamp || Date.now();
            // Use synchronous check if possible (for web IndexedDB this is async, but we can't await here)
            // For now, return null and let async loading handle it
            return null;
        }

        return null;
    }

    /**
     * Add bucket icon to processing queue (for download from backend-generated URL)
     */
    private async addBucketIconToQueue(
        bucketId: string,
        bucketName: string,
        iconUrl: string
    ): Promise<void> {
        const key = `BUCKET_ICON::${bucketId}::bucket-icon`;

        // Check if already in queue (use currentQueueState for synchronous check)
        // Note: This check might have race conditions with concurrent calls,
        // but the reducer will also check for duplicates, so it's safe
        const alreadyInQueue = this.currentQueueState.queue.some(item => item.key === key);

        if (alreadyInQueue) {
            console.log(`[MediaCache] ⏭️ Bucket icon already in queue for ${bucketId}, skipping`);
            return;
        }

        // Also check if currently processing this bucket icon
        if (this.currentQueueState.isProcessing &&
            this.currentQueueState.currentItem?.key === key) {
            console.log(`[MediaCache] ⏭️ Bucket icon already processing for ${bucketId}, skipping`);
            return;
        }

        const queueItem: DownloadQueueItem = {
            key,
            url: iconUrl,
            bucketId,
            bucketName,
            mediaType: MediaType.Icon,
            op: 'bucket-icon',
            timestamp: Date.now(),
            priority: 10, // High priority for bucket icons
        };

        console.log(`[MediaCache] ➕ Adding bucket icon to queue: ${bucketName} (${bucketId})`);
        console.log(`[MediaCache] 📊 Current queue state: ${this.currentQueueState.queue.length} items, processing: ${this.currentQueueState.isProcessing}`);
        
        this.queueAction$.next({ type: 'ADD', item: queueItem });
        console.log(`[MediaCache] 📤 Queue action dispatched for ${bucketName}`);
    }

    /**
     * Download and cache bucket icon from URL
     * Works for both web and mobile
     */
    private async downloadAndCacheBucketIcon(
        bucketId: string,
        bucketName: string,
        iconUrl: string
    ): Promise<string | null> {
        try {
            const cacheKey = this.generateBucketIconCacheKey(bucketId, bucketName);
            const downloadTimestamp = Date.now();
            const standardSize = 200;

            console.log(`[MediaCache] 🔄 Downloading bucket icon from URL`);

            if (isWeb) {
                // ===== WEB: Download via proxy to avoid CORS, resize, save to IndexedDB =====
                if (!this.repo) {
                    throw new Error('Repository not initialized');
                }

                // Get API credentials for proxy request
                const authToken = settingsService.getAuthData().accessToken;
                const apiEndpoint = settingsService.getApiBaseWithPrefix();

                if (!authToken) {
                    throw new Error('No auth token available for proxy request');
                }

                // Use backend proxy to download image (avoids CORS)
                const proxyUrl = `${apiEndpoint}/attachments/proxy-media?url=${encodeURIComponent(iconUrl)}`;
                console.log(`[MediaCache] Using backend proxy for bucket icon download`);

                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Accept': 'image/*',
                        'User-Agent': 'Zentik-Notifier-Web/1.0',
                    },
                });

                if (!response.ok) {
                    throw new Error(`Backend proxy failed: ${response.status} ${response.statusText}`);
                }

                const blob = await response.blob();
                console.log(`[MediaCache] ✅ Downloaded bucket icon: ${blob.size} bytes`);

                // Convert to data URL for ImageManipulator
                const reader = new FileReader();
                const dataUrlPromise = new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                });
                reader.readAsDataURL(blob);
                const dataUrl = await dataUrlPromise;

                // Resize using ImageManipulator
                const result = await ImageManipulator.manipulateAsync(
                    dataUrl,
                    [{ resize: { width: standardSize, height: standardSize } }],
                    { compress: 1, format: ImageManipulator.SaveFormat.PNG }
                );

                console.log(`[MediaCache] ✅ Resized bucket icon to ${standardSize}x${standardSize}`);

                // Convert result to ArrayBuffer
                const resizedResponse = await fetch(result.uri);
                const resizedBlob = await resizedResponse.blob();
                const buffer = await resizedBlob.arrayBuffer();

                // Save to IndexedDB
                await this.repo.saveMediaItem({
                    key: cacheKey,
                    data: buffer,
                });

                const savedDataUrl = await this.repo.getMediaUrl(cacheKey);
                console.log(`[MediaCache] ✅ Saved bucket icon to IndexedDB: ${cacheKey}`);

                // Update timestamp in cache
                const cachedParams = this.bucketParamsCache.get(bucketId);
                if (cachedParams) {
                    this.bucketParamsCache.set(bucketId, { ...cachedParams, timestamp: downloadTimestamp });
                }

                // Add fragment to force expo-image cache invalidation
                const finalUri = savedDataUrl ? `${savedDataUrl}#t=${downloadTimestamp}` : savedDataUrl;

                // Store in memory cache for instant access
                if (finalUri) {
                    this.bucketIconUriCache.set(bucketId, finalUri);
                }

                return finalUri;

            } else {
                // ===== MOBILE: Use filesystem with File.downloadAsync =====
                await this.ensureDirectories();

                // Download directly to final location (no resize)
                const finalUri = await this.getBucketIconFilePath(bucketId, bucketName);
                const finalFile = new File(finalUri);

                // Delete final file if exists
                if (finalFile.exists) {
                    await finalFile.delete();
                }

                const downloadResult = await File.downloadAsync(iconUrl, finalUri);

                if (!downloadResult.uri) {
                    console.error('[MediaCache] ❌ Bucket icon download failed, no URI returned');
                    return null;
                }

                console.log(`[MediaCache] ✅ Downloaded bucket icon: ${downloadResult.size || 0} bytes to ${finalUri}`);

                // Update timestamp in cache
                const cachedParams = this.bucketParamsCache.get(bucketId);
                if (cachedParams) {
                    this.bucketParamsCache.set(bucketId, { ...cachedParams, timestamp: downloadTimestamp });
                }

                // Add timestamp to force expo-image cache invalidation
                const finalUriWithTimestamp = `${finalUri}?t=${downloadTimestamp}`;

                // Store in memory cache for instant access
                this.bucketIconUriCache.set(bucketId, finalUriWithTimestamp);

                return finalUriWithTimestamp;
            }
        } catch (error) {
            console.error('[MediaCache] ❌ Error downloading/caching bucket icon:', error);
            return null;
        }
    }

    /**
     * Generate cache key for bucket icon (used for web IndexedDB)
     * Simple naming: just bucketId.png
     */
    private generateBucketIconCacheKey(bucketId: string, bucketName: string): string {
        return `BUCKET_ICON/${bucketId}.png`;
    }

    /**
     * Get bucket icon file path (for mobile filesystem)
     * Simple naming: just bucketId.png
     */
    private async getBucketIconFilePath(bucketId: string, bucketName: string): Promise<string> {
        const bucketIconDir = `${this.cacheDir}BUCKET_ICON/`;
        const fileName = `${bucketId}.png`;
        return `${bucketIconDir}${fileName}`;
    }

    /**
     * Invalidate cached bucket icon using saved parameters
     */
    async invalidateBucketIcon(bucketId: string, newBucketName?: string): Promise<void> {
        try {
            // Get old params from in-memory cache
            const oldParams = this.bucketParamsCache.get(bucketId);

            if (!oldParams) {
                // No old params cached, try to delete file anyway (file path is based on bucketId only)
                if (!isWeb && newBucketName) {
                    const fileUri = await this.getBucketIconFilePath(bucketId, newBucketName);
                    const file = new File(fileUri);
                    if (file.exists) {
                        await file.delete();
                        console.log(`[MediaCache] ✅ Deleted bucket icon: ${fileUri}`);
                    }
                }
                // Remove from in-memory cache anyway
                this.bucketParamsCache.delete(bucketId);
                return;
            }

            // Generate cache key with OLD parameters (currently based on bucketId only)
            const oldCacheKey = this.generateBucketIconCacheKey(bucketId, newBucketName ?? "");

            if (isWeb) {
                // Delete from IndexedDB
                if (this.repo) {
                    await this.repo.deleteMediaItem(oldCacheKey);
                    console.log(`[MediaCache] ✅ Deleted bucket icon from IndexedDB: ${oldCacheKey}`);
                }
            } else {
                // Delete from filesystem using old parameters
                const oldFileUri = await this.getBucketIconFilePath(bucketId, newBucketName ?? "");
                const file = new File(oldFileUri);
                if (file.exists) {
                    await file.delete();
                    console.log(`[MediaCache] ✅ Deleted bucket icon: ${oldFileUri}`);
                }
            }

            // Remove from in-memory cache
            this.bucketParamsCache.delete(bucketId);
            console.log(`[MediaCache] ✅ Removed bucket ${bucketId} from params cache`);
        } catch (error) {
            console.error('[MediaCache] Error invalidating bucket icon:', error);
        }
    }

    async cleanupGalleryBySettings(): Promise<GalleryCleanupResult> {
        await this.initialize();
        const retentionPolicies = settingsService.getRetentionPolicies();
        const maxCacheSizeMB = retentionPolicies.maxCacheSizeMB;
        const maxCageAgeDays = retentionPolicies.maxCageAgeDays;

        console.log(`[Gallery Cleanup] Starting cleanup with maxCacheSizeMB=${maxCacheSizeMB}, maxCageAgeDays=${maxCageAgeDays}`);

        const items = this.getCachedItems().filter(item => !item.isUserDeleted && item.mediaType !== MediaType.Icon);
        const totalBefore = items.length;
        const sizeBefore = items.reduce((sum, item) => sum + (item.size || 0), 0);

        if (totalBefore === 0) {
            console.log('[Gallery Cleanup] No media items to clean up (excluding icons)');
            return {
                totalBefore: 0,
                totalAfter: 0,
                deletedCount: 0,
                sizeBefore: 0,
                sizeAfter: 0,
                filteredByAge: 0,
                filteredBySize: 0,
            };
        }

        let filteredItems = items;
        let filteredByAge = 0;

        if (typeof maxCageAgeDays === 'number' && maxCageAgeDays > 0) {
            const cutoff = Date.now() - maxCageAgeDays * 24 * 60 * 60 * 1000;

            const beforeFilter = filteredItems.length;
            filteredItems = filteredItems.filter(item => {
                const itemDate = item.notificationDate || item.downloadedAt || item.timestamp;
                return itemDate >= cutoff;
            });
            filteredByAge = beforeFilter - filteredItems.length;

            if (filteredByAge > 0) {
                console.log(`[Gallery Cleanup] Filtered ${filteredByAge} items older than ${maxCageAgeDays} days`);
            }
        }

        filteredItems.sort((a, b) => {
            const aTime = a.notificationDate || a.downloadedAt || a.timestamp;
            const bTime = b.notificationDate || b.downloadedAt || b.timestamp;
            return bTime - aTime;
        });

        let itemsToKeep = filteredItems;
        let filteredBySize = 0;

        if (typeof maxCacheSizeMB === 'number' && maxCacheSizeMB > 0) {
            const maxSizeBytes = maxCacheSizeMB * 1024 * 1024;
            let currentSize = 0;
            const tempKeep: CacheItem[] = [];

            for (const item of filteredItems) {
                const itemSize = item.size || 0;
                if (currentSize + itemSize <= maxSizeBytes) {
                    tempKeep.push(item);
                    currentSize += itemSize;
                } else {
                    filteredBySize++;
                }
            }

            itemsToKeep = tempKeep;

            if (filteredBySize > 0) {
                console.log(`[Gallery Cleanup] Filtered ${filteredBySize} items to stay within ${maxCacheSizeMB}MB limit`);
            }
        }

        const idsToKeep = new Set(itemsToKeep.map(item => item.key));
        const itemsToDelete = items.filter(item => !idsToKeep.has(item.key));

        console.log(`[Gallery Cleanup] Will delete ${itemsToDelete.length} items from gallery`);

        let deletedCount = 0;
        if (itemsToDelete.length > 0) {
            for (const item of itemsToDelete) {
                try {
                    const success = await this.deleteCachedMedia(item.url, item.mediaType, false);
                    if (success) {
                        deletedCount++;
                    }
                } catch (error) {
                    console.error(`[Gallery Cleanup] Failed to delete item ${item.key}:`, error);
                }
            }
            console.log(`[Gallery Cleanup] Deleted ${deletedCount} media items (including thumbnails)`);
        }

        const totalAfter = itemsToKeep.length;
        const sizeAfter = itemsToKeep.reduce((sum, item) => sum + (item.size || 0), 0);

        console.log(`[Gallery Cleanup] Cleanup completed: ${totalBefore} → ${totalAfter} items (${deletedCount} deleted)`);
        console.log(`[Gallery Cleanup] Size: ${(sizeBefore / (1024 * 1024)).toFixed(2)}MB → ${(sizeAfter / (1024 * 1024)).toFixed(2)}MB`);

        return {
            totalBefore,
            totalAfter,
            deletedCount,
            sizeBefore,
            sizeAfter,
            filteredByAge,
            filteredBySize,
        };
    }

    async tryAutoDownload(notification: NotificationFragment, priority: number = 0): Promise<void> {
        const attachments = notification.message?.attachments || [];
        if (attachments.length === 0) return;

        await this.initialize();

        for (const attachment of attachments) {
            if (!attachment.url) continue;
            await this.downloadMedia({
                url: attachment.url,
                mediaType: attachment.mediaType,
                notificationDate: new Date(notification.createdAt).getTime(),
                notificationId: notification.id,
                priority,
            });
        }
    }

    /**
     * Get observable stream of queue progress
     * Emits percentage completion (0-100)
     */
    getQueueProgress$(): Observable<number> {
        return this.downloadQueue$.pipe(
            map(state => {
                const total = state.completedCount + state.failedCount + state.queue.length + (state.currentItem ? 1 : 0);
                if (total === 0) return 100;
                return Math.round(((state.completedCount + state.failedCount) / total) * 100);
            }),
            distinctUntilChanged()
        );
    }

    /**
     * Get observable stream of cache items for a specific media type
     */
    getCacheItemsByType$(mediaType: MediaType): Observable<CacheItem[]> {
        return this.metadata$.pipe(
            map(metadata =>
                Object.values(metadata).filter(item =>
                    item.mediaType === mediaType && !item.isUserDeleted
                )
            ),
            distinctUntilChanged((prev, curr) =>
                JSON.stringify(prev) === JSON.stringify(curr)
            )
        );
    }

    /**
     * Get observable stream of total cache size
     */
    getCacheSize$(): Observable<number> {
        return this.metadata$.pipe(
            map(metadata =>
                Object.values(metadata)
                    .filter(item => !item.isUserDeleted)
                    .reduce((sum, item) => sum + (item.size || 0), 0)
            ),
            distinctUntilChanged()
        );
    }

    /**
     * Watch specific cache item for changes
     */
    watchCacheItem$(url: string, mediaType: MediaType): Observable<CacheItem | undefined> {
        const key = this.generateCacheKey(url, mediaType);
        return this.metadata$.pipe(
            map(metadata => metadata[key]),
            distinctUntilChanged((prev, curr) =>
                JSON.stringify(prev) === JSON.stringify(curr)
            )
        );
    }

    /**
     * Batch download with priority
     */
    async batchDownload(
        items: Array<{ url: string; mediaType: MediaType; notificationDate?: number; notificationId?: string }>,
        priority: number = 0
    ): Promise<void> {
        await this.initialize();

        for (const item of items) {
            await this.downloadMedia({
                ...item,
                priority,
            });
        }
    }

    /**
     * Cleanup and destroy observables
     */
    destroy(): void {
        this.queueAction$.complete();
        this.queueItem$.complete();
        this.metadata$.complete();
    }
}

export interface GalleryCleanupResult {
    totalBefore: number;
    totalAfter: number;
    deletedCount: number;
    sizeBefore: number;
    sizeAfter: number;
    filteredByAge: number;
    filteredBySize: number;
}

export const mediaCache = new MediaCacheService();

export async function cleanupGalleryBySettings(): Promise<GalleryCleanupResult> {
    return await mediaCache.cleanupGalleryBySettings();
}
