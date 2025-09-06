import RefreshableScrollView from "@/components/RefreshableScrollView";
import { UserSessionsSettings } from "@/components/UserSessionsSettings";
import React, { useState } from "react";

export default function UserSessionsSettingsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // The refreshing state is passed down to components which handle their own refresh
    setTimeout(() => setRefreshing(false), 500); // Small delay to ensure smooth animation
  };

  return (
    <RefreshableScrollView onRefresh={handleRefresh}>
      {(isRefreshing) => (
        <UserSessionsSettings refreshing={isRefreshing || refreshing} />
      )}
    </RefreshableScrollView>
  );
}
