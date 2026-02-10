import { useCallback, useEffect, useState } from 'react';
import { Subscription } from 'rxjs';
import { MediaType } from '../generated/gql-operations-generated';
import { CacheItem, CacheStats, DownloadQueueState, mediaCache } from '../services/media-cache-service';
import { InteractionManager, Platform } from 'react-native';
import { useAppContext } from '@/contexts/AppContext';

const isWeb = Platform.OS === 'web';

/**
 * Hook reattivo per un singolo item della cache
 * Usa il nuovo watchCacheItem$ observable per aggiornamenti efficienti
 * Gestisce automaticamente il download se richiesto
 */
export const useCachedItem = (url: string, mediaType: MediaType, options?: {
  priority?: number;
  notificationDate?: number;
  force?: boolean;
}) => {
  const {
    priority = 5,
    notificationDate,
    force = false
  } = options || {};
  const {
    userSettings: {
      settings: {
        downloadSettings: { autoDownloadEnabled },
      },
    },
  } = useAppContext();
  const shouldAutoDownload =
    mediaType === MediaType.Icon || (autoDownloadEnabled);

  const [item, setItem] = useState<CacheItem | undefined>(() =>
    mediaCache.getCachedItemSync(url, mediaType)
  );
  const [isLoading, setIsLoading] = useState(() => {
    const cached = mediaCache.getCachedItemSync(url, mediaType);
    return cached?.isDownloading ?? true;
  });

  useEffect(() => {
    const cached = mediaCache.getCachedItemSync(url, mediaType);
    setItem(cached);
    setIsLoading(cached?.isDownloading ?? true);

    const sub: Subscription = mediaCache.watchCacheItem$(url, mediaType).subscribe(async (newItem) => {
      const applyUpdate = async () => {
        if (!isWeb) {
          setItem(newItem);
          setIsLoading(newItem?.isDownloading ?? false);
        } else {
          let localUrl: string | undefined;
          if (newItem?.localPath) {
            localUrl = (await mediaCache.getMediaUrl(newItem.localPath)) || undefined;
          }
          setItem(newItem ? { ...newItem, localPath: localUrl } : undefined);
          setIsLoading(newItem?.isDownloading ?? false);
        }
      };
      if (isWeb) {
        await applyUpdate();
      } else {
        InteractionManager.runAfterInteractions(() => applyUpdate());
      }
    });

    return () => sub.unsubscribe();
  }, [url, mediaType]);

  useEffect(() => {
    if (shouldAutoDownload && url) {
      mediaCache.downloadMedia({
        url,
        mediaType,
        priority,
        notificationDate,
        force
      });
    }
  }, [url, mediaType, shouldAutoDownload, priority, notificationDate, force]);

  const download = useCallback((forceDownload: boolean = true) => {
    return mediaCache.downloadMedia({
      url,
      mediaType,
      force: forceDownload,
      priority,
      notificationDate
    });
  }, [url, mediaType, priority, notificationDate]);

  const forceDownload = useCallback(() => {
    return mediaCache.forceMediaDownload({ url, mediaType, notificationDate });
  }, [url, mediaType, notificationDate]);

  const remove = useCallback(async () => {
    return mediaCache.deleteCachedMedia(url, mediaType);
  }, [url, mediaType]);

  return {
    item,
    isLoading,
    isError: item?.isPermanentFailure ?? false,
    isDeleted: item?.isUserDeleted ?? false,
    download,
    forceDownload,
    remove
  };
}

export const useCachedItems = () => {
  const [items, setItems] = useState(
    Object.values(mediaCache.getMetadata())
  );

  useEffect(() => {
    const sub: Subscription = mediaCache.metadata$.subscribe(all => {
      setItems(Object.values(all));
    });
    return () => sub.unsubscribe();
  }, []);

  return items;
}

/**
 * Hook reattivo per le statistiche della cache
 * Ora include anche il size tracking in tempo reale
 */
