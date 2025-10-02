import { useCallback, useEffect, useState } from 'react';
import { Subscription } from 'rxjs';
import { MediaType } from '../generated/gql-operations-generated';
import { CacheItem, CacheStats, DownloadQueueState, mediaCache } from '../services/media-cache-service';
import { IS_FS_SUPPORTED } from '@/utils';

export const useCachedItem = (url: string, mediaType: MediaType) => {
  const [key] = useState(mediaCache.generateCacheKey(url, mediaType));
  const [item, setItem] = useState<CacheItem | undefined>();

  useEffect(() => {
    if (IS_FS_SUPPORTED) {
      const sub: Subscription = mediaCache.metadata$.subscribe(async (all) => {
        const newItem = all[key];
        if (newItem) {
          setItem(newItem);
        }
      });

      return () => sub.unsubscribe();
    } else {
      setItem({ localPath: url, mediaType } as CacheItem);
    }
  }, [mediaCache, key]);

  return { item };
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
  }, [mediaCache]);

  return items;
}

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

  const updateStats = useCallback(() => {
    const { stats, items } = mediaCache.getCacheStats();
    setCacheStats(stats);
    setCachedItems(items);
  }, []);

  useEffect(() => {
    updateStats();

    const sub: Subscription = mediaCache.metadata$.subscribe(updateStats);

    return () => sub.unsubscribe();
  }, []);

  return {
    cacheStats,
    cachedItems,
    updateStats,
  };
}

export const useDownloadQueue = () => {
  const [queueState, setQueueState] = useState<DownloadQueueState>(mediaCache.getDownloadQueueState());

  useEffect(() => {
    const subscription = mediaCache.downloadQueue$.subscribe(setQueueState);
    return () => subscription.unsubscribe();
  }, []);

  const downloadMedia = (props: {
    url: string;
    mediaType: any;
    force?: boolean;
    notificationDate?: number;
    priority?: number;
  }) => {
    return mediaCache.downloadMedia(props);
  };

  const clearQueue = () => {
    mediaCache.clearDownloadQueue();
  };

  const removeFromQueue = (url: string, mediaType: any) => {
    return mediaCache.removeFromQueue(url, mediaType);
  };

  const isInQueue = (url: string, mediaType: any) => {
    return mediaCache.isInQueue(url, mediaType);
  };

  const getQueueState = () => {
    return mediaCache.getDownloadQueueState();
  };

  return {
    queueState,
    downloadMedia,
    clearQueue,
    removeFromQueue,
    isInQueue,
    getQueueState,
    inProcessing: queueState.isProcessing,
    itemsInQueue: queueState.isProcessing ? queueState.queue.length + 1 : 0
  };
};
