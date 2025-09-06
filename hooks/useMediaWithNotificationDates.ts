import { MediaType } from '@/generated/gql-operations-generated';
import { useMemo } from 'react';
import { useGetCacheStats } from './useMediaCache';

export interface MediaWithNotificationDate {
  id: string;
  url: string;
  localPath: string;
  mediaType: MediaType;
  size: number;
  timestamp: number;
  originalFileName?: string;
  downloadedAt: number;
  notificationDate: number;
}

const groupMediaByDate = (mediaWithDates: Array<{
  id: string;
  url: string;
  localPath: string;
  mediaType: MediaType;
  size: number;
  timestamp: number;
  originalFileName?: string;
  downloadedAt: number;
  notificationDate?: number;
}>): Map<string, MediaWithNotificationDate[]> => {
  const grouped = new Map<string, MediaWithNotificationDate[]>();

  for (const media of mediaWithDates) {
    // Use notification date if available, otherwise fallback to download date
    const dateToUse = media.notificationDate || media.downloadedAt || new Date().getTime();
    const date = new Date(dateToUse);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push({
      ...media,
      notificationDate: dateToUse,
    });
  }

  // Sort each group by notification date (newest first)
  for (const [_, mediaList] of grouped) {
    mediaList.sort((a, b) => b.notificationDate - a.notificationDate);
  }

  return grouped;
}

/**
 * Get sorted date keys (newest first)
 */
const getSortedDateKeys = (groupedMedia: Map<string, MediaWithNotificationDate[]>): string[] => {
  return Array.from(groupedMedia.keys()).sort((a, b) => b.localeCompare(a));
}

export function useMediaWithNotificationDates() {
  const { cachedItems } = useGetCacheStats();

  // Add id to cached items and group by date
  const mediaWithIds = useMemo(() => {
    return cachedItems.map((item, index) => ({
      ...item,
      id: `${item.mediaType}_${item.url}_${index}`,
    }));
  }, [cachedItems]);

  // Group media by date using saved notification dates
  const groupedMedia = useMemo(() => {
    return groupMediaByDate(mediaWithIds);
  }, [mediaWithIds]);

  // Get sorted date keys
  const sortedDateKeys = useMemo(() => {
    return getSortedDateKeys(groupedMedia);
  }, [groupedMedia]);

  return {
    mediaWithDates: mediaWithIds,
    groupedMedia,
    sortedDateKeys,
    loading: false,
  };
}