export function useGetCacheStats() {
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    totalItems: 0,
    totalSize: 0,
    itemsByType: {
      [MediaType.Image]: 0,
      [MediaType.Video]: 0,
      [MediaType.Gif]: 0,
      [MediaType.Audio]: 0,
      [MediaType.Icon]: 0,
    }
  });
  const [cachedItems, setCachedItems] = useState<CacheItem[]>([]);
  const [totalSizeBytes, setTotalSizeBytes] = useState(0);

  const updateAll = useCallback(() => {
    const { stats, items } = mediaCache.getCacheStats();
    setCacheStats(stats);
    setCachedItems(items);
    // Single pass for size calculation — no extra Object.values() or filter
    let size = 0;
    for (let i = 0; i < items.length; i++) {
      if (!items[i].isUserDeleted) {
        size += items[i].size || 0;
      }
    }
    setTotalSizeBytes(size);
  }, []);

  useEffect(() => {
    updateAll();

    // Single subscription: update stats and size together in one pass
    const metadataSub: Subscription = mediaCache.metadata$.subscribe(() => {
      updateAll();
    });

    return () => {
      metadataSub.unsubscribe();
    };
  }, [updateAll]);

  return {
    cacheStats,
    cachedItems,
    totalSizeBytes,
    totalSizeMB: totalSizeBytes / 1024 / 1024,
    updateStats: updateAll,
  };
}

/**
 * Hook reattivo per la gestione della queue di download
 * Subscribe automaticamente agli aggiornamenti della coda
 */
export const useDownloadQueue = () => {
  const [queueState, setQueueState] = useState<DownloadQueueState>({
    queue: [],
    isProcessing: false,
    completedCount: 0,
    failedCount: 0,
  });
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Subscribe allo stato della coda
    const queueSub = mediaCache.downloadQueue$.subscribe(setQueueState);

    // Subscribe al progresso percentuale
    const progressSub = mediaCache.getQueueProgress$().subscribe(setProgress);

    return () => {
      queueSub.unsubscribe();
      progressSub.unsubscribe();
    };
  }, []);

  const downloadMedia = useCallback((props: {
    url: string;
    mediaType: MediaType;
    force?: boolean;
    notificationDate?: number;
    priority?: number;
  }) => {
    return mediaCache.downloadMedia(props);
  }, []);

  const batchDownload = useCallback((items: Array<{ url: string; mediaType: MediaType; notificationDate?: number }>, priority?: number) => {
    return mediaCache.batchDownload(items, priority);
  }, []);

  const clearQueue = useCallback(() => {
    mediaCache.clearDownloadQueue();
  }, []);

  const removeFromQueue = useCallback((url: string, mediaType: MediaType) => {
    mediaCache.removeFromQueue(url, mediaType);
  }, []);

  const isInQueue = useCallback(async (url: string, mediaType: MediaType) => {
    return mediaCache.isInQueue(url, mediaType);
  }, []);

  const getQueueState = useCallback(async () => {
    return mediaCache.getDownloadQueueState();
  }, []);

  return {
    queueState,
    progress,
    downloadMedia,
    batchDownload,
    clearQueue,
    removeFromQueue,
    isInQueue,
    getQueueState,
    inProcessing: queueState.isProcessing,
    itemsInQueue: queueState.queue.length + (queueState.isProcessing ? 1 : 0),
    currentItem: queueState.currentItem,
    completedCount: queueState.completedCount,
    failedCount: queueState.failedCount,
  };
};

/**
 * Hook per monitorare items di un tipo specifico
 * Usa getCacheItemsByType$ per aggiornamenti filtrati
 */
export const useCachedItemsByType = (mediaType: MediaType) => {
  const [items, setItems] = useState<CacheItem[]>([]);

  useEffect(() => {
    const sub = mediaCache.getCacheItemsByType$(mediaType).subscribe(setItems);
    return () => sub.unsubscribe();
  }, [mediaType]);

  return { items, count: items.length };
};

/**
 * Hook per il progresso della coda in percentuale (0-100)
 * Perfetto per progress bars
 */
export const useQueueProgress = () => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const sub = mediaCache.getQueueProgress$().subscribe(setProgress);
    return () => sub.unsubscribe();
  }, []);

  return { progress, isDownloading: progress < 100 };
};
