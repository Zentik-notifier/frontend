import { BucketFragment, NotificationFragment } from '@/generated/gql-operations-generated';
import { useMemo, useState } from 'react';

export const useNotificationFilters = (
  notifications: NotificationFragment[],
  buckets: BucketFragment[]
) => {
  const [searchText, setSearchText] = useState('');
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Filter by search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(
        (notification) =>
          notification.message?.title.toLowerCase().includes(searchLower) ||
          (notification.message?.body && notification.message?.body.toLowerCase().includes(searchLower)) ||
          (notification.message?.subtitle && notification.message?.subtitle.toLowerCase().includes(searchLower)) ||
          (notification.message?.bucket?.name && notification.message?.bucket?.name.toLowerCase().includes(searchLower))
      );
    }

    // Filter by unread status
    if (showUnreadOnly) {
      filtered = filtered.filter(
        (notification) => !notification.readAt
      );
    }

    // Filter by bucket
    if (selectedBucketId) {
      // Specific bucket selected
      filtered = filtered.filter(
        (notification) => notification.message?.bucket?.id === selectedBucketId
      );
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [notifications, searchText, selectedBucketId, showUnreadOnly]);

  return {
    searchText,
    setSearchText,
    selectedBucketId,
    setSelectedBucketId,
    showUnreadOnly,
    setShowUnreadOnly,
    filteredNotifications,
  };
};
