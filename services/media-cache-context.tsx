import React, {
  createContext,
  useCallback,
  useContext,
  useState
} from "react";
import { MediaType } from "../generated/gql-operations-generated";
import { CacheItem, CacheStats, mediaCache } from "./media-cache";
import { userSettings } from "./user-settings";

interface MediaCacheContextType {
  canAutoDownload: boolean;
  cacheStats: CacheStats;
  cachedItems: CacheItem[];
  clearCache: () => Promise<void>;
  clearCacheComplete: () => Promise<void>;
  refreshCacheData: () => Promise<void>;
  deleteCachedMedia: (url: string, mediaType: MediaType) => Promise<void>;
  isCached: (url: string, mediaType: MediaType) => Promise<boolean>;
  getMediaSource: (
    url: string,
    mediaType: MediaType,
    originalFileName?: string,
    options?: { forceRetry?: boolean; notificationDate?: number }
  ) => Promise<{ uri: string; fromCache: boolean }>;
  downloadMedia: (
    url: string,
    mediaType: MediaType,
    originalFileName?: string,
    notificationDate?: number
  ) => Promise<boolean>;
  hasPermanentFailure: (url: string, mediaType: MediaType) => Promise<boolean>;
  isUserDeletedFlag: (url: string, mediaType: MediaType) => Promise<boolean>;
}

const MediaCacheContext = createContext<MediaCacheContextType | undefined>(
  undefined
);

export const MediaCacheProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    totalItems: 0,
    totalSize: 0,
    oldestItem: null,
    newestItem: null,
    itemsByType: {} as Record<MediaType, number>,
  });
  const [cachedItems, setCachedItems] = useState<any[]>([]);

  const [canAutoDownload, setCanAutoDownload] = useState<boolean>(false);

  // Function to check if auto download should be active
  const checkAutoDownloadStatus = async () => {
    try {
      const [downloadSettings] = await Promise.all([
        userSettings.getMediaCacheDownloadSettings(),
        userSettings.getMediaCacheRetentionPolicies(),
      ]);

      // Auto download is active if:
      // 1. Auto download is enabled in settings
      // 2. WiFi-only is disabled OR we're on WiFi
      let isActive = downloadSettings.autoDownloadEnabled;

      if (isActive && downloadSettings.wifiOnlyDownload) {
        // Check if we're on WiFi (this would need to be implemented)
        // For now, we'll assume it's active if WiFi-only is enabled
        // In a real implementation, you'd check the current network type
        isActive = true; // Placeholder - should check actual network status
      }

      setCanAutoDownload(isActive);
    } catch (error) {
      console.error("Failed to check auto download status:", error);
      setCanAutoDownload(false);
    }
  };

  // useEffect(() => {
  //   checkAutoDownloadStatus();

  //   refreshCacheData();
  //   // Subscribe to metadata changes from mediaCache so Gallery gets live updates
  //   const removeListener = mediaCache.addMetadataChangeListener(() => {
  //     refreshCacheData();
  //   });
  //   return () => {
  //     try { removeListener?.(); } catch {}
  //   };
  // }, []);

  const refreshCacheStats = useCallback(() => {
    try {
      const stats = mediaCache.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error("Failed to refresh cache stats:", error);
    }
  }, []);

  const refreshCachedItems = useCallback(() => {
    try {
      const items = mediaCache.getCachedItems();
      setCachedItems(items);
    } catch (error) {
      console.error("Failed to refresh cached items:", error);
      setCachedItems([]);
    }
  }, []);

  const refreshCacheData = useCallback(async () => {
    refreshCacheStats();
    refreshCachedItems();
  }, [refreshCacheStats, refreshCachedItems]);

  const clearCache = useCallback(async () => {
    await mediaCache.clearCache();
    // Reload cache stats and cached items after clearing
    try {
      refreshCacheData();
    } catch (error) {
      console.error("Failed to reload cache data:", error);
    }
  }, [refreshCacheData]);

  const clearCacheComplete = useCallback(async () => {
    await mediaCache.clearCacheComplete();
    // Reload cache data after clearing
    try {
      refreshCacheData();
    } catch (error) {
      console.error("Failed to reload cache data:", error);
    }
  }, []);

  const deleteCachedMedia = useCallback(
    async (url: string, mediaType: MediaType) => {
      await mediaCache.deleteCachedMedia(url, mediaType);
      refreshCacheData();
    },
    []
  );

  const isCached = useCallback(
    async (url: string, mediaType: MediaType): Promise<boolean> => {
      return mediaCache.isCached(url, mediaType);
    },
    []
  );

  const getMediaSource = useCallback(
    async (
      url: string,
      mediaType: MediaType,
      originalFileName?: string,
      options?: { forceRetry?: boolean; notificationDate?: number }
    ): Promise<{ uri: string; fromCache: boolean }> => {
      const mediaSource = await mediaCache.getMediaSource(
        url,
        mediaType,
        originalFileName,
        options
      );

      // If media was downloaded (not from cache), refresh stats and items
      if (!mediaSource.fromCache) {
        // Refresh cache data after successful download
        refreshCacheData();
      }

      return mediaSource;
    },
    [refreshCacheData]
  );

  const downloadMedia = useCallback(
    async (
      url: string,
      mediaType: MediaType,
      originalFileName?: string,
      notificationDate?: number
    ): Promise<boolean> => {
      const result = await mediaCache.downloadMedia(
        url,
        mediaType,
        originalFileName,
        notificationDate
      );
      if (result) {
        // Refresh cached items after successful download
        refreshCacheData();
      }
      return result;
    },
    [refreshCacheData]
  );

  const hasPermanentFailure = useCallback(
    async (url: string, mediaType: MediaType): Promise<boolean> => {
      return mediaCache.hasPermanentFailure(url, mediaType);
    },
    []
  );

  const isUserDeletedFlag = useCallback(
    async (url: string, mediaType: MediaType): Promise<boolean> => {
      return mediaCache.isUserDeletedFlag(url, mediaType);
    },
    []
  );

  const contextValue: MediaCacheContextType = {
    canAutoDownload,
    cacheStats,
    cachedItems,
    clearCache,
    clearCacheComplete,
    deleteCachedMedia,
    isCached,
    getMediaSource,
    downloadMedia,
    hasPermanentFailure,
    isUserDeletedFlag,
    refreshCacheData,
  };

  return (
    <MediaCacheContext.Provider value={contextValue}>
      {children}
    </MediaCacheContext.Provider>
  );
};

export const useMediaCache = (): MediaCacheContextType => {
  const context = useContext(MediaCacheContext);
  if (context === undefined) {
    throw new Error("useMediaCache must be used within a MediaCacheProvider");
  }
  return context;
};
