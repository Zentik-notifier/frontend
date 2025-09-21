import React, { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";

interface RefreshableScrollViewProps {
  children: React.ReactNode | ((refreshing: boolean) => React.ReactNode);
  onRefresh?: () => Promise<any>;
  style?: any;
  contentStyle?: any;
  refreshControlColors?: string[];
  refreshControlTintColor?: string;
  showsVerticalScrollIndicator?: boolean;
}

export default function RefreshableScrollView({
  children,
  onRefresh,
  style,
  contentStyle,
  refreshControlColors = ["#0a7ea4"],
  refreshControlTintColor = "#0a7ea4",
  showsVerticalScrollIndicator = false,
}: RefreshableScrollViewProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      // Add a delay to allow components to complete their refresh
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={[styles.scrollView, style]}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={refreshControlColors} // Android
          tintColor={refreshControlTintColor} // iOS
        />
      }
    >
      {typeof children === 'function' ? children(refreshing) : children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
});
