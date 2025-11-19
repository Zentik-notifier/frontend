import { mediaCache } from '@/services/media-cache-service';
import { useEffect, useState } from 'react';

export interface UseBucketIconOptions {
  /**
   * Whether to enable the hook (useful for conditional fetching)
   */
  enabled?: boolean;
  
  /**
   * Optional callback when icon is loaded
   */
  onIconLoaded?: (uri: string) => void;
}

export interface UseBucketIconResult {
  /**
   * The URI of the cached bucket icon (null if not available yet)
   */
  iconUri: string | null;
  
  /**
   * Whether the icon is currently being loaded/downloaded
   */
  isLoading: boolean;
  
  /**
   * Whether the icon has been successfully loaded
   */
  isLoaded: boolean;
  
  /**
   * Error message if icon loading failed
   */
  error: string | null;
  
  /**
   * Force reload the icon (useful when bucket params change)
   */
  reload: () => Promise<void>;
}

/**
 * Hook to manage bucket icon loading and caching
 * 
 * This hook:
 * - Checks for cached icon synchronously on mount
 * - Initiates async download if not cached
 * - Subscribes to icon ready events from media-cache-service
 * - Tracks loading state and errors
 * - Automatically invalidates cache when bucket params change
 * 
 * @param bucketId - The bucket ID
 * @param bucketName - The bucket name (used for cache key generation)
 * @param iconUrl - Optional icon URL from backend
 * @param options - Additional options for the hook
 * 
 * @example
 * ```tsx
 * const { iconUri, isLoading, isLoaded } = useBucketIcon(
 *   bucket.id,
 *   bucket.name,
 *   bucket.iconUrl
 * );
 * 
 * if (isLoading) {
 *   return <LoadingPlaceholder />;
 * }
 * 
 * if (iconUri) {
 *   return <Image source={{ uri: iconUri }} />;
 * }
 * ```
 */
export function useBucketIcon(
  bucketId: string,
  bucketName: string,
  iconUrl?: string,
  options: UseBucketIconOptions = {}
): UseBucketIconResult {
  const { enabled = true, onIconLoaded } = options;
  
  const [iconUri, setIconUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Function to load icon
  const loadIcon = async () => {
    if (!enabled || !bucketName) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Try to get cached icon first (synchronous, with param validation)
      const cachedUri = mediaCache.getCachedBucketIconUri(bucketId, bucketName, iconUrl);
      if (cachedUri) {
        // console.log(`[useBucketIcon] 💾 Found cached icon for ${bucketName}`);
        setIconUri(cachedUri);
        setIsLoading(false);
        onIconLoaded?.(cachedUri);
        return;
      }
      
      // Start async loading (this will queue the icon if not cached)
    //   console.log(`[useBucketIcon] 🔄 Loading icon for ${bucketName}`, { iconUrl });
      const uri = await mediaCache.getBucketIcon(
        bucketId,
        bucketName,
        iconUrl
      );
      
      if (uri) {
        // console.log(`[useBucketIcon] ✅ Icon loaded for ${bucketName}`);
        setIconUri(uri);
        onIconLoaded?.(uri);
      } else {
        // console.log(`[useBucketIcon] ⏳ Icon queued for download: ${bucketName}`);
      }
    } catch (err: any) {
      console.error(`[useBucketIcon] ❌ Error loading icon for ${bucketName}:`, err);
      setError(err?.message || 'Failed to load icon');
    } finally {
      setIsLoading(false);
    }
  };

  // Load icon on mount and when params change
  useEffect(() => {
    if (!enabled) return;
    
    let cancelled = false;

    // Try to get cached icon synchronously first (with param validation)
    const cachedUri = mediaCache.getCachedBucketIconUri(bucketId, bucketName, iconUrl);
    if (cachedUri && !cancelled) {
    //   console.log(`[useBucketIcon] 💾 Instant cache hit for ${bucketName}`);
      setIconUri(cachedUri);
      onIconLoaded?.(cachedUri);
    } else {
      // Start async loading
      loadIcon();
    }

    // Subscribe to bucket icon ready events
    const subscription = mediaCache.bucketIconReady.subscribe(
      ({ bucketId: readyBucketId, uri }) => {
        if (readyBucketId === bucketId && !cancelled) {
        //   console.log(`[useBucketIcon] 📢 Icon ready event received for ${bucketName}`);
          setIconUri(uri);
          setIsLoading(false);
          setError(null);
          onIconLoaded?.(uri);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [bucketId, bucketName, iconUrl, enabled]);

  // Compute isLoaded state
  const isLoaded = iconUri !== null;

  return {
    iconUri,
    isLoading: isLoading && !isLoaded,
    isLoaded,
    error,
    reload: loadIcon,
  };
}
