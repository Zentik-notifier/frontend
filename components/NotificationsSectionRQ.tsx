/**
 * NotificationsSection with React Query
 * Example migration from Apollo to React Query
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { NotificationsListWithContext } from "./NotificationsList";

interface NotificationsSectionRQProps {
  /**
   * Optional bucket ID to filter notifications
   */
  bucketId?: string;

  /**
   * Hide bucket information
   */
  hideBucketInfo?: boolean;

  /**
   * Custom header component
   */
  customHeader?: React.ReactNode;
}

/**
 * NotificationsSectionRQ
 * 
 * This is an example of how to migrate NotificationsSection to use React Query.
 * The main difference is that we no longer need to pass notifications from AppContext,
 * as the NotificationsListRQ component fetches them directly using React Query hooks.
 * 
 * Benefits:
 * - Automatic data fetching and caching
 * - Offline-first support
 * - Real-time synchronization
 * - Optimistic updates
 * - Better error handling
 */
export default function NotificationsSectionRQ({
  bucketId,
  hideBucketInfo = false,
  customHeader,
}: NotificationsSectionRQProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <NotificationsListWithContext
        bucketId={bucketId}
        hideBucketInfo={hideBucketInfo}
        customHeader={customHeader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
