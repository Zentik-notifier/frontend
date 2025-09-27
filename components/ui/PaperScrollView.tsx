import React from "react";
import { RefreshControl, ScrollView, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";

interface PaperScrollViewProps {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
}

export default function PaperScrollView({
  children,
  refreshing = false,
  onRefresh,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  showsHorizontalScrollIndicator = false,
}: PaperScrollViewProps) {
  const theme = useTheme();

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        style,
      ]}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
            progressBackgroundColor={theme.colors.surface}
            titleColor={theme.colors.onSurface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
